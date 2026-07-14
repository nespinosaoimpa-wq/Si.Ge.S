'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function getBrandConfig() {
  if (typeof window === 'undefined') {
    return { name: 'SIGPAD', logo: '/logo_sigpad.png' };
  }
  const host = window.location.hostname;
  const search = window.location.search;
  
  if (host.includes('704') || search.includes('brand=704')) {
    return {
      name: '704 Security',
      logo: '/logo_704.png'
    };
  }
  return {
    name: 'SIGPAD',
    logo: '/logo_sigpad.png'
  };
}

interface SIGPADIconProps {
  className?: string;
  strokeColor?: string; // Kept for interface compatibility, ignored for image render
}

/**
 * SIGPAD Official Logo Component rendering the real user-uploaded PNG image.
 */
export function SIGPADIcon({ className = "w-32 h-10" }: SIGPADIconProps) {
  const [logoSrc, setLogoSrc] = useState('/logo_sigpad.png');

  useEffect(() => {
    const brand = getBrandConfig();
    setLogoSrc(brand.logo);
  }, []);

  return (
    <img 
      src={logoSrc} 
      alt="SIGPAD" 
      className={cn("object-contain", className)}
      loading="eager"
      onError={(e) => {
        // Fallback to default SIGPAD logo if custom logo_704.png is not uploaded yet
        e.currentTarget.src = '/logo_sigpad.png';
      }}
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
