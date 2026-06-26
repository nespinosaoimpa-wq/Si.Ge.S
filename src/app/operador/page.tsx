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

export default function GuardiaDashboard() {
  const { isShiftActive, shiftId, shiftData, startShift, theme, toggleTheme } = useShift();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedObjective, setAssignedObjective] = useState<any>(null);
  const [linkageError, setLinkageError] = useState<string | null>(null);
  const [linkageDebug, setLinkageDebug] = useState<any>(null);
  // currentTime removed — now handled by isolated ElapsedTimer component
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
          // Check if this update is for our resource (by id or assigned_to)
          const updated = payload.new as any;
          if (
            updated.assigned_to === OPERATOR_ID || 
            updated.id === OPERATOR_ID || 
            (user?.email && updated.email?.toLowerCase() === user.email.toLowerCase())
          ) {
            // Re-run the API fetch to get full objective details bypassing RLS
            fetchObjective();
          }
        }
      )
      .subscribe();

    // Timer removed — ElapsedTimer component handles its own interval

    // Watch GPS accuracy for the UI auditor
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

  // Check DB for active shifts (handles cross-device sync)
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

  // getElapsedTime() removed — replaced by <ElapsedTimer /> component

  return (
    <div className={cn(
      "min-h-screen pb-32 transition-colors duration-500",
      theme === 'dark' ? "bg-[#0a0a0a]" : "bg-gray-50"
    )}>
      
      {/* Top Banner / Hero */}
      <div className={cn(
        "p-6 pb-20 rounded-b-[3rem] shadow-2xl relative overflow-hidden transition-colors",
        theme === 'dark' ? "bg-zinc-900" : "bg-gray-900 text-white"
      )}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 max-w-5xl mx-auto space-y-6">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                 <ShieldCheck size={14} className="text-primary" />
                 <span className="text-[11px] font-black uppercase tracking-tight text-primary">Si.Ge.S OS</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-white/20 transition-all"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>

                 <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 backdrop-blur-md rounded-full border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase text-green-400">Sistema Online</span>
                 </div>
              </div>
           </div>

           <div>
              <p className={cn(
                "font-medium text-sm",
                theme === 'dark' ? "text-gray-300" : "text-gray-400"
              )}>Buen día, Operador</p>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight mt-1 uppercase italic text-white">
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
              className={cn(
                "mb-6 p-4 rounded-3xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 overflow-hidden relative",
                theme === 'dark' ? "bg-black/60 border-white/10" : "bg-white/80 border-gray-100"
              )}
            >
              <div className={cn("absolute top-0 left-0 w-2 h-full", 
                category.label === 'EXCELENTE' || category.label === 'BUENA' ? 'bg-green-500' : 
                category.label === 'MEDIA' ? 'bg-amber-500' : 
                category.label === 'BAJA' ? 'bg-red-500' : 'bg-primary'
              )} />
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                  category.bgColor, category.color
                )}>
                  {gpsAccuracy && gpsAccuracy < 30 ? <MapPin size={24} /> : <Zap size={24} className="animate-pulse" />}
                </div>
                 <div>
                  <p className={cn("text-[11px] font-black uppercase tracking-widest", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                    Calidad de Geolocalización
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h4 className={cn("text-sm font-black uppercase italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
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
                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
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
            <Card className={cn(
              "p-0 border-none shadow-2xl overflow-hidden transition-colors",
              theme === 'dark' ? "bg-zinc-900/40 backdrop-blur-md border border-white/5" : "bg-white"
            )}>
              <div className={cn(
                "px-6 py-12 text-center bg-gradient-to-b",
                isShiftActive 
                  ? (theme === 'dark' ? "from-green-500/5 to-transparent" : "from-green-50 to-white") 
                  : (theme === 'dark' ? "from-zinc-800 to-transparent" : "from-gray-50 to-white")
              )}>
                  <div className={cn(
                    "mb-6 inline-flex items-center justify-center w-24 h-24 rounded-full shadow-2xl border",
                    theme === 'dark' ? "bg-zinc-800 border-white/5" : "bg-white border-gray-100"
                  )}>
                    {isShiftActive ? (
                      <Activity size={40} className="text-green-500 animate-pulse" />
                    ) : (
                      <LogOut size={40} className="text-gray-300" />
                    )}
                  </div>
                  
              {isShiftActive ? (
                <div className="flex flex-col items-center">
                  <ElapsedTimer
                    startTime={shiftData?.startTime || shiftData?.time || new Date()}
                    className={cn(
                      "text-5xl lg:text-7xl font-mono font-black tracking-tighter",
                      theme === 'dark' ? "text-white" : "text-gray-900"
                    )}
                  />
                  <p className="text-[11px] font-black text-green-600 uppercase tracking-[0.3em] mt-4">Tiempo de Servicio Certificado</p>
                  
                  {/* Strategic Panic & SOS Row */}
                  <div className="grid grid-cols-2 gap-4 w-full mt-10 px-4">
                    <Button 
                      variant="danger" 
                      className="h-24 rounded-[2rem] shadow-2xl shadow-red-500/30 flex flex-col items-center justify-center gap-2 group relative overflow-hidden active:scale-95 transition-all"
                      onClick={() => window.location.href = '/operador/novedades?type=emergencia'}
                    >
                      <div className="absolute inset-0 bg-red-600 group-active:bg-red-700 transition-colors" />
                      <Zap size={32} className="relative z-10 animate-pulse fill-current" />
                      <span className="text-[10px] font-black uppercase tracking-widest relative z-10 italic">Pánico</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 rounded-[2rem] border-white/5 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95"
                      onClick={() => window.location.href = '/operador/libro'}
                    >
                      <Book size={32} className="text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-gray-400">Bitácora</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 rounded-[2rem] border-white/5 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95"
                      onClick={() => window.location.href = '/operador/novedades'}
                    >
                      <ShieldAlert size={32} className="text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-gray-400">Novedades</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 rounded-[2rem] border-white/5 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95"
                    >
                      <Smartphone size={32} className="text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-gray-400">Soporte</span>
                    </Button>
                  </div>

                  {shiftData?.time && (
                    <div className={cn(
                      "mt-8 flex flex-col items-center gap-1 p-3 px-6 rounded-2xl border",
                      theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
                    )}>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inicio del Turno</p>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className={cn("text-xs font-black uppercase", theme === 'dark' ? "text-white" : "text-gray-900")}>
                            {new Date(shiftData.time).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="w-px h-4 bg-gray-200" />
                        <div className="flex flex-col items-center">
                          <span className={cn("text-xs font-black uppercase", theme === 'dark' ? "text-white" : "text-gray-900")}>
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
                      className={cn(
                        "p-6 rounded-[2rem] border-2 border-amber-400/30 bg-amber-400/5 max-w-sm w-full",
                        theme === 'dark' ? "border-amber-400/20" : "bg-amber-50"
                      )}
                    >
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Clock className="text-amber-500" size={20} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Relevo Programado</span>
                      </div>
                      <h4 className={cn("text-xl font-black uppercase italic leading-tight mb-2", theme === 'dark' ? "text-white" : "text-gray-900")}>
                        {scheduledShift.objectives?.name || 'Nuevo Objetivo'}
                      </h4>
                      <p className="text-[11px] font-bold text-amber-700/60 uppercase tracking-widest">
                        {new Date(scheduledShift.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(scheduledShift.checkout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} HS
                      </p>
                    </motion.div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                      <ShieldCheck size={32} className="text-gray-300" />
                    </div>
                  )}
                  <div>
                    <p className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
                      {scheduledShift ? 'Turno Pendiente' : 'Sin Turno Activo'}
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      {scheduledShift ? 'Iniciá servicio en el horario programado' : 'Debes fichar entrada desde el mapa operativo'}
                    </p>
                  </div>
                </div>
              )}
              </div>

              <div className={cn("p-6 flex gap-4 border-t", theme === 'dark' ? "border-white/5 bg-zinc-900/20" : "bg-gray-50/50 border-gray-100")}>
                  <Link href="/operador/fichaje" className="flex-1">
                    <Button 
                      variant={isShiftActive ? "danger" : "success"} 
                      className={cn(
                        "w-full h-20 rounded-3xl font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl transition-all active:scale-95",
                        isShiftActive 
                          ? "bg-red-600 hover:bg-red-700 shadow-red-500/20 text-white" 
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white"
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

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cargar Novedad', href: '/operador/novedades', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                { label: 'Rondines', href: '/operador/rondines', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
                { label: 'Mapa Local', href: '/operador/fichaje', icon: MapIcon, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100' },
                { label: 'Mi Perfil', href: '/operador/perfil', icon: User, color: theme === 'dark' ? 'text-zinc-400' : 'text-gray-600', bg: theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100', border: theme === 'dark' ? 'border-white/5' : 'border-gray-200' },
              ].map((action, i) => (
                <Link key={i} href={action.href} className="group">
                    <Card className={cn(
                      "p-5 border flex flex-col items-center gap-3 text-center transition-all active:scale-[0.95] group-hover:shadow-2xl group-hover:-translate-y-1 overflow-hidden",
                      theme === 'dark' ? "bg-zinc-950/20 border-white/5" : action.bg, 
                      theme === 'dark' ? "" : action.border
                    )}>
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 shrink-0",
                        theme === 'dark' ? "bg-zinc-800" : "bg-white",
                        action.color
                      )}>
                          <action.icon size={24} />
                      </div>
                       <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest truncate w-full",
                        theme === 'dark' ? "text-gray-300" : "text-gray-900"
                      )}>{action.label}</span>
                    </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Secondary Column: Info & Details */}
          <div className="space-y-6">
            <Card className={cn(
               "p-6 border-none shadow-2xl transition-colors",
               theme === 'dark' ? "bg-zinc-900 border border-white/5" : "bg-white"
             )}>
                 <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Puesto Asignado</p>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl",
                    theme === 'dark' ? "bg-zinc-800 border-white/5" : "bg-gray-900 border-gray-800"
                  )}>
                    <Building2 size={32} className={cn(assignedObjective ? "text-primary" : "text-gray-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("text-lg font-black uppercase leading-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>
                      {assignedObjective?.name || 'Esperando Asignación'}
                    </h3>
                     <div className="flex items-center gap-1.5 mt-1">
                         <MapPin size={12} className="text-gray-400" />
                         <p className="text-[11px] font-bold text-gray-400 uppercase truncate">
                           {assignedObjective?.address || 'Pendiente de Confirmación'}
                         </p>
                     </div>
                  </div>
                </div>
            </Card>

            <Card className={cn(
               "p-6 border-none shadow-2xl transition-colors",
               theme === 'dark' ? "bg-zinc-900 border border-white/5" : "bg-white"
             )}>
               <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Información del Sistema</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase">Si.Ge.S Version</span>
                  <span className={cn("font-black", theme === 'dark' ? "text-white" : "text-gray-900")}>2.1.0-PRO</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-4 dark:border-white/5">
                  <span className="text-gray-400 font-bold uppercase">Último Sync</span>
                  <span className={cn("font-black", theme === 'dark' ? "text-white" : "text-gray-900")}>Hace 2 min</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

         <p className="text-[11px] text-center text-gray-400 font-black uppercase tracking-[0.3em] py-12">
           Si.Ge.S • Gestión Operativa Digital
         </p>

      </div>
    </div>
  );
}
