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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32">
      
      {/* Top Banner / Hero (Coherente con Login) */}
      <div className="p-6 pb-20 border-b border-zinc-900 bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-zinc-900/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 max-w-5xl mx-auto space-y-6">
           <div className="flex justify-between items-center">
              <div className="flex items-center bg-[#09090b]/80 border border-zinc-800 rounded-xl p-1.5 px-3">
                 <SigesIcon className="w-24 h-7" />
              </div>
              
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-green-400 tracking-wider">Sistema Online</span>
                 </div>
              </div>
           </div>

           <div>
              <p className="text-zinc-500 font-medium text-xs uppercase tracking-widest font-mono">Terminal de Guardia</p>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-none mt-2 uppercase italic text-white font-display">
                {isShiftActive ? "En Servicio" : "Listo para Iniciar"}
              </h1>
           </div>
        </div>
      </div>

      {/* Overlapping Content Container */}
      <div className="max-w-5xl mx-auto px-6 -mt-12 relative z-20">
        
        {/* Warning if unlinked */}
        {linkageError && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-red-500">Cuenta No Vinculada</p>
              <p className="text-sm font-medium text-red-400 mt-1">{linkageError}</p>
            </div>
          </motion.div>
        )}

        {/* GPS Quality Auditor (Premium Widget) */}
        {isShiftActive && !linkageError && (() => {
          const category = gpsAccuracy 
            ? (() => {
                if (gpsAccuracy <= 10) return { label: 'EXCELENTE', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' };
                if (gpsAccuracy <= 30) return { label: 'BUENA', color: 'text-green-400', bgColor: 'bg-green-400/10', borderColor: 'border-green-400/20' };
                if (gpsAccuracy <= 100) return { label: 'MEDIA', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' };
                return { label: 'BAJA', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' };
              })()
            : { label: 'BUSCANDO', color: 'text-gray-400', bgColor: 'bg-gray-400/10', borderColor: 'border-gray-400/20' };
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 overflow-hidden relative"
            >
              <div className={cn("absolute top-0 left-0 w-2 h-full", 
                category.label === 'EXCELENTE' || category.label === 'BUENA' ? 'bg-green-500' : 
                category.label === 'MEDIA' ? 'bg-amber-500' : 
                category.label === 'BAJA' ? 'bg-red-500' : 'bg-zinc-500'
              )} />
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                  category.bgColor, category.color
                )}>
                  {gpsAccuracy && gpsAccuracy < 30 ? <MapPin size={24} /> : <Zap size={24} className="animate-pulse" />}
                </div>
                 <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                    Calidad de Geolocalización
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h4 className="text-sm font-black uppercase italic text-white">
                      {gpsSource === 'Satellite' ? 'Señal Satelital' : 'WiFi / Triangulación'}
                    </h4>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-black uppercase border",
                      category.bgColor, category.color, category.borderColor
                    )}>
                      {category.label}
                    </span>
                    {gpsAccuracy && (
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-black uppercase border",
                        category.bgColor, category.color, category.borderColor
                      )}>
                        ±{Math.round(gpsAccuracy)}m
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="hidden md:block max-w-[200px]">
                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                  {category.label === 'EXCELENTE' ? 'Precisión máxima certificada. Operación táctica óptima.' :
                   category.label === 'BUENA' ? 'Precisión aceptable para operación de seguridad estándar.' :
                   category.label === 'MEDIA' ? 'Movete a un lugar abierto para mejorar la señal GPS.' :
                   category.label === 'BAJA' ? '⚠️ Señal insuficiente. Buscar cielo abierto urgentemente.' :
                   'Buscando señal GPS...'}
                </p>
              </div>
            </motion.div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Status Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-0 border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md shadow-2xl overflow-hidden text-white rounded-[2rem]">
              <div className={cn(
                "px-6 py-12 text-center bg-gradient-to-b",
                isShiftActive ? "from-green-500/5 to-transparent" : "from-zinc-800/20 to-transparent"
              )}>
                  <div className="mb-6 inline-flex items-center justify-center w-24 h-24 rounded-full shadow-2xl border border-zinc-800 bg-zinc-950">
                    {isShiftActive ? (
                      <Activity size={40} className="text-green-500 animate-pulse" />
                    ) : (
                      <LogOut size={40} className="text-zinc-600" />
                    )}
                  </div>
                  
              {isShiftActive ? (
                <div className="flex flex-col items-center">
                  <ElapsedTimer
                    startTime={shiftData?.startTime || shiftData?.time || new Date()}
                    className="text-5xl lg:text-7xl font-mono font-black tracking-tighter text-white"
                  />
                  <p className="text-[11px] font-black text-green-500 uppercase tracking-[0.3em] mt-4">Tiempo de Servicio Certificado</p>
                  
                  {/* Strategic Panic & SOS Row */}
                  <div className="grid grid-cols-2 gap-4 w-full mt-10 px-4">
                    <Button 
                      variant="danger" 
                      className="h-24 rounded-[2rem] shadow-2xl shadow-red-600/10 flex flex-col items-center justify-center gap-2 group relative overflow-hidden active:scale-95 transition-all"
                      onClick={() => window.location.href = '/operador/novedades?type=emergencia'}
                    >
                      <div className="absolute inset-0 bg-red-600 group-active:bg-red-700 transition-colors" />
                      <Zap size={32} className="relative z-10 animate-pulse fill-current text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest relative z-10 italic text-white">Pánico</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 rounded-[2rem] border-zinc-800 bg-zinc-950 hover:bg-zinc-900 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95 text-white"
                      onClick={() => window.location.href = '/operador/libro'}
                    >
                      <Book size={32} className="text-zinc-300 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-zinc-500">Bitácora</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 rounded-[2rem] border-zinc-800 bg-zinc-950 hover:bg-zinc-900 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95 text-white"
                      onClick={() => window.location.href = '/operador/novedades'}
                    >
                      <ShieldAlert size={32} className="text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-zinc-500">Novedades</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 rounded-[2rem] border-zinc-800 bg-zinc-950 hover:bg-zinc-900 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95 text-white"
                    >
                      <Smartphone size={32} className="text-zinc-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-zinc-500">Soporte</span>
                    </Button>
                  </div>

                  {shiftData?.time && (
                    <div className="mt-8 flex flex-col items-center gap-1 p-3 px-6 rounded-2xl border bg-zinc-950 border-zinc-800">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Inicio del Turno</p>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-black uppercase text-white">
                            {new Date(shiftData.time).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="w-px h-4 bg-zinc-800" />
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-black uppercase text-white">
                            {new Date(shiftData.time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} HS
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  {scheduledShift ? (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-6 rounded-[2rem] border-2 border-amber-400/20 bg-amber-400/5 max-w-sm w-full"
                    >
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Clock className="text-amber-500" size={20} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Relevo Programado</span>
                      </div>
                      <h4 className="text-xl font-black uppercase italic leading-tight mb-2 text-white">
                        {scheduledShift.objectives?.name || 'Nuevo Objetivo'}
                      </h4>
                      <p className="text-[11px] font-bold text-amber-600/70 uppercase tracking-widest">
                        {new Date(scheduledShift.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(scheduledShift.checkout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} HS
                      </p>
                    </motion.div>
                  ) : (
                    <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center">
                      <ShieldCheck size={32} className="text-zinc-650" />
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {scheduledShift ? 'Turno Pendiente' : 'Sin Turno Activo'}
                    </p>
                    <p className="text-sm text-zinc-500 mt-2">
                      {scheduledShift ? 'Iniciá servicio en el horario programado' : 'Debes fichar entrada desde el mapa operativo'}
                    </p>
                  </div>
                </div>
              )}
              </div>

              <div className="p-6 flex gap-4 border-t border-zinc-800 bg-zinc-950/40">
                  <Link href="/operador/fichaje" className="flex-1">
                    <Button 
                      variant={isShiftActive ? "danger" : "success"} 
                      className={cn(
                        "w-full h-20 rounded-3xl font-black text-[11px] uppercase tracking-[0.25em] transition-all active:scale-95 border-none",
                        isShiftActive 
                          ? "bg-red-650 hover:bg-red-750 text-white shadow-xl shadow-red-950/20" 
                          : "bg-white hover:bg-zinc-200 text-zinc-950 shadow-xl shadow-white/5"
                      )}
                    >
                      {isShiftActive ? (
                        <div className="flex items-center gap-3">
                          <LogOut size={20} />
                          <span>Finalizar Turno</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <LogIn size={20} />
                          <span>Fichar Entrada</span>
                        </div>
                      )}
                    </Button>
                  </Link>
              </div>
            </Card>

            {/* Quick Actions Grid (Monochrome and Tactical) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cargar Novedad', href: '/operador/novedades', icon: AlertCircle, color: 'text-zinc-300' },
                { label: 'Rondines', href: '/operador/rondines', icon: Clock, color: 'text-zinc-300' },
                { label: 'Mapa Local', href: '/operador/fichaje', icon: MapIcon, color: 'text-zinc-300' },
                { label: 'Mi Perfil', href: '/operador/perfil', icon: User, color: 'text-zinc-300' },
              ].map((action, i) => (
                <Link key={i} href={action.href} className="group">
                    <Card className="p-5 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 flex flex-col items-center gap-3 text-center transition-all active:scale-[0.95] hover:border-zinc-700 overflow-hidden text-white rounded-2xl">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-zinc-950 transition-transform group-hover:scale-110 shrink-0",
                        action.color
                      )}>
                          <action.icon size={24} />
                      </div>
                       <span className="text-[9px] font-black uppercase tracking-widest truncate w-full text-zinc-300">{action.label}</span>
                    </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Secondary Column: Info & Details */}
          <div className="space-y-6">
            <Card className="p-6 border border-zinc-800 bg-zinc-900/40 text-white rounded-2xl">
                 <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Puesto Asignado</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-zinc-800 bg-zinc-950 shadow-xl">
                    <Building2 size={32} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black uppercase leading-tight text-white">
                      {assignedObjective?.name || 'Esperando Asignación'}
                    </h3>
                     <div className="flex items-center gap-1.5 mt-1">
                          <MapPin size={12} className="text-zinc-500" />
                          <p className="text-[11px] font-bold text-zinc-400 uppercase truncate">
                            {assignedObjective?.address || 'Pendiente de Confirmación'}
                          </p>
                     </div>
                  </div>
                </div>
            </Card>

            <Card className="p-6 border border-zinc-800 bg-zinc-900/40 text-white rounded-2xl">
               <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">Información del Sistema</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-bold uppercase">SIGPAD OS Version</span>
                  <span className="font-black text-white">2.1.0-PRO</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-zinc-850 pt-4">
                  <span className="text-zinc-500 font-bold uppercase">Último Sync</span>
                  <span className="font-black text-white">Hace 2 min</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

         <p className="text-[11px] text-center text-zinc-650 font-black uppercase tracking-[0.3em] py-12 font-mono">
           SIGPAD • Sistema Inteligente de Gestión
         </p>

      </div>
    </div>
  );
}
