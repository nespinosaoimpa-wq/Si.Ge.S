'use client';

import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TacticalSheetRef {
  snapTo: (index: number) => void;
  currentSnap: number;
}

export interface TacticalSheetProps {
  /** Snap points as fractions of viewport height occupied by the sheet */
  snapPoints?: number[];
  /** Index into snapPoints for initial position */
  initialSnap?: number;
  /** Called when snap point changes */
  onSnapChange?: (index: number) => void;
  /** Content — receives { currentSnap, snapTo } as render prop */
  children: React.ReactNode | ((ctx: { currentSnap: number; snapTo: (i: number) => void }) => React.ReactNode);
  /** Extra classes on the sheet container */
  className?: string;
  /** Theme */
  theme?: 'light' | 'dark';
}

export const TacticalSheet = forwardRef<TacticalSheetRef, TacticalSheetProps>(function TacticalSheet(
  {
    snapPoints = [0.12, 0.50, 0.88],
    initialSnap = 0,
    onSnapChange,
    children,
    className,
    theme = 'light',
  },
  ref
) {
  const [windowH, setWindowH] = useState(800);
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWindowH(window.innerHeight);
    setReady(true);
    const onResize = () => setWindowH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // y = distance from bottom of viewport to bottom of sheet
  // When sheet occupies fraction f of viewport, y = f * windowH offset from bottom
  // We use y as the TOP position: y = windowH * (1 - fraction)
  const fractionToY = useCallback(
    (fraction: number) => windowH * (1 - fraction),
    [windowH]
  );

  const y = useMotionValue(fractionToY(snapPoints[initialSnap]));

  // Set initial position once ready
  useEffect(() => {
    if (!ready) return;
    y.set(fractionToY(snapPoints[initialSnap]));
  }, [ready, windowH]);

  const snapTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, snapPoints.length - 1));
      setCurrentSnap(clamped);
      onSnapChange?.(clamped);
      animate(y, fractionToY(snapPoints[clamped]), {
        type: 'spring',
        damping: 32,
        stiffness: 380,
        mass: 0.8,
      });
    },
    [snapPoints, fractionToY, y, onSnapChange]
  );

  useImperativeHandle(ref, () => ({ snapTo, currentSnap }), [snapTo, currentSnap]);

  // Backdrop opacity: transparent at collapsed, dark at expanded
  const backdropOpacity = useTransform(
    y,
    [fractionToY(snapPoints[snapPoints.length - 1]), fractionToY(snapPoints[0])],
    [0.5, 0]
  );

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const currentY = y.get();
      const velocity = info.velocity.y;
      const yPositions = snapPoints.map((sp) => fractionToY(sp));

      let targetIndex: number;

      if (Math.abs(velocity) > 400) {
        // Velocity-based: snap in swipe direction
        if (velocity < 0) {
          // Swiping UP → larger sheet → find closest snap above current
          const above = yPositions.map((yp, i) => ({ i, yp })).filter((s) => s.yp < currentY);
          targetIndex = above.length > 0 ? above[above.length - 1].i : snapPoints.length - 1;
        } else {
          // Swiping DOWN → smaller sheet → find closest snap below
          const below = yPositions.map((yp, i) => ({ i, yp })).filter((s) => s.yp > currentY);
          targetIndex = below.length > 0 ? below[0].i : 0;
        }
      } else {
        // Proximity-based
        targetIndex = yPositions.reduce(
          (best, yp, i) => (Math.abs(yp - currentY) < Math.abs(yPositions[best] - currentY) ? i : best),
          0
        );
      }

      setCurrentSnap(targetIndex);
      onSnapChange?.(targetIndex);
      animate(y, yPositions[targetIndex], {
        type: 'spring',
        damping: 32,
        stiffness: 380,
        mass: 0.8,
      });
    },
    [snapPoints, fractionToY, y, onSnapChange]
  );

  const isDark = theme === 'dark';

  if (!ready) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black pointer-events-none z-[49]"
        style={{ opacity: backdropOpacity }}
      />

      {/* Sheet */}
      <motion.div
        className={cn(
          'fixed left-0 right-0 z-[50] flex flex-col will-change-transform',
          isDark
            ? 'bg-[#0a0a0a]/[0.97] backdrop-blur-3xl border-t border-white/[0.06]'
            : 'bg-white/[0.97] backdrop-blur-3xl border-t border-black/[0.04]',
          className
        )}
        style={{
          y,
          height: windowH,
          borderTopLeftRadius: 36,
          borderTopRightRadius: 36,
          boxShadow: isDark
            ? '0 -12px 80px rgba(0,0,0,0.6)'
            : '0 -12px 60px rgba(0,0,0,0.08)',
        }}
        drag="y"
        dragConstraints={{
          top: fractionToY(snapPoints[snapPoints.length - 1]),
          bottom: fractionToY(snapPoints[0]),
        }}
        dragElastic={0.04}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-[10px] pb-[6px] cursor-grab active:cursor-grabbing shrink-0">
          <motion.div
            className={cn(
              'h-[5px] rounded-full transition-all duration-300',
              isDark ? 'bg-white/[0.15]' : 'bg-black/[0.12]'
            )}
            animate={{ width: currentSnap >= 2 ? 56 : 40 }}
          />
        </div>

        {/* Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain',
            currentSnap === 0 && 'overflow-hidden' // Prevent scroll in collapsed
          )}
        >
          {typeof children === 'function'
            ? (children as any)({ currentSnap, snapTo })
            : children}
        </div>
      </motion.div>
    </>
  );
});
