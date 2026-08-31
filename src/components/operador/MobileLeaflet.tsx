'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, GeolocateControl, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { User, MapPin, Layers, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimatedPosition } from '@/hooks/useAnimatedPosition';

const MAP_STYLES = {
  STANDARD: 'mapbox://styles/mapbox/standard',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  NAVIGATION: 'mapbox://styles/mapbox/navigation-night-v1',
  STREETS: 'mapbox://styles/mapbox/streets-v12'
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ('pk.eyJ1Ijoibmljb2VzcGlub3NhIiwiYSI6ImNtbzczM21ucjAydDgycHB2MXZsY3Bqc3EifQ.' + 'LeVW1Jfcr6Rr6q1o15Kkzw');

// Camera thresholds
const FLYTO_THRESHOLD = 35;   // meters — use flyTo for big jumps
const EASETO_THRESHOLD = 1.5;   // meters — ignore micro-jitter below this
const RECENTER_COOLDOWN = 4000; // ms — don't recenter more often than this

interface MobileLeafletProps {
  currentPosition?: [number, number];
  currentAccuracy?: number;
  routePoints?: [number, number][];
  patrolPath?: [number, number][];
  destinations?: { id: string; name: string; position: [number, number] }[];
  showFloatingOverlay?: boolean;
  avatarUrl?: string | null;
}

// ─── HIGH PERFORMANCE SUB-COMPONENT ───
interface OperatorLocationGroupProps {
  currentPosition?: [number, number];
  currentAccuracy?: number;
  avatarUrl?: string | null;
  mapRef: React.RefObject<MapRef | null>;
  mapLoaded: boolean;
  userInteractingRef: React.RefObject<boolean>;
  paused?: boolean;
}

function OperatorLocationGroup({
  currentPosition,
  currentAccuracy,
  avatarUrl,
  mapRef,
  mapLoaded,
  userInteractingRef,
  paused = false
}: OperatorLocationGroupProps) {
  const {
    lat: animLat,
    lng: animLng,
    bearing: animBearing,
    trail,
    haversineDistance,
  } = useAnimatedPosition(currentPosition?.[0], currentPosition?.[1], 1500, paused);

  const lastRecenterTime = useRef<number>(0);

  const smoothRecenter = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (userInteractingRef.current) return;

    const now = Date.now();
    if (now - lastRecenterTime.current < RECENTER_COOLDOWN) return;

    const center = map.getCenter();
    const dist = haversineDistance(center.lat, center.lng, lat, lng);

    if (dist < EASETO_THRESHOLD) return;

    lastRecenterTime.current = now;

    if (dist > FLYTO_THRESHOLD) {
      map.flyTo({
        center: [lng, lat],
        duration: 1800,
        essential: true,
        curve: 1.3,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    } else {
      map.easeTo({
        center: [lng, lat],
        duration: 1200,
        easing: (t) => t * (2 - t),
      });
    }
  }, [mapLoaded, haversineDistance, mapRef, userInteractingRef]);

  useEffect(() => {
    if (animLat && animLng && animLat !== 0) {
      smoothRecenter(animLat, animLng);
    }
  }, [animLat, animLng, smoothRecenter]);

  const trailData = useMemo(() => {
    if (trail.length < 2) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: trail.map((p) => [p[1], p[0]])
      }
    };
  }, [trail]);

  return (
    <>
      {/* Ephemeral breadcrumb trail */}
      {trailData && (
        <Source id="operator-trail" type="geojson" data={trailData as any}>
          <Layer
            id="trail-glow"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{
              'line-color': '#3b82f6',
              'line-width': 10,
              'line-opacity': 0.12,
              'line-blur': 6
            }}
          />
          <Layer
            id="trail-main"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{
              'line-color': '#3b82f6',
              'line-width': 3,
              'line-opacity': 0.5
            }}
          />
          <Layer
            id="trail-dots"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{
              'line-color': '#ffffff',
              'line-width': 1.5,
              'line-dasharray': [0, 3],
              'line-opacity': 0.3
            }}
          />
        </Source>
      )}

      {/* Accuracy Circle */}
      {animLat !== 0 && currentAccuracy && currentAccuracy > 15 && (
        <Source id="accuracy-circle" type="geojson" data={{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [animLng, animLat] },
          properties: {}
        }}>
          <Layer
            id="accuracy-layer"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate',
                ['exponential', 2],
                ['zoom'],
                0, 0,
                22, ['*', ['number', currentAccuracy], 10]
              ],
              'circle-color': '#3b82f6',
              'circle-opacity': 0.1,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#3b82f6',
              'circle-stroke-opacity': 0.25,
            }}
          />
        </Source>
      )}

      {/* Operator Marker - Fixed Anchor Precision */}
      {animLat !== 0 && (
        <Marker 
          latitude={animLat} 
          longitude={animLng} 
          anchor="center"
          pitchAlignment="viewport"
          rotationAlignment="viewport"
        >
          <div className="relative w-12 h-12 flex items-center justify-center pointer-events-none select-none">
            {/* Heading Chevron */}
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `rotate(${animBearing}deg)`,
                transition: 'transform 0.4s ease-out',
              }}
            >
              <div className="absolute -top-1 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[9px] border-l-transparent border-r-transparent border-b-blue-500 drop-shadow-[0_2px_4px_rgba(59,130,246,0.6)]" />
            </div>
            
            {/* Pulsing halo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            
            {/* Avatar Circle */}
            <div
              className="w-10 h-10 bg-blue-600 border-[3.5px] border-white rounded-full shadow-[0_4px_16px_rgba(59,130,246,0.5)] flex items-center justify-center overflow-hidden relative z-10"
              style={{
                transform: `rotate(${-animBearing}deg)`,
                transition: 'transform 0.4s ease-out',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Operator" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4.5 h-4.5 text-white" />
              )}
            </div>
          </div>
        </Marker>
      )}
    </>
  );
}

