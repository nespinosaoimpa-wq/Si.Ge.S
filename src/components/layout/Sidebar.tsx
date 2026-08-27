'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Users, Settings, LogOut, Shield,
  ClipboardList, Home, User, BookOpen, Activity,
  CheckCircle2, Package, Calculator, Download, Share2, Building2,
  Grid, X, ChevronRight
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { useShift } from '@/components/providers/ShiftProvider';
import { SIGPADLogo } from '@/components/ui/SIGPADLogo';

const adminItems = [
  { name: 'Mapa', href: '/gerente', icon: MapPin },
  { name: 'Personal', href: '/gerente/personal', icon: Users },
  { name: 'Objetivos', href: '/gerente/objetivos', icon: ClipboardList },
  { name: 'Libro', href: '/gerente/libro', icon: BookOpen },
  { name: 'Hombre Vivo', href: '/gerente/hombre-vivo', icon: Activity },
  { name: 'Recurso Logístico', href: '/gerente/inventario', icon: Package },
  { name: 'Planillas', href: '/gerente/planillas', icon: Calculator },
  { name: 'Accesos', href: '/gerente/accesos', icon: Settings },
];

const guardiaItems = [
  { name: 'Inicio', href: '/operador', icon: Home },
  { name: 'Fichaje', href: '/operador/fichaje', icon: CheckCircle2 },
  { name: 'Novedades', href: '/operador/novedades', icon: BookOpen },
  { name: 'Perfil', href: '/operador/perfil', icon: User },
];

