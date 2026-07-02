'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ElapsedTimer from '@/components/operador/ElapsedTimer';
import { 
  CheckCircle2, Clock, MapPin, AlertCircle, 
  User, ChevronRight, LogIn, LogOut, Building2,
  Calendar, ShieldCheck, Activity, Map as MapIcon, Zap,
  Book, ShieldAlert, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { useShift } from '@/components/providers/ShiftProvider';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { SigesIcon } from '@/components/ui/SigesLogo';

export default function GuardiaDashboard() {
  const { isShiftActive, shiftId, shiftData, startShift, theme, toggleTheme } = useShift();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedObjective, setAssignedObjective] = useState<any>(null);
  const [linkageError, setLinkageError] = useState<string | null>(null);
  const [linkageDebug, setLinkageDebug] = useState<any>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSource, setGpsSource] = useState<'Satellite' | 'WiFi/Cell' | 'Searching'>('Searching');
  const [scheduledShift, setScheduledShift] = useState<any>(null);
  
  const OPERATOR_ID = user?.id || 'recurso_demo';

  useEffect(() => {
    const fetchObjective = async () => {
      setLoading(true);
      try {
        if (OPERATOR_ID !== 'recurso_demo' || user?.email) {
          const params = new URLSearchParams();
          if (OPERATOR_ID !== 'recurso_demo') params.append('id', OPERATOR_ID);
          if (user?.email) params.append('email', user.email || '');

          const response = await fetch(`/api/resources/profile?${params.toString()}`);
          const res = await response.json();
          
          if (res && !res.error) {
            if (res.objectives) {
              setAssignedObjective(Array.isArray(res.objectives) ? res.objectives[0] : res.objectives);
            } else if (res.current_objective_id) {
              setAssignedObjective(res.objectives);
            }

            // Fetch scheduled shifts for this operator
            const { data: programmed } = await supabase
              .from('guard_shifts')
              .select('*, objectives(*)')
              .eq('operator_id', res.id || OPERATOR_ID)
              .eq('status', 'programado')
              .gte('checkin_time', new Date().toISOString())
              .order('checkin_time', { ascending: true })
              .limit(1)
              .maybeSingle();
            
            if (programmed) setScheduledShift(programmed);
          } else if (res?.isRecovering) {
            setLinkageError('Tu cuenta de correo no coincide con ningún legajo. Pídele al Gerente Operativo que ingrese tu email exacto en tu perfil.');
            setLinkageDebug(res.debug);
            setAssignedObjective(null);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchObjective();

    // REAL-TIME: Subscribe to changes on own resource record
    const channel = supabase
      .channel(`resource-${OPERATOR_ID}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'resources' },
        async (payload) => {
          const updated = payload.new as any;
          if (
            updated.assigned_to === OPERATOR_ID || 
            updated.id === OPERATOR_ID || 
            (user?.email && updated.email?.toLowerCase() === user.email.toLowerCase())
          ) {
            fetchObjective();
          }
        }
      )
      .subscribe();

    // Watch GPS accuracy
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsAccuracy(pos.coords.accuracy);
          setGpsSource(pos.coords.accuracy < 30 ? 'Satellite' : 'WiFi/Cell');
        },
        () => setGpsSource('Searching'),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    return () => {
      supabase.removeChannel(channel);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [OPERATOR_ID]);

  // Check DB for active shifts
  useEffect(() => {
    const checkActiveShift = async () => {
      if (!user || isShiftActive) return;
      try {
        const { data: resource } = await supabase
          .from('resources')
          .select('id')
          .eq('assigned_to', user.id)
          .limit(1)
          .maybeSingle();

        let query = supabase
          .from('guard_shifts')
          .select('*')
          .in('status', ['activo', 'active']);

        if (resource?.id) {
          const isResourceUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id);
          let orClause = `operator_id.eq.${user.id}`;
          if (isResourceUUID) {
            orClause += `,operator_id.eq.${resource.id}`;
          } else {
            orClause += `,operator_id.eq."${resource.id}"`;
          }
          query = query.or(orClause);
        } else {
          query = query.eq('operator_id', user.id);
        }

        const { data: activeShift, error } = await query.limit(1).maybeSingle();

        if (activeShift && !error) {
          startShift({
            time: new Date(activeShift.checkin_time),
            startTime: new Date(activeShift.checkin_time),
            location: { lat: activeShift.checkin_latitude, lng: activeShift.checkin_longitude },
            operator_id: activeShift.operator_id,
            objective_id: activeShift.objective_id
          }, activeShift.id);
        }
      } catch (e) {
        console.error('Error checking active shift:', e);
      }
    };
    checkActiveShift();
  }, [user, isShiftActive]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0e12] via-[#141720] to-[#090a0d] text-zinc-200 pb-32 relative overflow-hidden font-sans antialiased">
      
      {/* ── Background Subtle Aesthetics ────────────────────────────── */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-zinc-800/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] bg-zinc-900/5 blur-[150px] rounded-full pointer-events-none" />

      {/* ── Top Header Navigation ────────────────────────────────────── */}
      <header className="w-full border-b border-white/[0.04] bg-[#0c0e12]/60 backdrop-blur-md h-16 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
        <div className="flex items-center">
          <SigesIcon className="w-32 h-9 scale-110 origin-left" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/15">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Online</span>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ───────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 pt-8 space-y-6 relative z-10">
        
        {/* Profile Card Header */}
        <div className="flex items-center justify-between pb-2">
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em] font-mono">Terminal Móvil de Seguridad</p>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mt-1 font-display">
              {isShiftActive ? "Servicio en Curso" : "Panel de Guardia"}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Operador Activo</p>
            <p className="text-xs font-black text-zinc-300 mt-0.5">{user?.email?.split('@')[0] || 'Vigilador'}</p>
          </div>
        </div>

        {/* Warning if unlinked */}
        {linkageError && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-red-500">Sincronización Pendiente</p>
              <p className="text-xs font-medium text-red-400 mt-0.5">{linkageError}</p>
            </div>
          </motion.div>
        )}

        {/* GPS Quality Widget (Premium Glassmorphism) */}
        {isShiftActive && !linkageError && (() => {
          const category = gpsAccuracy 
            ? (() => {
                if (gpsAccuracy <= 10) return { label: 'EXCELENTE', color: 'text-emerald-400', bgColor: 'bg-emerald-400/5', borderColor: 'border-emerald-500/10' };
                if (gpsAccuracy <= 30) return { label: 'BUENA', color: 'text-green-400', bgColor: 'bg-green-400/5', borderColor: 'border-green-500/10' };
                if (gpsAccuracy <= 100) return { label: 'MEDIA', color: 'text-amber-400', bgColor: 'bg-amber-400/5', borderColor: 'border-amber-500/10' };
                return { label: 'BAJA', color: 'text-red-400', bgColor: 'bg-red-400/5', borderColor: 'border-red-500/10' };
              })()
            : { label: 'BUSCANDO', color: 'text-zinc-500', bgColor: 'bg-zinc-800/5', borderColor: 'border-zinc-800/10' };
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-white/[0.04] bg-[#161820]/40 backdrop-blur-xl shadow-xl flex items-center justify-between gap-4 overflow-hidden relative"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all border border-white/[0.02]",
                  category.bgColor, category.color
                )}>
                  {gpsAccuracy && gpsAccuracy < 30 ? <MapPin size={18} /> : <Zap size={18} className="animate-pulse" />}
                </div>
                 <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">GPS Operativo</span>
                    <span className={cn(
                      "text-[8px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider",
                      category.bgColor, category.color, category.borderColor
                    )}>
                      {category.label}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-0.5">
                    {gpsSource === 'Satellite' ? 'Señal Satelital Directa' : 'Triangulación Móvil'} {gpsAccuracy && `(±${Math.round(gpsAccuracy)}m)`}
                  </h4>
                </div>
              </div>
              
              <p className="hidden md:block text-[10px] text-zinc-500 font-medium">
                {category.label === 'EXCELENTE' ? 'Precisión máxima de geocercas activada.' :
                 category.label === 'BUENA' ? 'Precisión de geolocalización estándar.' :
                 category.label === 'MEDIA' ? 'Buscando optimizar coordenadas satelitales.' :
                 category.label === 'BAJA' ? '⚠️ Moverse a cielo abierto.' : 'Buscando señal...'}
              </p>
            </motion.div>
          );
        })()}

        {/* ── Main Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Status Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-0 border border-white/[0.04] bg-[#161922]/50 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden rounded-[2.5rem] text-white">
              
              {/* Header Timer Segment */}
              <div className={cn(
                "px-6 py-14 text-center bg-gradient-to-b transition-all",
                isShiftActive ? "from-emerald-500/[0.02] to-transparent" : "from-zinc-800/[0.02] to-transparent"
              )}>
                  <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full border border-white/[0.04] bg-[#0c0d12]/80 shadow-inner">
                    {isShiftActive ? (
                      <Activity size={32} className="text-emerald-400 animate-pulse" />
                    ) : (
                      <LogOut size={32} className="text-zinc-650" />
                    )}
                  </div>
                  
                  {isShiftActive ? (
                    <div className="flex flex-col items-center">
                      <ElapsedTimer
                        startTime={shiftData?.startTime || shiftData?.time || new Date()}
                        className="text-5xl lg:text-6xl font-mono font-black tracking-tight text-white leading-none"
                      />
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em] mt-3">Cronómetro de Turno Activo</p>
                      
                      {/* Grid Táctico de Emergencia y Reporte */}
                      <div className="grid grid-cols-2 gap-4 w-full mt-10 px-2">
                        <Button 
                          variant="danger" 
                          className="h-20 rounded-2xl shadow-xl shadow-red-950/20 flex flex-col items-center justify-center gap-1.5 group relative overflow-hidden active:scale-95 transition-all border border-red-500/10 bg-red-650 hover:bg-red-700"
                          onClick={() => window.location.href = '/operador/novedades?type=emergencia'}
                        >
                          <Zap size={24} className="animate-pulse text-white" />
                          <span className="text-[9px] font-black uppercase tracking-widest italic text-white">Botón de Pánico</span>
                        </Button>

                        <Button 
                          variant="outline" 
                          className="h-20 rounded-2xl border-white/[0.03] bg-[#0c0d12]/50 hover:bg-[#0c0d12]/80 flex flex-col items-center justify-center gap-1.5 group transition-all active:scale-95 text-white"
                          onClick={() => window.location.href = '/operador/libro'}
                        >
                          <Book size={24} className="text-zinc-400 group-hover:text-white transition-colors" />
                          <span className="text-[9px] font-black uppercase tracking-widest italic text-zinc-400 group-hover:text-white transition-colors">Bitácora</span>
                        </Button>

                        <Button 
                          variant="outline" 
                          className="h-20 rounded-2xl border-white/[0.03] bg-[#0c0d12]/50 hover:bg-[#0c0d12]/80 flex flex-col items-center justify-center gap-1.5 group transition-all active:scale-95 text-white"
                          onClick={() => window.location.href = '/operador/novedades'}
                        >
                          <ShieldAlert size={24} className="text-zinc-400 group-hover:text-amber-400 transition-colors" />
                          <span className="text-[9px] font-black uppercase tracking-widest italic text-zinc-400 group-hover:text-white transition-colors">Novedades</span>
                        </Button>

                        <Button 
                          variant="outline" 
                          className="h-20 rounded-2xl border-white/[0.03] bg-[#0c0d12]/50 hover:bg-[#0c0d12]/80 flex flex-col items-center justify-center gap-1.5 group transition-all active:scale-95 text-white"
                        >
                          <Smartphone size={24} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
                          <span className="text-[9px] font-black uppercase tracking-widest italic text-zinc-400 group-hover:text-white transition-colors">Soporte</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      {scheduledShift ? (
                        <div className="p-5 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] max-w-sm w-full">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Clock className="text-amber-400" size={16} />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500">Servicio Programado</span>
                          </div>
                          <h4 className="text-base font-black uppercase tracking-tight text-white">
                            {scheduledShift.objectives?.name || 'Nuevo Objetivo'}
                          </h4>
                          <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">
                            {new Date(scheduledShift.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(scheduledShift.checkout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} HS
                          </p>
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-[#0c0d12]/80 border border-white/[0.04] rounded-full flex items-center justify-center">
                          <ShieldCheck size={24} className="text-zinc-700" />
                        </div>
                      )}
                      <div>
                        <p className="text-xl font-black uppercase italic tracking-tight text-white">
                          {scheduledShift ? 'Servicio Pendiente' : 'Sin Turno Activo'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {scheduledShift ? 'Iniciá tu turno en el horario asignado' : 'Debes realizar el fichaje para iniciar el servicio'}
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Botón Principal (Fichar Entrada / Salida con degradado premium) */}
              <div className="p-6 border-t border-white/[0.04] bg-[#0c0e12]/30">
                  <Link href="/operador/fichaje" className="flex-1">
                    <Button 
                      variant={isShiftActive ? "danger" : "success"} 
                      className={cn(
                        "w-full h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all active:scale-[0.98] border-none shadow-xl",
                        isShiftActive 
                          ? "bg-red-650 hover:bg-red-750 text-white shadow-red-950/20" 
                          : "bg-gradient-to-r from-white via-zinc-100 to-zinc-300 text-zinc-950 shadow-white/5 hover:from-zinc-150 hover:to-zinc-250"
                      )}
                    >
                      {isShiftActive ? (
                        <div className="flex items-center justify-center gap-2">
                          <LogOut size={16} />
                          <span>Finalizar Servicio</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <LogIn size={16} />
                          <span>Fichar Entrada</span>
                        </div>
                      )}
                    </Button>
                  </Link>
              </div>
            </Card>

            {/* Quick Actions (Monochrome Minimalist) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cargar Novedad', href: '/operador/novedades', icon: AlertCircle },
                { label: 'Rondines', href: '/operador/rondines', icon: Clock },
                { label: 'Mapa Local', href: '/operador/fichaje', icon: MapIcon },
                { label: 'Mi Perfil', href: '/operador/perfil', icon: User },
              ].map((action, i) => (
                <Link key={i} href={action.href} className="group">
                    <Card className="p-4 border border-white/[0.04] bg-[#161922]/30 hover:bg-[#161922]/60 flex flex-col items-center gap-3 text-center transition-all active:scale-[0.95] hover:border-zinc-800 overflow-hidden text-white rounded-2xl">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-[#0c0e12]/80 border border-white/[0.02] text-zinc-400 group-hover:text-white transition-all shrink-0">
                          <action.icon size={20} />
                      </div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-200 transition-colors truncate w-full">{action.label}</span>
                    </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Secondary Column: Info & Details */}
          <div className="space-y-6">
            
            {/* Objective Info Widget */}
            <Card className="p-6 border border-white/[0.04] bg-[#161922]/50 text-white rounded-2xl shadow-xl">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 font-mono">Puesto Asignado</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-white/[0.04] bg-[#0c0d12]/80 shadow-xl shrink-0">
                    <Building2 size={24} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black uppercase leading-tight text-white truncate">
                      {assignedObjective?.name || 'Buscando Asignación'}
                    </h3>
                     <div className="flex items-center gap-1.5 mt-1">
                          <MapPin size={12} className="text-zinc-600 shrink-0" />
                          <p className="text-[10px] font-bold text-zinc-500 uppercase truncate">
                            {assignedObjective?.address || 'Sin Puesto Asignado'}
                          </p>
                     </div>
                  </div>
                </div>
            </Card>

            {/* System Info Widget */}
            <Card className="p-6 border border-white/[0.04] bg-[#161922]/50 text-white rounded-2xl shadow-xl">
               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 font-mono">Estado del Sistema</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider">SIGPAD OS</span>
                  <span className="font-black text-zinc-300">2.1.0</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-white/[0.04] pt-4">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider">Último Sync</span>
                  <span className="font-black text-zinc-300">Sincronizado</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

         {/* Sub Footer Info */}
         <p className="text-[9px] text-center text-zinc-700 font-black uppercase tracking-[0.3em] py-12 font-mono">
           SIGPAD • Sistema Inteligente de Gestión y Seguridad
         </p>

      </main>
    </div>
  );
}
