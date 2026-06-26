'use client';

import React, { useEffect, useRef } from 'react';
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
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { fetchNearbyEmergencyServices, NearbyPOI } from '@/lib/nearby-services';

const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-900 animate-pulse" />
});

interface PanicAlertOverlayProps {
  alert: any;
  onDismiss: () => void;
  onResolve: (notes: string) => void;
}

export default function PanicAlertOverlay({ alert, onDismiss, onResolve }: PanicAlertOverlayProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nearbyServices, setNearbyServices] = React.useState<NearbyPOI[]>([]);
  const [loadingServices, setLoadingServices] = React.useState(false);

  useEffect(() => {
    if (alert?.latitude && alert?.longitude) {
      setLoadingServices(true);
      fetchNearbyEmergencyServices(alert.latitude, alert.longitude)
        .then(res => setNearbyServices(res.slice(0, 3)))
        .finally(() => setLoadingServices(false));
    }
  }, [alert?.id]);

  useEffect(() => {
    // Attempt to play alert sound
    if (typeof window !== 'undefined' && alert) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
      audioRef.current.loop = true;
      audioRef.current.play().catch(e => console.warn('Audio auto-play blocked:', e));
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [alert?.id]);

  if (!alert) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8"
      >
        {/* Backdrop with aggressive pulsing animation */}
        <motion.div 
          animate={{ 
            backgroundColor: ['rgba(153, 27, 27, 0.9)', 'rgba(0, 0, 0, 0.95)', 'rgba(153, 27, 27, 0.9)'] 
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 backdrop-blur-xl"
        />

        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative w-full max-w-5xl bg-zinc-900 border-4 border-red-600 rounded-[3rem] shadow-[0_0_100px_rgba(220,38,38,0.5)] overflow-hidden flex flex-col lg:flex-row h-[90vh] lg:h-auto"
        >
          {/* Left Side: Info & Actions */}
          <div className="flex-1 p-8 md:p-12 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce">
                  <Zap size={32} className="text-white fill-current" />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
                    Protocolo de Intervención
                  </h1>
                  <p className="text-red-500 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                    <BellRing size={14} className="animate-pulse" /> Acción de Seguridad Prioritaria
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">{alert.resource_name || 'Prestador Desconocido'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Hora</p>
                    <p className="text-xl font-mono text-gray-300">{new Date(alert.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Mensaje / Novedad</p>
                  <p className="text-lg text-gray-200 font-medium italic">"{alert.content}"</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                      <MapPin size={20} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Coordenadas</p>
                     <p className="text-xs font-mono text-white">{alert.latitude?.toFixed(5)}, {alert.longitude?.toFixed(5)}</p>
                   </div>
                </div>
                <div className="bg-zinc-800/50 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                   <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-500">
                      <ShieldAlert size={20} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Estado Oficial</p>
                     <p className="text-xs font-bold text-white uppercase">Emergencia Crítica</p>
                   </div>
                </div>
              </div>

              {/* Nearby Services Display */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Servicios de Emergencia Cercanos</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {loadingServices ? (
                    [1,2,3].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-2xl" />)
                  ) : nearbyServices.length > 0 ? (
                    nearbyServices.map(poi => (
                      <div key={poi.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          poi.type === 'hospital' ? "bg-red-500/20 text-red-500" :
                          poi.type === 'police' ? "bg-blue-500/20 text-blue-500" : "bg-orange-500/20 text-orange-500"
                        )}>
                          {poi.type === 'hospital' ? <Hospital size={18} /> : 
                           poi.type === 'police' ? <ShieldAlert size={18} /> : <Flame size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-white truncate">{poi.name}</p>
                          <p className="text-[9px] text-gray-500 font-bold uppercase">{poi.estimatedETA} min • {poi.distance}m</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-2 text-[10px] text-gray-500 uppercase font-bold italic">No se detectaron servicios en el radio inmediato</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-4">
              <div className="flex gap-4">
                <Button 
                  className="flex-1 h-20 rounded-2xl bg-white text-black hover:bg-gray-200 font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-3"
                  onClick={() => window.open(`tel:${alert.phone || ''}`)}
                >
                  <Phone size={24} /> Llamar al Prestador
                </Button>
                <Button 
                  className="flex-1 h-20 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-3 border-none"
                  onClick={() => window.open('tel:911')}
                >
                  <AlertOctagon size={24} /> Llamar al 911
                </Button>
              </div>
              <div className="flex gap-4">
                <Button 
                  variant="outline"
                  className="flex-1 h-14 rounded-xl border-white/10 text-gray-400 hover:text-white hover:bg-white/5 uppercase font-bold text-[10px] tracking-widest"
                  onClick={onDismiss}
                >
                  <X size={16} /> Cancelar Alerta
                </Button>
                <Button 
                  className="flex-1 h-14 rounded-xl bg-green-500 text-black hover:bg-green-400 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-500/20 border-none"
                  onClick={() => {
                    if (confirm('¿Confirmas que la emergencia ha sido controlada y deseas finalizar el protocolo de alerta?')) {
                      onResolve('Alerta gestionada por gerencia');
                    }
                  }}
                >
                  <CheckCircle2 size={16} className="mr-2" /> Concluir Gestión
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side: Visual Context (Map) */}
          <div className="hidden lg:block w-[400px] bg-black relative border-l-4 border-red-600">
             <div className="absolute top-6 left-6 z-10">
                <div className="bg-red-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                   <Navigation size={14} className="animate-pulse" /> Localización Satelital
                </div>
             </div>
             <MapView 
               center={(alert.latitude && alert.longitude) ? [alert.latitude, alert.longitude] : undefined} 
               zoom={17}
               className="w-full h-full"
               tileStyle="satellite"
             />
             <div className="absolute inset-0 pointer-events-none border-[20px] border-red-600/20 mix-blend-overlay animate-pulse" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
