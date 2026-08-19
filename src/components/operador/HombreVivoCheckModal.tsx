'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { playAlertTone, startCrazyHombreVivoAlarm, stopCrazyHombreVivoAlarm, unlockAudioContext } from '@/lib/push-notifications';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/providers/AuthProvider';

interface HombreVivoCheckModalProps {
  operatorId?: string;
  objectiveId?: string | null;
  location?: { lat: number; lng: number } | null;
  isShiftActive?: boolean;
}

export default function HombreVivoCheckModal({
  operatorId,
  objectiveId,
  location,
  isShiftActive
}: HombreVivoCheckModalProps) {
  const { user } = useAuth();
  const [activeCheck, setActiveCheck] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(180);
  const [isAnswering, setIsAnswering] = useState(false);
  const [answeredSuccess, setAnsweredSuccess] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeenAlarmRef = useRef<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<any>(null);
  const userResourceRef = useRef<any>(null);

  // Fetch operator's resource details to match operator_id accurately
  useEffect(() => {
    const fetchUserResource = async () => {
      if (!user?.id && !user?.email) return;
      try {
        const { data } = await supabase
          .from('resources')
          .select('id, name, user_id, profile_id')
          .or(`id.eq.${user?.id},user_id.eq.${user?.id},profile_id.eq.${user?.id},email.eq.${user?.email}`)
          .limit(1);
        if (data && data.length > 0) {
          userResourceRef.current = data[0];
        }
      } catch (e) {}
    };
    fetchUserResource();
  }, [user?.id, user?.email]);

  const isTargetOperator = useCallback((alarm: any) => {
    const targetId = alarm?.operator_id || alarm?.resource_id;
    // If no target ID specified in alarm, it's a global check for all active operators
    if (!targetId) return true;

    const myIds = [
      operatorId,
      user?.id,
      userResourceRef.current?.id,
      userResourceRef.current?.user_id,
      userResourceRef.current?.profile_id
    ].filter(Boolean);

    if (myIds.includes(targetId)) return true;

    if (alarm?.operator_name && userResourceRef.current?.name && 
        alarm.operator_name.toLowerCase().trim() === userResourceRef.current.name.toLowerCase().trim()) {
      return true;
    }

    return false;
  }, [operatorId, user?.id]);

  const triggerCheckModal = useCallback((alarm: any) => {
    if (!alarm) return;
    // Prevent duplicate triggers for the same alarm
    if (alarm?.id && lastSeenAlarmRef.current === alarm.id) return;
    if (alarm?.id) lastSeenAlarmRef.current = alarm.id;

    console.log('[HombreVivo] ✅ CHECK RECIBIDO - Mostrando modal al operador', alarm);

    setActiveCheck(alarm);
    setCountdown(180);
    setAnsweredSuccess(false);

    unlockAudioContext();
    startCrazyHombreVivoAlarm();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([500, 150, 500, 150, 800, 150, 500]);
    }

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeExpired(alarm);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ═══════════ STRATEGY 1: Supabase Realtime Broadcast (instant) ═══════════
  useEffect(() => {
    const channel = supabase
      .channel('hombre-vivo-broadcast-channel')
      .on('broadcast', { event: 'hombre_vivo_dispatch' }, (payload: any) => {
        console.log('[HombreVivo] 📡 BROADCAST recibido:', payload);
        const data = payload?.payload;
        if (data && isTargetOperator(data)) {
          triggerCheckModal(data);
        }
      })
      .subscribe((status: string) => {
        console.log('[HombreVivo] 📡 Broadcast channel status:', status);
      });

    broadcastChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [triggerCheckModal, isTargetOperator]);

  // ═══════════ STRATEGY 2: Supabase Postgres Changes on alarms table ═══════════
  useEffect(() => {
    const channel = supabase
      .channel('hombre-vivo-postgres-listener')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alarms'
      }, (payload: any) => {
        console.log('[HombreVivo] 🗄️ Postgres INSERT recibido:', payload);
        const newAlarm = payload.new as any;
        const type = (newAlarm?.alarm_type || '').toLowerCase();
        if (type.includes('hombre_vivo') && isTargetOperator(newAlarm)) {
          triggerCheckModal(newAlarm);
        }
      })
      .subscribe((status: string) => {
        console.log('[HombreVivo] 🗄️ Postgres channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [triggerCheckModal, isTargetOperator]);

  // ═══════════ STRATEGY 3: Polling fallback every 3 seconds ═══════════
  useEffect(() => {
    const checkForPendingAlarms = async () => {
      if (activeCheck) return;

      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        
        // 1. Query alarms table
        const { data: alarmsData } = await supabase
          .from('alarms')
          .select('*')
          .or('alarm_type.eq.hombre_vivo_solicitud,alarm_type.eq.hombre_vivo,alarm_type.eq.hombre_vivo_sin_respuesta')
          .eq('status', 'active')
          .gte('created_at', tenMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(10);

        if (alarmsData && alarmsData.length > 0) {
          for (const alarm of alarmsData) {
            if (alarm.id !== lastSeenAlarmRef.current && isTargetOperator(alarm)) {
              console.log('[HombreVivo] 🔄 POLLING encontró alarma activa para operador:', alarm);
              triggerCheckModal(alarm);
              return;
            }
          }
        }

        // 2. Fallback check on guard_book_entries if alarms table RLS restricted
        const { data: bookData } = await supabase
          .from('guard_book_entries')
          .select('*')
          .eq('entry_type', 'hombre_vivo')
          .ilike('content', '%Pendiente de confirmación%')
          .gte('created_at', tenMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(5);

        if (bookData && bookData.length > 0) {
          for (const entry of bookData) {
            if (entry.id !== lastSeenAlarmRef.current && isTargetOperator(entry)) {
              console.log('[HombreVivo] 🔄 POLLING encontró guard_book_entry activa:', entry);
              triggerCheckModal({
                id: entry.id,
                operator_id: entry.operator_id,
                objective_id: entry.objective_id,
                alarm_type: 'hombre_vivo_solicitud',
                message: entry.content,
                created_at: entry.created_at
              });
              return;
            }
          }
        }
      } catch (e) {
        console.warn('[HombreVivoPolling] Error:', e);
      }
    };

    checkForPendingAlarms();
    pollingRef.current = setInterval(checkForPendingAlarms, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeCheck, triggerCheckModal, isTargetOperator]);

  // Loop tactical vibration every 3 seconds while modal is active and unanswered
  useEffect(() => {
    if (activeCheck && !answeredSuccess) {
      const soundInterval = setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([500, 150, 500, 150, 800, 150, 500]);
        }
      }, 3000);
      return () => {
        clearInterval(soundInterval);
        stopCrazyHombreVivoAlarm();
      };
    } else {
      stopCrazyHombreVivoAlarm();
    }
  }, [activeCheck?.id, answeredSuccess]);

  const handleTimeExpired = async (alarm: any) => {
    try {
      let lat = location?.lat || 0;
      let lng = location?.lng || 0;

      await supabase.from('alarms').insert({
        triggered_by: 'system_timeout',
        operator_id: operatorId || user?.id,
        objective_id: objectiveId || null,
        alarm_type: 'hombre_vivo_sin_respuesta',
        severity: 'critica',
        message: `🚨 HOMBRE VIVO NO ATENDIDO: El operador no respondió la verificación dentro de los 3 minutos límite.`,
        latitude: lat,
        longitude: lng,
        status: 'active',
        created_at: new Date().toISOString()
      });

      await supabase.from('guard_book_entries').insert({
        objective_id: objectiveId || null,
        operator_id: operatorId || user?.id,
        entry_type: 'hombre_vivo_sin_respuesta',
        content: `🚨 HOMBRE VIVO SIN RESPONDER - LÍMITE DE TIEMPO EXCEDIDO (3 min)`,
        latitude: lat,
        longitude: lng,
        urgency: 'critica'
      });

      if (alarm?.id) {
        await supabase.from('alarms').update({ status: 'unattended' }).eq('id', alarm.id);
      }
    } catch (e) {
      console.error('[HombreVivoModal] Timeout error:', e);
    }
  };

  const handleConfirmPresence = async () => {
    if (!activeCheck) return;
    try {
      setIsAnswering(true);
      if (timerRef.current) clearInterval(timerRef.current);

      let lat = location?.lat || 0;
      let lng = location?.lng || 0;

      // 1. Log answered check in guard book
      await supabase.from('guard_book_entries').insert({
        objective_id: objectiveId || null,
        operator_id: operatorId || user?.id,
        entry_type: 'hombre_vivo',
        content: `✅ CONTROL HOMBRE VIVO RESPONDIDO OK - PRESENCIA CONFIRMADA`,
        latitude: lat,
        longitude: lng,
        urgency: 'normal'
      });

      // 2. Mark alarm request as acknowledged
      if (activeCheck.id) {
        await supabase.from('alarms').update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        }).eq('id', activeCheck.id);
      }

      setAnsweredSuccess(true);
      setTimeout(() => {
        setActiveCheck(null);
        setIsAnswering(false);
      }, 1500);
    } catch (e) {
      console.error('[HombreVivoModal] Answer error:', e);
    } finally {
      setIsAnswering(false);
    }
  };

  if (!activeCheck) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          className="bg-zinc-950 border-2 border-amber-500/40 p-8 rounded-[3.5rem] max-w-sm w-full shadow-[0_0_80px_rgba(245,158,11,0.3)] flex flex-col items-center relative overflow-hidden"
        >
          {answeredSuccess ? (
            <>
              <div className="w-24 h-24 bg-emerald-500/20 border-2 border-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-1">
                PRESENCIA CONFIRMADA
              </h2>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">
                Protocolo Hombre Vivo Sincronizado
              </p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-amber-500/20 border-2 border-amber-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.4)] animate-bounce">
                <Activity size={48} className="text-amber-500" />
              </div>

              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">
                Verificación de Guardia
              </span>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                CONTROL DE HOMBRE VIVO
              </h2>
              <p className="text-xs text-zinc-400 font-medium mb-6">
                Gerencia solicita tu confirmación de presencia en el objetivo.
              </p>

              {/* Countdown Display */}
              <div className="w-28 h-14 bg-zinc-900 border border-amber-500/30 text-amber-400 font-mono font-black text-2xl rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </div>

              <Button
                onClick={handleConfirmPresence}
                disabled={isAnswering}
                className="w-full h-18 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-xs shadow-xl shadow-amber-500/30"
              >
                {isAnswering ? 'Registrando...' : '✅ DAR PRESENTE HOMBRE VIVO'}
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
