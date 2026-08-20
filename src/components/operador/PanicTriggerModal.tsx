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

      if (!lat || !lng) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
        }
      }

      // 1. Atomic insertion into central alarms table (triggers Manager realtime overlay)
      await supabase.from('alarms').insert({
        operator_id: operatorId || 'op_demo',
        objective_id: objectiveId || null,
        alarm_type: 'sos_panic',
        severity: 'critica',
        message: `🚨 ¡ALERTA DE PÁNICO S.O.S ACTIVADA! Operador en situación de emergencia en tiempo real.`,
        latitude: lat,
        longitude: lng,
        status: 'active',
        created_at: new Date().toISOString()
      });

      // 2. Insert incident into Supabase
      await supabase.from('incidents').insert({
        objective_id: objectiveId || null,
        operator_id: operatorId || 'op_demo',
        entry_type: 'panic',
        content: `🚨 ¡ALERTA DE PÁNICO S.O.S ACTIVADA! Operador en situación de emergencia en tiempo real.`,
        latitude: lat,
        longitude: lng,
        status: 'critica',
        created_at: new Date().toISOString()
      });

      // 3. Log in guard book for audit trace
      if (objectiveId) {
        await supabase.from('guard_book_entries').insert({
          objective_id: objectiveId,
          operator_id: operatorId || 'op_demo',
          entry_type: 'incidente',
          content: `🚨 ALERTA DE PÁNICO SOS DESPACHADA DESDE APP OPERADOR`,
          urgency: 'critica',
          latitude: lat,
          longitude: lng
        });
      }

      // 4. Trigger Server Web Push Notification (requireInteraction: true)
      fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          notification: {
            title: '🚨 ¡ALERTA DE PÁNICO S.O.S!',
            body: 'Un operador disparó la alerta de emergencia en pantalla.',
            url: '/gerente/mapa',
            requireInteraction: true
          }
        })
      });
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
