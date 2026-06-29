'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCw, ShieldCheck, Clock, 
  CheckCircle2, MapPin, 
  ArrowLeft, Play, History, Map as MapIcon,
  ShieldAlert, Target, Navigation, Zap, Flag, Timer
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DebugTelemetry from '@/components/operador/DebugTelemetry';

import { useShift } from '@/components/providers/ShiftProvider';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

// Dynamic import — no SSR for Mapbox component
const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
interface TracePoint { lat: number; lng: number; timestamp: string; speed?: number | null; accuracy?: number | null; }
interface LiveMetrics { distanceMeters: number; currentSpeedKmh: number; avgSpeedKmh: number; maxSpeedKmh: number; }

// ─── Haversine distance (meters) ─────────────────────────────────────────────
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Elapsed timer (self-contained, isolated re-renders) ─────────────────────
function ElapsedTimer({ startIso, className }: { startIso: string; className?: string }) {
  const [display, setDisplay] = useState('00:00:00');
  useEffect(() => {
    const start = new Date(startIso).getTime();
    const tick = () => {
      const d = Date.now() - start;
      const h = Math.floor(d / 3600000);
      const m = Math.floor((d % 3600000) / 60000);
      const s = Math.floor((d % 60000) / 1000);
      setDisplay(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  return <span className={className}>{display}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RondinesPage() {
  const { theme, shiftData, isShiftActive } = useShift();
  const isShiftActiveRef = useRef(isShiftActive);
  useEffect(() => { isShiftActiveRef.current = isShiftActive; }, [isShiftActive]);

  // UI state
  const [activeTab, setActiveTab] = useState<'status' | 'timeline'>('status');
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Round state
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [validations, setValidations] = useState<Record<string, string>>({});

  // GPS / path state
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [patrolPath, setPatrolPath] = useState<TracePoint[]>([]); // the live-drawn route
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Live metrics (Uber-style)
  const [metrics, setMetrics] = useState<LiveMetrics>({ distanceMeters: 0, currentSpeedKmh: 0, avgSpeedKmh: 0, maxSpeedKmh: 0 });

  // Telemetry overlay
  const [telemetry, setTelemetry] = useState({ accuracy: null as number | null, distanceToTarget: null as number | null, syncStatus: 'online' as 'online' | 'offline' | 'pending', lastPointTimestamp: null as number | null });

  // Refs
  const trackerRef = useRef<any>(null);
  const metricsRef = useRef<LiveMetrics>({ distanceMeters: 0, currentSpeedKmh: 0, avgSpeedKmh: 0, maxSpeedKmh: 0 });
  const lastPathPointRef = useRef<TracePoint | null>(null);
  const speedSamplesRef = useRef<number[]>([]);

  const objectiveId = (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;
  const operatorId = (shiftData as any)?.operator_id || (shiftData as any)?.resource_id;

  // ── Fetch avatar ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (operatorId && operatorId !== 'recurso_demo') {
      supabase.from('resources').select('avatar_url').eq('id', operatorId).maybeSingle()
        .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url); });
    }
  }, [operatorId]);

  // ── Cleanup tracker on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => { trackerRef.current?.stop(); };
  }, []);

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!objectiveId) { setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch checkpoints directly linked to the objective
        const { data: cpData } = await supabase
          .from('checkpoints')
          .select('*')
          .eq('objective_id', objectiveId)
          .order('order_index', { ascending: true });
        setCheckpoints(cpData || []);

        // 2. Check for an already-active round (cross-device resilience)
        const { data: roundData } = await supabase
          .from('patrol_rounds').select('*')
          .eq('objective_id', objectiveId)
          .eq('resource_id', operatorId)
          .eq('status', 'active')
          .maybeSingle();

        if (roundData) {
          setActiveRound(roundData);

          // 3. Recover existing trace points from patrol_trace (correct table!)
          const { data: existingPoints } = await supabase
            .from('patrol_trace')
            .select('latitude, longitude, speed, accuracy, created_at')
            .eq('round_id', roundData.id)
            .order('created_at', { ascending: true });

          if (existingPoints && existingPoints.length > 0) {
            const recovered: TracePoint[] = existingPoints.map((p: any) => ({
              lat: p.latitude, lng: p.longitude,
              timestamp: p.created_at,
              speed: p.speed, accuracy: p.accuracy
            }));
            setPatrolPath(recovered);

            // Reconstruct metrics from recovered points
            let totalDist = 0;
            let maxSpd = 0;
            const speeds: number[] = [];
            for (let i = 1; i < recovered.length; i++) {
              totalDist += haversineMeters(recovered[i-1].lat, recovered[i-1].lng, recovered[i].lat, recovered[i].lng);
              if (recovered[i].speed) {
                const kmh = (recovered[i].speed! * 3.6);
                speeds.push(kmh);
                if (kmh > maxSpd) maxSpd = kmh;
              }
            }
            const avgSpd = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
            const newMetrics = { distanceMeters: totalDist, currentSpeedKmh: 0, avgSpeedKmh: avgSpd, maxSpeedKmh: maxSpd };
            metricsRef.current = newMetrics;
            setMetrics(newMetrics);
            lastPathPointRef.current = recovered[recovered.length - 1];
          }

          startTrackingForRound(roundData.id);
        }
      } catch (e) {
        console.error('[Rondines] fetchData error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectiveId, operatorId]);

  // ── Start GPS tracking for a round ─────────────────────────────────────────
  const startTrackingForRound = useCallback(async (roundId: string) => {
    // Dynamically import to avoid SSR issues
    const { GPSTracker } = await import('@/lib/gps-tracker');

    const tracker = new GPSTracker(
      shiftData?.id || 'rondin-shift',
      operatorId,
      // onUpdate callback (standard 5-60s updates)
      async (pos: any) => {
        if (!isShiftActiveRef.current) { tracker.stop(); return; }

        const coords = { lat: pos.latitude, lng: pos.longitude };
        setLocation(coords);
        setTelemetry({
          accuracy: pos.accuracy,
          distanceToTarget: pos.distanceToObjective,
          syncStatus: navigator.onLine ? 'online' : 'offline',
          lastPointTimestamp: Date.now()
        });
      },
      (err: string) => console.warn('[Rondines] GPS error:', err),
      (shiftData as any)?.objectiveLocation ? {
        location: (shiftData as any).objectiveLocation,
        radius: (shiftData as any).geofenceRadius || 70,
        id: objectiveId
      } : undefined
    );

    // High-frequency mode: tracker writes to patrol_trace (PostGIS)
    tracker.setHighFrequencyMode(true, roundId);

    // Local real-time callback for instant drawing (Uber style)
    tracker.onTracePoint = (p: any) => {
      const newPoint: TracePoint = {
        lat: p.lat,
        lng: p.lng,
        timestamp: p.timestamp,
        speed: p.speed,
        accuracy: p.accuracy
      };

      setPatrolPath(prev => {
        if (prev.some(x => x.lat === newPoint.lat && x.lng === newPoint.lng)) return prev;
        return [...prev, newPoint];
      });

      setMetrics(prev => {
        const last = lastPathPointRef.current;
        let addedDist = 0;
        if (last) {
          addedDist = haversineMeters(last.lat, last.lng, newPoint.lat, newPoint.lng);
        }
        const currentSpeedKmh = newPoint.speed ? newPoint.speed * 3.6 : prev.currentSpeedKmh;
        const newMax = Math.max(prev.maxSpeedKmh, currentSpeedKmh);

        if (currentSpeedKmh > 0) speedSamplesRef.current.push(currentSpeedKmh);
        const avgSpd = speedSamplesRef.current.length > 0
          ? speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length
          : prev.avgSpeedKmh;

        const updated = {
          distanceMeters: prev.distanceMeters + addedDist,
          currentSpeedKmh,
          avgSpeedKmh: avgSpd,
          maxSpeedKmh: newMax
        };
        metricsRef.current = updated;
        lastPathPointRef.current = newPoint;
        return updated;
      });

      setLocation({ lat: newPoint.lat, lng: newPoint.lng });
    };

    // Subscribe to real-time patrol_trace inserts for THIS round (updates from other sources or sync recovery)
    const channel = supabase
      .channel(`patrol-trace-${roundId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'patrol_trace', filter: `round_id=eq.${roundId}` },
        (payload) => {
          const p = payload.new as any;
          if (!p.latitude || !p.longitude) return;

          const newPoint: TracePoint = {
            lat: p.latitude, lng: p.longitude,
            timestamp: p.created_at || new Date().toISOString(),
            speed: p.speed, accuracy: p.accuracy
          };

          // Update path state
          setPatrolPath(prev => {
            // Avoid duplicates (same timestamp or same coordinate)
            if (prev.some(x => x.timestamp === newPoint.timestamp || (x.lat === newPoint.lat && x.lng === newPoint.lng))) return prev;
            return [...prev, newPoint];
          });

          // Update live metrics
          setMetrics(prev => {
            const last = lastPathPointRef.current;
            let addedDist = 0;
            if (last) {
              addedDist = haversineMeters(last.lat, last.lng, newPoint.lat, newPoint.lng);
            }
            const currentSpeedKmh = newPoint.speed ? newPoint.speed * 3.6 : prev.currentSpeedKmh;
            const newMax = Math.max(prev.maxSpeedKmh, currentSpeedKmh);

            // Rolling average
            if (currentSpeedKmh > 0) speedSamplesRef.current.push(currentSpeedKmh);
            const avgSpd = speedSamplesRef.current.length > 0
              ? speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length
              : prev.avgSpeedKmh;

            const updated = {
              distanceMeters: prev.distanceMeters + addedDist,
              currentSpeedKmh,
              avgSpeedKmh: avgSpd,
              maxSpeedKmh: newMax
            };
            metricsRef.current = updated;
            lastPathPointRef.current = newPoint;
            return updated;
          });

          // Also update GPS location
          setLocation({ lat: newPoint.lat, lng: newPoint.lng });
        }
      )
      .subscribe();

    tracker.start();
    trackerRef.current = tracker;

    // Store channel ref for cleanup
    (tracker as any)._realtimeChannel = channel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftData, operatorId, objectiveId]);

  // ── Start Round ─────────────────────────────────────────────────────────────
  const handleStartRound = async () => {
    if (!objectiveId || !operatorId) return;

    // Proximity guard: must be < 150m from objective
    const objectiveLoc = (shiftData as any)?.objectiveLocation;
    if (objectiveLoc && location) {
      const dist = haversineMeters(location.lat, location.lng, objectiveLoc.lat, objectiveLoc.lng);
      if (dist > 150) {
        alert(`🔒 BLOQUEO TÁCTICO: Fuera de perímetro. Se encuentra a ${Math.round(dist)}m del objetivo. Requisito: <150m.`);
        return;
      }
    }

    setValidating(true);
    try {
      const { data, error } = await supabase
        .from('patrol_rounds')
        .insert({
          objective_id: objectiveId,
          resource_id: operatorId,
          status: 'active',
          round_start: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setActiveRound(data);
      setValidations({});
      setPatrolPath([]);
      setMetrics({ distanceMeters: 0, currentSpeedKmh: 0, avgSpeedKmh: 0, maxSpeedKmh: 0 });
      metricsRef.current = { distanceMeters: 0, currentSpeedKmh: 0, avgSpeedKmh: 0, maxSpeedKmh: 0 };
      lastPathPointRef.current = null;
      speedSamplesRef.current = [];

      await startTrackingForRound(data.id);

    } catch (e) {
      console.error('[Rondines] handleStartRound error:', e);
      alert('Error al iniciar la patrulla');
    } finally {
      setValidating(false);
    }
  };

  // ── Finish Round ────────────────────────────────────────────────────────────
  const handleFinishRound = async () => {
    if (!activeRound) return;
    setValidating(true);
    try {
      // Stop tracker first (flushes remaining buffer)
      if (trackerRef.current) {
        await trackerRef.current.stop();
        // Remove realtime channel
        if (trackerRef.current._realtimeChannel) {
          await supabase.removeChannel(trackerRef.current._realtimeChannel);
        }
        trackerRef.current = null;
      }

      // Mark round as completed with final metrics
      const finalMetrics = metricsRef.current;
      const { error } = await supabase
        .from('patrol_rounds')
        .update({
          status: 'completed',
          round_end: new Date().toISOString(),
          // Store summary metrics if columns exist (graceful — won't fail if they don't)
          ...(finalMetrics.distanceMeters > 0 ? {
            distance_meters: Math.round(finalMetrics.distanceMeters),
            avg_speed: Math.round(finalMetrics.avgSpeedKmh * 10) / 10,
            max_speed: Math.round(finalMetrics.maxSpeedKmh * 10) / 10,
            telemetry_summary: {
              total_points: patrolPath.length,
              distance_m: Math.round(finalMetrics.distanceMeters),
              avg_speed_kmh: Math.round(finalMetrics.avgSpeedKmh * 10) / 10,
              max_speed_kmh: Math.round(finalMetrics.maxSpeedKmh * 10) / 10,
              finalized_at: new Date().toISOString()
            }
          } : {})
        })
        .eq('id', activeRound.id);

      if (error) {
        // Fallback: update only status if extra columns don't exist yet
        await supabase.from('patrol_rounds')
          .update({ status: 'completed', round_end: new Date().toISOString() })
          .eq('id', activeRound.id);
      }

      setActiveRound(null);
      setValidations({});
      // Keep patrolPath on screen so the operator can review the route

    } catch (e) {
      console.error('[Rondines] handleFinishRound error:', e);
      alert('Error al finalizar la patrulla');
    } finally {
      setValidating(false);
    }
  };

  // ── Checkpoint validation ───────────────────────────────────────────────────
  const validateCheckpoint = useCallback(async (cp: any, coords: { lat: number; lng: number }) => {
    if (validations[cp.id]) return;
    setValidating(true);
    const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setValidations(prev => {
      const updated = { ...prev, [cp.id]: time };
      if (Object.keys(updated).length >= checkpoints.length) {
        setTimeout(() => handleFinishRound(), 1500);
      }
      return updated;
    });

    try {
      await api.patrols.validateCheckpoint({
        operator_id: operatorId,
        round_id: activeRound?.id,
        checkpoint_id: cp.id,
        latitude: coords.lat,
        longitude: coords.lng,
        shift_id: shiftData?.id
      });
    } catch (err) {
      console.error('[Rondines] checkpoint validation error:', err);
    } finally {
      setValidating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validations, checkpoints.length, operatorId, shiftData?.id, activeRound]);

  // ── Auto proximity checkpoint trigger ──────────────────────────────────────
  useEffect(() => {
    if (!activeRound || !location || checkpoints.length === 0) return;
    const cp = checkpoints.find((c: any) => !validations[c.id]);
    if (cp?.latitude && cp?.longitude) {
      const dist = haversineMeters(location.lat, location.lng, cp.latitude, cp.longitude);
      if (dist <= 25) validateCheckpoint(cp, location);
    }
  }, [location, activeRound, checkpoints, validations, validateCheckpoint]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const nextCp = checkpoints.find((c: any) => !validations[c.id]) || null;
  const distanceToNextCp = useMemo(() => {
    if (!location || !nextCp?.latitude || !nextCp?.longitude) return null;
    return haversineMeters(location.lat, location.lng, nextCp.latitude, nextCp.longitude);
  }, [location, nextCp]);

  const routePoints = useMemo(() =>
    patrolPath.map(p => [p.lat, p.lng] as [number, number]),
    [patrolPath]
  );

  // ── Access guard ────────────────────────────────────────────────────────────
  if (!isShiftActive || !objectiveId) {
    return (
      <div className={cn('min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-10', theme === 'dark' ? 'bg-black' : 'bg-[#f8f9fc]')}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 bg-blue-500/10 rounded-[3rem] flex items-center justify-center border border-blue-500/20 shadow-2xl relative"
        >
          <ShieldCheck className="w-16 h-16 text-blue-500" />
          <div className="absolute inset-0 bg-blue-500/5 rounded-[3rem] animate-pulse" />
        </motion.div>
        <div className="space-y-4">
          <h2 className={cn('text-3xl font-black uppercase tracking-tight italic', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
            Acceso<br />Denegado
          </h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto leading-relaxed">
            Iniciá tu <span className="text-blue-600 font-bold">turno de servicio</span> para acceder al sistema de rondines.
          </p>
        </div>
        <Link href="/operador/fichaje">
          <Button className="h-16 px-10 uppercase font-black text-xs tracking-[0.3em] rounded-2xl shadow-xl shadow-blue-500/20 bg-blue-600 hover:bg-blue-700">
            Ir a Fichaje
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-screen transition-colors duration-500 overflow-hidden', theme === 'dark' ? 'bg-black text-white' : 'bg-[#f8f9fc] text-gray-900')}>

      {/* ── MAP VIEW ── */}
      <div className="relative h-[45vh] bg-zinc-900 overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 z-0">
          <MobileLeaflet
            currentPosition={location ? [location.lat, location.lng] : (shiftData?.location ? [shiftData.location.lat, shiftData.location.lng] : [-31.6350, -60.7000])}
            routePoints={routePoints}
            patrolPath={patrolPath.map(p => [p.lat, p.lng])}
            avatarUrl={avatarUrl}
            destinations={checkpoints.filter((cp: any) => cp.latitude).map((cp: any) => ({
              id: cp.id, name: cp.name, position: [cp.latitude, cp.longitude] as [number, number]
            }))}
          />
        </div>

        {/* Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <Link href="/operador">
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl flex items-center justify-center border border-white text-gray-800"
            >
              <ArrowLeft size={20} />
            </motion.button>
          </Link>
        </div>

        {/* ── LIVE METRICS BAR (Uber-style) ── */}
        {activeRound && (
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-0 left-0 right-0 z-10"
          >
            <div className="mx-3 mb-3 bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                {/* Distance */}
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-[18px] font-black text-white font-mono leading-none">
                    {metrics.distanceMeters >= 1000
                      ? `${(metrics.distanceMeters / 1000).toFixed(2)}`
                      : Math.round(metrics.distanceMeters)}
                  </span>
                  <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">
                    {metrics.distanceMeters >= 1000 ? 'km' : 'm'}
                  </span>
                </div>

                <div className="w-px h-8 bg-white/10" />

                {/* Current Speed */}
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-[18px] font-black text-blue-400 font-mono leading-none">
                    {metrics.currentSpeedKmh.toFixed(1)}
                  </span>
                  <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">km/h</span>
                </div>

                <div className="w-px h-8 bg-white/10" />

                {/* Elapsed Time */}
                <div className="flex flex-col items-center min-w-[60px]">
                  <ElapsedTimer
                    startIso={activeRound.round_start}
                    className="text-[18px] font-black text-emerald-400 font-mono leading-none"
                  />
                  <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">duración</span>
                </div>

                <div className="w-px h-8 bg-white/10" />

                {/* Checkpoints */}
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-[18px] font-black text-[#0F4C5C] font-mono leading-none">
                    {Object.keys(validations).length}/{checkpoints.length}
                  </span>
                  <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">CPs</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Route Summary (when round ended, show final path) */}
        {!activeRound && patrolPath.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <div className="bg-emerald-900/80 backdrop-blur-xl rounded-2xl border border-emerald-500/20 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag size={16} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Ronda Finalizada</span>
              </div>
              <span className="text-[10px] font-black text-emerald-400">
                {patrolPath.length} puntos · {metrics.distanceMeters >= 1000
                  ? `${(metrics.distanceMeters / 1000).toFixed(2)} km`
                  : `${Math.round(metrics.distanceMeters)} m`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT SHEET ── */}
      <div className={cn(
        'flex-1 flex flex-col min-h-0 relative z-10 -mt-10 rounded-t-[3.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] border-t',
        theme === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100'
      )}>
        {/* Handle */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/10 rounded-full mx-auto mt-5 mb-2" />

        {/* Tabs */}
        <div className="px-8 mt-4 flex gap-2">
          <button
            onClick={() => setActiveTab('status')}
            className={cn(
              'flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
              activeTab === 'status'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : theme === 'dark' ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'
            )}
          >
            <MapIcon size={16} /> Estado
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={cn(
              'flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
              activeTab === 'timeline'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : theme === 'dark' ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'
            )}
          >
            <History size={16} /> Recorrido
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-36 pt-8">
          <div className="max-w-md mx-auto">
            <AnimatePresence mode="wait">

              {/* ─── STATUS TAB ─── */}
              {activeTab === 'status' && (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {/* Header */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('w-2 h-2 rounded-full', activeRound ? 'bg-blue-500 animate-pulse' : 'bg-gray-500')} />
                      <p className={cn('text-[9px] uppercase tracking-[0.25em] font-black py-1 px-2 rounded-md',
                        activeRound ? (theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600') : 'bg-gray-100 text-gray-400'
                      )}>
                        {activeRound ? 'Ronda Activa' : 'Sin Ronda Activa'}
                      </p>
                    </div>
                    <h1 className={cn('text-4xl font-black uppercase tracking-tight italic leading-none', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                      Puesto de <br /><span className="text-blue-600">Control</span>
                    </h1>
                  </div>

                  {/* Round stats (when active) */}
                  {activeRound && (
                    <div className={cn('grid grid-cols-2 gap-3')}>
                      {[
                        {
                          label: 'Distancia',
                          value: metrics.distanceMeters >= 1000
                            ? `${(metrics.distanceMeters / 1000).toFixed(2)} km`
                            : `${Math.round(metrics.distanceMeters)} m`,
                          icon: Navigation, color: 'text-blue-400', bg: 'bg-blue-500/10'
                        },
                        {
                          label: 'Vel. actual',
                          value: `${metrics.currentSpeedKmh.toFixed(1)} km/h`,
                          icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10'
                        },
                        {
                          label: 'Vel. máxima',
                          value: `${metrics.maxSpeedKmh.toFixed(1)} km/h`,
                          icon: Timer, color: 'text-emerald-400', bg: 'bg-emerald-500/10'
                        },
                        {
                          label: 'Puntos GPS',
                          value: String(patrolPath.length),
                          icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10'
                        }
                      ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className={cn('p-4 rounded-2xl border', theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100')}>
                          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-2', bg)}>
                            <Icon size={16} className={color} />
                          </div>
                          <p className="text-[18px] font-black font-mono text-white leading-none">{value}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Target card / Start button */}
                  {activeRound ? (
                    <div className={cn('p-8 rounded-[3rem] relative overflow-hidden', theme === 'dark' ? 'bg-zinc-900/40 border border-white/5' : 'bg-white border border-gray-100 shadow-lg')}>
                      {nextCp ? (
                        <>
                          <div className="flex items-center gap-6 mb-8">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-800 border border-white/10 flex items-center justify-center shadow-lg">
                              <MapPin className="text-[#0F4C5C]" size={32} />
                            </div>
                            <div>
                              <p className="text-[10px] text-[#0F4C5C] font-black uppercase tracking-[0.15em] mb-1">Próximo Punto</p>
                              <h3 className={cn('text-2xl font-black uppercase tracking-tighter', theme === 'dark' ? 'text-white' : 'text-gray-900')}>{nextCp.name}</h3>
                              {distanceToNextCp !== null && (
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">
                                  Distancia: <span className="text-[#0F4C5C]">{Math.round(distanceToNextCp)}m</span> (Objetivo: &lt;25m)
                                </p>
                              )}
                            </div>
                          </div>

                          <Button
                            className={cn(
                              'w-full h-20 text-[11px] font-black tracking-[0.35em] uppercase rounded-2xl border-none transition-all',
                              distanceToNextCp !== null && distanceToNextCp > 25
                                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95'
                            )}
                            onClick={() => {
                              if (!location) { alert('Obteniendo posición GPS...'); return; }
                              if (distanceToNextCp !== null && distanceToNextCp > 25) {
                                alert(`🔒 BLOQUEO DE DISTANCIA: Se encuentra a ${Math.round(distanceToNextCp)} metros. Debe acercarse a menos de 25m.`);
                                return;
                              }
                              validateCheckpoint(nextCp, location);
                            }}
                            disabled={validating || !location}
                          >
                            {validating
                              ? <RotateCw size={24} className="animate-spin" />
                              : <span className="flex items-center gap-3">
                                  <Target size={20} />
                                  {distanceToNextCp !== null && distanceToNextCp > 25 ? 'FUERA DE RANGO' : 'VALIDAR PRESENCIA'}
                                </span>
                            }
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-6">
                          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                          <h3 className="text-2xl font-black uppercase tracking-tighter text-emerald-500">Patrulla Completada</h3>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button
                        className={cn(
                          'w-full h-24 text-[13px] font-black tracking-[0.45em] uppercase rounded-[2.5rem] border-none transition-all active:scale-95',
                          loading ? 'bg-zinc-800 text-zinc-600' :
                          'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50'
                        )}
                        onClick={handleStartRound}
                        disabled={validating || loading}
                      >
                        {loading
                          ? <RotateCw size={28} className="animate-spin" />
                          : <span className="flex items-center gap-3"><Play size={32} className="fill-current" /> INICIAR RONDA</span>
                        }
                      </Button>

                      {/* Completed round summary */}
                      {patrolPath.length > 0 && !activeRound && (
                        <div className={cn('p-5 rounded-2xl border', theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200')}>
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2">Última Ronda Guardada</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-sm font-black text-emerald-500 font-mono">
                                {metrics.distanceMeters >= 1000
                                  ? `${(metrics.distanceMeters / 1000).toFixed(2)}km`
                                  : `${Math.round(metrics.distanceMeters)}m`}
                              </p>
                              <p className="text-[8px] text-gray-400 uppercase">Distancia</p>
                            </div>
                            <div>
                              <p className="text-sm font-black text-emerald-500 font-mono">{patrolPath.length}</p>
                              <p className="text-[8px] text-gray-400 uppercase">Puntos GPS</p>
                            </div>
                            <div>
                              <p className="text-sm font-black text-emerald-500 font-mono">{metrics.maxSpeedKmh.toFixed(1)}</p>
                              <p className="text-[8px] text-gray-400 uppercase">Vel. Máx km/h</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Checkpoint list */}
                  {checkpoints.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Puntos del Objetivo ({Object.keys(validations).length}/{checkpoints.length})
                      </h3>
                      {checkpoints.map((cp: any, i: number) => (
                        <div key={cp.id} className={cn(
                          'flex items-center gap-4 p-4 rounded-2xl border transition-all',
                          validations[cp.id]
                            ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'
                        )}>
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
                            validations[cp.id] ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'
                          )}>
                            {validations[cp.id] ? <CheckCircle2 size={16} /> : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs font-black uppercase tracking-tight truncate', theme === 'dark' ? 'text-zinc-100' : 'text-gray-900')}>{cp.name}</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                              {validations[cp.id] ? `✓ Validado ${validations[cp.id]}` : 'Pendiente'}
                            </p>
                          </div>
                          {cp.id === nextCp?.id && activeRound && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Finish button */}
                  {activeRound && (
                    <div className="pb-4">
                      <Button
                        onClick={handleFinishRound}
                        variant="ghost"
                        className="w-full h-16 text-red-500/60 text-[10px] font-black tracking-widest uppercase hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
                        disabled={validating}
                      >
                        {validating ? <RotateCw size={18} className="animate-spin" /> : 'Finalizar Patrulla'}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ─── TIMELINE TAB ─── */}
              {activeTab === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <div className="space-y-1">
                    <p className={cn('text-[9px] uppercase tracking-[0.25em] font-black py-1 px-2 rounded-md inline-block',
                      theme === 'dark' ? 'bg-zinc-800 text-gray-500' : 'bg-gray-100 text-gray-400'
                    )}>Trazabilidad GPS</p>
                    <h1 className={cn('text-4xl font-black uppercase tracking-tight italic leading-none', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                      Historial de <br /><span className="text-blue-600">Recorrido</span>
                    </h1>
                  </div>

                  {/* Stats summary */}
                  {patrolPath.length > 0 && (
                    <div className={cn('p-4 rounded-2xl border', theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100')}>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-sm font-black font-mono text-blue-400">
                            {metrics.distanceMeters >= 1000 ? `${(metrics.distanceMeters / 1000).toFixed(2)}` : Math.round(metrics.distanceMeters)}
                          </p>
                          <p className="text-[8px] text-gray-400 uppercase">{metrics.distanceMeters >= 1000 ? 'km' : 'm'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-black font-mono text-amber-400">{metrics.maxSpeedKmh.toFixed(1)}</p>
                          <p className="text-[8px] text-gray-400 uppercase">km/h máx</p>
                        </div>
                        <div>
                          <p className="text-sm font-black font-mono text-emerald-400">{metrics.avgSpeedKmh.toFixed(1)}</p>
                          <p className="text-[8px] text-gray-400 uppercase">km/h prom</p>
                        </div>
                        <div>
                          <p className="text-sm font-black font-mono text-purple-400">{patrolPath.length}</p>
                          <p className="text-[8px] text-gray-400 uppercase">puntos</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline list */}
                  <div className="relative space-y-5 pl-4">
                    <div className={cn('absolute left-7 top-4 bottom-4 w-px', theme === 'dark' ? 'bg-white/5' : 'bg-gray-200')} />

                    {patrolPath.slice().reverse().slice(0, 50).map((point, i) => {
                      const date = new Date(point.timestamp);
                      const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const speedKmh = point.speed ? (point.speed * 3.6).toFixed(1) : null;

                      return (
                        <motion.div
                          key={point.timestamp + i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="relative pl-10"
                        >
                          <div className={cn(
                            'absolute left-1.5 top-3 w-4 h-4 rounded-full border-4 shadow-sm z-10 transition-all',
                            i === 0 ? 'bg-blue-600 border-blue-200 scale-125' : 'bg-gray-300 border-white dark:bg-zinc-700 dark:border-black'
                          )} />

                          <div className={cn(
                            'p-4 rounded-2xl border transition-all',
                            i === 0
                              ? theme === 'dark' ? 'bg-blue-600/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                              : theme === 'dark' ? 'bg-white/3 border-white/5' : 'bg-white border-gray-100'
                          )}>
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-[11px] text-blue-500 font-black">{timeStr}</p>
                              {speedKmh && (
                                <span className={cn(
                                  'text-[9px] px-2 py-0.5 rounded-full font-black',
                                  parseFloat(speedKmh) > 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'
                                )}>
                                  {speedKmh} km/h
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] font-mono text-gray-500">
                              {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                            </p>
                            {point.accuracy && (
                              <p className="text-[8px] text-gray-400 mt-0.5">Precisión: ±{Math.round(point.accuracy)}m</p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {patrolPath.length > 50 && (
                      <p className="text-center text-[9px] text-gray-400 font-black uppercase tracking-widest">
                        + {patrolPath.length - 50} puntos más guardados en servidor
                      </p>
                    )}

                    {patrolPath.length === 0 && (
                      <div className="text-center py-20 opacity-30">
                        <History size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">Sin datos de recorrido</p>
                        <p className="text-xs text-gray-400 mt-2">Iniciá una ronda para comenzar el tracking</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Telemetry overlay */}
      <DebugTelemetry
        accuracy={telemetry.accuracy}
        distanceToTarget={telemetry.distanceToTarget}
        syncStatus={telemetry.syncStatus}
        lastPointTimestamp={telemetry.lastPointTimestamp}
        isVisible={!!activeRound}
      />
    </div>
  );
}
