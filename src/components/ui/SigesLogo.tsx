'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SigesIconProps {
  className?: string;
  strokeColor?: string; // Kept for interface compatibility, ignored for image render
}

/**
 * SIGPAD Official Logo Component rendering the real user-uploaded PNG image.
 */
export function SigesIcon({ className = "w-32 h-10" }: SigesIconProps) {
  return (
    <img 
      src="/logo_sigpad.png" 
      alt="SIGPAD" 
      className={cn("object-contain", className)}
      loading="eager"
    />
  );
}

interface SigesLogoProps {
  className?: string;
  iconSize?: string;
  variant?: 'light' | 'dark' | 'color'; // Ignored as PNG logo contains custom brand styling
}

/**
 * Integrated SIGPAD Brand Logo Component using the real uploaded asset.
 */
export function SigesLogo({ 
  className = "", 
  iconSize = "w-36 h-12" 
}: SigesLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <SigesIcon className={iconSize} />
    </div>
  );
}
