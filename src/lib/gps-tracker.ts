import { db, GPSPoint } from './db';
import { supabase } from './supabase';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const GRACE_PERIOD_MS = 30000; // 30 seconds
const ADAPTIVE_STATIONARY_SPEED = 0.27; // ~1 km/h in m/s
const STATIONARY_TIME_THRESHOLD = 120000; // 2 minutes
const NORMAL_INTERVAL = 5000; // 5s
const STATIONARY_INTERVAL = 60000; // 60s

// Precision gates (raised from original 50m/12m for stricter accuracy)
const ACCURACY_GATE_TRACKING = 25;  // discard readings worse than 25m during tracking
const ACCURACY_GATE_KALMAN_BYPASS = 8; // bypass Kalman smoothing only for excellent satellite lock
const ACCURACY_GATE_COLD_START = 60; // allow up to 60m only when no prior fix exists (cold start)

// Multi-sample high-precision fix config
const HP_FIX_REQUIRED_SAMPLES = 5;  // number of good samples to average
const HP_FIX_SAMPLE_ACCURACY = 20;  // each sample must be ≤20m
const HP_FIX_FALLBACK_ACCURACY = 40; // fallback accept threshold if 20m not achieved in time
const HP_FIX_TIMEOUT_MS = 30000;    // 30 seconds max to collect samples

export class GPSTracker {
  private onUpdate: (pos: any) => void;
  private onError: (err: string) => void;
  private shiftId: string;
  private operatorId: string;
  private isSyncing = false;
  private wakeLock: any = null;
  private watchId: number | null = null;
  private isRunning = false;

  private objectiveLocation?: { lat: number, lng: number };
  private geofenceRadius?: number;
  private objectiveId?: string;

  // Geofencing state
  private gracePeriodStart: number | null = null;
  private isCurrentlyOutside = false;
  private alertTriggered = false;
  
  // Adaptive sampling state
  private lastUpdateTs = 0;
  private stationaryStartTime: number | null = null;

  // High-Frequency Mode (Patrol Traceability)
  private highFrequencyMode = false;
  private lastHighFreqPos: { lat: number, lng: number } | null = null;
  private roundId?: string;
  public onTracePoint?: (point: any) => void;
  private accumulatedDistance = 0;

  // Batch Insert Buffer (flush every 10 points or 30s)
  private traceBuffer: any[] = [];
  private flushTimerId: ReturnType<typeof setTimeout> | null = null;
  private readonly TRACE_BUFFER_SIZE = 10;
  private readonly TRACE_FLUSH_INTERVAL = 30000; // 30 seconds

  // Sprint 3: Reliability State
  private currentBackoffMs = 5000;
  private keepaliveTimerId: ReturnType<typeof setInterval> | null = null;
  private fallbackVideoEl: HTMLVideoElement | null = null;
  private boundVisibilityHandler: () => void;
  private boundOnlineHandler: () => void;

  // Kalman Filter GPS Smoothing State
  private kalmanLat = 0;
  private kalmanLng = 0;
  private kalmanVariance = -1; // -1 = uninitialized
  private kalmanLastTimestamp = 0;
  private readonly Q_PROCESS_NOISE = 1.5; // Base process variance (meters^2 per second)

  // Last raw accuracy for external consumers (e.g. UI progress)
  private lastRawAccuracy = 999;
  public getLastAccuracy() { return this.lastRawAccuracy; }

  constructor(
    shiftId: string,
    operatorId: string,
    onUpdate: (pos: any) => void,
    onError: (err: string) => void,
    objectiveData?: { location: { lat: number, lng: number }, radius: number, id: string }
  ) {
    const isShiftValid = typeof shiftId === 'string' && shiftId.length > 5;
    const isOperatorValid = typeof operatorId === 'string' && operatorId.length > 2;

    this.shiftId = isShiftValid ? shiftId : 'invalid_shift';
    this.operatorId = isOperatorValid ? operatorId : 'invalid_operator';
    this.onUpdate = typeof onUpdate === 'function' ? onUpdate : () => {};
    this.onError = typeof onError === 'function' ? onError : () => {};

    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
    this.boundOnlineHandler = this.handleOnline.bind(this);

    if (objectiveData) {
      this.objectiveLocation = objectiveData.location;
      this.geofenceRadius = objectiveData.radius;
      this.objectiveId = objectiveData.id;
      // Sprint 3: Dynamic Geofencing - Fetch if not provided correctly or use fallback
      if (!this.geofenceRadius && this.objectiveId) {
        this.fetchDynamicGeofenceRadius();
      } else if (!this.geofenceRadius) {
        this.geofenceRadius = 100; // default fallback
      }
    }
  }

