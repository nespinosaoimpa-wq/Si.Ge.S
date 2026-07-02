'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SigesIconProps {
  className?: string;
  strokeColor?: string;
}

/**
 * SIGPAD Official Horizontal Logo SVG Component
 * Vectorial representation matching the geometry and style of the official SIGPAD brand logo.
 */
export function SigesIcon({ className = "w-32 h-10", strokeColor = "currentColor" }: SigesIconProps) {
  return (
    <svg 
      viewBox="0 0 230 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer rounded frame - Curved left border and horizontal open lines */}
      <path 
        d="M 170 15 L 35 15 C 21 15 10 26 10 40 C 10 54 21 65 35 65 L 205 65" 
        stroke={strokeColor} 
        strokeWidth="4.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Letter S - Curved and stylized */}
      <path 
        d="M 68 25 L 48 25 C 44 25 42 27.5 42 30.5 L 42 36.5 C 42 39.5 44 41.5 48 41.5 L 62 41.5 C 66 41.5 68 43.5 68 46.5 L 68 50.5 C 68 53.5 66 55.5 62 55.5 L 42 55.5" 
        stroke={strokeColor} 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Letter I - Vertical bar */}
      <path 
        d="M 80 25 L 80 55" 
        stroke={strokeColor} 
        strokeWidth="5" 
        strokeLinecap="round" 
      />
      
      {/* Letter G - Stylized open loop with inner crossbar */}
      <path 
        d="M 116 32 C 116 27 112 25 105 25 L 98 25 C 93 25 90 28 90 33 L 90 47 C 90 52 93 55 98 55 L 106 55 C 111 55 116 52 116 47 L 116 40 L 106 40" 
        stroke={strokeColor} 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Letter P - Vertical left stem and rounded loop */}
      <path 
        d="M 126 55 L 126 25 L 140 25 C 145 25 149 27.5 149 32.5 L 149 34.5 C 149 39.5 145 42 140 42 L 126 42" 
        stroke={strokeColor} 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Letter A - Triangle without horizontal crossbar (Lambda style) */}
      <path 
        d="M 158 55 L 169 25 L 180 55" 
        stroke={strokeColor} 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Letter D - Vertical left stem and enclosing outer loop */}
      <path 
        d="M 190 25 L 190 55 L 202 55 C 210 55 218 49 218 40 L 218 40 C 218 31 210 25 202 25 Z" 
        stroke={strokeColor} 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

interface SigesLogoProps {
  className?: string;
  iconSize?: string;
  variant?: 'light' | 'dark' | 'color';
}

/**
 * Integrated SIGPAD Brand Logo Component.
 * Unified display component to render the logo in navbars, sidebars and headers.
 */
export function SigesLogo({ 
  className = "", 
  iconSize = "w-36 h-12", 
  variant = "color" 
}: SigesLogoProps) {
  const getColors = () => {
    switch (variant) {
      case 'light':
        return {
          icon: '#FFFFFF',
        };
      case 'dark':
        return {
          icon: '#09090B',
        };
      case 'color':
      default:
        return {
          icon: '#3ABEFF', // SIGPAD cyan/blue accent for high presence
        };
    }
  };

  const colors = getColors();

  return (
    <div className={cn("flex items-center", className)}>
      <SigesIcon className={iconSize} strokeColor={colors.icon} />
    </div>
  );
}
