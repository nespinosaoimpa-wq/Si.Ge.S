'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { playAlertTone, startCrazyHombreVivoAlarm, stopCrazyHombreVivoAlarm } from '@/lib/push-notifications';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/providers/AuthProvider';

import { useShift } from '@/components/providers/ShiftProvider';

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
  const { shiftData } = useShift();
  const [activeCheck, setActiveCheck] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(180);
  const [isAnswering, setIsAnswering] = useState(false);
  const [answeredSuccess, setAnsweredSuccess] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeenAlarmRef = useRef<string | null>(null);
  const answeredAlarmIdsRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<any>(null);
  const userResourceRef = useRef<any>(null);

  // Load answered alarm IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('704_answered_hombre_vivo_ids');
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
          ids.forEach((id: string) => answeredAlarmIdsRef.current.add(id));
        }
      }
    } catch (e) {}
  }, []);

  // Fetch operator's resource details to match operator_id accurately
  useEffect(() => {
    const fetchUserResource = async () => {
      if (!user?.id && !user?.email) return;
      try {
        const { data: res1 } = await supabase
          .from('resources')
          .select('id, name, user_id, profile_id, assigned_to, email')
          .or(`id.eq.${user.id},assigned_to.eq.${user.id},user_id.eq.${user.id},profile_id.eq.${user.id}`);

        if (res1 && res1.length > 0) {
          userResourceRef.current = res1[0];
          return;
        }

        if (user?.email) {
          const { data: res2 } = await supabase
            .from('resources')
            .select('id, name, user_id, profile_id, assigned_to, email')
            .eq('email', user.email);

          if (res2 && res2.length > 0) {
            userResourceRef.current = res2[0];
          }
        }
      } catch (e) {}
    };
    fetchUserResource();
  }, [user?.id, user?.email]);

  const isTargetOperator = useCallback((alarm: any) => {
    if (!alarm) return false;
    const targetId = alarm?.operator_id || alarm?.resource_id;

    // If no target ID specified in alarm or target is 'all', it's for all active operators
    if (!targetId || targetId === 'all') return true;

    const myIds = new Set<string>();
    if (operatorId) myIds.add(String(operatorId));
    if (user?.id) myIds.add(String(user.id));
    if (user?.email) myIds.add(String(user.email).toLowerCase());
    if (shiftData?.operator_id) myIds.add(String(shiftData.operator_id));
    if (shiftData?.resource_id) myIds.add(String(shiftData.resource_id));

    if (userResourceRef.current) {
      const r = userResourceRef.current;
      if (r.id) myIds.add(String(r.id));
      if (r.user_id) myIds.add(String(r.user_id));
      if (r.profile_id) myIds.add(String(r.profile_id));
      if (r.assigned_to) myIds.add(String(r.assigned_to));
      if (r.email) myIds.add(String(r.email).toLowerCase());
    }

    const targetStr = String(targetId).toLowerCase();

    for (const myId of Array.from(myIds)) {
      if (myId.toLowerCase() === targetStr) return true;
    }

    // Name matching fallback
    if (alarm?.operator_name && userResourceRef.current?.name) {
      const alarmName = alarm.operator_name.toLowerCase().trim();
      const myName = userResourceRef.current.name.toLowerCase().trim();
      if (alarmName.includes(myName) || myName.includes(alarmName)) {
        return true;
      }
    }

    // Email matching fallback
    if (alarm?.operator_email && user?.email) {
      if (alarm.operator_email.toLowerCase().trim() === user.email.toLowerCase().trim()) {
        return true;
      }
    }

    // Objective matching fallback
    if (objectiveId && alarm?.objective_id && String(alarm.objective_id) === String(objectiveId)) {
      return true;
    }

    return false;
  }, [operatorId, user?.id, user?.email, objectiveId, shiftData]);

  const triggerCheckModal = useCallback((alarm: any) => {
    if (!alarm) return;
    // Prevent duplicate triggers or re-triggering already answered alarms
    if (alarm?.id && answeredAlarmIdsRef.current.has(alarm.id)) return;
    if (alarm?.id && lastSeenAlarmRef.current === alarm.id) return;
    if (alarm?.id) lastSeenAlarmRef.current = alarm.id;

    console.log('[HombreVivo] 🚨 CHECK HOMBRE VIVO RECIBIDO - Desplegando modal emergente al instante:', alarm);

    setActiveCheck(alarm);
    setCountdown(180);
    setAnsweredSuccess(false);
    startCrazyHombreVivoAlarm();

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

  // ═══════════ STRATEGY 0: Web Push Service Worker Message (Direct from SW) ═══════════
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'PUSH_RECEIVED' || data?.type === 'NOTIFICATION_CLICKED') {
        console.log('[HombreVivo] 🔔 Service Worker Push Message recibido:', data);
        const payload = data.payload || {};
        if (isTargetOperator(payload)) {
          triggerCheckModal({
            id: payload.alarm_id || 'push-' + Date.now(),
            operator_id: payload.operator_id || operatorId,
            alarm_type: 'hombre_vivo_solicitud',
            message: payload.body || 'Control de Hombre Vivo',
            created_at: new Date().toISOString()
          });
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, [triggerCheckModal, isTargetOperator, operatorId]);

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

  // ═══════════ STRATEGY 3: Polling fallback for active alarms every 3 seconds ═══════════
  useEffect(() => {
    const checkForPendingAlarms = async () => {
      if (activeCheck) return;

      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        
        // Query alarms table ONLY for active status hombre_vivo checks
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
            if (!answeredAlarmIdsRef.current.has(alarm.id) && alarm.id !== lastSeenAlarmRef.current && isTargetOperator(alarm)) {
              console.log('[HombreVivo] 🔄 POLLING encontró alarma activa para operador:', alarm);
              triggerCheckModal(alarm);
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

  // Loop crazy siren and vibration while modal is active and unanswered
  useEffect(() => {
    if (activeCheck && !answeredSuccess) {
      startCrazyHombreVivoAlarm();
      return () => {
        stopCrazyHombreVivoAlarm();
      };
    } else {
      stopCrazyHombreVivoAlarm();
    }
  }, [activeCheck?.id, answeredSuccess]);

  const handleTimeExpired = async (alarm: any) => {
    stopCrazyHombreVivoAlarm();
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

  const markAlarmAnswered = (id: string) => {
    if (!id) return;
    answeredAlarmIdsRef.current.add(id);
    lastSeenAlarmRef.current = id;
    try {
      const currentList = Array.from(answeredAlarmIdsRef.current).slice(-100);
      localStorage.setItem('704_answered_hombre_vivo_ids', JSON.stringify(currentList));
    } catch (e) {}
  };

  const handleConfirmPresence = async () => {
    if (!activeCheck) return;
    stopCrazyHombreVivoAlarm();
    try {
      setIsAnswering(true);
      if (timerRef.current) clearInterval(timerRef.current);

      if (activeCheck?.id) {
        markAlarmAnswered(activeCheck.id);
      }

      let lat = location?.lat || 0;
      let lng = location?.lng || 0;
      const opId = operatorId || user?.id || userResourceRef.current?.id;

      // 1. Log answered check in guard book
      await supabase.from('guard_book_entries').insert({
        objective_id: objectiveId || null,
        operator_id: opId,
        entry_type: 'hombre_vivo',
        content: `✅ CONTROL HOMBRE VIVO RESPONDIDO OK - PRESENCIA CONFIRMADA`,
        latitude: lat,
        longitude: lng,
        urgency: 'normal'
      });

      // 2. Mark alarm request as acknowledged in DB for this operator
      if (activeCheck.id && !activeCheck.id.startsWith('manual-') && !activeCheck.id.startsWith('push-')) {
        await supabase.from('alarms').update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        }).eq('id', activeCheck.id);
      }

      if (opId) {
        await supabase.from('alarms').update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('status', 'active')
        .in('alarm_type', ['hombre_vivo_solicitud', 'hombre_vivo'])
        .or(`operator_id.eq.${opId},triggered_by.eq.${opId}`);
      }

      setAnsweredSuccess(true);
      stopCrazyHombreVivoAlarm();

      setTimeout(() => {
        setActiveCheck(null);
        setIsAnswering(false);
        stopCrazyHombreVivoAlarm();
      }, 1800);
    } catch (e) {
      console.error('[HombreVivoModal] Answer error:', e);
    } finally {
      setIsAnswering(false);
      stopCrazyHombreVivoAlarm();
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
