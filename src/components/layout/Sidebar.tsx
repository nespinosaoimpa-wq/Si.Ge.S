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
  { name: 'Libro de Novedades', href: '/gerente/libro', icon: BookOpen },
  { name: 'Hombre Vivo', href: '/gerente/hombre-vivo', icon: Activity },
  { name: 'Logística', href: '/gerente/inventario', icon: Package },
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

  // Top 4 core items for quick mobile access
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
      {/* Floating Dark Glass Tactical Mobile Dock (Settigation Light Beam Effect) */}
      <nav className="lg:hidden fixed left-1/2 -translate-x-1/2 bottom-4 w-[calc(100%-24px)] max-w-md z-[100] bg-[#070b14]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.15)] rounded-full p-1.5 flex items-center justify-between gap-1 pointer-events-auto safe-bottom">
        {primaryMobileItems.map((item) => {
          const isActive = item.href === '/gerente'
            ? (pathname === '/gerente' || pathname === '/gerente/mapa')
            : pathname?.startsWith(item.href);

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
                    layoutId="gerente-dock-light"
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-cyan-500/25 via-blue-600/15 to-transparent border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                  {/* Sliding Top Light Ray */}
                  <motion.div
                    layoutId="gerente-dock-top-beam"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-[2.5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rounded-full shadow-[0_0_10px_#22d3ee,0_0_18px_#06b6d4]"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                  {/* Bottom Ambient Spotlight */}
                  <motion.div
                    layoutId="gerente-dock-floor-glow"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-9 h-2.5 bg-cyan-400/40 blur-sm rounded-full pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                </>
              )}
              <item.icon 
                size={20} 
                className={cn(
                  "relative z-10 transition-all duration-200",
                  isActive 
                    ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] scale-110" 
                    : "text-zinc-400 group-hover:text-zinc-200"
                )} 
              />
              <span className={cn(
                "relative z-10 text-[9px] font-bold mt-1 tracking-wider uppercase transition-colors duration-200 truncate max-w-full",
                isActive ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-zinc-200"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* 5th Column: "Más" Button for Manager */}
        {!isGuardia && (
          <button 
            type="button" 
            onClick={() => setIsMoreOpen(!isMoreOpen)} 
            className="relative flex-1 min-w-0 py-2 px-1 rounded-full flex flex-col items-center justify-center text-center transition-all select-none active:scale-95 group cursor-pointer"
          >
            {isMoreOpen && (
              <>
                <motion.div
                  layoutId="gerente-dock-light"
                  className="absolute inset-0 rounded-full bg-gradient-to-b from-cyan-500/25 via-blue-600/15 to-transparent border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]"
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
                <motion.div
                  layoutId="gerente-dock-top-beam"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-[2.5px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rounded-full shadow-[0_0_10px_#22d3ee,0_0_18px_#06b6d4]"
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                />
              </>
            )}
            <Grid 
              size={20} 
              className={cn(
                "relative z-10 transition-all duration-200",
                isMoreOpen 
                  ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] scale-110" 
                  : "text-zinc-400 group-hover:text-zinc-200"
              )} 
            />
            <span className={cn(
              "relative z-10 text-[9px] font-bold mt-1 tracking-wider uppercase transition-colors duration-200",
              isMoreOpen ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-zinc-200"
            )}>
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
                className="lg:hidden fixed bottom-0 left-0 right-0 max-h-[88vh] z-[120] bg-[#0A182E]/92 backdrop-blur-2xl border-t border-cyan-400/30 rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.85),0_0_50px_rgba(0,122,255,0.25)]"
              >
                {/* Pull handle bar */}
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 -mb-1 shrink-0" />

                {/* Sheet Handle Header */}
                <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-[0_0_15px_rgba(0,122,255,0.35)]">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <p className="text-base font-black text-white leading-tight uppercase tracking-tight">
                        {(user as any)?.company_name || user?.user_metadata?.company_name || 'Empresa de Seguridad'}
                      </p>
                      <p className="text-xs text-cyan-300 font-semibold mt-0.5 tracking-wide">Menú de Herramientas Operativas</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMoreOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/90 active:scale-95 transition-all shadow-sm"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Sheet Body — Grid Options */}
                <div className="p-5 overflow-y-auto space-y-4 max-h-[68vh]">
                  <p className="text-[11px] font-black text-cyan-400/90 uppercase tracking-widest px-1 mb-1">Módulos Adicionales</p>

                  <div className="grid grid-cols-1 gap-3">
                    {secondaryMobileItems.map((sec) => {
                      const isActive = pathname === sec.href || pathname?.startsWith(sec.href);
                      return (
                        <Link key={sec.name} href={sec.href} onClick={() => setIsMoreOpen(false)}>
                          <div className={cn(
                            "flex items-center gap-4 p-3.5 rounded-2xl border transition-all active:scale-[0.98]",
                            isActive 
                              ? "bg-white/20 border-cyan-400 text-white shadow-[0_8px_25px_rgba(0,122,255,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)]" 
                              : "bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
                          )}>
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm",
                              isActive
                                ? "bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_0_15px_rgba(0,229,255,0.5)]"
                                : "bg-gradient-to-br from-blue-500/20 to-cyan-500/15 border border-cyan-400/30 text-cyan-300"
                            )}>
                              <sec.icon size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white tracking-tight truncate">{sec.name}</p>
                              <p className="text-xs text-zinc-300/80 truncate mt-0.5 font-medium">{sec.desc}</p>
                            </div>
                            <ChevronRight size={18} className="text-cyan-300/60 shrink-0" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Actions Section */}
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest px-1 pt-3 mb-1">Acciones Rápidas</p>

                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2.5 h-13 bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 rounded-2xl text-xs font-bold uppercase tracking-wider text-white active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all"
                    >
                      <Share2 size={18} className="text-cyan-300" />
                      <span>Compartir App</span>
                    </button>

                    <button
                      onClick={() => { signOut(); window.location.href = '/login'; }}
                      className="flex items-center justify-center gap-2.5 h-13 bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 rounded-2xl text-xs font-bold uppercase tracking-wider text-red-300 active:scale-95 shadow-[0_4px_16px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all"
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

        {/* ============ DESKTOP: Left Sidebar — dark with SIGPAD brand styling ============ */}
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[220px] z-[90] flex-col bg-zinc-950 border-r border-white/5">

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
    </aside>
  </>
  );
}
