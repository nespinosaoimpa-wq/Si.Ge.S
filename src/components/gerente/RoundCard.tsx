'use client';

import React, { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Inline SVG Route Visualizer ────────────────────────────────────────────
// Reemplaza Leaflet/react-leaflet para mostrar la ruta de ronda.
// Ahorra ~40KB en el bundle principal y elimina 3 dependencias externas.
// Para rondas históricas no necesitamos un mapa interactivo completo —
// una polilínea SVG normalizada es suficiente y mucho más eficiente.

function RouteMapSVG({ coordinates }: { coordinates: [number, number][] }) {
  const svgPath = useMemo(() => {
    if (coordinates.length < 2) return null;

    const lats = coordinates.map(c => c[0]);
    const lngs = coordinates.map(c => c[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    // Normalizar coordenadas al viewport SVG (260x180)
    const W = 260, H = 180, PAD = 20;
    const normalize = (lat: number, lng: number) => {
      const x = PAD + ((lng - minLng) / lngRange) * (W - PAD * 2);
      const y = PAD + ((maxLat - lat) / latRange) * (H - PAD * 2); // invertir Y
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    };

    const points = coordinates.map(([lat, lng]) => normalize(lat, lng)).join(' ');
    const startPt = normalize(coordinates[0][0], coordinates[0][1]).split(',');
    const endPt   = normalize(coordinates[coordinates.length - 1][0], coordinates[coordinates.length - 1][1]).split(',');

    return { points, startPt, endPt };
  }, [coordinates]);

  if (!svgPath) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={22} className="text-zinc-600" />
          </div>
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Sin trazado GPS</p>
        </div>
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 260 180"
      className="h-full w-full"
      style={{ background: 'transparent' }}
    >
      {/* Grid lines decorativas */}
      <defs>
        <pattern id="grid" width="26" height="18" patternUnits="userSpaceOnUse">
          <path d="M 26 0 L 0 0 0 18" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="260" height="180" fill="url(#grid)" />

      {/* Ruta de patrulla — polilínea con glow */}
      <polyline
        points={svgPath.points}
        fill="none"
        stroke="#0F4C5C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <polyline
        points={svgPath.points}
        fill="none"
        stroke="#14b8a6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 8"
        opacity="0.9"
      />

      {/* Punto inicio (verde) */}
      <circle cx={svgPath.startPt[0]} cy={svgPath.startPt[1]} r="5" fill="#10b981" opacity="0.9" />
      <circle cx={svgPath.startPt[0]} cy={svgPath.startPt[1]} r="9" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.4" />

      {/* Punto fin (rojo) */}
      <circle cx={svgPath.endPt[0]} cy={svgPath.endPt[1]} r="5" fill="#ef4444" opacity="0.9" />
      <circle cx={svgPath.endPt[0]} cy={svgPath.endPt[1]} r="9" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function RoundCard({ round }: { round: any }) {
  const coordinates: [number, number][] =
    round.traces?.map((t: any) => [t.latitude, t.longitude] as [number, number]) || [];

  const startDate = new Date(round.start_at);
  const durationMs = round.end_at ? new Date(round.end_at).getTime() - startDate.getTime() : 0;
  const durationMins = Math.round(durationMs / 60000);

  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-tactical group hover:border-primary/30 transition-all">
      {/* MAP / ROUTE SECTION */}
      <div className="relative h-[220px] w-full bg-zinc-950 overflow-hidden z-0">
        <RouteMapSVG coordinates={coordinates} />

        {/* Overlay badge */}
        <div className="absolute top-4 right-4 z-10">
          <div className="px-3 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Historial Táctico</span>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[8px] font-bold text-zinc-500">Inicio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[8px] font-bold text-zinc-500">Fin</span>
          </div>
          {coordinates.length > 0 && (
            <span className="text-[8px] font-bold text-zinc-600">{coordinates.length} puntos GPS</span>
          )}
        </div>
      </div>

      {/* DETAILS SECTION */}
      <div className="p-6 flex flex-col gap-1 z-10 relative">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-black tracking-tighter text-white uppercase">
            {round.objective?.name || 'Patrulla General'}
          </h2>
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
            ID: {round.id?.substring(0, 8)}
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
            <p className="text-[10px] font-black text-white uppercase tracking-tight">
              {round.resource?.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
              round.incidents?.length > 0
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-zinc-800 text-zinc-400"
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
