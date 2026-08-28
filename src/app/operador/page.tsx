'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ElapsedTimer from '@/components/operador/ElapsedTimer';
import { 
  CheckCircle2, Clock, MapPin, AlertCircle, AlertTriangle,
  User, ChevronRight, LogIn, LogOut, Building2,
  Calendar, ShieldCheck, Activity, Map as MapIcon, Zap,
  Book, ShieldAlert, Smartphone, Share2, Download
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { useShift } from '@/components/providers/ShiftProvider';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import PanicTriggerModal from '@/components/operador/PanicTriggerModal';

export default function GuardiaDashboard() {
  const { isShiftActive, shiftId, shiftData, startShift, theme, toggleTheme, updateShiftData } = useShift();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedObjective, setAssignedObjective] = useState<any>(null);
  const [linkageError, setLinkageError] = useState<string | null>(null);
  const [linkageDebug, setLinkageDebug] = useState<any>(null);
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSource, setGpsSource] = useState<'Satellite' | 'WiFi/Cell' | 'Searching'>('Searching');
  const [scheduledShift, setScheduledShift] = useState<any>(null);
  const [isGeofencePaused, setIsGeofencePaused] = useState(false);
  const [geofenceDistance, setGeofenceDistance] = useState(0);
  const [recentBookEntries, setRecentBookEntries] = useState<any[]>([]);

  useEffect(() => {
    const handleGeofenceEvent = (e: any) => {
      const { type, distance } = e.detail || {};
      if (type === 'exit') {
        setIsGeofencePaused(true);
        setGeofenceDistance(Math.round(distance || 0));
        if (updateShiftData) {
          updateShiftData({ isOutside: true, is_paused: true, distanceToObjective: distance });
        }
      } else if (type === 'entry') {
        setIsGeofencePaused(false);
        setGeofenceDistance(0);
        if (updateShiftData) {
          updateShiftData({ isOutside: false, is_paused: false });
        }
      }
    };

    window.addEventListener('sigpad_geofence_alert', handleGeofenceEvent);
    return () => window.removeEventListener('sigpad_geofence_alert', handleGeofenceEvent);
  }, [updateShiftData]);

  // Sincronización en Tiempo Real de Bitácora del Puesto para el Operador
  useEffect(() => {
    const currentObjId = shiftData?.objective_id || assignedObjective?.id;
    if (!currentObjId) return;

    const fetchRecentEntries = async () => {
      try {
        const { data } = await supabase
          .from('guard_book_entries')
          .select('*')
          .eq('objective_id', currentObjId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (data) setRecentBookEntries(data);
      } catch (e) {}
    };

    fetchRecentEntries();

    const channel = supabase
      .channel(`op-book-sync-${currentObjId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guard_book_entries',
        filter: `objective_id=eq.${currentObjId}`
      }, (payload) => {
        const newE = payload.new as any;
        setRecentBookEntries(prev => [newE, ...prev.filter(x => x.id !== newE.id).slice(0, 4)]);
        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shiftData?.objective_id, assignedObjective?.id]);
  
  const OPERATOR_ID = user?.id || 'recurso_demo';

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const shareData = {
      title: 'SIGPAD - Panel Operativo',
      text: 'Plataforma de gestión táctica y seguridad privada - SIGPAD',
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
            let targetObj = res.objectives 
              ? (Array.isArray(res.objectives) ? res.objectives[0] : res.objectives)
              : null;

            if (!targetObj && res.current_objective_id) {
              const { data: directObj } = await supabase
                .from('objectives')
                .select('*')
                .eq('id', res.current_objective_id)
                .maybeSingle();
              if (directObj) targetObj = directObj;
            }

            setAssignedObjective(targetObj);

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

        const { data: activeShift, error } = await query
          .select('*, objectives:objective_id(latitude, longitude, geofence_radius, name)')
          .limit(1)
          .maybeSingle();

        if (activeShift && !error) {
          const objLoc = activeShift.objectives?.latitude && activeShift.objectives?.longitude
            ? { lat: Number(activeShift.objectives.latitude), lng: Number(activeShift.objectives.longitude) }
            : undefined;

          startShift({
            time: new Date(activeShift.checkin_time),
            startTime: new Date(activeShift.checkin_time),
            location: { lat: activeShift.checkin_latitude, lng: activeShift.checkin_longitude },
            operator_id: activeShift.operator_id,
            objective_id: activeShift.objective_id,
            objectiveLocation: objLoc,
            geofenceRadius: activeShift.objectives?.geofence_radius || 100,
            objective_name: activeShift.objectives?.name
          }, activeShift.id);
        }
      } catch (e) {
        console.error('Error checking active shift:', e);
      }
    };
    checkActiveShift();
  }, [user, isShiftActive]);

  return (
    <div className={cn(
      "min-h-screen pb-32 transition-colors duration-500",
      theme === 'dark' ? "bg-[#0a0a0a]" : "bg-zinc-50"
    )}>
      
      {/* Top Banner / Hero */}
      <div className={cn(
        "p-6 pb-20 rounded-b-[3rem] shadow-2xl relative overflow-hidden transition-colors",
        theme === 'dark' ? "bg-zinc-900" : "bg-zinc-900 text-white"
      )}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0F4C5C]/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 max-w-5xl mx-auto space-y-6">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                 <ShieldCheck size={14} className="text-[#0F4C5C]" />
                 <span className="text-[11px] font-black uppercase tracking-tight text-[#0F4C5C]">SIGPAD OS</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Install PWA Button */}
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('trigger-pwa-install'))}
                  className="h-10 px-3.5 bg-[#0F4C5C]/30 backdrop-blur-md rounded-full flex items-center gap-2 border border-[#0F4C5C]/50 text-white hover:bg-[#0F4C5C]/50 transition-all text-xs font-black uppercase tracking-tight shadow-lg active:scale-95"
                  title="Instalar App en el Celular"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Instalar App</span>
                </button>

                {/* Share Button */}
                <button 
                  onClick={handleShare}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-white/20 transition-all"
                  title="Compartir enlace de la plataforma"
                >
                  <Share2 size={16} />
                </button>

                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-white/20 transition-all"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>

                 <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase text-emerald-400">Sistema Online</span>
                 </div>
              </div>
           </div>

           <div>
              <p className={cn(
                "font-medium text-sm",
                theme === 'dark' ? "text-zinc-300" : "text-zinc-400"
              )}>Buen día, Operador</p>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight mt-1 uppercase italic text-white">
                {isShiftActive ? "En Servicio" : "Listo para Iniciar"}
              </h1>
           </div>
        </div>
      </div>

      {/* Overlapping Content Container */}
      <div className="max-w-5xl mx-auto px-6 -mt-12 relative z-20">
        
        {/* Geofence Abandonment Warning Banner */}
        {isShiftActive && (isGeofencePaused || shiftData?.isOutside || shiftData?.isAbandoned || shiftData?.is_paused) && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-6 rounded-3xl bg-red-950/90 border-2 border-red-500 shadow-[0_15px_40px_rgba(239,68,68,0.3)] backdrop-blur-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shrink-0 animate-bounce shadow-lg shadow-red-600/50">
              <AlertTriangle size={32} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">🚨 ALERTA: FUERA DE TU OBJETIVO ASIGNADO</p>
              <h3 className="text-lg font-black text-white mt-0.5">
                Te has alejado {geofenceDistance || Math.round(shiftData.distanceToObjective || 0)}m de tu puesto ({shiftData.objective_name || 'Objetivo'})
              </h3>
              <p className="text-xs text-red-200 font-semibold mt-1">
                ⚠️ Por favor regresa inmediatamente a tu puesto de trabajo. El reloj de cómputo de horas ha sido <span className="underline font-black text-white">DETENIDO / PAUSADO</span>.
              </p>
            </div>
          </motion.div>
        )}

        {/* Warning if unlinked */}
        {linkageError && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-6 p-5 rounded-3xl bg-zinc-950 border-2 border-red-500/80 shadow-2xl backdrop-blur-xl flex items-center gap-4 text-white relative z-30"
          >
            <div className="w-12 h-12 bg-red-600/30 border border-red-500 text-red-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
              <AlertCircle size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-red-400">Cuenta No Vinculada</p>
              <p className="text-xs font-semibold text-zinc-200 mt-1 leading-relaxed">{linkageError}</p>
            </div>
          </motion.div>
        )}

        {/* GPS Quality Auditor (Premium Widget) */}
        {isShiftActive && !linkageError && (() => {
          const category = gpsAccuracy 
            ? (() => {
                if (gpsAccuracy <= 10) return { label: 'EXCELENTE', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' };
                if (gpsAccuracy <= 30) return { label: 'BUENA', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', borderColor: 'border-emerald-400/20' };
                if (gpsAccuracy <= 100) return { label: 'MEDIA', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' };
                return { label: 'BAJA', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' };
              })()
            : { label: 'BUSCANDO', color: 'text-zinc-400', bgColor: 'bg-zinc-400/10', borderColor: 'border-zinc-400/20' };
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mb-6 p-4 rounded-3xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 overflow-hidden relative",
                theme === 'dark' ? "bg-black/60 border-white/10" : "bg-white/80 border-zinc-100"
              )}
            >
              <div className={cn("absolute top-0 left-0 w-2 h-full", 
                category.label === 'EXCELENTE' || category.label === 'BUENA' ? 'bg-emerald-500' : 
                category.label === 'MEDIA' ? 'bg-amber-500' : 
                category.label === 'BAJA' ? 'bg-red-500' : 'bg-[#0F4C5C]'
              )} />
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                  category.bgColor, category.color
                )}>
                  {gpsAccuracy && gpsAccuracy < 30 ? <MapPin size={24} /> : <Zap size={24} className="animate-pulse" />}
                </div>
                 <div>
                  <p className={cn("text-[11px] font-black uppercase tracking-widest", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                    Calidad de Geolocalización
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h4 className={cn("text-sm font-black uppercase italic", theme === 'dark' ? "text-white" : "text-zinc-900")}>
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
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
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
                  ? (theme === 'dark' ? "from-emerald-500/5 to-transparent" : "from-emerald-50 to-white") 
                  : (theme === 'dark' ? "from-zinc-800 to-transparent" : "from-zinc-50 to-white")
              )}>
                  <div className={cn(
                    "mb-6 inline-flex items-center justify-center w-24 h-24 rounded-full shadow-2xl border",
                    theme === 'dark' ? "bg-zinc-800 border-white/5" : "bg-white border-zinc-100"
                  )}>
                    {isShiftActive ? (
                      <Activity size={40} className="text-emerald-500 animate-pulse" />
                    ) : (
                      <LogOut size={40} className="text-zinc-300" />
                    )}
                  </div>
                  
              {isShiftActive ? (
                <div className="flex flex-col items-center">
                  <ElapsedTimer
                    startTime={shiftData?.startTime || shiftData?.time || new Date()}
                    isPaused={isGeofencePaused || shiftData?.isOutside || shiftData?.is_paused}
                    className={cn(
                      "font-mono text-5xl lg:text-7xl font-black tracking-tight",
                      theme === 'dark' ? "text-white" : "text-zinc-900"
                    )}
                  />
                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-4">Tiempo de Servicio Certificado</p>
                  
                  {/* Strategic Panic & SOS Row */}
                  <div className="grid grid-cols-2 gap-4 w-full mt-10 px-4">
                    <Button 
                      variant="danger" 
                      className="h-24 rounded-[2rem] shadow-2xl shadow-red-500/30 flex flex-col items-center justify-center gap-2 group relative overflow-hidden active:scale-95 transition-all"
                      onClick={() => setShowPanicModal(true)}
                    >
                      <div className="absolute inset-0 bg-red-600 group-active:bg-red-700 transition-colors animate-pulse" />
                      <Zap size={32} className="relative z-10 animate-bounce fill-current" />
                      <span className="text-[10px] font-black uppercase tracking-widest relative z-10 italic">Pánico S.O.S</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 rounded-[2rem] border-white/5 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95"
                      onClick={() => window.location.href = '/operador/libro'}
                    >
                      <Book size={32} className="text-[#0F4C5C] group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-zinc-400">Bitácora</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 rounded-[2rem] border-white/5 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95"
                      onClick={() => window.location.href = '/operador/novedades'}
                    >
                      <ShieldAlert size={32} className="text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-zinc-400">Novedades</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-24 rounded-[2rem] border-white/5 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2 group transition-all active:scale-95"
                    >
                      <Smartphone size={32} className="text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic text-zinc-400">Soporte</span>
                    </Button>
                  </div>

                  {shiftData?.time && (
                    <div className={cn(
                      "mt-8 flex flex-col items-center gap-1 p-3 px-6 rounded-2xl border",
                      theme === 'dark' ? "bg-white/5 border-white/5" : "bg-zinc-50 border-zinc-100"
                    )}>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Inicio del Turno</p>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className={cn("text-xs font-black uppercase", theme === 'dark' ? "text-white" : "text-zinc-900")}>
                            {new Date(shiftData.time).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="w-px h-4 bg-zinc-200" />
                        <div className="flex flex-col items-center">
                          <span className={cn("text-xs font-black uppercase", theme === 'dark' ? "text-white" : "text-zinc-900")}>
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
                      <h4 className={cn("text-xl font-black uppercase italic leading-tight mb-2", theme === 'dark' ? "text-white" : "text-zinc-900")}>
                        {scheduledShift.objectives?.name || 'Nuevo Objetivo'}
                      </h4>
                      <p className="text-[11px] font-bold text-amber-700/60 uppercase tracking-widest">
                        {new Date(scheduledShift.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(scheduledShift.checkout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} HS
                      </p>
                    </motion.div>
                  ) : (
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                      <ShieldCheck size={32} className="text-zinc-300" />
                    </div>
                  )}
                  <div>
                    <p className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-zinc-900")}>
                      {scheduledShift ? 'Turno Pendiente' : !assignedObjective ? 'Sin Objetivo Asignado' : 'Sin Turno Activo'}
                    </p>
                    <p className="text-sm text-zinc-400 mt-2">
                      {scheduledShift ? 'Iniciá servicio en el horario programado' : !assignedObjective ? 'Contactá a gerencia para ser asignado a un puesto antes de fichar' : 'Debes fichar entrada desde el mapa operativo'}
                    </p>
                  </div>
                </div>
              )}
              </div>

              <div className={cn("p-6 flex gap-4 border-t", theme === 'dark' ? "border-white/5 bg-zinc-900/20" : "bg-zinc-50/50 border-zinc-100")}>
                  {!isShiftActive && !assignedObjective ? (
                    <Button 
                      disabled
                      className="flex-1 w-full h-20 rounded-3xl font-black text-[11px] uppercase tracking-[0.25em] bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-60"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <AlertCircle size={20} className="text-amber-500" />
                        <span>Sin Objetivo Asignado</span>
                      </div>
                    </Button>
                  ) : (
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
                          <div className="flex items-center justify-center gap-3">
                            <LogOut size={20} />
                            <span>Finalizar Turno</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <LogIn size={20} />
                            <span>Fichar Entrada</span>
                          </div>
                        )}
                      </Button>
                    </Link>
                  )}
              </div>
            </Card>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cargar Novedad', href: '/operador/novedades', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                { label: 'Rondines', href: '/operador/rondines', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
                { label: 'Mapa Local', href: '/operador/fichaje', icon: MapIcon, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                { label: 'Mi Perfil', href: '/operador/perfil', icon: User, color: theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600', bg: theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100', border: theme === 'dark' ? 'border-white/5' : 'border-zinc-200' },
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
                        theme === 'dark' ? "text-zinc-300" : "text-zinc-900"
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
                 <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Puesto Asignado</p>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl",
                    theme === 'dark' ? "bg-zinc-800 border-white/5" : "bg-zinc-900 border-zinc-800"
                  )}>
                    <Building2 size={32} className={cn(assignedObjective ? "text-[#0F4C5C]" : "text-zinc-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("text-lg font-black uppercase leading-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>
                      {assignedObjective?.name || 'Esperando Asignación'}
                    </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                          <MapPin size={12} className="text-zinc-400" />
                          <p className="text-[11px] font-bold text-zinc-400 uppercase truncate">
                            {assignedObjective?.address || 'Pendiente de Confirmación'}
                          </p>
                      </div>
                  </div>
                </div>
            </Card>

            {/* Widget: Bitácora & Consignas del Puesto */}
            <Card className={cn(
              "p-6 border-none shadow-2xl transition-colors relative overflow-hidden",
              theme === 'dark' ? "bg-zinc-900 border border-white/5" : "bg-white"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Book size={18} className="text-emerald-500" />
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                    Bitácora del Puesto
                  </p>
                </div>
                <Link href="/operador/libro">
                  <span className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider">
                    Ver Todo →
                  </span>
                </Link>
              </div>

              {recentBookEntries.length > 0 ? (
                <div className="space-y-3">
                  {recentBookEntries.slice(0, 3).map((entry, idx) => {
                    const isGerente = entry.content?.startsWith('[GERENTE]');
                    const cleanText = entry.content?.replace('[GERENTE]', '').trim();
                    return (
                      <div 
                        key={entry.id || idx}
                        className={cn(
                          "p-3.5 rounded-2xl border text-xs font-medium space-y-1 transition-all",
                          isGerente
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                            : (theme === 'dark' ? "bg-white/5 border-white/5 text-zinc-200" : "bg-zinc-50 border-zinc-100 text-zinc-800")
                        )}
                      >
                        <div className="flex items-center justify-between text-[10px] font-black uppercase">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px]",
                            isGerente ? "bg-amber-500 text-black font-black" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          )}>
                            {isGerente ? '✍️ Gerencia' : (entry.entry_type || 'Novedad')}
                          </span>
                          <span className="font-mono text-zinc-400 text-[9px]">
                            {new Date(entry.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                          </span>
                        </div>
                        <p className="line-clamp-2 leading-relaxed pt-1">
                          {cleanText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Sin novedades recientes en la bitácora</p>
                </div>
              )}
            </Card>

            <Card className={cn(
               "p-6 border-none shadow-2xl transition-colors",
               theme === 'dark' ? "bg-zinc-900 border border-white/5" : "bg-white"
             )}>
               <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-4">Información del Sistema</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold uppercase">SIGPAD Version</span>
                  <span className={cn("font-black", theme === 'dark' ? "text-white" : "text-zinc-900")}>2.1.0-PRO</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-zinc-100 pt-4 dark:border-white/5">
                  <span className="text-zinc-400 font-bold uppercase">Último Sync</span>
                  <span className={cn("font-black", theme === 'dark' ? "text-white" : "text-zinc-900")}>Hace 2 min</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

         <p className="text-[11px] text-center text-zinc-400 font-black uppercase tracking-[0.3em] py-12">
           SIGPAD • Gestión Operativa Digital
         </p>

      </div>

      <PanicTriggerModal
        isOpen={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        operatorId={user?.id}
        objectiveId={assignedObjective?.id}
        location={shiftData?.location}
      />
    </div>
  );
}
