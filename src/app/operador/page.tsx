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
    <div className="min-h-screen bg-gradient-to-b from-[#0b0c10] via-[#10121a] to-[#07080b] text-zinc-200 pb-20 relative overflow-hidden font-sans antialiased flex flex-col justify-between">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-zinc-800/10 blur-[100px] rounded-full pointer-events-none" />

      {/* ── Main Container (Mobile-First Centered Grid) ───────────────── */}
      <div className="w-full max-w-md mx-auto px-5 pt-8 flex-1 flex flex-col justify-between space-y-6 relative z-10">
        
        {/* Cabecera / Logo Integrado y Prolijo */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-48 h-14 bg-[#09090b]/40 border border-white/[0.04] rounded-2xl flex items-center justify-center p-1.5 shadow-xl backdrop-blur-md">
            <SigesIcon className="w-full h-full object-contain" />
          </div>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/15">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest">Sistema En Línea</span>
          </div>
        </div>

        {/* Info del Operador */}
        <div className="flex justify-between items-center px-2">
          <div>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Terminal de Guardia</p>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight mt-0.5 font-display">
              {isShiftActive ? "Servicio Activo" : "Panel de Inicio"}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider">ID Operador</p>
            <p className="text-xs font-black text-zinc-350">{user?.email?.split('@')[0] || 'Vigilador'}</p>
          </div>
        </div>

        {/* Warning if unlinked */}
        {linkageError && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-xs font-medium text-red-400">{linkageError}</p>
          </motion.div>
        )}

        {/* Tarjeta Principal de Servicio (Glassmorphism de alta gama) */}
        <Card className="border border-white/[0.04] bg-[#141620]/60 backdrop-blur-xl shadow-2xl overflow-hidden rounded-[2rem] text-white p-6 space-y-6 flex flex-col justify-between">
          
          {/* Puesto Asignado Segment */}
          <div className="flex items-center gap-4 border-b border-white/[0.04] pb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.04] bg-[#090a0f]/80 shadow-md shrink-0 text-zinc-400">
              <Building2 size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-black text-zinc-550 uppercase tracking-widest font-mono">Objetivo Asignado</p>
              <h3 className="text-sm font-black uppercase text-white truncate mt-0.5">
                {assignedObjective?.name || 'Esperando Asignación'}
              </h3>
              <p className="text-[10px] font-bold text-zinc-500 truncate mt-0.5">
                {assignedObjective?.address || 'Sin servicio de destino'}
              </p>
            </div>
          </div>

          {/* Estado de Turno / Cronómetro */}
          <div className="py-2 text-center flex flex-col items-center">
            {isShiftActive ? (
              <div className="space-y-2">
                <div className="w-14 h-14 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Activity size={24} className="text-emerald-400 animate-pulse" />
                </div>
                <ElapsedTimer
                  startTime={shiftData?.startTime || shiftData?.time || new Date()}
                  className="text-4xl font-mono font-black tracking-tight text-white leading-none"
                />
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-2">Horas de Servicio</p>
              </div>
            ) : (
              <div className="space-y-3 w-full">
                {scheduledShift ? (
                  <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] text-center">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Turno Próximo</p>
                    <h4 className="text-xs font-black uppercase text-white mt-1">{scheduledShift.objectives?.name}</h4>
                    <p className="text-[9px] font-bold text-zinc-550 mt-0.5">
                      {new Date(scheduledShift.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} HS
                    </p>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full border border-white/[0.04] bg-[#090a0f]/80 flex items-center justify-center mx-auto mb-2 text-zinc-600">
                    <ShieldCheck size={22} />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-black uppercase text-zinc-300">
                    {scheduledShift ? 'Servicio Asignado' : 'Fichaje Pendiente'}
                  </h4>
                  <p className="text-[10px] text-zinc-550 mt-1">
                    {scheduledShift ? 'Iniciá servicio en el horario programado' : 'Registrá tu ingreso para comenzar'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botón de Fichaje */}
          <div className="pt-2">
            <Link href="/operador/fichaje" className="w-full block">
              <Button 
                variant={isShiftActive ? "danger" : "success"} 
                className={cn(
                  "w-full h-14 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.97] border-none shadow-lg",
                  isShiftActive 
                    ? "bg-red-650 hover:bg-red-750 text-white shadow-red-950/20" 
                    : "bg-gradient-to-r from-white via-zinc-100 to-zinc-350 text-zinc-950 shadow-white/5 hover:from-zinc-150 hover:to-zinc-250"
                )}
              >
                {isShiftActive ? (
                  <div className="flex items-center justify-center gap-2">
                    <LogOut size={14} />
                    <span>Finalizar Turno</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <LogIn size={14} />
                    <span>Fichar Entrada</span>
                  </div>
                )}
              </Button>
            </Link>
          </div>
        </Card>

        {/* GPS Quality Status (Sutil y elegante) */}
        {isShiftActive && !linkageError && (
          <div className="flex items-center justify-between px-3 py-1 bg-[#141620]/30 border border-white/[0.02] rounded-xl text-[9px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <MapPin size={10} className="text-zinc-550" />
              <span>Precisión GPS: ±{gpsAccuracy ? Math.round(gpsAccuracy) : '...'}m</span>
            </div>
            <span className="font-mono uppercase tracking-wider">{gpsSource === 'Satellite' ? 'SATÉLITE' : 'RED'}</span>
          </div>
        )}

        {/* Botones del Operador Activo (SOS y Bitácoras) */}
        {isShiftActive && (
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="danger" 
              className="h-16 rounded-xl flex items-center justify-center gap-2 border border-red-500/10 bg-red-650/10 hover:bg-red-650/20 active:scale-95 transition-all text-red-400 font-black text-[9px] uppercase tracking-widest"
              onClick={() => window.location.href = '/operador/novedades?type=emergencia'}
            >
              <Zap size={16} className="animate-pulse" />
              <span>SOS / Pánico</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 rounded-xl flex items-center justify-center gap-2 border border-white/[0.03] bg-[#141620]/30 hover:bg-[#141620]/60 active:scale-95 transition-all text-zinc-300 font-black text-[9px] uppercase tracking-widest"
              onClick={() => window.location.href = '/operador/libro'}
            >
              <Book size={16} className="text-zinc-500" />
              <span>Ver Bitácora</span>
            </Button>
          </div>
        )}

        {/* Acciones Rápidas Simétricas (Monochrome minimalista 2x2) */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Cargar Novedad', href: '/operador/novedades', icon: AlertCircle },
            { label: 'Rondines', href: '/operador/rondines', icon: Clock },
            { label: 'Mapa Local', href: '/operador/fichaje', icon: MapIcon },
            { label: 'Mi Perfil', href: '/operador/perfil', icon: User },
          ].map((action, i) => (
            <Link key={i} href={action.href} className="group">
              <Card className="p-4 border border-white/[0.03] bg-[#141620]/25 hover:bg-[#141620]/50 flex items-center gap-3 transition-all active:scale-[0.96] hover:border-zinc-800 overflow-hidden text-white rounded-xl">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#090a0f]/80 border border-white/[0.01] text-zinc-500 group-hover:text-zinc-200 transition-all shrink-0">
                  <action.icon size={16} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-450 group-hover:text-zinc-250 transition-colors truncate">{action.label}</span>
              </Card>
            </Link>
          ))}
        </div>

        {/* Info del Sistema (Sutil abajo) */}
        <div className="flex justify-between items-center text-[8px] text-zinc-650 px-2 font-mono uppercase tracking-wider border-t border-white/[0.02] pt-4">
          <span>SIGPAD OS v2.1.0</span>
          <span>Sincronizado</span>
        </div>

      </div>
    </div>
  );
}
