'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SigesIconProps {
  className?: string;
  strokeColor?: string;
}

export function SigesIcon({ className = "w-10 h-10", strokeColor = "currentColor" }: SigesIconProps) {
  return (
    <svg 
      viewBox="0 0 220 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Stylized S Line */}
      <path 
        d="M 140 160 L 90 160 L 60 125 L 155 125 C 182 125 182 85 155 85 L 90 85 C 63 85 63 45 90 45 L 160 45" 
        stroke={strokeColor} 
        strokeWidth="18" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Dot with concentric circle on the top right */}
      <circle cx="192" cy="45" r="18" stroke={strokeColor} strokeWidth="8" />
      <circle cx="192" cy="45" r="5" fill={strokeColor} />
    </svg>
  );
}

interface SigesLogoProps {
  className?: string;
  iconSize?: string;
  textSize?: string;
  variant?: 'light' | 'dark' | 'color';
}

export function SigesLogo({ 
  className = "", 
  iconSize = "w-10 h-10", 
  textSize = "text-2xl", 
  variant = "color" 
}: SigesLogoProps) {
  const getColors = () => {
    switch (variant) {
      case 'light':
        return {
          icon: '#FFFFFF',
          text: 'text-white',
        };
      case 'dark':
        return {
          icon: '#09090B',
          text: 'text-zinc-900',
        };
      case 'color':
      default:
        return {
          icon: '#0F4C5C',
          text: 'text-[#0F4C5C]',
        };
    }
  };

  const colors = getColors();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <SigesIcon className={iconSize} strokeColor={colors.icon} />
      <div className="flex flex-col">
        <span className={cn("font-black tracking-tight leading-none uppercase font-display", colors.text, textSize)}>
          SIGPAD
        </span>
      </div>
    </div>
  );
}
