'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[]; // Heights in pixels or view height percentage, e.g. [150, 400, 700]
  defaultSnapIndex?: number; // Starting index in snapPoints (defaults to 1 or last)
  title?: string;
  className?: string;
  nonBlocking?: boolean; // If true, does not block clicks on the map behind it
  theme?: 'light' | 'dark' | 'glass';
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  snapPoints = [160, 420, typeof window !== 'undefined' ? window.innerHeight * 0.85 : 700],
  defaultSnapIndex = 1,
  title,
  className,
  nonBlocking = false,
  theme = 'glass'
}: BottomSheetProps) {
  const [currentHeight, setCurrentHeight] = useState(snapPoints[defaultSnapIndex]);
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Sync state if open status changes
  useEffect(() => {
    if (isOpen) {
      setCurrentHeight(snapPoints[defaultSnapIndex]);
      controls.start({ y: 0 });
      if (!nonBlocking) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (!nonBlocking) {
        document.body.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultSnapIndex, snapPoints, controls, nonBlocking]);

  const handleDragEnd = async (event: any, info: any) => {
    const deltaY = info.offset.y;
    const velocityY = info.velocity.y;

    // Calculate proposed next height based on drag direction and speed
    const currentAbsoluteHeight = currentHeight - deltaY;

    // Find the closest snap point
    let closestSnap = snapPoints[0];
    let minDiff = Math.abs(currentAbsoluteHeight - closestSnap);

    for (let i = 1; i < snapPoints.length; i++) {
      const diff = Math.abs(currentAbsoluteHeight - snapPoints[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closestSnap = snapPoints[i];
      }
    }

    // Dismiss if swiped down hard past the lowest snap point
    if (velocityY > 400 && currentAbsoluteHeight < snapPoints[0] + 50) {
      onClose();
      return;
    }

    setCurrentHeight(closestSnap);
    await controls.start({ y: 0, transition: { type: 'spring', damping: 25, stiffness: 220 } });
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-zinc-950 text-zinc-100 border-t border-zinc-800 shadow-2xl';
      case 'glass':
        return 'glass-sheet text-zinc-100 shadow-volumetric';
      case 'light':
      default:
        return 'bg-white text-zinc-900 border-t border-zinc-200 shadow-2xl';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Non-blocking layouts do not render a backdrop overlay */}
          {!nonBlocking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200]"
            />
          )}

          {/* Wrapper to control click throughs */}
          <div 
            className={cn(
              "fixed inset-0 z-[201] flex flex-col justify-end",
              nonBlocking ? "pointer-events-none" : "pointer-events-auto"
            )}
          >
            {/* Sheet */}
            <motion.div
              ref={sheetRef}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              animate={controls}
              initial={{ y: '100%' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{ 
                height: currentHeight, 
                touchAction: 'none' // Prevents browser scroll events during dragging
              }}
              className={cn(
                "w-full rounded-t-[2rem] flex flex-col overflow-hidden pointer-events-auto select-none",
                getThemeClasses(),
                className
              )}
            >
              {/* Drag Handle Bar */}
              <div className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing w-full">
                <div className="w-12 h-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors" />
              </div>

              {/* Title Section (Optional) */}
              {title && (
                <div className={cn(
                  "flex items-center justify-between px-6 pb-3 border-b",
                  theme === 'light' ? 'border-zinc-100' : 'border-white/5'
                )}>
                  <h2 className="text-sm font-black uppercase tracking-widest leading-none opacity-90">{title}</h2>
                  <button 
                    onClick={onClose} 
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
                  >
                    <X size={18} className="opacity-60 hover:opacity-100" />
                  </button>
                </div>
              )}

              {/* Scrollable Content Container */}
              <div className="flex-1 overflow-y-auto px-6 py-4 touch-pan-y select-text">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
