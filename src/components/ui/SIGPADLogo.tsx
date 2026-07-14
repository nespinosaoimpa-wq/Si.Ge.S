'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SIGPADIconProps {
  className?: string;
  strokeColor?: string; // Kept for interface compatibility, ignored for image render
}

/**
 * SIGPAD Official Logo Component rendering the real user-uploaded PNG image.
 */
export function SIGPADIcon({ className = "w-32 h-10" }: SIGPADIconProps) {
  return (
    <img 
      src="/logo_sigpad.png" 
      alt="SIGPAD" 
      className={cn("object-contain", className)}
      loading="eager"
    />
  );
}

interface SIGPADLogoProps {
  className?: string;
  iconSize?: string;
  variant?: 'light' | 'dark' | 'color'; // Ignored as PNG logo contains custom brand styling
}

/**
 * Integrated SIGPAD Brand Logo Component using the real uploaded asset.
 */
export function SIGPADLogo({ 
  className = "", 
  iconSize = "w-36 h-12" 
}: SIGPADLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <SIGPADIcon className={iconSize} />
    </div>
  );
}
