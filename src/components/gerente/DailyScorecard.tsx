'use client';

import React, { useMemo } from 'react';
import { ShieldAlert, ShieldCheck, Clock, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ScorecardProps {
  entries: any[];
  totalObjectives?: number;
}

interface Metric {
  label: string;
  value: string;
  sub?: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  pulse?: boolean;
}

export default function DailyScorecard({ entries, totalObjectives = 0 }: ScorecardProps) {
  const metrics = useMemo(() => {
    const criticalAlerts = entries.filter(
      e => e.urgency === 'critica' || e.urgency === 'alta' || e.entry_type === 'emergencia'
    ).length;

    const checkins = entries.filter(e => e.entry_type === 'fichaje');
    const uniqueObjectivesWithCheckin = new Set(checkins.map(e => e.objective_id)).size;
    const coveragePct = totalObjectives > 0
      ? Math.round((uniqueObjectivesWithCheckin / totalObjectives) * 100)
      : checkins.length > 0 ? 100 : 0;

    const rounds = entries.filter(e => e.entry_type === 'ronda');
    const roundEffectiveness = rounds.length > 0 ? 100 : 0;

    const incidents = entries.filter(e => e.entry_type === 'incidente');
    let avgResponseMin = 0;
    if (incidents.length > 0) {
      const durations: number[] = [];
      for (let i = 0; i < incidents.length - 1; i++) {
        const t1 = new Date(incidents[i].created_at).getTime();
        const t2 = new Date(incidents[i + 1]?.created_at || incidents[i].created_at).getTime();
        const diff = Math.abs(t2 - t1) / 60000;
        if (diff > 0 && diff < 120) durations.push(diff);
      }
      if (durations.length > 0) {
        avgResponseMin = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      }
    }

    return { criticalAlerts, coveragePct, roundEffectiveness, avgResponseMin, checkins: checkins.length, incidents: incidents.length, rounds: rounds.length };
  }, [entries, totalObjectives]);

  const cards: Metric[] = [
    {
      label: 'Alertas Críticas',
      value: metrics.criticalAlerts.toString(),
      sub: metrics.criticalAlerts === 0 ? 'Sin incidentes' : 'Requieren revisión',
      color: metrics.criticalAlerts > 0 ? 'text-red-400' : 'text-emerald-400',
      bg: metrics.criticalAlerts > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
      border: metrics.criticalAlerts > 0 ? 'border-red-500/20' : 'border-emerald-500/20',
      icon: <ShieldAlert size={20} />,
      pulse: metrics.criticalAlerts > 0,
    },
    {
      label: '% Cobertura',
      value: `${metrics.coveragePct}%`,
      sub: `${metrics.checkins} fichaje(s) registrado(s)`,
      color: metrics.coveragePct >= 80 ? 'text-emerald-400' : metrics.coveragePct >= 50 ? 'text-amber-400' : 'text-red-400',
      bg: metrics.coveragePct >= 80 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
      border: metrics.coveragePct >= 80 ? 'border-emerald-500/20' : 'border-amber-500/20',
      icon: <Target size={20} />,
    },
    {
      label: 'Rondines',
      value: metrics.rounds > 0 ? `${metrics.roundEffectiveness}%` : '--',
      sub: `${metrics.rounds} ronda(s) completada(s)`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: <ShieldCheck size={20} />,
    },
    {
      label: 'T° Respuesta Avg',
      value: metrics.avgResponseMin > 0 ? `${metrics.avgResponseMin}min` : '--',
      sub: `${metrics.incidents} incidente(s) en el día`,
      color: metrics.avgResponseMin > 10 ? 'text-orange-400' : 'text-emerald-400',
      bg: metrics.avgResponseMin > 10 ? 'bg-orange-500/10' : 'bg-emerald-500/10',
      border: metrics.avgResponseMin > 10 ? 'border-orange-500/20' : 'border-emerald-500/20',
      icon: <Clock size={20} />,
    },
  ];

  // Mini sparkline bars (last 6 hours approximation from entries)
  const sparkleBars = useMemo(() => {
    const buckets = Array(8).fill(0);
    entries.forEach(e => {
      const hour = new Date(e.created_at).getHours() % 8;
      buckets[hour]++;
    });
    const max = Math.max(...buckets, 1);
    return buckets.map(v => Math.max(4, Math.round((v / max) * 32)));
  }, [entries]);

  return (
    <div className="space-y-4">
      {/* Tactical header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-[#0F4C5C]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Resumen del Día · Actualizado en tiempo real
          </span>
        </div>
        {/* Sparkline */}
        <div className="hidden sm:flex items-end gap-0.5 h-6">
          {sparkleBars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.05 }}
              className="w-1.5 bg-zinc-900/10 rounded-t-sm"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn(
              'relative p-5 rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all hover:shadow-md hover:border-zinc-300',
              card.label === 'Alertas Críticas' && metrics.criticalAlerts > 0 ? 'bg-red-50/50 border-red-200' : ''
            )}
          >
            {card.pulse && (
              <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
              </span>
            )}
            <div className={cn('mb-2.5', card.color)}>{card.icon}</div>
            <p className="text-2xl lg:text-3xl font-bold font-mono tabular-nums tracking-tight text-zinc-950">
              {card.value}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mt-1">
              {card.label}
            </p>
            {card.sub && (
              <p className="text-xs text-zinc-400 font-medium mt-0.5 truncate">{card.sub}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
