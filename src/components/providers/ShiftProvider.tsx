'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ShieldAlert, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { isValidCoordinatePair } from '@/lib/gps-tracker';

interface ShiftContextType {
  isShiftActive: boolean;
  isCheckingShift: boolean;
  shiftData: any | null;
  shiftId: string | null;
  startShift: (data: any, id?: string) => void;
  endShift: () => void;
  triggerManAlive: () => void;
  updateShiftData: (data: Partial<any>) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setHighFrequencyMode: (enabled: boolean, roundId?: string) => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [isCheckingShift, setIsCheckingShift] = useState(true);
  const [shiftData, setShiftData] = useState<any | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);
  
  // Refs to prevent stale closures in background callbacks
  const isShiftActiveRef = React.useRef(isShiftActive);
  const shiftIdRef = React.useRef(shiftId);

  useEffect(() => {
    isShiftActiveRef.current = isShiftActive;
    shiftIdRef.current = shiftId;
  }, [isShiftActive, shiftId]);
  
  // Man Alive state
  const [showManAliveDialog, setShowManAliveDialog] = useState(false);
  const [manAliveTimer, setManAliveTimer] = useState<NodeJS.Timeout | null>(null);
  const MAN_ALIVE_INTERVAL = 10 * 60 * 1000;
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Multi-layered Persistence & DB Verification on app launch / auth load
  useEffect(() => {
    const savedTheme = localStorage.getItem('704_ui_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);

    const restoreActiveShift = async () => {
      setIsCheckingShift(true);

      if (!user) {
        setIsShiftActive(false);
        setShiftData(null);
        setShiftId(null);
        setIsCheckingShift(false);
        return;
      }

      // 1. Instant Local Cache Recovery for 0ms UX
      let restoredFromLocal = false;
      const savedShift = localStorage.getItem('704_active_shift');
      if (savedShift) {
        try {
          const parsed = JSON.parse(savedShift);
          const storedUserId = parsed.data?.user_id;
          const storedEmail = parsed.data?.operator_email;

          const isDifferentUser = (storedUserId && user.id && String(storedUserId) !== String(user.id)) &&
                                  (storedEmail && user.email && String(storedEmail).toLowerCase() !== String(user.email).toLowerCase());

          const startTimeMs = parsed.data?.startTime ? new Date(parsed.data.startTime).getTime() : (parsed.data?.time ? new Date(parsed.data.time).getTime() : (parsed.data?.checkin_time ? new Date(parsed.data.checkin_time).getTime() : Date.now()));
          const hoursOld = (Date.now() - startTimeMs) / (1000 * 3600);

          if (!isDifferentUser && hoursOld <= 24) {
            setIsShiftActive(true);
            setShiftData(parsed.data);
            setShiftId(parsed.id);
            restoredFromLocal = true;
          }
        } catch (e) {
          localStorage.removeItem('704_active_shift');
        }
      }

      // 2. Authoritative Database Verification & Auto-Recovery (Supabase)
      try {
        const candidateIds = new Set<string>();
        if (user.id) candidateIds.add(String(user.id));
        if (user.email) candidateIds.add(String(user.email).toLowerCase());

        const { data: resData } = await supabase
          .from('resources')
          .select('id, user_id, profile_id, assigned_to, email')
          .or(`id.eq.${user.id},assigned_to.eq.${user.id},user_id.eq.${user.id},profile_id.eq.${user.id}`);

        if (resData && resData.length > 0) {
          resData.forEach((r: any) => {
            if (r.id) candidateIds.add(String(r.id));
            if (r.user_id) candidateIds.add(String(r.user_id));
            if (r.profile_id) candidateIds.add(String(r.profile_id));
            if (r.assigned_to) candidateIds.add(String(r.assigned_to));
            if (r.email) candidateIds.add(String(r.email).toLowerCase());
          });
        }

        if (user.email) {
          const { data: resByEmail } = await supabase
            .from('resources')
            .select('id, user_id, profile_id, assigned_to')
            .eq('email', user.email);
          if (resByEmail) {
            resByEmail.forEach((r: any) => {
              if (r.id) candidateIds.add(String(r.id));
            });
          }
        }

        const { data: activeShifts, error } = await supabase
          .from('guard_shifts')
          .select('*, objectives:objective_id(latitude, longitude, geofence_radius, geofence_radius_meters, name)')
          .in('status', ['activo', 'active'])
          .order('checkin_time', { ascending: false });

        const activeShift = (activeShifts || []).find((s: any) => 
          Array.from(candidateIds).some(cid => cid === String(s.operator_id) || cid.toLowerCase() === String(s.operator_id).toLowerCase())
        );

        if (activeShift && !error) {
          const realStartTime = activeShift.checkin_time ? new Date(activeShift.checkin_time) : new Date();
          const hoursOld = (Date.now() - realStartTime.getTime()) / (1000 * 3600);

          if (hoursOld > 24) {
            fetch('/api/shifts/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shift_id: activeShift.id, operator_id: activeShift.operator_id })
            }).catch(() => {});
            localStorage.removeItem('704_active_shift');
            setIsShiftActive(false);
            setShiftData(null);
            setShiftId(null);
          } else {
            const objLoc = activeShift.objectives?.latitude && activeShift.objectives?.longitude
              ? { lat: Number(activeShift.objectives.latitude), lng: Number(activeShift.objectives.longitude) }
              : undefined;

            const recoveredData = {
              time: realStartTime,
              startTime: realStartTime,
              location: { lat: activeShift.checkin_latitude, lng: activeShift.checkin_longitude },
              operator_id: activeShift.operator_id,
              objective_id: activeShift.objective_id,
              objectiveLocation: objLoc,
              geofenceRadius: activeShift.objectives?.geofence_radius_meters || activeShift.objectives?.geofence_radius || 100,
              objective_name: activeShift.objectives?.name,
              user_id: user?.id,
              operator_email: user?.email
            };

            setIsShiftActive(true);
            setShiftData(recoveredData);
            setShiftId(activeShift.id);
            try {
              localStorage.setItem('704_active_shift', JSON.stringify({ id: activeShift.id, data: recoveredData }));
            } catch (e) {}
          }
        } else if (!restoredFromLocal) {
          setIsShiftActive(false);
          setShiftData(null);
          setShiftId(null);
          localStorage.removeItem('704_active_shift');
        }
      } catch (e) {
        console.error('[ShiftProvider] Active shift recovery error:', e);
      } finally {
        setIsCheckingShift(false);
      }
    };

    restoreActiveShift();
  }, [user?.id, user?.email]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('704_ui_theme', newTheme);
  };
  
  const startShift = (data: any, id: string | null = null) => {
    const enrichedData = {
      ...data,
      user_id: user?.id || data?.user_id,
      operator_email: user?.email || data?.operator_email
    };
    setIsShiftActive(true);
    setShiftData(enrichedData);
    const sid = id || (data as any)?.id || null;
    setShiftId(sid);
    try {
      localStorage.setItem('704_active_shift', JSON.stringify({ id: sid, data: enrichedData }));
    } catch (e) {
      console.warn('[704 Shift] localStorage write failed:', e);
    }
    resetManAlive();
  };

  const updateShiftData = (newData: Partial<any>) => {
    // If shift is no longer active according to the latest ref state, do not write
    if (!isShiftActiveRef.current) return;

    setShiftData((prev: any) => {
      if (!prev) return null;
      const updated = { ...prev, ...newData };
      // Also update localStorage so it persists on refresh using latest ref ID
      if (shiftIdRef.current) {
        try {
          if (localStorage.getItem('704_active_shift')) {
            localStorage.setItem('704_active_shift', JSON.stringify({ id: shiftIdRef.current, data: updated }));
          }
        } catch (e) {
          console.warn('[704 Shift] localStorage update failed:', e);
        }
      }
      return updated;
    });
  };

  const endShift = () => {
    setIsShiftActive(false);
    setShiftData(null);
    setShiftId(null);
    try {
      localStorage.removeItem('704_active_shift');
    } catch (e) {
      console.warn('[704 Shift] localStorage remove failed:', e);
    }
    if (manAliveTimer) clearTimeout(manAliveTimer);
    setShowManAliveDialog(false);
  };

  const resetManAlive = () => {
    if (manAliveTimer) clearTimeout(manAliveTimer);
    setShowManAliveDialog(false);
    
    // Set next interval
    const timer = setTimeout(() => {
      triggerManAlive();
    }, MAN_ALIVE_INTERVAL);
    
    setManAliveTimer(timer);
  };

  const triggerManAlive = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
    // In a real app, we'd also play a loud alarm sound here
    setShowManAliveDialog(true);
    
    // Auto-alert to base if not confirmed in 2 minutes
    setTimeout(() => {
      // Check if dialog is still open (meaning not confirmed)
      // We would send an SOS/ManDown API call here
    }, 2 * 60 * 1000);
  };

  const confirmAlive = () => {
    resetManAlive();
  };

  const trackerRef = React.useRef<any>(null);

  const setHighFrequencyMode = (enabled: boolean, roundId?: string) => {
    if (trackerRef.current) {
      trackerRef.current.setHighFrequencyMode(enabled, roundId);
    }
  };

  
  // BACKGROUND TRACKING Logic
  useEffect(() => {
    const handleGeofenceEvent = (e: any) => {
      const { type, distance } = e.detail || {};
      if (type === 'exit') {
        updateShiftData({ isOutside: true, isAbandoned: true, is_paused: true, distanceToObjective: distance });
      } else if (type === 'entry') {
        updateShiftData({ isOutside: false, isAbandoned: false, is_paused: false, distanceToObjective: distance });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sigpad_geofence_alert', handleGeofenceEvent);
    }

    if (isShiftActive && typeof window !== 'undefined') {
      const startTracking = async () => {
        if (trackerRef.current) return; // Already running

        try {
          const { GPSTracker } = await import('@/lib/gps-tracker');
          // Resolve the real resource ID in priority order:
          // 1. operator_id (set when checkin passes resource_id as operator_id)
          // 2. resource_id (direct from checkin API response)
          // 3. id (fallback from shift data)
          // Never fall back to 'recurso_demo' if we have any real ID.
          const resolvedResourceId =
            shiftData?.operator_id ||
            shiftData?.resource_id ||
            shiftData?.id ||
            'recurso_demo';
          trackerRef.current = new GPSTracker(
            shiftId || (shiftData as any)?.id,
            resolvedResourceId,
            async (pos) => {
               // Calculate distance to objective if valid objectiveLocation exists
               let isOutside = Boolean(pos.isOutside);
               let distToObj = pos.distanceToObjective;

               const hasValidObjLoc = shiftData?.objectiveLocation && isValidCoordinatePair(shiftData.objectiveLocation.lat, shiftData.objectiveLocation.lng);
               const hasValidPosLoc = isValidCoordinatePair(pos.latitude, pos.longitude);

               if (hasValidObjLoc && hasValidPosLoc) {
                 const R = 6371e3;
                 const φ1 = Number(pos.latitude) * Math.PI / 180;
                 const φ2 = Number(shiftData.objectiveLocation.lat) * Math.PI / 180;
                 const Δφ = (Number(shiftData.objectiveLocation.lat) - Number(pos.latitude)) * Math.PI / 180;
                 const Δλ = (Number(shiftData.objectiveLocation.lng) - Number(pos.longitude)) * Math.PI / 180;
                 const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                 const calcDist = R * c;

                 if (calcDist > 500000) {
                   distToObj = null;
                   isOutside = false;
                 } else {
                   distToObj = calcDist;
                   const gpsMargin = Math.max(Number(pos.accuracy || 0), 25);
                   const effectiveRadius = (shiftData.geofenceRadius || 100) + gpsMargin;

                   if (pos.accuracy && pos.accuracy < 300 && calcDist > effectiveRadius) {
                     isOutside = true;
                   } else {
                     isOutside = false;
                   }
                 }
               } else {
                 distToObj = null;
                 isOutside = false;
               }

               // Notify UI for live updates
               updateShiftData({ 
                 location: { lat: pos.latitude, lng: pos.longitude, accuracy: pos.accuracy, speed: pos.speed },
                 isOutside: isOutside,
                 isAbandoned: isOutside,
                 is_paused: isOutside,
                 distanceToObjective: distToObj
               });
            },
            (err) => console.warn('[704 Tracker] Background Error:', err),
            (shiftData?.objectiveLocation && isValidCoordinatePair(shiftData.objectiveLocation.lat, shiftData.objectiveLocation.lng)) ? {
              location: shiftData.objectiveLocation,
              radius: shiftData.geofenceRadius || 100,
              id: shiftData.objective_id
            } : undefined
          );
          trackerRef.current.start();
        } catch (e) {
          console.error("[704 Tracker] Failed to start:", e);
        }
      };
      startTracking();
    } else if (!isShiftActive && trackerRef.current) {
       trackerRef.current.stop().catch((e: any) => console.warn('[704 Tracker] Stop error:', e));
       trackerRef.current = null;
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('sigpad_geofence_alert', handleGeofenceEvent);
      }
    };
  }, [isShiftActive, shiftId, shiftData?.objectiveLocation]);

  // Separate effect for component unmount
  useEffect(() => {
    return () => {
      if (trackerRef.current) {
        trackerRef.current.stop();
        trackerRef.current = null;
      }
      if (manAliveTimer) clearTimeout(manAliveTimer);
    };
  }, []);

  return (
    <ShiftContext.Provider value={{ 
      isShiftActive, 
      isCheckingShift,
      shiftData, 
      shiftId, 
      startShift, 
      endShift, 
      triggerManAlive,
      updateShiftData,
      theme,
      toggleTheme,
      setHighFrequencyMode
    }}>
      {children}

      {showManAliveDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-md p-6 animate-fade-in">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 w-full max-w-sm text-center shadow-2xl shadow-primary/10 animate-scale-up">
            <div className="w-24 h-24 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-3">Control de Presencia</h2>
            <p className="text-gray-500 text-sm font-medium mb-10 leading-relaxed px-4">
              Por favor, confirmá que te encontrás en tu puesto para mantener el registro de actividad.
            </p>
            
            <Button 
              onClick={confirmAlive}
              className="w-full h-16 bg-primary hover:bg-primary-dark text-black text-sm font-black uppercase tracking-widest gap-3 rounded-2xl shadow-lg shadow-primary/20"
            >
              <Fingerprint className="w-6 h-6" />
              Confirmar Presencia
            </Button>
          </div>
        </div>
      )}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
