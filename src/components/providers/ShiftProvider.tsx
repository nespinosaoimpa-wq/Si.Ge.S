'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { ShieldAlert, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ShiftContextType {
  isShiftActive: boolean;
  shiftData: any | null;
  shiftId: string | null;
  startShift: (data: any, id?: string) => void;
  endShift: () => void;
  triggerManAlive: () => void;
  updateShiftData: (data: Partial<any>) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setHighFrequencyMode: (enabled: boolean, roundId?: string) => void;
  getGpsPosition: () => { lat: number; lng: number; accuracy?: number; speed?: number | null } | null;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [shiftData, setShiftData] = useState<any | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);
  
  // Man Alive state
  const [showManAliveDialog, setShowManAliveDialog] = useState(false);
  const [manAliveTimer, setManAliveTimer] = useState<NodeJS.Timeout | null>(null);
  const MAN_ALIVE_INTERVAL = 10 * 60 * 1000;
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // ── GPS Position Ref (no state) ──────────────────────────────────────────
  // CRÍTICO PARA RENDIMIENTO: La posición GPS se actualiza cada 3-5 segundos.
  // Si se guardara en estado del contexto, TODOS los consumidores de useShift()
  // se re-renderizarían continuamente. En cambio, usamos un ref mutable:
  // los componentes que necesiten la posición en tiempo real la leen con getGpsPosition().
  const gpsPositionRef = useRef<{ lat: number; lng: number; accuracy?: number; speed?: number | null } | null>(null);
  const getGpsPosition = useCallback(() => gpsPositionRef.current, []);

  // Persistence for Theme & Shift
  useEffect(() => {
    const savedTheme = localStorage.getItem('SIGPAD_ui_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);

    const savedShift = localStorage.getItem('SIGPAD_active_shift');
    if (savedShift) {
      try {
        const parsed = JSON.parse(savedShift);
        setIsShiftActive(true);
        setShiftData(parsed.data);
        setShiftId(parsed.id);
      } catch (e) {}
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('SIGPAD_ui_theme', newTheme);
  };
  
  const startShift = (data: any, id: string | null = null) => {
    setIsShiftActive(true);
    setShiftData(data);
    const sid = id || (data as any)?.id || null;
    setShiftId(sid);
    localStorage.setItem('SIGPAD_active_shift', JSON.stringify({ id: sid, data }));
    resetManAlive();
  };

  const updateShiftData = useCallback((newData: Partial<any>) => {
    setShiftData((prev: any) => {
      const updated = { ...prev, ...newData };
      // Also update localStorage so it persists on refresh
      if (shiftId) {
        localStorage.setItem('SIGPAD_active_shift', JSON.stringify({ id: shiftId, data: updated }));
      }
      return updated;
    });
  }, [shiftId]);

  const endShift = () => {
    setIsShiftActive(false);
    setShiftData(null);
    setShiftId(null);
    localStorage.removeItem('SIGPAD_active_shift');
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
               // Actualizar SOLO el ref GPS — no setState para evitar re-renders globales.
               // El mapa y otros componentes pueden leer la posición via getGpsPosition().
               gpsPositionRef.current = { lat: pos.latitude, lng: pos.longitude, accuracy: pos.accuracy, speed: pos.speed };
            },
            (err) => console.warn('[SIGPAD Tracker] Background Error:', err),
            shiftData?.objectiveLocation ? {
              location: shiftData.objectiveLocation,
              radius: shiftData.geofenceRadius || 100,
              id: shiftData.objective_id
            } : undefined
          );
          trackerRef.current.start();
        } catch (e) {
          console.error("[SIGPAD Tracker] Failed to start:", e);
        }
      };
      startTracking();
    } else if (!isShiftActive && trackerRef.current) {
       trackerRef.current.stop();
       trackerRef.current = null;
    }

    return () => {
      // Note: We don't stop the tracker on every effect cleanup (e.g. when timer changes)
      // but only if the shift is actually ended or the component unmounts
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

  // Memoizar el valor del contexto: solo cambia cuando cambian los estados reales
  // (isShiftActive, shiftId, theme), NO cuando llega una posición GPS.
  const contextValue = useMemo(() => ({
    isShiftActive,
    shiftData,
    shiftId,
    startShift,
    endShift,
    triggerManAlive,
    updateShiftData,
    theme,
    toggleTheme,
    setHighFrequencyMode,
    getGpsPosition, // Exponer getter de posición GPS sin re-renders
  }), [isShiftActive, shiftData, shiftId, theme, updateShiftData, getGpsPosition]);

  return (
    <ShiftContext.Provider value={contextValue}>
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
