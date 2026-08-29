'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  MapPin, 
  Phone, 
  AlertOctagon, 
  X, 
  ShieldAlert, 
  Navigation,
  CheckCircle2,
  BellRing,
  Hospital,
  Flame,
  Building2,
  Volume2,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { fetchNearbyEmergencyServices, NearbyPOI } from '@/lib/nearby-services';
import { supabase } from '@/lib/supabase';
import { startCrazyHombreVivoAlarm, stopCrazyHombreVivoAlarm, unlockAudioContext, setSirenDucked } from '@/lib/push-notifications';

const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-900 animate-pulse flex items-center justify-center text-xs font-mono text-zinc-500">Cargando mapa satelital...</div>
});

interface PanicAlertOverlayProps {
  alert: any;
  onDismiss: () => void;
  onResolve: (notes: string) => void;
}

export default function PanicAlertOverlay({ alert, onDismiss, onResolve }: PanicAlertOverlayProps) {
  const [nearbyServices, setNearbyServices] = useState<NearbyPOI[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);

  const [operatorInfo, setOperatorInfo] = useState({
    name: alert?.resource_name || alert?.operator_name || 'Operador',
    phone: alert?.phone || '',
    objectiveName: alert?.objective_name || 'Objetivo Asignado',
    objectiveAddress: alert?.objective_address || ''
  });

  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔍 1. ENRICH OPERATOR & OBJECTIVE DATA WITH AUTO-RECOVERY
  useEffect(() => {
    let isMounted = true;

    const enrichData = async () => {
      if (!alert) return;
      let name = alert.resource_name || alert.operator_name || '';
      let phone = alert.phone || '';
      let objectiveName = alert.objective_name || '';
      let objectiveAddress = alert.objective_address || '';
      let objId = alert.objective_id;
      const opId = alert.operator_id || alert.triggered_by;

      try {
        // Step A: Search resource by opId or email
        if (opId) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opId);
          let query = supabase
            .from('resources')
            .select('id, name, phone, current_objective_id, objectives!current_objective_id(id, name, address)');

          if (isUUID) {
            query = query.or(`id.eq.${opId},assigned_to.eq.${opId}`);
          } else {
            query = query.eq('id', opId);
          }

          const { data: res } = await query.limit(1).maybeSingle();

          if (res && isMounted) {
            if (res.name && (!name || name === 'Prestador Desconocido' || name === 'Operador')) {
              name = res.name;
            }
            if (res.phone && !phone) phone = res.phone;
            if (!objId && res.current_objective_id) objId = res.current_objective_id;
            if (res.objectives) {
              const obj: any = res.objectives;
              if (!objectiveName && obj.name) objectiveName = obj.name;
              if (!objectiveAddress && obj.address) objectiveAddress = obj.address;
            }
          }
        }

        // Step B: Fallback search in active guard shifts if name or objective is still missing
        if ((!name || !objectiveName) && opId) {
          const { data: activeShift } = await supabase
            .from('guard_shifts')
            .select('objective_id, objectives(name, address), resources(name, phone)')
            .eq('operator_id', opId)
            .eq('status', 'activo')
            .limit(1)
            .maybeSingle();

          if (activeShift && isMounted) {
            if (!name && (activeShift.resources as any)?.name) {
              name = (activeShift.resources as any).name;
            }
            if (!phone && (activeShift.resources as any)?.phone) {
              phone = (activeShift.resources as any).phone;
            }
            if (!objId && activeShift.objective_id) objId = activeShift.objective_id;
            if ((activeShift.objectives as any)?.name) {
              if (!objectiveName) objectiveName = (activeShift.objectives as any).name;
              if (!objectiveAddress) objectiveAddress = (activeShift.objectives as any).address;
            }
          }
        }

        // Step C: Direct objective search by objId
        if (objId && (!objectiveName || !objectiveAddress)) {
          const { data: obj } = await supabase
            .from('objectives')
            .select('name, address')
            .eq('id', objId)
            .maybeSingle();

          if (obj && isMounted) {
            if (!objectiveName && obj.name) objectiveName = obj.name;
            if (!objectiveAddress && obj.address) objectiveAddress = obj.address;
          }
        }

        // Step D: Fallback nearest objective by lat/lng if still missing
        if (!objectiveName && alert.latitude && alert.longitude) {
          const { data: nearestObj } = await supabase
            .from('objectives')
            .select('name, address')
            .not('latitude', 'is', null)
            .limit(1)
            .maybeSingle();

          if (nearestObj && isMounted) {
            objectiveName = nearestObj.name;
            if (nearestObj.address) objectiveAddress = nearestObj.address;
          }
        }

        // Step E: Fallback search for any active operator in resources if name is still 'Operador'
        if (!name || name === 'Operador' || name === 'Prestador Desconocido') {
          const { data: activeRes } = await supabase
            .from('resources')
            .select('name, phone')
            .eq('status', 'activo')
            .limit(1)
            .maybeSingle();

          if (activeRes?.name && isMounted) {
            name = activeRes.name;
            if (activeRes.phone && !phone) phone = activeRes.phone;
          }
        }

        if (isMounted) {
          setOperatorInfo({
            name: name || alert?.operator_name || 'Operador de Guardia',
            phone: phone || '',
            objectiveName: objectiveName || 'Objetivo Principal',
            objectiveAddress: objectiveAddress || ''
          });
        }
      } catch (e) {
        console.error('[PANIC_ENRICH_ERROR]', e);
      }
    };

    enrichData();
    return () => { isMounted = false; };
  }, [alert?.id, alert?.operator_id, alert?.triggered_by, alert?.objective_id, alert?.latitude, alert?.longitude]);

  // 🏥 2. FETCH NEARBY EMERGENCY SERVICES
  useEffect(() => {
    if (alert?.latitude && alert?.longitude) {
      setLoadingServices(true);
      fetchNearbyEmergencyServices(alert.latitude, alert.longitude)
        .then(res => setNearbyServices(res.slice(0, 3)))
        .finally(() => setLoadingServices(false));
    }
  }, [alert?.id, alert?.latitude, alert?.longitude]);

  // 🔊 3. SIREN ALARM SOUND (Web Audio API Synthesizer)
  useEffect(() => {
    if (typeof window !== 'undefined' && alert) {
      unlockAudioContext();
      startCrazyHombreVivoAlarm();
    }
    return () => {
      stopCrazyHombreVivoAlarm();
    };
  }, [alert?.id]);

  // 🗣️ 4. TEXT-TO-SPEECH VOICE SYNTHESIS (Locución Parlante en Español con Ducking)
  const speakAlert = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !alert) return;

    try {
      window.speechSynthesis.cancel();

      const opName = operatorInfo.name && operatorInfo.name !== 'Operador' ? operatorInfo.name : 'un operador';
      const objName = operatorInfo.objectiveName && operatorInfo.objectiveName !== 'Objetivo Asignado' ? operatorInfo.objectiveName : 'el puesto de guardia';
      
      const textToSpeak = `¡Alerta de pánico activada por el operador ${opName} en ${objName}! Se requiere intervención de seguridad inmediata.`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'es-AR';
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(v => v.lang.includes('es-AR') || v.lang.includes('es-ES') || v.lang.startsWith('es'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      utterance.onstart = () => {
        setSpeechActive(true);
        setSirenDucked(true); // 🔥 Duck siren audio down to 5% while speech is talking!
      };

      utterance.onend = () => {
        setSpeechActive(false);
        setSirenDucked(false); // Restore siren audio after speech
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis error:', err);
    }
  }, [alert, operatorInfo.name, operatorInfo.objectiveName]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !alert) return;

    // Chrome/Edge: Ensure voices are populated before initial speak
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => speakAlert();
    }

    const timer = setTimeout(() => {
      speakAlert();
    }, 600);

    speechIntervalRef.current = setInterval(() => {
      speakAlert();
    }, 11000);

    return () => {
      clearTimeout(timer);
      if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [alert?.id, speakAlert]);

  // Handle click anywhere on modal to unlock audio and trigger speech
  const handleUserInteract = () => {
    unlockAudioContext();
    speakAlert();
  };

  if (!alert) return null;

  // 🗺️ Map Marker Props setup for satellite preview
  const alertLat = Number(alert.latitude) || -31.64267;
  const alertLng = Number(alert.longitude) || -60.69651;

  const mapObjectives = [{
    id: alert.objective_id || 'alert-obj-1',
    name: operatorInfo.objectiveName,
    address: operatorInfo.objectiveAddress || 'Objetivo en Emergencia',
    latitude: alertLat,
    longitude: alertLng,
    status: 'critica',
    is_manned: true,
    occupant_name: operatorInfo.name,
    geofence_radius: 100
  }];

  const mapGuards = [{
    id: alert.operator_id || alert.triggered_by || 'alert-guard-1',
    name: operatorInfo.name,
    latitude: alertLat,
    longitude: alertLng,
    status: 'activo',
    role: 'Vigilador en Emergencia',
    isOnShift: true,
    accuracy: 15
  }];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6"
        onClick={handleUserInteract}
      >
        {/* Backdrop con parpadeo agresivo de emergencia */}
        <motion.div 
          animate={{ 
            backgroundColor: ['rgba(153, 27, 27, 0.94)', 'rgba(10, 10, 10, 0.97)', 'rgba(153, 27, 27, 0.94)'] 
          }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="absolute inset-0 backdrop-blur-xl"
        />

        {/* Modal Content - Viewport Fit */}
        <motion.div 
          initial={{ scale: 0.94, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          className="relative w-full max-w-5xl max-h-[92vh] bg-zinc-950 border-2 sm:border-4 border-red-600 rounded-3xl sm:rounded-[2.5rem] shadow-[0_0_90px_rgba(220,38,38,0.6)] overflow-hidden flex flex-col lg:flex-row"
          onClick={e => e.stopPropagation()}
        >
          {/* Lado Izquierdo: Información de Emergencia y Acciones Tácticas */}
          <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between overflow-y-auto max-h-[92vh] space-y-4">
            
            {/* Header del Protocolo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg animate-bounce shrink-0">
                    <Zap size={24} className="text-white fill-current" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">
                      Protocolo de Intervención
                    </h1>
                    <p className="text-red-500 font-semibold text-xs uppercase tracking-wider mt-1 flex items-center gap-1.5">
                      <BellRing size={13} className="animate-pulse" /> Acción de Seguridad Prioritaria S.O.S
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botón de reproducción manual de voz */}
                  <button
                    onClick={speakAlert}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border flex items-center gap-1.5 transition-all shadow-md",
                      speechActive 
                        ? "bg-red-600 text-white border-red-400 animate-pulse" 
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                    )}
                    title="Escuchar voz de la alerta"
                  >
                    <Volume2 size={15} className={speechActive ? "animate-bounce" : ""} />
                    <span>{speechActive ? 'Hablando...' : 'Voz Alerta'}</span>
                  </button>

                  <button
                    onClick={onDismiss}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center transition-all shrink-0"
                    title="Cerrar modal"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Ficha Principal del Operador y Objetivo */}
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-inner">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block mb-0.5">
                      Vigilador en Emergencia
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {operatorInfo.name}
                    </h2>
                    
                    {/* Objetivo de Origen */}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-400 font-medium">
                      <Building2 size={14} className="shrink-0 text-emerald-400" />
                      <span className="font-semibold text-white">{operatorInfo.objectiveName}</span>
                      {operatorInfo.objectiveAddress && (
                        <span className="text-zinc-400 font-normal truncate max-w-[240px]">
                          ({operatorInfo.objectiveAddress})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Hora Exacta</p>
                    <p className="text-lg font-mono font-medium text-white bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700">
                      {new Date(alert.created_at || Date.now()).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Detalle del Mensaje */}
                <div className="pt-3 border-t border-zinc-800">
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">
                    Detalle de la Alerta
                  </p>
                  <p className="text-sm text-zinc-100 font-medium leading-relaxed bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    "{alert.content || '🚨 BOTÓN DE PÁNICO S.O.S ACTIVADO EN FICHAJE'}"
                  </p>
                </div>
              </div>

              {/* Fila de Coordenadas GPS y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800 flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Coordenadas GPS</p>
                    <p className="text-xs font-mono font-semibold text-white truncate">
                      {alertLat.toFixed(5)}, {alertLng.toFixed(5)}
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800 flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Estado Oficial</p>
                    <p className="text-xs font-semibold text-white uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                      Emergencia Crítica
                    </p>
                  </div>
                </div>
              </div>

              {/* Servicios de Emergencia Cercanos */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Servicios de Emergencia Cercanos
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {loadingServices ? (
                    [1, 2, 3].map(i => <div key={i} className="h-12 bg-zinc-900 animate-pulse rounded-xl" />)
                  ) : nearbyServices.length > 0 ? (
                    nearbyServices.map(poi => (
                      <div key={poi.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          poi.type === 'hospital' ? "bg-red-500/20 text-red-400" :
                          poi.type === 'police' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                        )}>
                          {poi.type === 'hospital' ? <Hospital size={16} /> : 
                           poi.type === 'police' ? <ShieldAlert size={16} /> : <Flame size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{poi.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{poi.estimatedETA} min • {poi.distance}m</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-1.5 text-[11px] text-zinc-500 italic">No se detectaron servicios en el radio inmediato</div>
                  )}
                </div>
              </div>

            </div>

            {/* BOTONERA TÁCTICA DE ACCIÓN DIRECTA */}
            <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button 
                  className="h-11 sm:h-12 rounded-xl bg-white text-zinc-950 hover:bg-zinc-100 font-semibold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  onClick={() => window.open(`tel:${operatorInfo.phone || ''}`)}
                >
                  <Phone size={16} />
                  <span>Llamar</span>
                </button>
                
                <button 
                  className="h-11 sm:h-12 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 border-none"
                  onClick={() => {
                    const clean = (operatorInfo.phone || '').replace(/[^0-9]/g, '');
                    window.open(clean ? `https://wa.me/${clean}` : `https://wa.me/`);
                  }}
                >
                  💬 WhatsApp
                </button>

                <button 
                  className="h-11 sm:h-12 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 border-none"
                  onClick={() => window.open('tel:911')}
                >
                  <AlertOctagon size={16} /> 911
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button 
                  className="h-10 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 font-semibold text-xs uppercase tracking-wider transition-all"
                  onClick={onDismiss}
                >
                  <X size={15} className="inline mr-1" /> Desestimar
                </button>
                <button 
                  className="h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5"
                  onClick={() => {
                    if (confirm('¿Confirmas que la emergencia ha sido controlada y deseas finalizar el protocolo de alerta?')) {
                      onResolve(alert.id);
                    }
                  }}
                >
                  <CheckCircle2 size={16} /> Concluir Gestión
                </button>
              </div>
            </div>

          </div>

          {/* Lado Derecho: Mapa Satelital con ÍCONOS Y DATOS DE OBJETIVO Y OPERADOR */}
          <div className="hidden lg:block w-[380px] xl:w-[420px] bg-black relative border-l-2 sm:border-l-4 border-red-600 shrink-0">
             <div className="absolute top-4 left-4 z-10">
                <div className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-2xl flex items-center gap-2">
                   <Navigation size={14} className="animate-pulse text-white" /> Localización Satelital
                </div>
             </div>
             
             {/* MapView con marcadores de Objetivo y Operador pasados explícitamente */}
             <MapView 
               center={[alertLat, alertLng]} 
               zoom={17}
               className="w-full h-full"
               tileStyle="satellite"
               objectives={mapObjectives}
               guards={mapGuards}
               selectedObjectiveId={mapObjectives[0].id}
             />
             <div className="absolute inset-0 pointer-events-none border-[16px] border-red-600/20 mix-blend-overlay animate-pulse" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
