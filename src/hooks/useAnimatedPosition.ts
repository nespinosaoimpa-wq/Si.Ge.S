'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

/** Haversine distance in meters */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Calculate bearing in degrees (0=north, 90=east) */
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Shortest angular interpolation */
function lerpAngle(from: number, to: number, t: number): number {
  const diff = ((to - from + 540) % 360) - 180;
  return ((from + diff * t) + 360) % 360;
}

interface AnimatedPos {
  lat: number;
  lng: number;
  bearing: number;
}

const MAX_TRAIL = 8;

/**
 * Smoothly interpolates between GPS coordinate updates using requestAnimationFrame.
 * Returns the current interpolated position, bearing, and a trail of recent positions.
 *
 * @param targetLat  - Latest GPS latitude
 * @param targetLng  - Latest GPS longitude
 * @param duration   - Interpolation duration in ms (default 1500)
 */
export function useAnimatedPosition(
  targetLat: number | undefined,
  targetLng: number | undefined,
  duration = 1500
) {
  const [pos, setPos] = useState<AnimatedPos>({ lat: 0, lng: 0, bearing: 0 });
  const posRef = useRef<AnimatedPos>({ lat: 0, lng: 0, bearing: 0 });
  const [trail, setTrail] = useState<[number, number][]>([]);

  const prevTarget = useRef<{ lat: number; lng: number } | null>(null);
  const animStart = useRef<{ lat: number; lng: number; bearing: number } | null>(null);
  const animTarget = useRef<{ lat: number; lng: number; bearing: number } | null>(null);
  const startTime = useRef<number>(0);
  const rafId = useRef<number>(0);
  const initialized = useRef(false);

  const updatePos = useCallback((newPos: AnimatedPos) => {
    posRef.current = newPos;
    setPos(newPos);
  }, []);

  const tickRef = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    if (!animStart.current || !animTarget.current) return;

    const elapsed = performance.now() - startTime.current;
    const rawT = Math.min(elapsed / duration, 1);
    // Ease-out cubic for natural deceleration
    const t = 1 - Math.pow(1 - rawT, 3);

    const lat = animStart.current.lat + (animTarget.current.lat - animStart.current.lat) * t;
    const lng = animStart.current.lng + (animTarget.current.lng - animStart.current.lng) * t;
    const bearing = lerpAngle(animStart.current.bearing, animTarget.current.bearing, t);

    updatePos({ lat, lng, bearing });

    if (rawT < 1) {
      rafId.current = requestAnimationFrame(() => tickRef.current());
    }
  }, [duration, updatePos]);

  // Keep tickRef updated to avoid stale closures in requestAnimationFrame
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (targetLat === undefined || targetLng === undefined) return;
    if (targetLat === 0 && targetLng === 0) return;

    // First point — snap immediately
    if (!initialized.current) {
      initialized.current = true;
      prevTarget.current = { lat: targetLat, lng: targetLng };
      updatePos({ lat: targetLat, lng: targetLng, bearing: 0 });
      setTrail([[targetLat, targetLng]]);
      return;
    }

    const prev = prevTarget.current!;
    const dist = haversineDistance(prev.lat, prev.lng, targetLat, targetLng);

    // Ignore jitter (< 1m)
    if (dist < 1) return;

    // Calculate bearing from previous to new target
    const newBearing = calculateBearing(prev.lat, prev.lng, targetLat, targetLng);

    // Cancel any running animation
    if (rafId.current) cancelAnimationFrame(rafId.current);

    // Set up new interpolation
    animStart.current = { ...posRef.current };
    animTarget.current = { lat: targetLat, lng: targetLng, bearing: newBearing };
    startTime.current = performance.now();

    // Add to trail
    setTrail((prevTrail) => {
      const next = [...prevTrail, [targetLat, targetLng] as [number, number]];
      return next.slice(-MAX_TRAIL);
    });

    prevTarget.current = { lat: targetLat, lng: targetLng };

    // Start animation
    rafId.current = requestAnimationFrame(() => tickRef.current());

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [targetLat, targetLng, updatePos]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return {
    lat: pos.lat,
    lng: pos.lng,
    bearing: pos.bearing,
    trail,
    /** Haversine distance helper for external use */
    haversineDistance,
  };
}
