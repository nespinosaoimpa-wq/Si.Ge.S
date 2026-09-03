'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { playAlertTone } from '@/lib/push-notifications';
import { Button } from '@/components/ui/Button';

interface PanicTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  operatorId?: string;
  objectiveId?: string | null;
  location?: { lat: number; lng: number } | null;
}

export default function PanicTriggerModal({
  isOpen,
  onClose,
  operatorId,
  objectiveId,
  location
}: PanicTriggerModalProps) {
  const [countdown, setCountdown] = useState(3);
  const [status, setStatus] = useState<'counting' | 'dispatched' | 'cancelled'>('counting');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStatus('counting');
      setCountdown(3);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // TACTICAL BLUEPRINT REQUIREMENT: 100% SILENT ON OPERATOR PHONE
    // Silent micro-vibration of 100ms for discreet tactile confirmation without alerting aggressors
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }

    setStatus('counting');
    setCountdown(3);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          dispatchPanicAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const dispatchPanicAlert = async () => {
    setStatus('dispatched');
    
    // Discreet tactile confirmation
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }

    try {
      let lat = location?.lat || 0;
      let lng = location?.lng || 0;
      let resolvedObjectiveId = objectiveId || null;
      let operatorName = 'Operador';
      let tenantId: string | null = null;

      // 1. Resolve from Objective if objectiveId is present
      if (resolvedObjectiveId) {
        try {
          const { data: obj } = await supabase
            .from('objectives')
            .select('latitude, longitude, tenant_id')
            .eq('id', resolvedObjectiveId)
            .maybeSingle();

          if (obj) {
            if (obj.tenant_id) tenantId = obj.tenant_id;
            if ((!lat || !lng) && obj.latitude && obj.longitude) {
              lat = Number(obj.latitude);
              lng = Number(obj.longitude);
            }
          }
        } catch (e) {
          console.warn('[PanicModal] Failed to fetch objective details:', e);
        }
      }

      // 2. Fetch operator details (name, tenant_id, current_objective_id)
      if (operatorId && operatorId !== 'recurso_demo') {
        try {
          const { data: res } = await supabase
            .from('resources')
            .select('name, tenant_id, current_objective_id')
            .or(`id.eq.${operatorId},assigned_to.eq.${operatorId}`)
            .maybeSingle();

          if (res) {
            if (res.name) operatorName = res.name;
            if (!tenantId && res.tenant_id) tenantId = res.tenant_id;
            if (!resolvedObjectiveId && res.current_objective_id) {
              resolvedObjectiveId = res.current_objective_id;
            }
          }
        } catch (e) {
          console.warn('[PanicModal] Failed to fetch resource details:', e);
        }
      }

      // 3. Fallback to SIGPAD_user cookie if tenant_id is still missing
      if (!tenantId && typeof document !== 'undefined') {
        try {
          const cookieStr = document.cookie.split('; ').find(row => row.startsWith('SIGPAD_user='));
          if (cookieStr) {
            const userObj = JSON.parse(decodeURIComponent(cookieStr.split('=')[1]));
            if (userObj.tenant_id) tenantId = userObj.tenant_id;
          }
        } catch (e) {}
      }

      // 4. Fallback to browser geolocation if coords still missing
      if (!lat || !lng) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
        }
      }

      const panicPayload = {
        operator_id: operatorId || 'op_demo',
        operator_name: operatorName,
        triggered_by: operatorId || 'op_demo',
        objective_id: resolvedObjectiveId,
        alarm_type: 'sos_panic',
        severity: 'critica',
        message: `🚨 ¡ALERTA DE PÁNICO S.O.S ACTIVADA! ${operatorName} en situación de emergencia.`,
        latitude: lat,
        longitude: lng,
        status: 'active',
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      };

      // Atomic insertions into alarms, incidents, and guard_book_entries
      await Promise.allSettled([
        supabase.from('alarms').insert(panicPayload),
        supabase.from('incidents').insert({
          objective_id: resolvedObjectiveId,
          operator_id: operatorId || 'op_demo',
          operator_name: operatorName,
          entry_type: 'panic',
          urgency: 'critica',
          content: `🚨 ¡ALERTA DE PÁNICO S.O.S ACTIVADA! ${operatorName} en situación de emergencia.`,
          latitude: lat,
          longitude: lng,
          status: 'abierto',
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        } as any),
        resolvedObjectiveId ? supabase.from('guard_book_entries').insert({
          objective_id: resolvedObjectiveId,
          operator_id: operatorId || 'op_demo',
          resource_id: operatorId || 'op_demo',
          entry_type: 'incidente',
          content: `🚨 ALERTA DE PÁNICO SOS DESPACHADA DESDE APP OPERADOR - ${operatorName}`,
          urgency: 'critica',
          latitude: lat,
          longitude: lng,
          tenant_id: tenantId
        }) : Promise.resolve()
      ]);

      // 4. Trigger Server Web Push Notification (requireInteraction: true)
      fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          notification: {
            title: '🚨 ¡ALERTA DE PÁNICO S.O.S!',
            body: `${operatorName} disparó la alerta de emergencia.`,
            url: '/gerente/mapa',
            requireInteraction: true
          }
        })
      }).catch(() => {});
    } catch (e) {
      console.error('[PanicModal] Dispatch error:', e);
    }
  };

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('cancelled');
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleForceDispatchNow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    dispatchPanicAlert();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          className="bg-zinc-950 border-2 border-red-600/40 p-8 rounded-[3.5rem] max-w-sm w-full shadow-[0_0_80px_rgba(220,38,38,0.4)] flex flex-col items-center relative overflow-hidden"
        >
          {/* Animated red pulse background */}
          <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />

          {status === 'counting' && (
            <>
              <div className="w-24 h-24 bg-red-600/20 border-2 border-red-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(220,38,38,0.5)] animate-bounce">
                <ShieldAlert size={48} className="text-red-500" />
              </div>

              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-1">
                Protocolo de Emergencia
              </span>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                Despachando S.O.S
              </h2>
              <p className="text-xs text-zinc-400 font-medium mb-6">
                La central SIGPAD y la mesa de control recibirán tu ubicación en tiempo real.
              </p>

              {/* Big Countdown Badge */}
              <div className="w-20 h-20 bg-red-600 text-white font-black text-4xl rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-red-600/30">
                {countdown}
              </div>

              <div className="w-full space-y-3">
                <Button
                  onClick={handleForceDispatchNow}
                  className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-red-600/40"
                >
                  ⚡ ENVIAR AHORA MISMO
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full h-14 rounded-2xl border-white/10 text-zinc-400 font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-white"
                >
                  Cancelar (Falsa Alarma)
                </Button>
              </div>
            </>
          )}

          {status === 'dispatched' && (
            <>
              <div className="w-24 h-24 bg-emerald-500/20 border-2 border-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>

              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-1">
                Alerta Despachada
              </span>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                S.O.S ENVIADO A CENTRAL
              </h2>
              <p className="text-xs text-zinc-300 font-medium mb-8 leading-relaxed">
                Mesa de control, gerencia y supervisores operativos fueron notificados con tu geolocalización.
              </p>

              <Button
                onClick={onClose}
                className="w-full h-16 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-[11px]"
              >
                Entendido / Cerrar
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
