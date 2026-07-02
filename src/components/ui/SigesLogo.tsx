'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SigesIconProps {
  className?: string;
  strokeColor?: string;
}

export function SigesIcon({ className = "w-[15px] h-[27px]", strokeColor = "currentColor" }: SigesIconProps) {
  return (
    <svg 
      viewBox="0 0 15 27" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer rounded frame inspired by the SIGPAD logo layout */}
      <path 
        d="M 15 3 C 8.5 3 2.5 3 2.5 3 C 1.5 3 1 3.8 1 4.8 L 1 22.2 C 1 23.2 1.5 24 2.5 24 C 2.5 24 8.5 24 15 24" 
        stroke={strokeColor} 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Monogram letters S and P merged geometrically */}
      <path 
        d="M 11.5 7.5 L 6.5 7.5 C 5.5 7.5 4.5 8.2 4.5 9.2 L 4.5 20.8 C 4.5 20.8 4.5 21.5 4.5 21.5 M 4.5 12 L 10 12 C 11 12 11.5 12.8 11.5 13.8 L 11.5 15.2 C 11.5 16.2 11 17 10 17 L 4.5 17" 
        stroke={strokeColor} 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
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
