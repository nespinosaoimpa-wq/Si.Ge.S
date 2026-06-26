'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, X, Volume2, VolumeX, MapPin, Phone, User, Shield, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PanicAlertOverlay from '@/app/gerente/_components/PanicAlertOverlay';

interface Alarm {
  id: string;
  triggered_by: string;
  objective_id?: string;
  alarm_type?: string;
  message?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  operator_name?: string;
  operator_latitude?: number;
  operator_longitude?: number;
  objective_name?: string;
  created_at?: string;
}

export function AlarmListener() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [panicAlarm, setPanicAlarm] = useState<Alarm | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // 1. Initial fetch of active alarms to handle any missed while offline
    const fetchActiveAlarms = async () => {
      const { data } = await supabase
        .from('alarms')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        const panic = data.find(a => a.alarm_type === 'panico' || a.alarm_type === 'emergencia');
        if (panic) setPanicAlarm(panic);
        setAlarms(data.filter(a => a.alarm_type !== 'panico' && a.alarm_type !== 'emergencia'));
      }
    };

    fetchActiveAlarms();

    // 2. Real-time subscription (stable)
    const channel = supabase
      .channel('global-alarms-tactical')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alarms' },
        (payload) => {
          const newAlarm = payload.new as Alarm;
          console.log('Tactical Alarm Received:', newAlarm);
          
          if (newAlarm.alarm_type === 'panico' || newAlarm.alarm_type === 'emergencia') {
            setPanicAlarm(newAlarm);
          } else {
            setAlarms((prev) => [newAlarm, ...prev]);
          }
          
          // Audio and vibration are handled by a separate effect watching state
          triggerVibration();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alarms' },
        (payload) => {
          const updated = payload.new as Alarm;
          if (updated.status === 'acknowledged' || updated.status === 'resolved') {
            if (panicAlarm?.id === updated.id) setPanicAlarm(null);
            setAlarms(prev => prev.filter(a => a.id !== updated.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          const newIncident = payload.new;
          if (newIncident.entry_type === 'panic') {
             console.log('🚨 TACTICAL PANIC RECEIVED (INCIDENTS TABLE):', newIncident);
             setPanicAlarm({
                id: newIncident.id,
                triggered_by: newIncident.operator_id,
                alarm_type: 'panico',
                message: newIncident.content,
                latitude: newIncident.latitude,
                longitude: newIncident.longitude,
                created_at: newIncident.created_at,
                status: 'active'
             } as Alarm);
             triggerVibration();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Stable subscription

  // Separate effect for sounds to avoid subscription churn
  useEffect(() => {
    if (panicAlarm) {
      playAlarmSound(true);
    } else if (alarms.length > 0) {
      playAlarmSound(false);
    }
  }, [panicAlarm?.id, alarms.length, soundEnabled]);

  const playAlarmSound = (isPanic: boolean) => {
    if (!soundEnabled) return;
    try {
      // Use the Web Audio API for a more reliable alarm sound
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = isPanic ? 2 : 0.5;
      const freq = isPanic ? 880 : 440;
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = isPanic ? 'sawtooth' : 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      if (isPanic) {
        // Siren effect for panic
        oscillator.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
        oscillator.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 1.0);
        oscillator.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 1.5);
        oscillator.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 2.0);
      }
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.warn('Audio context unavailable:', err);
    }
  };

  const triggerVibration = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Patrón SOS: 3 cortos, 3 largos, 3 cortos
      navigator.vibrate([100, 30, 100, 30, 100, 200, 300, 30, 300, 30, 300, 200, 100, 30, 100, 30, 100]);
    }
  };

  const dismissAlarm = async (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    // Marcar en DB como reconocida
    await supabase.from('alarms').update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() }).eq('id', id);
  };

  const dismissPanic = async () => {
    if (panicAlarm) {
      await supabase.from('alarms').update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() }).eq('id', panicAlarm.id);
      setPanicAlarm(null);
    }
  };

  const handleResolvePanic = async (notes: string) => {
    if (!panicAlarm) return;
    try {
      // 1. Mark alarm as acknowledged
      await supabase.from('alarms').update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() }).eq('id', panicAlarm.id);
      
      // 2. Mark guard book entry as resolved (if we have a reference, otherwise we just close the UI)
      // Since alarms is a separate table, we at least close the UI and alarm record.
      
      setPanicAlarm(null);
    } catch (err: any) {
      console.error("Error resolving panic:", err);
    }
  };

  const getTimeSinceAlarm = (createdAt?: string) => {
    if (!createdAt) return 'Ahora';
    const diff = Date.now() - new Date(createdAt).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `Hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Hace ${minutes}min`;
  };

  return (
    <>
      {/* ═══════════ NEW PANIC OVERLAY INTEGRATION ═══════════ */}
      <PanicAlertOverlay 
        alert={panicAlarm ? {
          id: panicAlarm.id,
          resource_name: panicAlarm.operator_name,
          content: panicAlarm.message,
          latitude: panicAlarm.latitude || panicAlarm.operator_latitude,
          longitude: panicAlarm.longitude || panicAlarm.operator_longitude,
          created_at: panicAlarm.created_at
        } : null}
        onDismiss={dismissPanic}
        onResolve={handleResolvePanic}
      />
      {/* ═══════════ STANDARD ALARM BANNERS ═══════════ */}
      {alarms.length > 0 && (
        <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
          <AnimatePresence>
            {alarms.map((alarm) => (
              <motion.div
                key={alarm.id}
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                className="pointer-events-auto bg-red-600 border-2 border-red-400 p-4 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.6)] flex items-center gap-4 max-w-md w-full"
              >
                <div className="bg-white rounded-full p-2 animate-pulse">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div className="flex-1 text-white">
                  <h3 className="font-black uppercase tracking-widest text-sm drop-shadow-md">
                    ALERTA DE SEGURIDAD
                  </h3>
                  <p className="font-medium text-xs text-red-100 uppercase tracking-wider mt-0.5">
                    {alarm.message || `Disparado por: ${alarm.triggered_by}`}
                  </p>
                </div>
                <button
                  onClick={() => dismissAlarm(alarm.id)}
                  className="w-10 h-10 bg-black/20 hover:bg-black/40 rounded-xl flex items-center justify-center transition-colors shrink-0"
                >
                  <X size={20} className="text-white" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Sound Toggle (fixed) */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="fixed bottom-24 right-4 z-40 w-10 h-10 bg-gray-900/80 backdrop-blur rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors shadow-lg border border-white/10"
        title={soundEnabled ? 'Silenciar alarmas' : 'Activar sonido'}
      >
        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
    </>
  );
}
