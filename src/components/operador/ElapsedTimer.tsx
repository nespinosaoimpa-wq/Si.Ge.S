'use client';

import React, { useState, useEffect } from 'react';

interface ElapsedTimerProps {
  startTime: Date | string;
  className?: string;
}

/**
 * Isolated timer component — only THIS component re-renders every second,
 * not the entire operator page. Extracted for performance.
 */
export default function ElapsedTimer({ startTime, className }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const start = new Date(startTime).getTime();

    const tick = () => {
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    tick(); // immediate first render
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return <span className={className}>{elapsed}</span>;
}
