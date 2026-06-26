'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LiveActivityFeedProps {
  liveFeed: any[];
  isMobile: boolean;
}

export function LiveActivityFeed({ liveFeed, isMobile }: LiveActivityFeedProps) {
  if (isMobile) return null;

  return (
    <div className="absolute top-20 right-6 z-[40] w-72 pointer-events-none">
      <AnimatePresence>
        {liveFeed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-2xl shadow-2xl p-4 pointer-events-auto"
          >
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-[#0F4C5C] rounded-full animate-pulse shadow-[0_0_8px_rgba(15, 76, 92,0.3)]" />
                 <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-900">Centro de Monitoreo</h3>
              </div>
              <span className="text-[8px] text-zinc-400 font-bold uppercase">Vivo</span>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mt-3">
              {liveFeed.map((log, i) => (
                <motion.div 
                  key={log.id + i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3 pl-3 py-2 rounded-lg transition-colors border-l-2",
                    log.type === 'event' ? "bg-red-50 border-red-500/50" : "bg-zinc-50 border-[#0F4C5C]/50"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start text-[8px] uppercase tracking-tighter">
                      <p className={cn("font-black", log.type === 'event' ? "text-red-500" : "text-[#0F4C5C]")}>
                        {log.type === 'event' ? 'Evento Reportado' : 'U-TRACK SYNC'}
                      </p>
                      <p className="text-zinc-400">{new Date(log.recorded_at || log.created_at).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-[9px] text-zinc-600 font-medium mt-1 line-clamp-2">
                      {log.type === 'event' ? log.content : `Sinc: ${log.resource_name || log.resource_id?.substring(0,8)}`}
                    </p>
                    {log.accuracy && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-black text-[#0F4C5C] uppercase tracking-widest">Prec: {Math.round(log.accuracy)}m</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
