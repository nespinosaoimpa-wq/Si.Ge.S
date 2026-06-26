'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, MapPin, Eye, Clock, ShieldCheck, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

export function RoundCard({ round }: { round: any }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fix leaflet default icons if needed
    (async function init() {
      if (typeof window !== 'undefined') {
        const L = (await import('leaflet')).default;
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      }
    })();
  }, []);

  const coordinates = round.traces?.map((t: any) => [t.latitude, t.longitude] as [number, number]) || [];
  
  let center: [number, number] = [-31.6333, -60.7000]; // default Santa Fe
  if (coordinates.length > 0) {
    const lats = coordinates.map((c: any) => c[0]);
    const lngs = coordinates.map((c: any) => c[1]);
    center = [(Math.max(...lats) + Math.min(...lats)) / 2, (Math.max(...lngs) + Math.min(...lngs)) / 2];
  } else if (round.incidents && round.incidents.length > 0) {
    center = [round.incidents[0].latitude, round.incidents[0].longitude];
  }

  const startDate = new Date(round.start_at);
  const durationMs = round.end_at ? new Date(round.end_at).getTime() - startDate.getTime() : 0;
  const durationMins = Math.round(durationMs / 60000);

  const startPoint = coordinates.length > 0 ? coordinates[0] : null;

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-tactical group hover:border-primary/30 transition-all">
      {/* MAP SECTION */}
      <div className="relative h-[220px] w-full bg-black overflow-hidden z-0">
        {mounted && (
          <MapContainer
            center={center}
            zoom={16}
            scrollWheelZoom={false}
            dragging={true}
            zoomControl={false}
            className="h-full w-full opacity-70"
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {coordinates.length > 1 && (
              <Polyline 
                positions={coordinates} 
                pathOptions={{ 
                  color: '#0F4C5C', 
                  weight: 3, 
                  lineCap: 'round', 
                  lineJoin: 'round',
                  dashArray: '1, 10',
                  opacity: 0.8
                }} 
              />
            )}
            
            {round.incidents?.map((incident: any) => (
              incident.latitude && incident.longitude && (
                <Marker key={incident.id} position={[incident.latitude, incident.longitude]}>
                  <Popup className="tactical-popup">
                    <div className="p-1">
                      <p className="uppercase tracking-[0.2em] text-[8px] text-primary font-black mb-1">{incident.entry_type}</p>
                      <p className="text-[10px] text-zinc-300 font-bold leading-tight">{incident.content}</p>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        )}

        <div className="absolute top-4 right-4 z-10 flex gap-2">
           <div className="px-3 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Historial Táctico</span>
           </div>
        </div>
      </div>

      {/* DETAILS SECTION */}
      <div className="p-6 flex flex-col gap-1 z-10 relative">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-black tracking-tighter text-white uppercase">{round.objective?.name || 'Patrulla General'}</h2>
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
            ID: {round.id?.substring(0,8)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2 mb-4 pb-4 border-b border-white/5">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Inicio</p>
            <p className="text-xs font-bold text-zinc-300">
               {startDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Duración</p>
            <p className="text-xs font-bold text-zinc-300">{durationMins} min</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
               {round.resource?.avatar_url ? (
                 <img src={round.resource.avatar_url} className="w-full h-full object-cover" alt="Op" />
               ) : (
                 <ShieldCheck size={14} className="text-zinc-500" />
               )}
             </div>
             <p className="text-[10px] font-black text-white uppercase tracking-tight">{round.resource?.name}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
              round.incidents?.length > 0 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-zinc-800 text-zinc-400"
            )}>
              {round.incidents?.length || 0} Novedades
            </span>
          </div>
        </div>

        <button className="w-full mt-6 h-12 bg-zinc-800/50 hover:bg-primary hover:text-white text-zinc-400 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all border border-white/5 group-hover:border-primary/50">
           Ver Análisis Forense
        </button>
      </div>
    </div>
  );
}