export function Sidebar() {
  const { user, role, signOut } = useAuth();
  const pathname = usePathname();
  const { theme } = useShift();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const shareData = {
      title: 'SIGPAD - Plataforma de Control',
      text: 'Sistema de Gestión Operativa y Control de Seguridad - SIGPAD',
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.origin);
        alert('📋 ¡Enlace copiado al portapapeles! Puedes enviarlo por WhatsApp u otro medio.');
      } catch (err) {
        alert(`Comparte este enlace: ${window.location.origin}`);
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sheet on route change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const isGuardia = pathname?.startsWith('/operador');
  const navItems = isGuardia ? guardiaItems : adminItems;

  if (!mounted) return null;
  if (pathname === '/login' || pathname === '/' || pathname === '/register' || pathname?.startsWith('/operador')) return null;

  // ============ MOBILE: Premium Ergonomic Bottom Navigation Bar ============
  if (isMobile) {
    // Top 4 core items for quick access
    const primaryMobileItems = isGuardia 
      ? guardiaItems 
      : [
          { name: 'Mapa', href: '/gerente', icon: MapPin },
          { name: 'Personal', href: '/gerente/personal', icon: Users },
          { name: 'Objetivos', href: '/gerente/objetivos', icon: ClipboardList },
          { name: 'Libro', href: '/gerente/libro', icon: BookOpen },
        ];

    const secondaryMobileItems = [
      { name: 'Recursos Logísticos (Stock)', href: '/gerente/inventario', icon: Package, desc: 'Equipamiento y armas' },
      { name: 'Planillas & Liquidación', href: '/gerente/planillas', icon: Calculator, desc: 'Cálculos de hs extras y sueldos' },
      { name: 'Control Hombre Vivo', href: '/gerente/hombre-vivo', icon: Activity, desc: 'Verificación de presencia' },
      { name: 'Gestión de Accesos', href: '/gerente/accesos', icon: Settings, desc: 'Roles y permisos de usuarios' },
    ];

    return (
      <>
        {/* Fixed Mobile Bottom Bar (5 equal columns) — High Contrast & Maximum Legibility */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[92px] z-[100] grid grid-cols-5 items-center bg-zinc-950/98 backdrop-blur-2xl border-t border-white/15 px-1 safe-bottom shadow-[0_-15px_50px_rgba(0,0,0,0.8)]">
          {primaryMobileItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/gerente' && pathname?.startsWith(item.href));

            return (
              <Link key={item.name} href={item.href} className="flex flex-col items-center justify-center h-full active:scale-95 transition-transform py-1.5">
                <div className={cn(
                  'w-14 h-11 rounded-2xl flex items-center justify-center transition-all',
                  isActive 
                    ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)] scale-110' 
                    : 'text-zinc-400 hover:text-white'
                )}>
                  <item.icon size={26} />
                </div>
                <span className={cn('text-[13px] font-black uppercase mt-1.5 tracking-tight truncate max-w-full leading-none', isActive ? 'text-amber-400 font-extrabold' : 'text-zinc-300')}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* 5th Column: "Más" Button for Manager */}
          {!isGuardia && (
            <button 
              onClick={() => setIsMoreOpen(!isMoreOpen)} 
              className="flex flex-col items-center justify-center h-full active:scale-95 transition-transform py-1.5"
            >
              <div className={cn(
                'w-14 h-11 rounded-2xl flex items-center justify-center transition-all',
                isMoreOpen 
                  ? 'bg-amber-400 text-black shadow-[0_0_30px_rgba(251,191,36,0.6)] scale-110' 
                  : 'text-zinc-400 hover:text-white'
              )}>
                <Grid size={26} />
              </div>
              <span className={cn('text-[13px] font-black uppercase mt-1.5 tracking-tight truncate leading-none', isMoreOpen ? 'text-amber-400 font-extrabold' : 'text-zinc-300')}>
                Más
              </span>
            </button>
          )}
        </nav>

        {/* Mobile Slide-Up Full Drawer Sheet for "Más" */}
        <AnimatePresence>
          {isMoreOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMoreOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/90 backdrop-blur-xl z-[110]"
              />

              {/* Sheet Container */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="lg:hidden fixed bottom-0 left-0 right-0 max-h-[88vh] z-[120] bg-zinc-950 border-t-2 border-white/20 rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.95)]"
              >
                {/* Sheet Handle Header */}
                <div className="p-6 pb-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/90">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <p className="text-base font-black text-white leading-tight uppercase tracking-tight">
                        {(user as any)?.company_name || user?.user_metadata?.company_name || 'Empresa de Seguridad'}
                      </p>
                      <p className="text-xs text-amber-400 font-bold mt-0.5 uppercase tracking-wide">Menú de Herramientas Operativas</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMoreOpen(false)}
                    className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Sheet Body — Grid Options */}
                <div className="p-6 overflow-y-auto space-y-4 max-h-[68vh]">
                  <p className="text-sm font-black text-amber-400 uppercase tracking-widest px-1 mb-2">Módulos Adicionales</p>

                  <div className="grid grid-cols-1 gap-3.5">
                    {secondaryMobileItems.map((sec) => {
                      const isActive = pathname === sec.href || pathname?.startsWith(sec.href);
                      return (
                        <Link key={sec.name} href={sec.href} onClick={() => setIsMoreOpen(false)}>
                          <div className={cn(
                            "flex items-center gap-4.5 p-4.5 rounded-2xl border-2 transition-all active:scale-[0.98]",
                            isActive 
                              ? "bg-amber-400/20 border-amber-400/60 text-amber-400 shadow-xl shadow-amber-400/15" 
                              : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          )}>
                            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/15 flex items-center justify-center shrink-0">
                              <sec.icon size={26} className="text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-black text-white truncate uppercase tracking-tight">{sec.name}</p>
                              <p className="text-xs text-zinc-300 truncate mt-1 font-semibold">{sec.desc}</p>
                            </div>
                            <ChevronRight size={22} className="text-zinc-400 shrink-0" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Actions Section */}
                  <p className="text-sm font-black text-zinc-400 uppercase tracking-widest px-1 pt-4 mb-2">Acciones Rápidas</p>

                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-3 h-16 bg-white/10 border border-white/15 rounded-2xl text-sm font-black uppercase text-white active:scale-95 shadow-lg"
                    >
                      <Share2 size={22} className="text-amber-400" />
                      <span>Compartir App</span>
                    </button>

                    <button
                      onClick={() => { signOut(); window.location.href = '/login'; }}
                      className="flex items-center justify-center gap-3 h-16 bg-red-500/20 border border-red-500/40 rounded-2xl text-sm font-black uppercase text-red-400 active:scale-95 shadow-lg"
                    >
                      <LogOut size={22} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ============ DESKTOP: Left Sidebar — dark with SIGPAD brand styling ============
  return (
    <div className="fixed left-0 top-0 bottom-0 w-[220px] z-[90] flex flex-col bg-zinc-950 border-r border-white/5">

      {/* Brand */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <SIGPADLogo variant="light" iconSize="w-44 h-12" className="scale-[1.6] origin-left ml-2.5 my-2" />
        </div>
        <div className="mt-1.5 px-1">
          <p className="text-zinc-500 text-[11px] font-medium">
            {isGuardia ? 'Panel Operativo' : 'Panel de Control'}
          </p>
        </div>

        <AnimatePresence>
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-white/5"
            >
              <div className="flex items-center gap-2.5 px-2.5 py-2 bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-primary/30 shrink-0 shadow-sm">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                  ) : (
                    <User className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate leading-tight">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-[10px] text-amber-400 font-bold mt-0.5 flex items-center gap-1 truncate">
                    <Building2 size={10} className="shrink-0 text-amber-400" />
                    <span className="truncate">
                      {(user as any)?.company_name || user?.user_metadata?.company_name || (role === 'superadmin' ? 'Matriz SIGPAD' : 'Empresa de Seguridad')}
                    </span>
                  </p>
                  {(role === 'superadmin' || (user as any)?.role === 'superadmin' || user?.email === 'sigpad.info@gmail.com') && (
                    <a href="/superadmin" className="text-[9px] font-black text-amber-400 hover:underline block mt-0.5">
                      👑 Ir a SuperAdmin
                    </a>
                  )}
                </div>
                <button
                  onClick={() => { signOut(); window.location.href = '/login'; }}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all shrink-0 ml-auto"
                  title="Cerrar Sesión"
                >
                  <LogOut size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/gerente' && item.href !== '/operador' && pathname?.startsWith(item.href));

          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/15'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              )}>
                <item.icon size={16} />
                <span>{item.name}</span>
                {isActive && <div className="ml-auto w-1 h-4 bg-primary rounded-full" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <button
          onClick={handleShare}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-primary hover:bg-white/5 transition-all text-sm font-semibold"
        >
          <Share2 size={16} />
          <span>Compartir Enlace</span>
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('trigger-pwa-install'))}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-primary hover:bg-white/5 transition-all text-sm font-semibold"
        >
          <Download size={16} />
          <span>Descargar App</span>
        </button>
        <button
          onClick={() => { signOut(); window.location.href = '/login'; }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-white/5 transition-all text-sm font-semibold"
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
