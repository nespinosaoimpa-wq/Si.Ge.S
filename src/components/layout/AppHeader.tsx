'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { SigesIcon } from '@/components/ui/SigesLogo';

export function AppHeader() {
  const { user, role } = useAuth();
  const pathname = usePathname();
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const isGuardia = pathname?.startsWith('/operador');

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Hide on login/home/register and all operator routes (they have their own UI)
  if (pathname === '/login' || pathname === '/' || pathname === '/register' || pathname?.startsWith('/operador')) return null;

  // Hide on desktop for admin (sidebar handles branding)
  // Show only on mobile, but HIDE on mobile if on the manager map view to save space
  const isManagerDashboard = pathname === '/gerente';

  return (
    <header className={cn(
      "fixed top-0 right-0 left-0 lg:left-[240px] h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200 z-[80] items-center justify-between px-4 lg:px-8 safe-top transition-all",
      isManagerDashboard ? "hidden lg:flex" : "flex"
    )}>
      {/* Left: Mobile brand + Page context */}
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <SigesIcon className="w-24 h-8 text-[#0F4C5C]" />
        </div>

        {/* Desktop: page title */}
        <div className="hidden lg:block">
          <p className="text-[13px] text-gray-500 font-normal">
            {mounted ? time.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Time */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
          <span className="text-sm font-medium text-gray-600 tabular-nums">
            {mounted ? time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black text-xs font-bold uppercase ring-2 ring-white shadow-sm overflow-hidden bg-cover bg-center"
             style={user?.user_metadata?.avatar_url ? { backgroundImage: `url(${user.user_metadata.avatar_url})` } : {}}>
          {!user?.user_metadata?.avatar_url && (
            user?.email?.charAt(0) || (role === 'gerente' ? 'A' : 'G')
          )}
        </div>
      </div>
    </header>
  );
}
