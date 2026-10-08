'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CheckCircle2, BookOpen, User, Bell, ShieldAlert, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

import { unlockAudioContext } from '@/lib/push-notifications';
import HombreVivoCheckModal from '@/components/operador/HombreVivoCheckModal';

const navItems = [
  { name: 'Inicio', href: '/operador', icon: Home },
  { name: 'Novedades', href: '/operador/novedades', icon: ShieldAlert },
  { name: 'Rondines', href: '/operador/rondines', icon: Route },
  { name: 'Libro', href: '/operador/libro', icon: BookOpen },
  { name: 'Perfil', href: '/operador/perfil', icon: User },
];

export default function OperadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, isShiftActive } = useShift();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Tactically unlock Web Audio API Context on first screen touch/click
    const handleUserGesture = () => {
      unlockAudioContext();
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
    };

    window.addEventListener('touchstart', handleUserGesture, { passive: true });
    window.addEventListener('click', handleUserGesture, { passive: true });

    // Add a class to the html/body to trigger the scoped CSS overrides in globals.css
    document.documentElement.classList.add('operator-mode-layout');
    return () => {
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
      document.documentElement.classList.remove('operator-mode-layout');
    };
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/notifications?resource_id=${user.id}&unread_only=true`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setUnreadCount(data.length);
        }
      } catch (e) {}
    };

    fetchUnread();

    // Listen for new notifications
    const channel = supabase
      .channel(`op-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new as any;
          if (notif.resource_id === user.id || notif.resource_id?.includes?.(user.id)) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Real-time listener for manager commands/messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`op-commands-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_notifications', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const notif = payload.new as any;
          alert(`MESA DE CONTROL: ${notif.message}`);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div className="operador-shell overflow-hidden min-h-screen">
      {children}

      {/* Floating SOS Button (Global) */}
      <AnimatePresence>
        {isShiftActive && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-28 right-6 z-[110]"
          >
            <Link href="/operador/novedades?type=emergencia">
              <button className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-full shadow-[0_10px_30px_rgba(220,38,38,0.4)] flex items-center justify-center border-2 border-white/20 active:scale-90 transition-all relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500 opacity-0 group-active:opacity-20 transition-opacity" />
                <ShieldAlert size={32} strokeWidth={2.5} />
                <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <HombreVivoCheckModal
        operatorId={user?.id}
        isShiftActive={isShiftActive}
      />

      {/* Operator Floating Dark Glass Tactical Dock (Settigation Light Beam Effect) */}
      <nav className="fixed left-1/2 -translate-x-1/2 bottom-4 w-[calc(100%-24px)] max-w-md z-[100] bg-[#070b14]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.15)] rounded-full p-1.5 flex items-center justify-between gap-1 pointer-events-auto safe-bottom">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/operador' && pathname?.startsWith(item.href));
          const isBuzon = item.href === '/operador/notificaciones';
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className="relative flex-1 min-w-0 py-2 px-1 rounded-full flex flex-col items-center justify-center text-center transition-all select-none active:scale-95 group"
            >
              {isActive && (
                <>
                  {/* Sliding Glow Pill */}
                  <motion.div
                    layoutId="operador-dock-light"
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-cyan-500/25 via-blue-600/15 to-transparent border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                  {/* Sliding Top Light Ray */}
                  <motion.div
                    layoutId="operador-dock-top-beam"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-[2.5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rounded-full shadow-[0_0_10px_#22d3ee,0_0_18px_#06b6d4]"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                  {/* Bottom Ambient Spotlight */}
                  <motion.div
                    layoutId="operador-dock-floor-glow"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-9 h-2.5 bg-cyan-400/40 blur-sm rounded-full pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                </>
              )}

              <div className="relative">
                <item.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={cn(
                    "relative z-10 transition-all duration-200",
                    isActive 
                      ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] scale-110" 
                      : "text-zinc-400 group-hover:text-zinc-200"
                  )} 
                />

                {/* Notification badge */}
                {isBuzon && unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center border-2 border-[#070b14] z-20 shadow-md">
                    <span className="text-[7px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </div>
                )}
              </div>

              <span className={cn(
                "relative z-10 text-[9px] font-bold mt-1 tracking-wider uppercase transition-colors duration-200 truncate max-w-full",
                isActive ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-zinc-200"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