  private async fetchDynamicGeofenceRadius() {
    try {
      const { supabase } = await import('./supabase');
      const { data, error } = await supabase
        .from('objectives')
        .select('geofence_radius')
        .eq('id', this.objectiveId)
        .single();
      
      if (!error && data && data.geofence_radius) {
        this.geofenceRadius = data.geofence_radius;
        console.log(`[SIGPAD GPS] Dynamic Geofence Radius loaded: ${this.geofenceRadius}m`);
      } else {
        this.geofenceRadius = 100; // fallback
      }
    } catch (e) {
      this.geofenceRadius = 100;
    }
  }

  public setHighFrequencyMode(enabled: boolean, roundId?: string) {
    this.highFrequencyMode = enabled;
    this.roundId = roundId;
    if (enabled) {
      console.log(`[SIGPAD GPS] High-Frequency Mode ACTIVE (Round: ${roundId})`);
      this.accumulatedDistance = 0;
      this.startFlushTimer();
    } else {
      console.log('[SIGPAD GPS] High-Frequency Mode DISABLED');
      this.lastHighFreqPos = null;
      // Flush remaining buffer before disabling
      this.flushTraceBuffer();
      this.stopFlushTimer();
    }
  }

  private startFlushTimer() {
    this.stopFlushTimer();
    this.flushTimerId = setInterval(() => {
      if (this.traceBuffer.length > 0) {
        this.flushTraceBuffer();
      }
    }, this.TRACE_FLUSH_INTERVAL);
  }

  private stopFlushTimer() {
    if (this.flushTimerId) {
      clearInterval(this.flushTimerId);
      this.flushTimerId = null;
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Acquire Wake Lock & Setup Reliability Listeners
    await this.acquireWakeLock();
    this.setupVideoFallback();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.boundOnlineHandler);
    }

    // 1.b SW Keepalive Heartbeat
    this.startKeepaliveHeartbeat();

    // 2. Start Main Thread Tracking
    if (!navigator.geolocation) {
        this.onError('Geolocation not supported');
        return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.onError(err.message),
      // timeout increased to 20s: gives GPS chip more time to converge in indoor/obstructed environments
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    // 3. Start Sync Monitor
    this.startSyncLoop();
  }

