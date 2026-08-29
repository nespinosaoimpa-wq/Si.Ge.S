'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, LogIn, LogOut, Navigation, 
  ShieldCheck, AlertCircle, ArrowLeft, X, CheckSquare, Package, Camera, Smartphone, Zap, Shield, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import GPSConsentModal from '@/components/legal/GPSConsentModal';
import { DocumentScanner } from '@/components/operador/DocumentScanner';

const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });
import DynamicIsland from '@/components/operador/DynamicIsland';
import { TacticalSheet } from '@/components/ui/TacticalSheet';

export default function FichajePage() {
  const { user, loading: authLoading } = useAuth();
  const { isShiftActive, shiftId, shiftData, startShift, endShift, theme, updateShiftData, setHighFrequencyMode } = useShift();
  const isShiftActiveRef = React.useRef(isShiftActive);
  const isCheckingInRef = React.useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isShiftActiveRef.current = isShiftActive;
  }, [isShiftActive]);

  const [tracker, setTracker] = useState<any>(null);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number, accuracy?: number, speed?: number} | null>(null);
  const [hasConsent, setHasConsent] = useState(true);
  const [showInventoryCheck, setShowInventoryCheck] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryStatus, setInventoryStatus] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [assignedObjective, setAssignedObjective] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingObjective, setLoadingObjective] = useState(true);
  const [gpsProgress, setGpsProgress] = useState<{accuracy: number | null, count: number}>({ accuracy: null, count: 0 });
  const [gpsFixProgress, setGpsFixProgress] = useState<{sample: number, total: number, accuracy: number} | null>(null);
  const [gpsFallbackWarning, setGpsFallbackWarning] = useState(false);
  const [canSkipGps, setCanSkipGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geofenceError, setGeofenceError] = useState<{message: string, targetRadius: number} | null>(null);
  
  // Handoff state
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [objectiveItems, setObjectiveItems] = useState<any[]>([]);
  const [itemConditions, setItemConditions] = useState<Record<string, string>>({});
  
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState({
    accuracy: null as number | null,
    distanceToTarget: null as number | null,
    syncStatus: 'online' as 'online' | 'offline' | 'pending',
    lastPointTimestamp: null as number | null
  });
  const locatingRef = React.useRef(locating);
  useEffect(() => { locatingRef.current = locating; }, [locating]);

  // ─── PANIC BUTTON LOGIC ───
  const [panicProgress, setPanicProgress] = useState(0);
  const panicTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const panicIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const handlePanicStart = () => {
    setPanicProgress(0);
    if (navigator.vibrate) navigator.vibrate(50);
    panicIntervalRef.current = setInterval(() => {
      setPanicProgress(prev => Math.min(prev + (100 / (3000 / 30)), 100));
    }, 30);

    panicTimerRef.current = setTimeout(async () => {
      clearInterval(panicIntervalRef.current!);
      setPanicProgress(100);
      // Discreet micro-vibration of 100ms
      if (navigator.vibrate) navigator.vibrate(100);
      
      try {
        // Coordenadas: si el GPS es 0, usar las del objetivo asignado
        // Garantiza que la alarma SIEMPRE aparezca en el mapa del gerente
        const objLat = assignedObjective?.latitude ? Number(assignedObjective.latitude) : 0;
        const objLng = assignedObjective?.longitude ? Number(assignedObjective.longitude) : 0;
        const lat = (location?.lat && location.lat !== 0) ? location.lat : objLat;
        const lng = (location?.lng && location.lng !== 0) ? location.lng : objLng;
        const resolvedTenantId = (user as any)?.tenant_id || 
                                 (user as any)?.user_metadata?.tenant_id || 
                                 assignedObjective?.tenant_id || 
                                 null;
        const resolvedOperatorName = (user as any)?.user_metadata?.name || 
                                     user?.email || 
                                     'Operador';
        const targetObjectiveId = assignedObjective?.id || null;

        // 1. Call /api/guard-book to save in guard_book_entries + alarms + incidents automatically
        if (targetObjectiveId) {
          try {
            await fetch('/api/guard-book', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                objective_id: targetObjectiveId,
                resource_id: OPERATOR_ID,
                entry_type: 'emergencia',
                urgency: 'critica',
                content: '🚨 BOTÓN DE PÁNICO S.O.S ACTIVADO EN FICHAJE',
                latitude: lat,
                longitude: lng,
                tenant_id: resolvedTenantId
              })
            });
          } catch (e) {
            console.error('[PANIC_GUARD_BOOK_ERROR]', e);
          }
        }

        // 2. Insert directly into alarms table as immediate realtime backup with full fields
        await supabase.from('alarms').insert({
          operator_id: OPERATOR_ID,
          triggered_by: OPERATOR_ID,
          operator_name: resolvedOperatorName,
          objective_id: targetObjectiveId,
          objective_name: assignedObjective?.name || 'Objetivo de Guardia',
          tenant_id: resolvedTenantId,
          alarm_type: 'sos_panic',
          severity: 'critica',
          message: '🚨 BOTÓN DE PÁNICO S.O.S ACTIVADO EN FICHAJE',
          latitude: lat,
          longitude: lng,
          status: 'active',
          created_at: new Date().toISOString()
        } as any);

        // 3. Insert directly into incidents table for map display
        if (targetObjectiveId) {
          await supabase.from('incidents').insert({
            objective_id: targetObjectiveId,
            operator_id: OPERATOR_ID,
            operator_name: resolvedOperatorName,
            tenant_id: resolvedTenantId,
            entry_type: 'panic',
            urgency: 'critica',
            content: '🚨 BOTÓN DE PÁNICO S.O.S ACTIVADO EN FICHAJE',
            latitude: lat,
            longitude: lng,
            status: 'abierto',
            created_at: new Date().toISOString()
          } as any);
        }

        // 4. Dispatch server push notification
        fetch('/api/notifications/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            notification: {
              title: '🚨 ¡ALERTA DE PÁNICO S.O.S!',
              body: `${resolvedOperatorName} disparó la alerta de emergencia en fichaje.`,
              url: '/gerente/mapa',
              requireInteraction: true
            }
          })
        });
      } catch (e) {
        console.error("Error triggering panic:", e);
      }
      
      setTimeout(() => setPanicProgress(0), 3000); // Reset UI after 3s
    }, 3000);
  };

  const handlePanicEnd = () => {
    if (panicTimerRef.current) clearTimeout(panicTimerRef.current);
    if (panicIntervalRef.current) clearInterval(panicIntervalRef.current);
    if (panicProgress < 100) setPanicProgress(0);
  };

  // ─── AUTH & IDENTITY ───
  const OPERATOR_ID = user?.id || 'recurso_demo';

  // REUSABLE CHECKIN LOGIC
  const performCheckin = async (coords: {lat: number, lng: number, accuracy: number}) => {
    if (isCheckingInRef.current || isSubmitting) return;
    
    isCheckingInRef.current = true;
    setIsSubmitting(true);
    const now = new Date();
    let serverShiftId: string | undefined = undefined;
    
    try {
      setGeofenceError(null);
      const res = await fetch('/api/shifts/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: OPERATOR_ID,
          email: user?.email,
          objective_id: assignedObjective?.id,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: coords.accuracy
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403 && errorData.error === 'FUERA DE RANGO') {
          setGeofenceError({
            message: errorData.message,
            targetRadius: errorData.targetRadius
          });
          setLocating(false);
          return;
        }
        throw new Error(errorData.error || 'Error en el servidor');
      }
      
      const data = await res.json();
      if (data.shift?.id) serverShiftId = data.shift.id;
      if (data.warning) alert("⚠️ " + data.warning);
      
      startShift({ 
        time: now, 
        location: coords, 
        operator_id: data.resource_id || OPERATOR_ID, 
        objective_id: assignedObjective?.id,
        objectiveLocation: data.objectiveLocation,
        geofenceRadius: data.geofenceRadius,
        avatar_url: avatarUrl // Include avatar
      }, serverShiftId);
      
      setLocating(false);
      setCanSkipGps(false);
    } catch (e: any) {
      console.error("Checkin error:", e);
      alert(e.message || "No se pudo iniciar servicio. Intentá de nuevo.");
      isCheckingInRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    try {
      const consent = localStorage.getItem('SIGPAD_gps_consent');
      if (!consent) setHasConsent(false);
    } catch (e) {
      setHasConsent(false);
    }
    
    const fetchObjective = async () => {
      setLoadingObjective(true);
      try {
        if (OPERATOR_ID !== 'recurso_demo' || user?.email) {
          const params = new URLSearchParams();
          if (OPERATOR_ID !== 'recurso_demo') params.append('id', OPERATOR_ID);
          if (user?.email) params.append('email', user.email || '');

          const response = await fetch(`/api/resources/profile?${params.toString()}`);
          const res = await response.json();
          
          if (res && !res.error) {
            if (res.avatar_url) setAvatarUrl(res.avatar_url);
            
            const obj = Array.isArray(res.objectives) ? res.objectives[0] : res.objectives;
            
            if (obj) {
              // 📍 Coordinate Validation & Guard
              if (!obj.latitude || !obj.longitude) {
                alert(`⚠️ ERROR DE ASIGNACIÓN: El objetivo "${obj.name}" no tiene coordenadas configuradas. Contacte a soporte.`);
              }
              setAssignedObjective(obj);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      } finally {
        setLoadingObjective(false);
      }
    };
    fetchObjective();

    // Start watching position immediately to show the marker correctly on the map
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          // Gate: ignore readings coarser than 50m for initial map display
          // (was 150m — too permissive, caused marker to jump to cell towers)
          if (pos.coords.accuracy > 50 && location) return;
          
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed || 0
          });
        },
        (err) => console.warn('[Fichaje] GPS Initial Watch Error:', err.message),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);

  useEffect(() => {
    const checkActiveShift = async () => {
      if (!user || isShiftActive) return;
      
      try {
        const { data: resource } = await supabase
          .from('resources')
          .select('id')
          .eq('assigned_to', user.id)
          .maybeSingle();
          
        let query = supabase
          .from('guard_shifts')
          .select('*')
          .in('status', ['activo', 'active']);
          
        if (resource?.id) {
          const isResourceUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id);
          let orClause = `operator_id.eq.${user.id}`;
          if (isResourceUUID) {
            orClause += `,operator_id.eq.${resource.id}`;
          } else {
            orClause += `,operator_id.eq."${resource.id}"`;
          }
          query = query.or(orClause);
        } else {
          query = query.eq('operator_id', user.id);
        }
        
        const { data: activeShift, error } = await query.maybeSingle();
          
        if (activeShift && !error) {
          startShift({
            time: new Date(activeShift.checkin_time),
            location: { lat: activeShift.checkin_latitude, lng: activeShift.checkin_longitude },
            operator_id: activeShift.operator_id,
            objective_id: activeShift.objective_id
          }, activeShift.id);
        }
      } catch (e) {
        console.error("Error checking active shift:", e);
      }
    };
    
    checkActiveShift();
  }, [user, isShiftActive]);

  // Passive location sync for UI
  useEffect(() => {
    if (isShiftActive && shiftData?.location) {
      setLocation(shiftData.location);
    }
  }, [isShiftActive, shiftData?.location]);

  const handleClockClick = async () => {
    if (locating) return;
    if (isShiftActive && assignedObjective?.id) {
      fetchObjectiveItems();
      setShowHandoffModal(true);
    } else {
      if (assignedObjective?.id) {
        // Fetch inventory before checking in
        setLocating(true);
        try {
          const { data } = await supabase.from('resource_inventory').select('*').eq('objective_id', assignedObjective.id);
          if (data && data.length > 0) {
            setInventoryItems(data);
            const initial: any = {};
            data.forEach(d => initial[d.id] = 'Operativo');
            setInventoryStatus(initial);
            setShowInventoryCheck(true);
            setLocating(false);
          } else {
            handleClock();
          }
        } catch (e) {
          handleClock();
        }
      } else {
        handleClock();
      }
    }
  };

  const confirmInventoryCheck = async () => {
    setShowInventoryCheck(false);
    // Report damages/missing as incidents
    const tenantId = (user as any)?.user_metadata?.tenant_id || null;
    const operatorName = (user as any)?.user_metadata?.name || user?.email || 'Operador';
    const objLat = assignedObjective?.latitude ? Number(assignedObjective.latitude) : 0;
    const objLng = assignedObjective?.longitude ? Number(assignedObjective.longitude) : 0;
    const lat = (location?.lat && location.lat !== 0) ? location.lat : objLat;
    const lng = (location?.lng && location.lng !== 0) ? location.lng : objLng;
    for (const item of inventoryItems) {
      if (inventoryStatus[item.id] !== 'Operativo') {
        await supabase.from('incidents').insert({
          objective_id: assignedObjective?.id,
          operator_id: OPERATOR_ID,
          operator_name: operatorName,
          tenant_id: tenantId,
          entry_type: 'novedad',
          urgency: 'alta',
          content: `📦 INVENTARIO: ${item.item_name} reportado como ${inventoryStatus[item.id].toUpperCase()}`,
          latitude: lat,
          longitude: lng,
          status: 'abierto'
        } as any);
      }
    }
    handleClock();
  };

  const handleClock = async () => {
    setLocating(true);

    if (isShiftActive) {
      if (tracker) {
        tracker.stop();
        setTracker(null);
      }
      try {
        const res = await fetch('/api/shifts/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shift_id: shiftId,
            operator_id: OPERATOR_ID,
            email: user?.email,
            latitude: location?.lat || 0,
            longitude: location?.lng || 0
          })
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn('[CHECKOUT] Response warning:', errData);
        }
      } catch (e: any) {
        console.error("[CHECKOUT] Network exception:", e);
      } finally {
        // ALWAYS end shift locally so the active shift timer 100% stops running
        endShift();
        setLocating(false);
        setGpsProgress({ accuracy: null, count: 0 });
        setCanSkipGps(false);
      }
      return;
    }

    setGpsProgress({ accuracy: null, count: 0 });
    setGpsFixProgress(null);
    setGpsFallbackWarning(false);
    setCanSkipGps(false);

    const skipTimer = setTimeout(() => {
       if (locatingRef.current) setCanSkipGps(true);
    }, 4000); 

    const gpsTimeout = setTimeout(() => {
      if (locatingRef.current && !isShiftActiveRef.current) {
        setLocating(false);
        isCheckingInRef.current = false;
      }
    }, 45000); 

    try {
      const { GPSTracker } = await import('@/lib/gps-tracker');
      const newTracker = new GPSTracker(
        shiftId || 'pending_validation',
        OPERATOR_ID,
        async (pos) => {
          const coords = { 
            lat: pos.latitude, 
            lng: pos.longitude,
            accuracy: pos.accuracy,
            speed: pos.speed
          };
          setGpsProgress(prev => ({ 
            accuracy: coords.accuracy, 
            count: prev.count + 1 
          }));

          if (isShiftActiveRef.current) {
            if (!isShiftActiveRef.current) return;
            setLocation(coords);
            setLocating(false); 
            clearTimeout(gpsTimeout);
            
            // Update Telemetry
            setTelemetry({
              accuracy: pos.accuracy,
              distanceToTarget: pos.distanceToObjective,
              syncStatus: navigator.onLine ? 'online' : 'offline',
              lastPointTimestamp: Date.now()
            });
          }
        },
        (err) => {
          setLocating(false);
          isCheckingInRef.current = false;
          alert("🔒 ACCESO A GPS BLOQUEADO");
        },
        assignedObjective ? {
          location: { lat: assignedObjective.latitude, lng: assignedObjective.longitude },
          radius: assignedObjective.geofence_radius_meters || 100,
          id: assignedObjective.id
        } : undefined
      );

      newTracker.start();
      setTracker(newTracker);

      // ── HIGH-PRECISION CHECKIN ─────────────────────────────────────
      // For checkin, we collect 5 GPS samples ≤20m and average them,
      // discarding the worst outlier. This prevents a single noisy tower
      // reading from placing the operator at the wrong coordinates.
      // Zero Vercel invocations — all math runs in the browser.
      if (!isShiftActiveRef.current) {
        try {
          const fix = await newTracker.getHighPrecisionFix(
            (sample, total, accuracy) => {
              setGpsFixProgress({ sample, total, accuracy: Math.round(accuracy) });
            }
          );

          setGpsFixProgress(null);
          clearTimeout(skipTimer);
          clearTimeout(gpsTimeout);

          if (fix.isFallback) {
            setGpsFallbackWarning(true);
          }

          if (!isCheckingInRef.current) {
            performCheckin({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
          }
        } catch (e) {
          // If getHighPrecisionFix fails (e.g. permission denied), fall back gracefully
          console.warn('[Fichaje] getHighPrecisionFix failed, falling back to single-sample:', e);
          setGpsFixProgress(null);
        }
      }
    } catch (e: any) {
      console.error("[Fichaje] Failed to initialize GPS Tracker:", e);
      alert("⚠️ Error de conexión al iniciar GPS. Por favor, refrescá el navegador e intentá de nuevo.");
      setLocating(false);
      isCheckingInRef.current = false;
      clearTimeout(gpsTimeout);
      clearTimeout(skipTimer);
    }
  };

  const fetchObjectiveItems = async () => {
    if (!assignedObjective?.id) return;
    try {
      const { data } = await supabase
        .from('resource_inventory')
        .select('*')
        .eq('objective_id', assignedObjective.id)
        .neq('status', 'baja');
      setObjectiveItems(data || []);
      const initial: Record<string, string> = {};
      data?.forEach(item => initial[item.id] = 'operativo');
      setItemConditions(initial);
    } catch (e) {
      console.error(e);
    }
  };

  const submitHandoffAndCheckout = async () => {
    try {
      setIsSubmitting(true);
      if (objectiveItems.length > 0) {
        const items = objectiveItems.map(item => ({
          item_id: item.id,
          name: item.item_name,
          condition: itemConditions[item.id] || 'operativo',
        }));
        await fetch('/api/inventory/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objective_id: assignedObjective.id,
            resource_id: OPERATOR_ID,
            shift_id: shiftId,
            items
          })
        });
      }
      setShowHandoffModal(false);
      await handleClock();
    } catch (e: any) {
      alert("Error al enviar el reporte.");
      setIsSubmitting(false);
    }
  };

  const handleToggleRound = async () => {
    setIsSubmitting(true);
    try {
      if (!shiftData?.activeRoundId) {
        // Start Round
        const { data, error } = await supabase.from('patrol_rounds').insert({
          resource_id: OPERATOR_ID,
          objective_id: assignedObjective?.id
        }).select().single();
        
        if (!error && data) {
          updateShiftData({ activeRoundId: data.id });
          setHighFrequencyMode(true, data.id);
        } else {
          alert('Error al iniciar ronda: ' + (error?.message || 'Error desconocido'));
        }
      } else {
        // End Round
        await supabase.from('patrol_rounds').update({ end_at: new Date().toISOString() }).eq('id', shiftData.activeRoundId);
        updateShiftData({ activeRoundId: null });
        setHighFrequencyMode(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetLat = assignedObjective ? Number(assignedObjective.latitude) : NaN;
  const targetLng = assignedObjective ? Number(assignedObjective.longitude) : NaN;

  const destinations = (assignedObjective && !isNaN(targetLat) && !isNaN(targetLng) && targetLat !== 0 && targetLng !== 0) 
    ? [{
        id: assignedObjective.id,
        name: assignedObjective.name,
        position: [targetLat, targetLng] as [number, number],
        radius: Number(assignedObjective.geofence_radius_meters || assignedObjective.geofence_radius || 150)
      }] 
    : [];

  let currentDistance = telemetry.distanceToTarget;
  let geofenceRadius = Number(assignedObjective?.geofence_radius_meters || assignedObjective?.geofence_radius || 150);
  
  if (currentDistance === null && location && !isNaN(targetLat) && !isNaN(targetLng) && targetLat !== 0) {
    const R = 6371e3; 
    const p1 = location.lat * Math.PI/180;
    const p2 = targetLat * Math.PI/180;
    const dp = (targetLat-location.lat) * Math.PI/180;
    const dl = (targetLng-location.lng) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    currentDistance = R * c;
  }

  const isOutOfRange = !isShiftActive && currentDistance !== null && currentDistance > geofenceRadius;

  let displayLocation = location ? [location.lat, location.lng] : undefined;
  let displayAccuracy = location?.accuracy;
  const currentAvatar = isShiftActive ? ((shiftData as any)?.avatar_url || avatarUrl) : avatarUrl;

  if (globalError) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6", theme === 'dark' ? "bg-black text-white" : "bg-[#f8f9fc] text-gray-900")}>
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-2xl">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tight">Error de Sistema</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto leading-relaxed">{globalError}</p>
        </div>
        <Button onClick={() => window.location.reload()} className="h-14 px-8 uppercase font-black text-[10px] tracking-widest rounded-xl bg-blue-600 hover:bg-blue-700">
          Reiniciar Aplicación
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col transition-colors duration-500 bg-zinc-50 font-sans">
      {!hasConsent && <GPSConsentModal onAccept={() => setHasConsent(true)} />}

      {/* HEADER: Back button only */}
      <div className="absolute top-0 left-0 right-0 z-[56] p-6 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <Link href="/operador" className="pointer-events-auto">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center bg-white border border-zinc-200 text-zinc-900 transition-all"
            >
               <ArrowLeft size={22} />
            </motion.button>
          </Link>
        </div>
      </div>

      {/* DYNAMIC ISLAND: Premium Telemetry HUD */}
      <DynamicIsland
        accuracy={telemetry.accuracy ?? location?.accuracy ?? null}
        distanceToTarget={telemetry.distanceToTarget}
        syncStatus={telemetry.syncStatus}
        lastPointTimestamp={telemetry.lastPointTimestamp}
        isVisible={isShiftActive}
        theme={theme as 'light' | 'dark'}
      />

      {/* MAP: Full Screen */}
      <div className="flex-1 relative z-0">
          <MobileLeaflet 
            currentPosition={displayLocation as [number, number] | undefined}
            currentAccuracy={displayAccuracy}
            destinations={destinations}
            avatarUrl={currentAvatar}
            showFloatingOverlay={false}
          />
      </div>

      {/* TACTICAL BOTTOM SHEET: 3-State Interactive Panel */}
      <TacticalSheet
        snapPoints={[0.14, 0.48, 0.85]}
        initialSnap={isShiftActive ? 1 : 0}
        theme="light"
        onSnapChange={(i) => {
          // Auto-expand when shift is active and sheet is collapsed
          if (i === 0 && isShiftActive) {
            // Allow collapse but show minimal info
          }
        }}
      >
        {({ currentSnap, snapTo }: { currentSnap: number; snapTo: (i: number) => void }) => (
          <div className="max-w-md mx-auto px-2">

            {/* ─── COLLAPSED PEEK: Always visible ─── */}
            <div
              className="flex items-center justify-between py-3 cursor-pointer"
              onClick={() => snapTo(currentSnap === 0 ? 1 : 0)}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl shadow-inner flex items-center justify-center transition-all shrink-0 bg-zinc-100">
                  <MapPin size={24} className={cn(assignedObjective ? 'text-[#0F4C5C]' : 'text-zinc-300')} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-[#0F4C5C]/60 uppercase tracking-[0.3em]">Puesto de Control</p>
                  <h3 className="text-lg font-black tracking-tight leading-tight truncate text-zinc-900">
                    {loadingObjective ? 'Localizando...' : (assignedObjective?.name || 'Sin Objetivo')}
                  </h3>
                </div>
              </div>
              <div className={cn(
                'px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0',
                isShiftActive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-zinc-100 text-zinc-400'
              )}>
                {isShiftActive ? 'En Servicio' : 'Inactivo'}
              </div>
            </div>

            {/* ─── HALF EXPANDED: Objective details + Action Button ─── */}
            <AnimatePresence>
              {currentSnap >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 pt-4"
                >
                  {/* Address chip */}
                  {assignedObjective?.address && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                      <Navigation size={14} className="text-[#0F4C5C] shrink-0" />
                      <span className="text-xs font-bold truncate text-zinc-500">
                        {assignedObjective.address}
                      </span>
                    </div>
                  )}

                  {/* ACTION BUTTON */}
                  <motion.button
                    whileHover={{ scale: isOutOfRange ? 1 : 1.01 }}
                    whileTap={{ scale: isOutOfRange ? 1 : 0.97 }}
                    onClick={handleClockClick}
                    disabled={locating || isSubmitting || isOutOfRange}
                    className={cn(
                      'w-full h-[72px] rounded-[2rem] flex items-center justify-center gap-4 text-[12px] font-black uppercase tracking-[0.35em] shadow-xl transition-all border-none',
                      isShiftActive
                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20'
                        : isOutOfRange ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    )}
                  >
                  {locating ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                          <span>
                            {gpsFixProgress
                              ? `Precisando GPS... (${gpsFixProgress.sample}/${gpsFixProgress.total})`
                              : 'Sincronizando'}
                          </span>
                        </div>
                        {gpsFixProgress && (
                          <div className="flex items-center gap-2 text-[10px] text-white/70">
                            <span>±{gpsFixProgress.accuracy}m</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: gpsFixProgress.total }).map((_, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    'w-4 h-1.5 rounded-full transition-all',
                                    i < gpsFixProgress.sample ? 'bg-emerald-400' : 'bg-white/20'
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isShiftActive ? (
                      <><LogOut size={22} /> Finalizar Turno</>
                    ) : (
                      <><LogIn size={22} /> Iniciar Turno</>
                    )}
                  </motion.button>
                  
                  {gpsFallbackWarning && (
                    <p className="text-center text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">
                      ⚠️ GPS con precisión reducida — fichaje registrado igualmente
                    </p>
                  )}
                  
                  {isOutOfRange && (
                    <p className="text-center text-[10px] font-black text-amber-500 uppercase tracking-widest mt-2">
                      Fuera de rango: Acérquese al puesto para iniciar
                    </p>
                  )}

                  {/* Security badge */}
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2.5 py-2 px-4 rounded-full bg-zinc-100">
                      <ShieldCheck size={13} className="text-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">SIGPAD OS Tactical</span>
                    </div>
                  </div>

                  {/* PANIC BUTTON */}
                  {isShiftActive && (
                    <motion.div 
                      onPointerDown={handlePanicStart}
                      onPointerUp={handlePanicEnd}
                      onPointerLeave={handlePanicEnd}
                      className="relative w-full h-14 rounded-[2rem] overflow-hidden flex items-center justify-center cursor-pointer select-none border border-red-200 bg-red-50"
                    >
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-red-600 transition-all duration-75"
                        style={{ width: `${panicProgress}%` }}
                      />
                      <div className={cn(
                        "relative z-10 flex items-center gap-3 font-black uppercase tracking-widest text-[11px]",
                        panicProgress > 0 ? "text-white" : "text-red-600"
                      )}>
                        <AlertTriangle size={16} className={panicProgress > 0 ? "animate-pulse" : ""} />
                        {panicProgress > 0 ? "Mantenga presionado..." : "S.O.S (Mantener 3s)"}
                      </div>
                    </motion.div>
                  )}

                  {/* EVIDENCE BUTTON */}
                  {isShiftActive && (
                    <button 
                      onClick={() => setShowScanner(true)}
                      className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-all"
                    >
                      <Camera size={16} className="text-[#0F4C5C]" />
                      Capturar Evidencia
                    </button>
                  )}

                  {/* ROUND BUTTON */}
                  {isShiftActive && (
                    <button 
                      onClick={handleToggleRound}
                      disabled={isSubmitting}
                      className={cn(
                        "w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] transition-all shadow-lg",
                        shiftData?.activeRoundId 
                          ? "bg-[#0F4C5C] text-black hover:bg-[#b08d29]" 
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                      )}
                    >
                      <MapPin size={16} className={shiftData?.activeRoundId ? "text-black" : "text-[#0F4C5C]"} />
                      {shiftData?.activeRoundId ? "Finalizar Ronda" : "Iniciar Ronda"}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── FULLY EXPANDED: Live metrics ─── */}
            <AnimatePresence>
              {currentSnap >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="pt-6 space-y-4"
                >
                  <p className={cn(
                    'text-[9px] font-black uppercase tracking-[0.35em] px-1',
                    theme === 'dark' ? 'text-white/15' : 'text-gray-300'
                  )}>Métricas de Servicio</p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* GPS Accuracy */}
                    <div className={cn(
                      'p-4 rounded-2xl border',
                      theme === 'dark' ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-100'
                    )}>
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-1', theme === 'dark' ? 'text-white/25' : 'text-gray-400')}>Precisión GPS</p>
                      <p className={cn(
                        'text-2xl font-black tabular-nums',
                        (location?.accuracy ?? 999) <= 15 ? 'text-emerald-400' : (location?.accuracy ?? 999) <= 50 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {location?.accuracy ? `${Math.round(location.accuracy)}m` : '---'}
                      </p>
                    </div>

                    {/* Speed */}
                    <div className={cn(
                      'p-4 rounded-2xl border',
                      theme === 'dark' ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-100'
                    )}>
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-1', theme === 'dark' ? 'text-white/25' : 'text-gray-400')}>Velocidad</p>
                      <p className={cn('text-2xl font-black tabular-nums', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')}>
                        {location?.speed ? `${(location.speed * 3.6).toFixed(1)}` : '0.0'}
                        <span className={cn('text-xs ml-1', theme === 'dark' ? 'text-white/20' : 'text-gray-300')}>km/h</span>
                      </p>
                    </div>

                    {/* Distance */}
                    <div className={cn(
                      'p-4 rounded-2xl border',
                      theme === 'dark' ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-100'
                    )}>
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-1', theme === 'dark' ? 'text-white/25' : 'text-gray-400')}>Dist. Objetivo</p>
                      <p className={cn('text-2xl font-black tabular-nums', theme === 'dark' ? 'text-purple-400' : 'text-purple-600')}>
                        {telemetry.distanceToTarget ? `${Math.round(telemetry.distanceToTarget)}m` : '---'}
                      </p>
                    </div>

                    {/* Sync */}
                    <div className={cn(
                      'p-4 rounded-2xl border',
                      theme === 'dark' ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-100'
                    )}>
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-1', theme === 'dark' ? 'text-white/25' : 'text-gray-400')}>Data Sync</p>
                      <div className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mt-1',
                        telemetry.syncStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400' :
                        telemetry.syncStatus === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      )}>
                        {telemetry.syncStatus}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}
      </TacticalSheet>

      {/* STATUS OVERLAY: Extreme Glassmorphism */}
      <AnimatePresence>
        {locating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="tactical-glass p-12 rounded-[4rem] max-w-sm w-full">
                <div className="relative mb-12 mx-auto w-28 h-28">
                  <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-t-4 border-blue-500 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="relative">
                        <Navigation className="w-10 h-10 text-blue-500" />
                        <div className="absolute -inset-2 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                     </div>
                  </div>
                </div>
                
                <h2 className="text-2xl text-premium text-white mb-3">Certificando GPS</h2>
                <p className="text-white/50 text-[12px] font-bold uppercase tracking-wider leading-relaxed mb-10 px-4">
                  Validando coordenadas tácticas de alta precisión.
                </p>

                {gpsProgress.accuracy && (
                  <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-10">
                     <div className="status-dot bg-blue-500" />
                     <span className="text-[11px] text-premium text-blue-400">Precisión: {Math.round(gpsProgress.accuracy)}m</span>
                  </div>
                )}

                {canSkipGps && (
                  <Button 
                    variant="outline" 
                    className="w-full h-16 border-white/10 bg-white/5 text-white text-premium text-[11px] tracking-widest rounded-2xl hover:bg-white/10"
                    onClick={() => performCheckin(assignedObjective ? {lat: assignedObjective.latitude, lng: assignedObjective.longitude, accuracy: 10} : (location as any || {lat:0,lng:0,accuracy:100}))}
                  >
                    Omitir y Conectar
                  </Button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GEOFENCE BLOCK OVERLAY */}
      {geofenceError && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="bg-zinc-900 border border-red-500/20 p-10 rounded-[3.5rem] max-w-sm w-full shadow-2xl shadow-red-500/10">
              <div className="w-24 h-24 bg-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                <AlertTriangle size={48} className="text-red-500 animate-pulse" />
              </div>
              
              <h2 className="text-3xl text-premium text-white mb-4 italic uppercase">Fuera de Rango</h2>
              <p className="text-gray-400 text-[13px] leading-relaxed mb-10">
                {geofenceError.message}
              </p>

              <div className="space-y-4">
                <Button 
                  className="w-full h-18 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] hover:bg-gray-200"
                  onClick={() => {
                    setGeofenceError(null);
                    handleClock();
                  }}
                >
                  Reintentar (GPS Alta Precisión)
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full h-18 rounded-2xl border-white/10 text-gray-500 font-black uppercase tracking-widest text-[11px] hover:bg-white/5"
                  onClick={() => setGeofenceError(null)}
                >
                  Volver al Mapa
                </Button>
              </div>
              
              <p className="mt-8 text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
                Seguridad Certificada SIGPAD
              </p>
          </div>
        </motion.div>
      )}

      {/* HANDOFF MODAL: GeoZilla Style Dark Sheet */}
      <AnimatePresence>
        {showHandoffModal && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end"
          >
            <div className={cn(
              "w-full max-h-[85vh] rounded-t-[4rem] shadow-tactical p-10 pb-16 overflow-y-auto",
              theme === 'dark' ? "bg-[#0a0a0a]" : "bg-white"
            )}>
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className={cn("text-3xl text-premium tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>Reporte Final</h2>
                  <p className="text-[10px] text-blue-600 font-black uppercase mt-2 tracking-[0.2em] opacity-60">Control de Inventario Operativo</p>
                </div>
                <button onClick={() => setShowHandoffModal(false)} className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", theme === 'dark' ? "bg-white/5 text-white" : "bg-gray-100 text-gray-400")}>
                  <X size={28} />
                </button>
              </div>

              <div className="space-y-6 mb-12">
                {objectiveItems.length === 0 ? (
                  <div className="p-16 text-center bg-gray-50 dark:bg-white/5 rounded-[3rem] border border-dashed border-gray-200 dark:border-white/5">
                     <CheckSquare size={48} className="text-blue-500 mx-auto mb-6 opacity-30" />
                     <p className="text-xs text-premium text-gray-500 tracking-widest">Sin elementos asignados</p>
                  </div>
                ) : objectiveItems.map((item) => (
                  <div key={item.id} className={cn("p-8 rounded-[2.5rem] border transition-all", theme === 'dark' ? "bg-zinc-900/40 border-white/5" : "bg-gray-50 border-gray-100")}>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className={cn("text-lg text-premium", theme === 'dark' ? "text-white" : "text-gray-800")}>{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">SN: {item.serial_number || 'REG-SIGPAD-AUTO'}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Package size={22} className="text-blue-500" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {['operativo', 'roto', 'faltante'].map((cond) => (
                        <button 
                          key={cond}
                          onClick={() => setItemConditions(prev => ({...prev, [item.id]: cond}))}
                          className={cn(
                            "py-4 rounded-2xl text-[10px] text-premium tracking-widest transition-all",
                            itemConditions[item.id] === cond 
                              ? (cond === 'operativo' ? "bg-green-500 text-black shadow-lg shadow-green-500/20" : 
                                 cond === 'roto' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : 
                                 "bg-amber-500 text-white shadow-lg shadow-amber-500/20")
                              : (theme === 'dark' ? "bg-white/5 text-gray-500 border border-white/5" : "bg-white text-gray-400 border border-gray-100")
                          )}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full h-20 rounded-[2rem] text-[12px] text-premium tracking-[0.3em] shadow-2xl btn-premium border-none"
                onClick={submitHandoffAndCheckout}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Procesando...' : 'Finalizar y Salir'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INVENTORY CHECK MODAL (START SHIFT) */}
      <AnimatePresence>
        {showInventoryCheck && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className={cn(
                "w-full max-w-sm rounded-3xl p-6 border",
                theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-gray-200"
              )}
            >
              <h2 className="text-xl font-black uppercase tracking-tighter mb-4 text-[#0F4C5C]">Checklist de Inventario</h2>
              <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-widest">Verificá los elementos asignados antes de iniciar el turno.</p>
              
              <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto">
                {inventoryItems.map(item => (
                  <div key={item.id} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <p className="font-bold text-sm uppercase">{item.item_name}</p>
                    <p className="text-xs text-gray-500 font-mono mb-2">SN: {item.serial_number || 'N/A'}</p>
                    <div className="flex gap-2">
                      {['Operativo', 'Dañado', 'Faltante'].map(st => (
                        <button
                          key={st}
                          onClick={() => setInventoryStatus(prev => ({...prev, [item.id]: st}))}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                            inventoryStatus[item.id] === st 
                              ? (st === 'Operativo' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30')
                              : "bg-white/5 text-gray-400 hover:bg-white/10"
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={confirmInventoryCheck}
                className="w-full py-4 bg-[#0F4C5C] hover:bg-[#b8952b] text-zinc-950 font-black uppercase tracking-widest rounded-2xl"
              >
                Confirmar e Iniciar Turno
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOCUMENT SCANNER MODAL */}
      {showScanner && isShiftActive && (
        <DocumentScanner
          objectiveId={assignedObjective?.id}
          operatorId={OPERATOR_ID}
          location={location}
          onClose={() => setShowScanner(false)}
          onUploadSuccess={(url) => {
            alert('Evidencia subida correctamente');
          }}
        />
      )}

    </div>
  );
}
