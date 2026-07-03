'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Map, { Source, Layer, Popup, Marker, NavigationControl, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Calendar, Clock, MapPin, ShieldCheck, User, Play, Pause, SkipForward, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ('pk.eyJ1Ijoibmljb2VzcGlub3NhIiwiYSI6ImNtbzczM21ucjAydDgycHB2MXZsY3Bqc3EifQ.' + 'LeVW1Jfcr6Rr6q1o15Kkzw');

interface RoutePoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  created_at: string;
}

interface RoutePlaybackProps {
  points: RoutePoint[];
  roundData?: any;
  className?: string;
}

/** Calculate total distance in meters from an array of points */
function totalDistance(pts: RoutePoint[]): number {
  let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(pts[i].latitude - pts[i - 1].latitude);
    const dLng = toRad(pts[i].longitude - pts[i - 1].longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(pts[i - 1].latitude)) * Math.cos(toRad(pts[i].latitude)) * Math.sin(dLng / 2) ** 2;
    dist += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return dist;
}

export default function RoutePlayback({ points, roundData, className }: RoutePlaybackProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoverInfo, setHoverInfo] = useState<{ longitude: number; latitude: number; point: RoutePoint } | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Speed thresholds for line color
  const SPEED_STATIC = 0.5;   // m/s
  const SPEED_WALKING = 2.0;  // m/s

  // Route GeoJSON with per-segment speed coloring
  const routeGeoJSON = useMemo(() => {
    if (points.length < 2) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: points.map(p => [p.longitude, p.latitude])
      }
    };
  }, [points]);

  // Segments colored by speed
  const coloredSegments = useMemo(() => {
    if (points.length < 2) return null;
    const features: any[] = [];
    for (let i = 1; i < points.length; i++) {
      const speed = points[i].speed ?? 0;
      const color = speed < SPEED_STATIC ? '#ef4444' : speed < SPEED_WALKING ? '#f59e0b' : '#22c55e';
      features.push({
        type: 'Feature',
        properties: { color, speed },
        geometry: {
          type: 'LineString',
          coordinates: [
            [points[i - 1].longitude, points[i - 1].latitude],
            [points[i].longitude, points[i].latitude]
          ]
        }
      });
    }
    return { type: 'FeatureCollection', features };
  }, [points]);

  // Playback visible route (up to current index)
  const playbackRoute = useMemo(() => {
    if (points.length < 2) return null;
    const visible = points.slice(0, playbackIndex + 1);
    if (visible.length < 2) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: visible.map(p => [p.longitude, p.latitude])
      }
    };
  }, [points, playbackIndex]);

  const currentPlaybackPoint = points[playbackIndex] || null;

  const initialViewState = useMemo(() => {
    if (points.length === 0) return { latitude: -31.6350, longitude: -60.7000, zoom: 14 };
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      zoom: 16.5,
      pitch: 45
    };
  }, [points]);

  // Computed stats
  const stats = useMemo(() => ({
    totalDist: totalDistance(points),
    avgAccuracy: points.length > 0 ? points.reduce((s, p) => s + (p.accuracy || 0), 0) / points.length : 0,
    duration: points.length > 1
      ? (new Date(points[points.length - 1].created_at).getTime() - new Date(points[0].created_at).getTime()) / 1000
      : 0,
    pointCount: points.length,
  }), [points]);

  // Playback controls
  const startPlayback = useCallback(() => {
    if (points.length === 0) return;
    setIsPlaying(true);
    if (playbackIndex >= points.length - 1) setPlaybackIndex(0);
  }, [points.length, playbackIndex]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      return;
    }

    const interval = Math.max(50, 200 / playbackSpeed);
    playIntervalRef.current = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= points.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playbackSpeed, points.length]);

  // Follow playback marker on map
  useEffect(() => {
    if (isPlaying && currentPlaybackPoint && mapRef.current) {
      mapRef.current.easeTo({
        center: [currentPlaybackPoint.longitude, currentPlaybackPoint.latitude],
        duration: 300,
      });
    }
  }, [playbackIndex, isPlaying, currentPlaybackPoint]);

  // Handle click on route line for audit tooltip
  const handleMapClick = useCallback((e: any) => {
    if (e.features && e.features.length > 0) {
      const coord = e.lngLat;
      let closest = points[0];
      let minDist = Infinity;
      points.forEach(p => {
        const d = Math.pow(p.latitude - coord.lat, 2) + Math.pow(p.longitude - coord.lng, 2);
        if (d < minDist) { minDist = d; closest = p; }
      });
      setHoverInfo({ longitude: coord.lng, latitude: coord.lat, point: closest });
    } else {
      setHoverInfo(null);
    }
  }, [points]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setPlaybackIndex(val);
    setIsPlaying(false);
  }, []);

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed(prev => prev >= 4 ? 1 : prev * 2);
  }, []);

  if (!MAPBOX_TOKEN) return null;

  return (
    <div className={cn("relative w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl", className)}>
      <Map
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        interactiveLayerIds={['route-hitbox']}
        onClick={handleMapClick}
      >
        <NavigationControl position="top-right" />

        {/* Speed-colored route segments */}
        {coloredSegments && (
          <Source id="colored-route" type="geojson" data={coloredSegments as any}>
            {/* Glow */}
            <Layer
              id="route-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 10,
                'line-opacity': 0.15,
                'line-blur': 5
              }}
            />
            {/* Main */}
            <Layer
              id="route-main"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 3.5,
                'line-opacity': 0.4
              }}
            />
            {/* Hitbox */}
            <Layer
              id="route-hitbox"
              type="line"
              paint={{ 'line-color': 'transparent', 'line-width': 24 }}
            />
          </Source>
        )}

        {/* Playback progress overlay */}
        {playbackRoute && (
          <Source id="playback-route" type="geojson" data={playbackRoute as any}>
            <Layer
              id="playback-line-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#FFD700',
                'line-width': 10,
                'line-opacity': 0.25,
                'line-blur': 4
              }}
            />
            <Layer
              id="playback-line"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#FFD700',
                'line-width': 4,
                'line-opacity': 0.9
              }}
            />
          </Source>
        )}

        {/* Start/End markers */}
        {points.length > 0 && (
          <Source id="endpoints" type="geojson" data={{
            type: 'FeatureCollection',
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [points[0].longitude, points[0].latitude] }, properties: { label: 'INICIO' } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [points[points.length - 1].longitude, points[points.length - 1].latitude] }, properties: { label: 'FIN' } }
            ]
          }}>
            <Layer
              id="endpoint-dots"
              type="circle"
              paint={{
                'circle-radius': 7,
                'circle-color': ['match', ['get', 'label'], 'INICIO', '#22c55e', '#ef4444'],
                'circle-stroke-width': 3,
                'circle-stroke-color': '#fff'
              }}
            />
          </Source>
        )}

        {/* Playback cursor marker */}
        {currentPlaybackPoint && (
          <Marker
            latitude={currentPlaybackPoint.latitude}
            longitude={currentPlaybackPoint.longitude}
            anchor="center"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-10 h-10 bg-yellow-400/20 rounded-full animate-ping" />
              <div className="w-6 h-6 bg-yellow-400 border-[3px] border-white rounded-full shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
            </div>
          </Marker>
        )}

        {/* Audit Tooltip Popup */}
        {hoverInfo && (
          <Popup
            longitude={hoverInfo.longitude}
            latitude={hoverInfo.latitude}
            anchor="bottom"
            onClose={() => setHoverInfo(null)}
            closeButton={false}
            maxWidth="280px"
            className="audit-popup"
          >
            <div className="p-4 bg-zinc-900 text-white rounded-2xl shadow-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <ShieldCheck size={14} className="text-yellow-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">Auditoría Forense</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">Hora exacta</span>
                  <span className="text-[11px] font-mono font-black">{new Date(hoverInfo.point.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">Precisión GPS</span>
                  <span className={cn("text-[11px] font-mono font-black", hoverInfo.point.accuracy < 15 ? "text-emerald-400" : hoverInfo.point.accuracy < 50 ? "text-amber-400" : "text-red-400")}>
                    {hoverInfo.point.accuracy.toFixed(1)}m
                  </span>
                </div>
                {hoverInfo.point.speed !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Velocidad</span>
                    <span className="text-[11px] font-mono font-black text-blue-400">
                      {(hoverInfo.point.speed * 3.6).toFixed(1)} km/h
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">Coords</span>
                  <span className="text-[8px] font-mono text-zinc-400">
                    {hoverInfo.point.latitude.toFixed(6)}, {hoverInfo.point.longitude.toFixed(6)}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* ─── PLAYBACK CONTROLS (Bottom Bar) ─── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <div className="bg-black/85 backdrop-blur-2xl rounded-2xl border border-white/[0.06] p-4 shadow-2xl space-y-3">
          {/* Time Slider */}
          <div className="relative">
            <input
              type="range"
              min={0}
              max={Math.max(0, points.length - 1)}
              value={playbackIndex}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(250,204,21,0.5)] [&::-webkit-slider-thumb]:cursor-grab"
              style={{
                background: points.length > 1
                  ? `linear-gradient(to right, #facc15 ${(playbackIndex / (points.length - 1)) * 100}%, rgba(255,255,255,0.1) ${(playbackIndex / (points.length - 1)) * 100}%)`
                  : undefined,
              }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Play/Pause + Speed */}
            <div className="flex items-center gap-2">
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                className="w-10 h-10 rounded-xl bg-yellow-400 text-black flex items-center justify-center shadow-lg hover:bg-yellow-300 transition-colors"
              >
                {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-0.5" />}
              </button>
              <button
                onClick={cycleSpeed}
                className="px-3 h-10 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black tracking-wider hover:bg-white/10 transition-colors"
              >
                {playbackSpeed}x
              </button>
            </div>

            {/* Timestamp */}
            <div className="text-center">
              <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Timestamp</p>
              <p className="text-[12px] font-mono font-black text-white/80">
                {currentPlaybackPoint ? new Date(currentPlaybackPoint.created_at).toLocaleTimeString('es-AR') : '--:--:--'}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[8px] font-bold text-white/20 uppercase">Distancia</p>
                <p className="text-[11px] font-black text-emerald-400 tabular-nums">{(stats.totalDist / 1000).toFixed(2)} km</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold text-white/20 uppercase">Puntos</p>
                <p className="text-[11px] font-black text-blue-400 tabular-nums">{playbackIndex + 1}/{stats.pointCount}</p>
              </div>
            </div>
          </div>

          {/* Speed Legend */}
          <div className="flex items-center justify-center gap-4 pt-1 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[8px] font-bold text-white/30 uppercase">Estático</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[8px] font-bold text-white/30 uppercase">Caminando</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-bold text-white/30 uppercase">Corriendo</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FLOATING INFO CARD ─── */}
      {roundData && (
        <div className="absolute top-6 left-6 z-10 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-2xl p-5 rounded-2xl border border-white/[0.06] shadow-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                <User size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Patrullero</p>
                <p className="text-sm font-black text-white uppercase">{roundData.resource_name || 'Personal SIGPAD'}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Calendar size={12} className="text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-400">{new Date(roundData.round_start).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-400">
                  {new Date(roundData.round_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            {/* Live stats */}
            <div className="flex items-center gap-4 pt-2 border-t border-white/5">
              <div>
                <p className="text-[8px] font-bold text-zinc-600 uppercase">Precisión Avg</p>
                <p className={cn('text-[11px] font-black', stats.avgAccuracy < 15 ? 'text-emerald-400' : 'text-amber-400')}>
                  {stats.avgAccuracy.toFixed(1)}m
                </p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-zinc-600 uppercase">Duración</p>
                <p className="text-[11px] font-black text-white/60">
                  {Math.floor(stats.duration / 60)}min
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