  private async acquireWakeLock() {
    if ('wakeLock' in navigator && this.isRunning) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[SIGPAD GPS] Wake Lock active');
      } catch (err) {
        console.warn('[SIGPAD GPS] Wake Lock failed (expected in background)');
      }
    }
  }

  private handleVisibilityChange() {
    if (document.visibilityState === 'visible' && this.isRunning) {
      console.log('[SIGPAD GPS] App became visible, re-acquiring Wake Lock...');
      this.acquireWakeLock();
    }
  }

  private handleOnline() {
    console.log('[SIGPAD GPS] Network connection restored, resetting backoff and flushing...');
    this.currentBackoffMs = 5000;
    this.flushTraceBuffer();
    this.syncPendingPoints();
  }

  private setupVideoFallback() {
    if (typeof document === 'undefined') return;
    // 1x1 invisible muted video loop to prevent OS process suspension
    const video = document.createElement('video');
    video.setAttribute('loop', 'true');
    video.setAttribute('muted', 'true');
    video.setAttribute('playsinline', 'true');
    video.style.display = 'none';
    // Tiny valid video data URI
    video.src = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAG21kYXQAAAHkAAAABuBvXgD/AAAAEAAAADAAAAD///AAhAAABwBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAACR0cmFmAAAAHHRmaGQAAAABAAAAAQAAAAAAAAAAAAAAAPAAAAAkdHJ1bgEAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAOAAAAAIAAAAAA==';
    document.body.appendChild(video);
    
    // Attempt play (may fail without user interaction, but we catch it)
    video.play().catch(() => console.warn('[SIGPAD GPS] Video fallback autoplay prevented'));
    this.fallbackVideoEl = video;
  }

  private startKeepaliveHeartbeat() {
    if (this.keepaliveTimerId) clearInterval(this.keepaliveTimerId);
    this.keepaliveTimerId = setInterval(() => {
      if (this.isRunning && navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'KEEPALIVE' });
      }
    }, 60000); // Every 60 seconds
  }

  private applyKalmanFilter(measuredLat: number, measuredLng: number, accuracyMeters: number, speedMs: number, timestampMs: number) {
    const measurementNoise = accuracyMeters * accuracyMeters;

    // High-precision satellite lock (≤8m): snap immediately without smoothing lag
    // Tightened from 12m → 8m: at 12m GPS can still oscillate visibly at building-level zoom
    if (accuracyMeters <= ACCURACY_GATE_KALMAN_BYPASS || this.kalmanVariance < 0) {
      this.kalmanLat = measuredLat;
      this.kalmanLng = measuredLng;
      this.kalmanVariance = measurementNoise;
      this.kalmanLastTimestamp = timestampMs;
    } else {
      const dt = Math.max((timestampMs - this.kalmanLastTimestamp) / 1000, 0.1);
      this.kalmanLastTimestamp = timestampMs;

      // Adjust process noise dynamically based on speed (more noise allowed at speed to allow faster updates)
      const currentProcessNoise = speedMs > 1.0 ? this.Q_PROCESS_NOISE * (speedMs * speedMs) : this.Q_PROCESS_NOISE;
      this.kalmanVariance += dt * currentProcessNoise;

      const gain = this.kalmanVariance / (this.kalmanVariance + measurementNoise);
      this.kalmanLat += gain * (measuredLat - this.kalmanLat);
      this.kalmanLng += gain * (measuredLng - this.kalmanLng);
      this.kalmanVariance = (1 - gain) * this.kalmanVariance;
    }

    return {
      lat: this.kalmanLat,
      lng: this.kalmanLng,
      accuracy: Math.sqrt(this.kalmanVariance)
    };
  }

  private handlePosition(pos: GeolocationPosition) {
    const now = Date.now();
    const rawSpeed = pos.coords.speed || 0;
    const rawAccuracy = pos.coords.accuracy || 30;

    // Track last raw accuracy for external UI consumers
    this.lastRawAccuracy = rawAccuracy;

    // Discard imprecise measurements to prevent GPS marker jumps.
    // Cold start (kalmanVariance === -1): allow up to ACCURACY_GATE_COLD_START (60m) to get initial fix.
    // After first fix: enforce strict ACCURACY_GATE_TRACKING (25m) gate.
    const gate = this.kalmanVariance === -1 ? ACCURACY_GATE_COLD_START : ACCURACY_GATE_TRACKING;
    if (rawAccuracy > gate) {
      console.warn(`[SIGPAD GPS] Descartando coordenada imprecisa (>${gate}m): ±${Math.round(rawAccuracy)}m`);
      return;
    }

    // Speed spike check: discard physically impossible GPS teleports (>42 m/s or ~150 km/h)
    if (this.lastUpdateTs > 0 && this.kalmanLat !== 0) {
      const dtSeconds = (now - this.lastUpdateTs) / 1000;
      if (dtSeconds > 0 && dtSeconds < 10) {
        const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, this.kalmanLat, this.kalmanLng);
        const derivedSpeed = dist / dtSeconds;
        if (derivedSpeed > 42) { // >150 km/h
          console.warn(`[SIGPAD GPS] Descartando salto GPS anómalo: ${Math.round(derivedSpeed * 3.6)} km/h en ${dtSeconds.toFixed(1)}s`);
          return;
        }
      }
    }

    const filtered = this.applyKalmanFilter(
      pos.coords.latitude,
      pos.coords.longitude,
      rawAccuracy,
      rawSpeed,
      now
    );

    const lat = filtered.lat;
    const lng = filtered.lng;
    const accuracy = filtered.accuracy;
    const speed = rawSpeed;

    // 1. High-Frequency Distance-based logic (3m threshold for smooth Uber-like trace)
    if (this.highFrequencyMode && this.roundId) {
      const distFromLast = this.lastHighFreqPos 
        ? calculateDistance(lat, lng, this.lastHighFreqPos.lat, this.lastHighFreqPos.lng)
        : 999;
      
      if (distFromLast >= 3) { // 3 meters threshold
        if (this.lastHighFreqPos && distFromLast !== 999) {
          this.accumulatedDistance += distFromLast;
        }
        this.lastHighFreqPos = { lat, lng };
        this.savePatrolTracePoint({
          round_id: this.roundId,
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
          speed: speed,
          heading: pos.coords.heading
        });

        if (this.onTracePoint) {
          this.onTracePoint({
            lat,
            lng,
            accuracy: accuracy,
            speed: speed,
            heading: pos.coords.heading,
            timestamp: new Date().toISOString(),
            totalDistance: this.accumulatedDistance
          });
        }
      }
    }

    // 2. Adaptive sampling logic (Tactical Blueprint: 60s stationary inside, 12s moving or outside)
    if (speed < ADAPTIVE_STATIONARY_SPEED) {
      if (this.stationaryStartTime === null) this.stationaryStartTime = now;
    } else {
      this.stationaryStartTime = null;
    }

    const isStationary = this.stationaryStartTime !== null && (now - this.stationaryStartTime > STATIONARY_TIME_THRESHOLD);
    const isStationaryInside = isStationary && !this.isCurrentlyOutside;
    const currentInterval = isStationaryInside ? 60000 : 12000;

    // 3. Geofence Logic
    if (this.objectiveLocation && this.geofenceRadius) {
      const distance = calculateDistance(lat, lng, this.objectiveLocation.lat, this.objectiveLocation.lng);
      const isOutside = distance > this.geofenceRadius;

      if (isOutside) {
        if (!this.isCurrentlyOutside) {
          this.isCurrentlyOutside = true;
          this.gracePeriodStart = now;
          this.handleGeofenceWarning({ distance, graceRemaining: GRACE_PERIOD_MS });
        } else if (!this.alertTriggered && (now - (this.gracePeriodStart || 0) > GRACE_PERIOD_MS)) {
          this.alertTriggered = true;
          this.handleAbandonment({ distance, latitude: lat, longitude: lng });
        }
      } else {
        if (this.isCurrentlyOutside) {
          this.isCurrentlyOutside = false;
          this.gracePeriodStart = null;
          if (this.alertTriggered) {
            this.alertTriggered = false;
            this.handleReturn({ distance });
          }
        }
      }
    }

    // 4. Throttle Updates for standard transmission
    if (now - this.lastUpdateTs >= currentInterval) {
      this.lastUpdateTs = now;
      
      const payload = {
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
        speed: speed,
        heading: pos.coords.heading,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        timestamp: pos.timestamp,
        isStationary,
        isOutside: this.isCurrentlyOutside,
        distanceToObjective: this.objectiveLocation ? calculateDistance(lat, lng, this.objectiveLocation.lat, this.objectiveLocation.lng) : null
      };

      this.handleLocationUpdate(payload);
    }
  }

  private savePatrolTracePoint(data: any) {
    // Buffer the point instead of inserting immediately
    this.traceBuffer.push({
      shift_id: this.shiftId,
      round_id: data.round_id,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      speed: data.speed,
      heading: data.heading
    });

    console.log(`[SIGPAD GPS] Trace buffered (${this.traceBuffer.length}/${this.TRACE_BUFFER_SIZE})`);

    // Flush when buffer is full
    if (this.traceBuffer.length >= this.TRACE_BUFFER_SIZE) {
      this.flushTraceBuffer();
    }
  }

  private async flushTraceBuffer() {
    if (this.traceBuffer.length === 0) return;

    const batch = [...this.traceBuffer];
    this.traceBuffer = []; // optimistically clear

    try {
      const { error } = await (await import('./supabase')).supabase
        .from('patrol_trace')
        .insert(batch);

      if (error) {
        throw error;
      } else {
        console.log(`[SIGPAD GPS] Flushed ${batch.length} trace points successfully`);
        this.currentBackoffMs = 5000; // reset backoff on success
      }
    } catch (e) {
      console.error(`[SIGPAD GPS] Batch trace exception, retrying in ${this.currentBackoffMs}ms:`, e);
      // Re-queue points
      this.traceBuffer.unshift(...batch);
      
      // Exponential Backoff
      setTimeout(() => {
        if (this.isRunning && this.traceBuffer.length > 0) {
          this.flushTraceBuffer();
        }
      }, this.currentBackoffMs);

      // Increase backoff for next time (cap at 60s)
      this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, 60000);
    }
  }

  async stop() {
    this.isRunning = false;
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }

    // Sprint 3: Cleanup listeners and timers
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.boundOnlineHandler);
    }
    if (this.keepaliveTimerId) {
      clearInterval(this.keepaliveTimerId);
      this.keepaliveTimerId = null;
    }
    if (this.fallbackVideoEl) {
      this.fallbackVideoEl.pause();
      this.fallbackVideoEl.remove();
      this.fallbackVideoEl = null;
    }

    // Flush any remaining trace buffer
    await this.flushTraceBuffer();
    this.stopFlushTimer();

    await this.syncPendingPoints();
  }

  private handleGeofenceWarning(data: any) {
    if ("vibrate" in navigator) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
  }

  private async handleReturn(data: any) {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sigpad_geofence_alert', { detail: { type: 'entry', distance: data.distance } }));
      }
      await fetch('/api/tracking/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: this.shiftId,
          operator_id: this.operatorId,
          objective_id: this.objectiveId,
          type: 'entry',
          distance: data.distance
        })
      });
    } catch (e) {
      console.error('[GPS_TRACKER] Error en handleReturn:', e);
    }
  }

  private async handleAbandonment(data: any) {
    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 1000]);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sigpad_geofence_alert', { detail: { type: 'exit', distance: data.distance } }));
      }
      await fetch('/api/tracking/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: this.shiftId,
          operator_id: this.operatorId,
          objective_id: this.objectiveId,
          type: 'exit',
          latitude: data.latitude,
          longitude: data.longitude,
          distance: data.distance
        })
      });
    } catch (e) {
      console.error('[GPS_TRACKER] Error en handleAbandonment:', e);
    }
  }

  private async handleLocationUpdate(data: any) {
    const point: GPSPoint = {
      shift_id: this.shiftId,
      operator_id: this.operatorId,
      objective_id: this.objectiveId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      speed: data.speed,
      heading: data.heading,
      timestamp: data.timestamp,
      status: 'pending'
    };

    try {
      const id = await db.gps_points.add(point);
      if (navigator.onLine) {
        const success = await this.transmitToServer(point);
        if (success) {
          await db.gps_points.update(id!, { status: 'synced' });
        }
      }
      this.onUpdate(data);
    } catch (e) {}
  }

  /**
   * High-Precision Fix: collects HP_FIX_REQUIRED_SAMPLES readings ≤ HP_FIX_SAMPLE_ACCURACY (20m),
   * averages coordinates discarding the outlier furthest from the centroid,
   * returns averaged position with real effective accuracy.
   * Used for checkin to prevent a single noisy reading from placing operator at wrong location.
   * Falls back to best reading if strict accuracy not achieved within timeout.
   * Zero Vercel invocations — pure browser-side computation.
   */
  public getHighPrecisionFix(
    onProgress: (sample: number, total: number, accuracy: number) => void
  ): Promise<{ lat: number; lng: number; accuracy: number; isFallback: boolean }> {
    return new Promise((resolve, reject) => {
      const samples: { lat: number; lng: number; accuracy: number }[] = [];
      let bestSoFar: { lat: number; lng: number; accuracy: number } | null = null;
      let watchId: number | null = null;
      let resolved = false;

      const finish = (isFallback: boolean) => {
        if (resolved) return;
        resolved = true;
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);

        if (isFallback && bestSoFar) {
          resolve({ ...bestSoFar, isFallback: true });
          return;
        }

        // Average collected samples, dropping the outlier furthest from centroid
        const centLat = samples.reduce((s, p) => s + p.lat, 0) / samples.length;
        const centLng = samples.reduce((s, p) => s + p.lng, 0) / samples.length;
        let worstIdx = 0, worstDist = 0;
        samples.forEach((p, i) => {
          const d = calculateDistance(p.lat, p.lng, centLat, centLng);
          if (d > worstDist) { worstDist = d; worstIdx = i; }
        });
        const filtered = samples.filter((_, i) => i !== worstIdx);
        const avgLat = filtered.reduce((s, p) => s + p.lat, 0) / filtered.length;
        const avgLng = filtered.reduce((s, p) => s + p.lng, 0) / filtered.length;
        const avgAcc = filtered.reduce((s, p) => s + p.accuracy, 0) / filtered.length;
        resolve({ lat: avgLat, lng: avgLng, accuracy: avgAcc, isFallback: false });
      };

      const timeoutId = setTimeout(() => {
        finish(true); // fallback to best reading
      }, HP_FIX_TIMEOUT_MS);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const acc = pos.coords.accuracy;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // Track best reading regardless of threshold (used for fallback)
          if (!bestSoFar || acc < bestSoFar.accuracy) {
            bestSoFar = { lat, lng, accuracy: acc };
          }

          if (acc <= HP_FIX_SAMPLE_ACCURACY) {
            samples.push({ lat, lng, accuracy: acc });
            onProgress(samples.length, HP_FIX_REQUIRED_SAMPLES, acc);
            if (samples.length >= HP_FIX_REQUIRED_SAMPLES) {
              clearTimeout(timeoutId);
              finish(false);
            }
          } else {
            // Report progress even when sample doesn't qualify, so UI stays responsive
            onProgress(samples.length, HP_FIX_REQUIRED_SAMPLES, acc);
          }
        },
        (err) => {
          clearTimeout(timeoutId);
          if (!resolved) reject(err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    });
  }

  private async transmitToServer(point: GPSPoint): Promise<boolean> {
    try {
      const opId = point.operator_id;
      const tasks: Promise<any>[] = [];

      const updatePayload: any = { 
        latitude: point.latitude, 
        longitude: point.longitude,
        accuracy: point.accuracy,
        speed: point.speed,
        heading: point.heading,
        last_gps_update: new Date().toISOString(),
        status: 'activo' 
      };

      if (point.objective_id) {
        updatePayload.current_objective_id = point.objective_id;
      }

      // Update position directly on Supabase resources table (0 Vercel function calls!)
      tasks.push(
        supabase.from('resources')
          .update(updatePayload)
          .or(`id.eq.${opId},assigned_to.eq.${opId}`)
      );

      // Log point in gps_tracking directly on Supabase
      tasks.push(
        supabase.from('gps_tracking').insert({
          operator_id: opId,
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          objective_id: point.objective_id,
          recorded_at: new Date().toISOString()
        })
      );

      const results = await Promise.allSettled(tasks);
      const isSuccess = results.some(r => r.status === 'fulfilled');
      if (isSuccess) return true;
      throw new Error("Direct Supabase update failed");
    } catch (e) {
      // Fallback to Vercel API route if direct Supabase query fails
      try {
        const response = await fetch('/api/tracking/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shiftData: { id: point.shift_id, operator_id: point.operator_id },
            objective_id: point.objective_id,
            latitude: point.latitude,
            longitude: point.longitude,
            accuracy: point.accuracy,
            speed: point.speed,
            heading: point.heading,
            timestamp: point.timestamp
          })
        });
        return response.ok;
      } catch (err) {
        return false;
      }
    }
  }

  private startSyncLoop() {
    const loop = async () => {
      if (!this.isRunning) return;
      if (navigator.onLine && !this.isSyncing) {
        await this.syncPendingPoints();
      }
      setTimeout(loop, 15000);
    };
    loop();
  }

  private async syncPendingPoints() {
    if (this.isSyncing) return;
    const pending = await db.gps_points.where('status').equals('pending').limit(50).toArray();
    if (pending.length === 0) return;
    this.isSyncing = true;
    try {
      await Promise.all(pending.map(async (p) => {
        const ok = await this.transmitToServer(p);
        if (ok) await db.gps_points.update(p.id!, { status: 'synced' });
      }));
    } finally {
      this.isSyncing = false;
    }
  }

  static getAccuracyCategory(accuracyMeters: number) {
    if (accuracyMeters <= 10) return { label: 'EXCELENTE', color: 'text-green-500', bgColor: 'bg-green-500/10', level: 'excelente' };
    if (accuracyMeters <= 30) return { label: 'BUENA', color: 'text-green-400', bgColor: 'bg-green-400/10', level: 'buena' };
    if (accuracyMeters <= 100) return { label: 'MEDIA', color: 'text-amber-500', bgColor: 'bg-amber-500/10', level: 'media' };
    return { label: 'BAJA', color: 'text-red-500', bgColor: 'bg-red-500/10', level: 'baja' };
  }
}
