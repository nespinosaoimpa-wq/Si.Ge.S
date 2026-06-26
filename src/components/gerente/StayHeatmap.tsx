'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, Popup, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Flame, Clock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface StayHeatmapProps {
  roundId: string;
  className?: string;
  /** If provided, use these points instead of fetching from DB */
  tracePoints?: { latitude: number; longitude: number; accuracy?: number; created_at: string }[];
}

interface DensityPoint {
  lat: number;
  lng: number;
  weight: number; // normalized 0-1
  staySeconds: number;
  pointCount: number;
  avgAccuracy: number;
}

export default function StayHeatmap({ roundId, tracePoints, className }: StayHeatmapProps) {
  const [densityData, setDensityData] = useState<DensityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverPoint, setHoverPoint] = useState<DensityPoint | null>(null);
  const [heatmapVisible, setHeatmapVisible] = useState(true);

  // Fetch or compute density from trace points
  useEffect(() => {
    if (tracePoints && tracePoints.length > 0) {
      computeLocalDensity(tracePoints);
    } else if (roundId) {
      fetchDensityFromDB();
    }
  }, [roundId, tracePoints]);

  const computeLocalDensity = (points: { latitude: number; longitude: number; accuracy?: number; created_at: string }[]) => {
    setLoading(true);
    const grid = new globalThis.Map<string, { lats: number[]; lngs: number[]; accs: number[]; timestamps: number[] }>();
    const precision = 5; // ~1.1m at equator

    for (const p of points) {
      const key = `${p.latitude.toFixed(precision)},${p.longitude.toFixed(precision)}`;
      if (!grid.has(key)) grid.set(key, { lats: [], lngs: [], accs: [], timestamps: [] });
      const bucket = grid.get(key)!;
      bucket.lats.push(p.latitude);
      bucket.lngs.push(p.longitude);
      bucket.accs.push(p.accuracy ?? 10);
      bucket.timestamps.push(new Date(p.created_at).getTime());
    }

    const results: DensityPoint[] = [];
    let maxCount = 0;

    grid.forEach((bucket) => {
      if (bucket.lats.length > maxCount) maxCount = bucket.lats.length;
    });

    grid.forEach((bucket) => {
      const avgLat = bucket.lats.reduce((a, b) => a + b, 0) / bucket.lats.length;
      const avgLng = bucket.lngs.reduce((a, b) => a + b, 0) / bucket.lngs.length;
      const avgAcc = bucket.accs.reduce((a, b) => a + b, 0) / bucket.accs.length;
      const minTs = Math.min(...bucket.timestamps);
      const maxTs = Math.max(...bucket.timestamps);
      const staySeconds = (maxTs - minTs) / 1000;

      results.push({
        lat: avgLat,
        lng: avgLng,
        weight: maxCount > 0 ? bucket.lats.length / maxCount : 0,
        staySeconds,
        pointCount: bucket.lats.length,
        avgAccuracy: avgAcc,
      });
    });

    setDensityData(results);
    setLoading(false);
  };

  const fetchDensityFromDB = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patrol_trace')
        .select('latitude, longitude, accuracy, created_at')
        .eq('round_id', roundId)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        computeLocalDensity(data);
      }
    } catch (e) {
      console.error('[Si.Ge.S] Heatmap fetch error:', e);
    }
    setLoading(false);
  };

  // GeoJSON for heatmap layer
  const heatmapGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: densityData.map(d => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [d.lng, d.lat],
      },
      properties: {
        weight: d.weight,
        staySeconds: d.staySeconds,
        pointCount: d.pointCount,
        avgAccuracy: d.avgAccuracy,
      },
    })),
  }), [densityData]);

  // Circle markers for clickable hotspots (top 20% density)
  const hotspots = useMemo(() =>
    densityData.filter(d => d.weight > 0.5).sort((a, b) => b.weight - a.weight).slice(0, 10),
  [densityData]);

  const initialView = useMemo(() => {
    if (densityData.length === 0) return { latitude: -31.635, longitude: -60.7, zoom: 14 };
    const avgLat = densityData.reduce((s, d) => s + d.lat, 0) / densityData.length;
    const avgLng = densityData.reduce((s, d) => s + d.lng, 0) / densityData.length;
    return { latitude: avgLat, longitude: avgLng, zoom: 17, pitch: 30 };
  }, [densityData]);

  if (!MAPBOX_TOKEN) return null;

  return (
    <div className={cn("relative w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl", className)}>
      {loading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400 animate-pulse">Procesando densidad...</p>
        </div>
      )}

      <Map
        initialViewState={initialView}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {/* Heatmap Layer */}
        {heatmapVisible && (
          <Source id="stay-heatmap" type="geojson" data={heatmapGeoJSON as any}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': ['get', 'weight'],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 3],
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(0,0,0,0)',
                  0.1, 'rgba(59,130,246,0.3)',
                  0.3, 'rgba(59,130,246,0.5)',
                  0.5, 'rgba(250,204,21,0.6)',
                  0.7, 'rgba(249,115,22,0.7)',
                  1, 'rgba(239,68,68,0.85)',
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 15, 18, 40],
                'heatmap-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {/* Clickable Hotspot Markers */}
        {hotspots.map((spot, i) => (
          <Source key={i} id={`hotspot-${i}`} type="geojson" data={{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [spot.lng, spot.lat] },
            properties: {},
          }}>
            <Layer
              id={`hotspot-ring-${i}`}
              type="circle"
              paint={{
                'circle-radius': 12 + spot.weight * 8,
                'circle-color': 'transparent',
                'circle-stroke-width': 2,
                'circle-stroke-color': spot.staySeconds > 120 ? '#ef4444' : '#f59e0b',
                'circle-stroke-opacity': 0.6,
              }}
            />
          </Source>
        ))}

        {/* Hover Popup */}
        {hoverPoint && (
          <Popup
            longitude={hoverPoint.lng}
            latitude={hoverPoint.lat}
            anchor="bottom"
            onClose={() => setHoverPoint(null)}
            closeButton={false}
            maxWidth="260px"
          >
            <div className="p-3 bg-zinc-900 text-white rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Flame size={14} className="text-orange-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Zona de Permanencia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Tiempo</span>
                <span className={cn("text-[11px] font-mono font-black", hoverPoint.staySeconds > 120 ? 'text-red-400' : 'text-amber-400')}>
                  {Math.floor(hoverPoint.staySeconds / 60)}m {Math.round(hoverPoint.staySeconds % 60)}s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Muestras</span>
                <span className="text-[11px] font-mono font-black text-white/60">{hoverPoint.pointCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-zinc-500 font-bold uppercase">Precisión Avg</span>
                <span className="text-[11px] font-mono font-black text-blue-400">{hoverPoint.avgAccuracy.toFixed(1)}m</span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Toggle Button */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={() => setHeatmapVisible(!heatmapVisible)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-lg transition-all text-[10px] font-black uppercase tracking-widest",
            heatmapVisible
              ? "bg-orange-500/20 border-orange-500/30 text-orange-400 backdrop-blur-xl"
              : "bg-white/5 border-white/10 text-white/40 backdrop-blur-xl"
          )}
        >
          {heatmapVisible ? <Eye size={14} /> : <EyeOff size={14} />}
          {heatmapVisible ? 'Heatmap Activo' : 'Heatmap Oculto'}
        </button>
      </div>

      {/* Alert: Extended stays */}
      {hotspots.filter(h => h.staySeconds > 300).length > 0 && (
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4 flex items-center gap-3"
          >
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">Alerta de Permanencia Extendida</p>
              <p className="text-[9px] text-white/40 font-bold mt-0.5">
                Se detectaron {hotspots.filter(h => h.staySeconds > 300).length} zona(s) con más de 5 minutos de inactividad
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
