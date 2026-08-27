'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, XCircle, Crown, Zap, Star } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

/**
 * PlanBanner — Muestra el estado de la suscripción activa del tenant.
 * Aparece en el layout del gerente (/gerente).
 * - Trial: avisa los días restantes.
 * - Suspendido: muestra alerta con información de contacto.
 * - Activo: muestra el plan actual de forma discreta.
 */

const PLAN_META: Record<string, { icon: any; label: string; color: string }> = {
  starter: { icon: Zap, label: 'Plan Básico', color: 'text-blue-400' },
  professional: { icon: Star, label: 'Plan Profesional', color: 'text-violet-400' },
  full: { icon: Star, label: 'Plan Único Full', color: 'text-violet-400' },
  enterprise: { icon: Crown, label: 'Plan Corporativo', color: 'text-amber-400' },
  trial: { icon: Clock, label: 'Prueba Gratuita', color: 'text-zinc-400' },
};

export function PlanBanner() {
  const { billingStatus, planTier, tenantName, isLoading, isSuspended, isTrialExpired } = useTenant();

  if (isLoading || !billingStatus) return null;

  // Cuenta atrás del trial
  if (billingStatus === 'trial' && !isTrialExpired) {
    const plan = PLAN_META['trial'];
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-blue-400" />
            <span className="text-blue-400 text-xs font-semibold">
              Período de prueba activo — 14 días gratuitos
            </span>
          </div>
          <a
            href="mailto:soporte@sigpad.com.ar?subject=Activar plan para mi empresa"
            className="text-[10px] bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded-full font-bold transition-colors"
          >
            Activar plan →
          </a>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Trial vencido
  if (isTrialExpired || billingStatus === 'suspended') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-red-500/10 border-b border-red-500/30 px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <XCircle size={14} className="text-red-400" />
          <span className="text-red-400 text-sm font-bold">
            {isSuspended ? 'Cuenta suspendida' : 'Período de prueba vencido'} — El acceso está limitado.
          </span>
        </div>
        <a
          href="mailto:soporte@sigpad.com.ar?subject=Reactivar cuenta SIGPAD"
          className="text-[10px] bg-red-500 hover:bg-red-400 text-white px-3 py-1 rounded-full font-bold transition-colors"
        >
          Contactar soporte →
        </a>
      </motion.div>
    );
  }

  // Plan activo — badge discreto
  if (billingStatus === 'active' && planTier) {
    const plan = PLAN_META[planTier] || PLAN_META.starter;
    return (
      <div className="w-full border-b border-zinc-900 px-4 py-1.5 flex items-center gap-2">
        <plan.icon size={12} className={plan.color} />
        <span className={`text-[10px] font-bold ${plan.color}`}>{plan.label}</span>
        <span className="text-zinc-600 text-[10px]">• {tenantName}</span>
      </div>
    );
  }

  return null;
}
