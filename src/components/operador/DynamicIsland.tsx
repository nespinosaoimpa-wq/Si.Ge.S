'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Satellite, Activity, Zap, Wifi, WifiOff, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicIslandProps {
  accuracy: number | null;
  distanceToTarget: number | null;
  syncStatus: 'online' | 'offline' | 'pending';
  lastPointTimestamp: number | null;
  isVisible: boolean;
  theme?: 'light' | 'dark';
}

export default function DynamicIsland({
  accuracy,
  distanceToTarget,
  syncStatus,
  lastPointTimestamp,
  isVisible,
  theme = 'dark',
}: DynamicIslandProps) {
  const [expanded, setExpanded] = useState(false);

  if (!isVisible) return null;

  const accuracyLevel =
    accuracy && accuracy <= 15 ? 'excellent' : accuracy && accuracy <= 50 ? 'good' : 'poor';
  const accentColor = {
    excellent: { dot: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    good:      { dot: 'bg-amber-500',   text: 'text-amber-400',   glow: 'shadow-amber-500/20' },
    poor:      { dot: 'bg-red-500',      text: 'text-red-400',     glow: 'shadow-red-500/20' },
  }[accuracyLevel];

  const secondsAgo = lastPointTimestamp ? Math.round((Date.now() - lastPointTimestamp) / 1000) : null;

  return (
    <div className="fixed top-[env(safe-area-inset-top,12px)] left-0 right-0 z-[55] flex justify-center pointer-events-none px-4 pt-2">
      <motion.div
        layout
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'pointer-events-auto cursor-pointer relative overflow-hidden',
          'bg-black/95 backdrop-blur-2xl border border-white/[0.05]',
          'shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
          accentColor.glow
        )}
        animate={{
          borderRadius: expanded ? 32 : 50,
          width: expanded ? 320 : 200,
          height: expanded ? 'auto' : 40,
        }}
        transition={{
          layout: { type: 'spring', damping: 30, stiffness: 400 },
          borderRadius: { duration: 0.3 },
        }}
      >
        <AnimatePresence mode="popLayout">
          {!expanded ? (
            /* ─── COMPACT STATE ─── */
            <motion.div
              key="compact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-4 h-[40px]"
            >
              {/* Refined Neon Pulse */}
              <div className="relative w-2 h-2 flex items-center justify-center">
                <div className={cn('w-1.5 h-1.5 rounded-full z-10', accentColor.dot)} />
                <div className={cn('absolute inset-0 rounded-full animate-ping opacity-40', accentColor.dot)} />
              </div>

              {/* Technical Data: Monospaced */}
              <span className={cn('text-[12px] font-mono font-black tracking-tighter tabular-nums', accentColor.text)}>
                {accuracy ? `${Math.round(accuracy)}M` : 'SEARCHING...'}
              </span>

              {/* Thin Divider */}
              <div className="w-[0.5px] h-3 bg-white/10" />

              {/* Sync indicator */}
              <div className="flex items-center gap-1.5 opacity-60">
                {syncStatus === 'online' ? (
                  <Wifi size={12} className="text-emerald-400" />
                ) : (
                  <WifiOff size={12} className="text-red-400" />
                )}
              </div>

              {/* Last update timer */}
              <span className="text-[9px] font-mono font-bold text-white/20 tabular-nums ml-auto">
                {secondsAgo !== null ? `${secondsAgo}S` : '—'}
              </span>
            </motion.div>
          ) : (
            /* ─── EXPANDED STATE ─── */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-5"
            >
              {/* Header: Refined Label */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="status-dot bg-primary" />
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">
                    Telemetría Activa
                  </span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-zinc-800 border border-white/5">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest italic">Encrypted</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* GPS Accuracy */}
                <div className="space-y-1.5">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Precisión GPS</p>
                  <div className="flex items-baseline gap-1">
                    <span className={cn('text-2xl font-mono font-black tracking-tighter tabular-nums', accentColor.text)}>
                      {accuracy ? accuracy.toFixed(1) : '---'}
                    </span>
                    <span className="text-[10px] font-black text-white/20">m</span>
                  </div>
                </div>

                {/* Distance to Target */}
                <div className="space-y-1.5">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Al Objetivo</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-mono font-black tracking-tighter tabular-nums text-blue-400">
                      {distanceToTarget ? Math.round(distanceToTarget) : '---'}
                    </span>
                    <span className="text-[10px] font-black text-white/20">m</span>
                  </div>
                </div>
              </div>

              {/* Status Row */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex gap-2">
                   <div className={cn(
                     "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-2",
                     syncStatus === 'online' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                   )}>
                     {syncStatus === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                     {syncStatus}
                   </div>
                   <div className="px-3 py-1 rounded-xl bg-zinc-800/50 text-zinc-500 border border-white/5 text-[9px] font-black uppercase tracking-wider flex items-center gap-2">
                     <Zap size={10} />
                     {secondsAgo !== null ? `${secondsAgo}s ago` : 'Waiting'}
                   </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Radio size={14} className="text-white/30" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
