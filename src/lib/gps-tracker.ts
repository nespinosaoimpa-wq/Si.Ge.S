import { db, GPSPoint } from './db';

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
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
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

  private handlePosition(pos: GeolocationPosition) {
    const now = Date.now();
    const speed = pos.coords.speed || 0;
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

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
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading
        });

        if (this.onTracePoint) {
          this.onTracePoint({
            lat,
            lng,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: new Date().toISOString(),
            totalDistance: this.accumulatedDistance
          });
        }
      }
    }

    // 2. Adaptive sampling logic (Standard tracking)
    if (speed < ADAPTIVE_STATIONARY_SPEED) {
      if (this.stationaryStartTime === null) this.stationaryStartTime = now;
    } else {
      this.stationaryStartTime = null;
    }

    const isStationary = this.stationaryStartTime !== null && (now - this.stationaryStartTime > STATIONARY_TIME_THRESHOLD);
    const currentInterval = isStationary ? STATIONARY_INTERVAL : NORMAL_INTERVAL;

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
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
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
    } catch (e) {}
  }

  private async handleAbandonment(data: any) {
    try {
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
    } catch (e) {}
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

  private async transmitToServer(point: GPSPoint): Promise<boolean> {
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
    } catch (e) {
      return false;
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
