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

      {/* Operator Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around px-4 border-t transition-all safe-bottom bg-black border-white/5",
      )} style={{ height: '84px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/operador' && pathname?.startsWith(item.href));
          const isBuzon = item.href === '/operador/notificaciones';
          return (
            <Link key={item.name} href={item.href} className="flex flex-col items-center justify-center gap-1.5 p-2 w-full active:scale-90 transition-all relative group">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative overflow-hidden",
                isActive 
                  ? "text-primary bg-primary/10 shadow-[0_0_20px_rgba(15, 76, 92,0.15)]" 
                  : "text-zinc-600 hover:text-zinc-400"
              )}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                
                {/* Active Glow Indicator */}
                {isActive && (
                  <motion.div 
                    layoutId="nav-active-bg"
                    className="absolute inset-0 bg-primary/5 rounded-2xl"
                    initial={false}
                  />
                )}

                {/* Notification badge */}
                {isBuzon && unreadCount > 0 && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center border-2 border-black z-20">
                    <span className="text-[7px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-[0.2em] transition-all",
                isActive ? "text-primary" : "text-zinc-600"
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

