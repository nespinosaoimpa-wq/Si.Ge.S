'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, Satellite, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebugTelemetryProps {
  accuracy: number | null;
  distanceToTarget: number | null;
  syncStatus: 'online' | 'offline' | 'pending';
  lastPointTimestamp: number | null;
  isVisible: boolean;
}

export default function DebugTelemetry({
  accuracy,
  distanceToTarget,
  syncStatus,
  lastPointTimestamp,
  isVisible
}: DebugTelemetryProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] pointer-events-none">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl overflow-hidden relative"
      >
        {/* Matrix background effect */}
        <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
          <div className="text-[6px] font-mono text-green-500 leading-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="whitespace-nowrap">
                {Math.random().toString(36).substring(2, 15).repeat(5)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              Si.Ge.S Telemetry
            </h4>
          </div>
          <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10">
          {/* Accuracy Metric */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-white/40 uppercase tracking-wider">
              <Satellite className="w-2.5 h-2.5" />
              GPS Accuracy
            </div>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-lg font-black font-mono",
                accuracy && accuracy < 15 ? "text-green-400" : "text-amber-400"
              )}>
                {accuracy ? accuracy.toFixed(1) : '---'}
              </span>
              <span className="text-[8px] font-bold text-white/20">m</span>
            </div>
          </div>

          {/* Distance Metric */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-white/40 uppercase tracking-wider">
              <Activity className="w-2.5 h-2.5" />
              Dist. Target
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black font-mono text-blue-400">
                {distanceToTarget ? Math.round(distanceToTarget) : '---'}
              </span>
              <span className="text-[8px] font-bold text-white/20">m</span>
            </div>
          </div>

          {/* Sync Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-white/40 uppercase tracking-wider">
              <ShieldCheck className="w-2.5 h-2.5" />
              Data Sync
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                syncStatus === 'online' ? "bg-green-500/20 text-green-500" : 
                syncStatus === 'pending' ? "bg-amber-500/20 text-amber-500" : 
                "bg-red-500/20 text-red-500"
              )}>
                {syncStatus}
              </div>
            </div>
          </div>

          {/* Last Pulse */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-white/40 uppercase tracking-wider">
              <Zap className="w-2.5 h-2.5" />
              Last Pulse
            </div>
            <div className="text-[10px] font-mono text-white/60">
              {lastPointTimestamp ? `${Math.round((Date.now() - lastPointTimestamp) / 1000)}s ago` : 'Waiting...'}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
