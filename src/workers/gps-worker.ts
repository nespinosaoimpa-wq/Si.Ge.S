/* eslint-disable no-restricted-globals */

interface WorkerConfig {
  shiftId: string;
  operatorId: string;
  objectiveId: string;
  objectiveLocation: { lat: number, lng: number };
  geofenceRadius: number;
}

let config: WorkerConfig | null = null;
let watchId: number | null = null;
let lastUpdateTs = 0;
let stationaryStartTime: number | null = null;
let lastSpeed = 0;

// Grace period state
let gracePeriodStart: number | null = null;
let isCurrentlyOutside = false;
let alertTriggered = false;

const GRACE_PERIOD_MS = 180000; // 3 minutes

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

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'START') {
    config = payload;
    isCurrentlyOutside = false;
    gracePeriodStart = null;
    alertTriggered = false;
    startTracking();
  } else if (type === 'STOP') {
    stopTracking();
  }
};


// Adaptive sampling thresholds
const ADAPTIVE_STATIONARY_SPEED = 0.27; // ~1 km/h in m/s
const STATIONARY_TIME_THRESHOLD = 120000; // 2 minutes
const NORMAL_INTERVAL = 5000; // 5s
const STATIONARY_INTERVAL = 60000; // 60s

function handlePosition(pos: GeolocationPosition) {
  const now = Date.now();
  const speed = pos.coords.speed || 0;
  lastSpeed = speed;

  // 1. Adaptive sampling logic
  if (speed < ADAPTIVE_STATIONARY_SPEED) {
    if (stationaryStartTime === null) stationaryStartTime = now;
  } else {
    stationaryStartTime = null;
  }

  const isStationary = stationaryStartTime !== null && (now - stationaryStartTime > STATIONARY_TIME_THRESHOLD);
  const currentInterval = isStationary ? STATIONARY_INTERVAL : NORMAL_INTERVAL;

  // 2. Geofence Exit Logic (Phase 4)
  if (config?.objectiveLocation && config.geofenceRadius) {
    const distance = calculateDistance(
      pos.coords.latitude, 
      pos.coords.longitude, 
      config.objectiveLocation.lat, 
      config.objectiveLocation.lng
    );

    const isOutside = distance > config.geofenceRadius;

    if (isOutside) {
      if (!isCurrentlyOutside) {
        isCurrentlyOutside = true;
        gracePeriodStart = now;
        self.postMessage({ type: 'GEOFENCE_WARNING', payload: { distance, graceRemaining: GRACE_PERIOD_MS } });
      } else if (!alertTriggered && (now - (gracePeriodStart || 0) > GRACE_PERIOD_MS)) {
        alertTriggered = true;
        self.postMessage({ 
          type: 'GEOFENCE_ABANDONMENT', 
          payload: { 
            distance, 
            latitude: pos.coords.latitude, 
            longitude: pos.coords.longitude 
          } 
        });
      }
    } else {
      if (isCurrentlyOutside) {
        isCurrentlyOutside = false;
        gracePeriodStart = null;
        if (alertTriggered) {
          alertTriggered = false;
          self.postMessage({ type: 'GEOFENCE_RETURN', payload: { distance } });
        }
      }
    }
  }

  // 3. Throttle Updates
  if (now - lastUpdateTs >= currentInterval) {
    lastUpdateTs = now;
    
    self.postMessage({
      type: 'LOCATION_UPDATE',
      payload: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp,
        isStationary,
        isOutside: isCurrentlyOutside
      }
    });
  }
}

function startTracking() {
  if (watchId !== null) return;
  if (!navigator.geolocation) {
    self.postMessage({ type: 'ERROR', payload: 'Geolocation not supported in worker' });
    return;
  }
  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    (err) => self.postMessage({ type: 'ERROR', payload: err.message }),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
  self.postMessage({ type: 'STATUS', payload: 'TRACKING_STARTED' });
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  config = null;
  stationaryStartTime = null;
  self.postMessage({ type: 'STATUS', payload: 'TRACKING_STOPPED' });
}

export {};
