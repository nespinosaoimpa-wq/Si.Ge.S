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
  { name: 'Stock', href: '/gerente/inventario', icon: Package },
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
        {/* Fixed Mobile Bottom Bar (5 equal columns) — Enlarged touch targets & crisp typography */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[82px] z-[100] grid grid-cols-5 items-center bg-zinc-950/98 backdrop-blur-2xl border-t border-white/10 px-2 safe-bottom shadow-[0_-12px_40px_rgba(0,0,0,0.7)]">
          {primaryMobileItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/gerente' && pathname?.startsWith(item.href));

            return (
              <Link key={item.name} href={item.href} className="flex flex-col items-center justify-center h-full active:scale-95 transition-transform py-1">
                <div className={cn(
                  'w-12 h-10 rounded-2xl flex items-center justify-center transition-all',
                  isActive 
                    ? 'bg-amber-400/20 border border-amber-400/50 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-105' 
                    : 'text-zinc-400 hover:text-white'
                )}>
                  <item.icon size={22} />
                </div>
                <span className={cn('text-[11px] font-black uppercase mt-1 tracking-tight truncate max-w-full', isActive ? 'text-amber-400 font-extrabold' : 'text-zinc-400')}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* 5th Column: "Más" Button for Manager */}
          {!isGuardia && (
            <button 
              onClick={() => setIsMoreOpen(!isMoreOpen)} 
              className="flex flex-col items-center justify-center h-full active:scale-95 transition-transform py-1"
            >
              <div className={cn(
                'w-12 h-10 rounded-2xl flex items-center justify-center transition-all',
                isMoreOpen 
                  ? 'bg-amber-400 text-black shadow-[0_0_25px_rgba(251,191,36,0.5)] scale-105' 
                  : 'text-zinc-400 hover:text-white'
              )}>
                <Grid size={22} />
              </div>
              <span className={cn('text-[11px] font-black uppercase mt-1 tracking-tight truncate', isMoreOpen ? 'text-amber-400 font-extrabold' : 'text-zinc-400')}>
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
                className="lg:hidden fixed inset-0 bg-black/85 backdrop-blur-lg z-[110]"
              />

              {/* Sheet Container */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="lg:hidden fixed bottom-0 left-0 right-0 max-h-[88vh] z-[120] bg-zinc-950 border-t border-white/10 rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-[0_-15px_50px_rgba(0,0,0,0.9)]"
              >
                {/* Sheet Handle Header */}
                <div className="p-5 pb-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white leading-tight uppercase tracking-tight">
                        {(user as any)?.company_name || user?.user_metadata?.company_name || 'Empresa de Seguridad'}
                      </p>
                      <p className="text-xs text-amber-400/80 font-bold mt-0.5">Menú de Herramientas Operativas</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMoreOpen(false)}
                    className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white active:scale-95"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Sheet Body — Grid Options */}
                <div className="p-5 overflow-y-auto space-y-3 max-h-[65vh]">
                  <p className="text-xs font-black text-amber-400 uppercase tracking-widest px-1 mb-2">Módulos Adicionales</p>

                  <div className="grid grid-cols-1 gap-3">
                    {secondaryMobileItems.map((sec) => {
                      const isActive = pathname === sec.href || pathname?.startsWith(sec.href);
                      return (
                        <Link key={sec.name} href={sec.href} onClick={() => setIsMoreOpen(false)}>
                          <div className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98]",
                            isActive 
                              ? "bg-amber-400/15 border-amber-400/50 text-amber-400 shadow-lg shadow-amber-400/10" 
                              : "bg-white/5 border-white/5 text-white hover:bg-white/10"
                          )}>
                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
                              <sec.icon size={22} className="text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{sec.name}</p>
                              <p className="text-xs text-zinc-400 truncate mt-0.5 font-medium">{sec.desc}</p>
                            </div>
                            <ChevronRight size={18} className="text-zinc-500 shrink-0" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Actions Section */}
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest px-1 pt-4 mb-2">Acciones Rápidas</p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2.5 h-14 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase text-zinc-200 active:scale-95"
                    >
                      <Share2 size={18} className="text-amber-400" />
                      <span>Compartir App</span>
                    </button>

                    <button
                      onClick={() => { signOut(); window.location.href = '/login'; }}
                      className="flex items-center justify-center gap-2.5 h-14 bg-red-500/15 border border-red-500/30 rounded-2xl text-xs font-black uppercase text-red-400 active:scale-95"
                    >
                      <LogOut size={18} />
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
              <div className="flex items-center gap-4 px-3 py-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden border border-primary/30 shrink-0 shadow-[0_0_20px_rgba(15,76,92,0.15)]">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                  ) : (
                    <User className="w-6 h-6 text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate leading-tight">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-[11px] text-amber-400 font-bold mt-0.5 flex items-center gap-1 truncate">
                    <Building2 size={11} className="shrink-0 text-amber-400" />
                    <span className="truncate">
                      {(user as any)?.company_name || user?.user_metadata?.company_name || (role === 'superadmin' ? 'Matriz SIGPAD' : 'Empresa de Seguridad')}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => { signOut(); window.location.href = '/login'; }}
                  className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                  title="Cerrar Sesión"
                >
                  <LogOut size={14} />
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
