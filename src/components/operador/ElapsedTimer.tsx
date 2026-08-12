'use client';

import React, { useState, useEffect } from 'react';

interface ElapsedTimerProps {
  startTime: Date | string;
  className?: string;
  isPaused?: boolean;
}

/**
 * Isolated timer component — only THIS component re-renders every second,
 * not the entire operator page. Extracted for performance.
 */
export default function ElapsedTimer({ startTime, className, isPaused = false }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState('00:00:00');
  const pausedTimeRef = React.useRef<number | null>(null);
  const accumulatedPauseMsRef = React.useRef<number>(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();

    const tick = () => {
      let now = Date.now();
      if (isPaused) {
        if (pausedTimeRef.current === null) {
          pausedTimeRef.current = now;
        }
        now = pausedTimeRef.current;
      } else {
        if (pausedTimeRef.current !== null) {
          accumulatedPauseMsRef.current += (now - pausedTimeRef.current);
          pausedTimeRef.current = null;
        }
      }

      const activeMs = Math.max(0, now - start - accumulatedPauseMsRef.current);
      const h = Math.floor(activeMs / 3600000);
      const m = Math.floor((activeMs % 3600000) / 60000);
      const s = Math.floor((activeMs % 60000) / 1000);
      setElapsed(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime, isPaused]);

  if (isPaused) {
    return (
      <span className={className}>
        {elapsed}
        <span className="text-red-500 text-xs font-black uppercase tracking-wider block mt-1 animate-pulse">
          (RELOJ PAUSADO POR ABANDONO)
        </span>
      </span>
    );
  }

  return <span className={className}>{elapsed}</span>;
}