export default function MobileLeaflet({
  currentPosition,
  currentAccuracy,
  routePoints = [],
  patrolPath = [],
  destinations = [],
  showFloatingOverlay = true,
  avatarUrl = null
}: MobileLeafletProps) {
  const mapRef = useRef<MapRef>(null);
  const [activeStyle, setActiveStyle] = useState<keyof typeof MAP_STYLES>('STANDARD');
  const [showStyles, setShowStyles] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const userInteracting = useRef(false);
  const interactionTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [navRoute, setNavRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    if (
      !currentPosition || 
      !Array.isArray(currentPosition) || 
      !currentPosition[0] || 
      !currentPosition[1] || 
      isNaN(Number(currentPosition[0])) || 
      isNaN(Number(currentPosition[1])) ||
      !destinations || 
      !Array.isArray(destinations) ||
      destinations.length === 0 || 
      !destinations[0]?.position ||
      !Array.isArray(destinations[0].position)
    ) {
      setNavRoute([]);
      return;
    }
    const dest = destinations[0];
    const fetchDirections = async () => {
      try {
        const destLat = Number(dest.position[0]);
        const destLng = Number(dest.position[1]);
        if (isNaN(destLat) || isNaN(destLng)) return;

        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${currentPosition[1]},${currentPosition[0]};${destLng},${destLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
          setNavRoute(coords);
        }
      } catch (e) {
        console.error('[SIGPAD Directions] walking routing failure:', e);
      }
    };

    fetchDirections();
  }, [currentPosition, destinations]);

  const destinationGeofenceData = useMemo(() => {
    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) return null;
    const dest = destinations[0];
    if (!dest || !dest.position || !Array.isArray(dest.position)) return null;

    const radiusMeters = (dest as any).radius || 150;
    const lat = Number(dest.position[0]);
    const lng = Number(dest.position[1]);

    if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

    const points = 64;
    const coords: [number, number][] = [];
    const km = radiusMeters / 1000;

    for (let i = 0; i < points; i++) {
      const angle = (i * 360) / points;
      const rad = (angle * Math.PI) / 180;
      const dx = km * Math.cos(rad);
      const dy = km * Math.sin(rad);
      const pointLat = lat + (dy / 111.32);
      const pointLng = lng + (dx / (111.32 * Math.cos((lat * Math.PI) / 180)));
      coords.push([pointLng, pointLat]);
    }
    coords.push(coords[0]);

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coords]
      }
    };
  }, [destinations]);

  // Uncontrolled viewport configurations: pitch 0 for 100% accurate 2D ortho alignment
  const initialViewState = useMemo(() => {
    const rawLat = currentPosition?.[0];
    const rawLng = currentPosition?.[1];
    const validLat = (rawLat && !isNaN(Number(rawLat)) && Number(rawLat) !== 0) ? Number(rawLat) : -31.6350;
    const validLng = (rawLng && !isNaN(Number(rawLng)) && Number(rawLng) !== 0) ? Number(rawLng) : -60.7000;
    return {
      latitude: validLat,
      longitude: validLng,
      zoom: 16.5,
      pitch: 0,
      bearing: 0
    };
  }, []);

  const handleInteractionStart = useCallback(() => {
    userInteracting.current = true;
    setIsInteracting(true);
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    interactionTimeout.current = setTimeout(() => {
      userInteracting.current = false;
      setIsInteracting(false);
    }, 6000);
  }, []);

  const activeRouteData = useMemo(() => {
    const coords = navRoute.length > 0 ? navRoute : routePoints;
    if (coords.length === 0) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords.map(p => [p[1], p[0]])
      }
    };
  }, [navRoute, routePoints]);

  const patrolPathData = useMemo(() => {
    if (patrolPath.length < 2) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: patrolPath.map(p => [p[1], p[0]])
      }
    };
  }, [patrolPath]);

  if (!MAPBOX_TOKEN) return null;

  return (
    <div className="w-full h-full relative z-0">
      <Map
        initialViewState={initialViewState}
        onDragStart={handleInteractionStart}
        onDragEnd={handleInteractionEnd}
        onZoomStart={handleInteractionStart}
        onZoomEnd={handleInteractionEnd}
        mapStyle={MAP_STYLES[activeStyle]}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        onLoad={() => setMapLoaded(true)}
      >
        <GeolocateControl 
          position="top-right" 
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={true}
          showUserHeading={true}
        />
        <NavigationControl position="top-right" showCompass={true} />

        {/* GEOFENCE PERIMETER */}
        {destinationGeofenceData && (
          <Source id="destination-geofence" type="geojson" data={destinationGeofenceData as any}>
            <Layer
              id="geofence-fill"
              type="fill"
              paint={{
                'fill-color': '#0F4C5C',
                'fill-opacity': 0.12
              }}
            />
            <Layer
              id="geofence-outline"
              type="line"
              paint={{
                'line-color': '#0F4C5C',
                'line-width': 2,
                'line-dasharray': [3, 2]
              }}
            />
          </Source>
        )}

        {/* OPERATOR BREADCRUMB GROUP */}
        <OperatorLocationGroup
          currentPosition={currentPosition}
          currentAccuracy={currentAccuracy}
          avatarUrl={avatarUrl}
          mapRef={mapRef}
          mapLoaded={mapLoaded}
          userInteractingRef={userInteracting}
          paused={isInteracting}
        />

        {/* ROUTE LAYER */}
        {activeRouteData && (
          <Source id="route" type="geojson" data={activeRouteData as any}>
            <Layer
              id="route-layer-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#3b82f6',
                'line-width': 10,
                'line-opacity': 0.25,
                'line-blur': 4
              }}
            />
            <Layer
              id="route-layer-main"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#3b82f6',
                'line-width': 5.5,
                'line-opacity': 0.95
              }}
            />
            <Layer
              id="route-layer-dash"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#ffffff',
                'line-width': 1.8,
                'line-dasharray': [0, 4, 3],
                'line-opacity': 0.7
              }}
            />
          </Source>
        )}

        {/* PATROL ROUTE */}
        {patrolPathData && (
          <Source id="patrol-path" type="geojson" data={patrolPathData as any}>
            <Layer
              id="patrol-path-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#0F4C5C',
                'line-width': 9,
                'line-opacity': 0.2,
                'line-blur': 3
              }}
            />
            <Layer
              id="patrol-path-main"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#0F4C5C',
                'line-width': 4.5,
                'line-opacity': 0.9
              }}
            />
          </Source>
        )}

        {/* DESTINATIONS (OBJETIVOS) - ROCK SOLID GEOGRAPHIC ANCHORING */}
        {destinations.map(dest => {
          const lat = Number(dest.position[0]);
          const lng = Number(dest.position[1]);
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

          return (
            <Marker 
              key={dest.id} 
              latitude={lat} 
              longitude={lng}
              anchor="center"
              pitchAlignment="viewport"
              rotationAlignment="viewport"
            >
              <div className="relative flex flex-col items-center pointer-events-none select-none">
                {/* Objective Label — Floating absolutely so it NEVER distorts Marker box */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-zinc-950/90 backdrop-blur-sm px-2.5 py-1 rounded-xl shadow-lg border border-[#0F4C5C]/50 whitespace-nowrap pointer-events-none z-20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C5C]">{dest.name}</p>
                </div>
                {/* Fixed-Size Tactical Obsidian Card (Identical to Manager MapView) */}
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border-2 border-[#0F4C5C] shadow-[0_6px_20px_rgba(0,0,0,0.5)] flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[#0F4C5C]/20 rounded-xl animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }} />
                  <Building2 className="w-5 h-5 text-[#0F4C5C] relative z-10" />
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* MAP STYLE PANEL */}
      <div className="absolute top-24 right-4 z-10 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowStyles(!showStyles)}
          className="w-12 h-12 bg-black/85 text-white/95 rounded-full shadow-2xl flex items-center justify-center hover:bg-black/90 transition-colors border border-white/10"
        >
          <Layers size={20} />
        </button>

        <AnimatePresence>
          {showStyles && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="flex flex-col gap-1.5 bg-black/90 backdrop-blur-xl p-2 rounded-2xl shadow-volumetric border border-white/10"
            >
              {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map(style => (
                <button
                  key={style}
                  onClick={() => {
                    setActiveStyle(style);
                    setShowStyles(false);
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-left w-28",
                    activeStyle === style ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                >
                  {style}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FLOATING OVERLAY */}
      {showFloatingOverlay && (
        <div className="absolute bottom-10 left-0 right-0 px-6 pointer-events-none">
          <div className="bg-black/90 backdrop-blur-xl p-4 rounded-3xl shadow-volumetric border border-white/8 flex items-center justify-between">
             <div>
                <p className="text-[9px] text-white/40 uppercase font-black tracking-widest leading-none">
                  {currentAccuracy && currentAccuracy <= 20 ? 'Certificado GPS Óptimo' : 'Navegación Activa'}
                </p>
                <h4 className="text-white font-bold text-xs mt-1.5 leading-none">
                  {currentAccuracy && currentAccuracy <= 20 
                    ? `Precisión: ±${Math.round(currentAccuracy)}m (Filtro Kalman)` 
                    : 'Ajustando Posición Exacta...'}
                </h4>
             </div>
             <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                <div className={cn("w-2 h-2 rounded-full", currentAccuracy && currentAccuracy <= 20 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "bg-blue-500 animate-pulse")} />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
