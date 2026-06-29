'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, FullscreenControl, GeolocateControl, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { reverseGeocode } from '@/lib/geocoding';
import { Shield, MapPin, AlertTriangle, User, Target, Layers, Car, UserX, DoorOpen, Package, Lightbulb, Zap, Navigation, Clock, Building2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchNearbyEmergencyServices, getPOIStyle, NearbyPOI } from '@/lib/nearby-services';
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ('pk.eyJ1Ijoibmljb2VzcGlub3NhIiwiYSI6ImNtbzczM21ucjAydDgycHB2MXZsY3Bqc3EifQ.' + 'LeVW1Jfcr6Rr6q1o15Kkzw');

/* ─── Interfaces ─── */

interface Objective {
  id: string;
  name: string;
  address?: string;
  client_name?: string;
  latitude: number;
  longitude: number;
  status: string;
  geofence_radius?: number;
  is_manned?: boolean;
  occupant_name?: string;
  assigned_personnel?: any[]; // For deep join results
}

interface Guard {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  role?: string;
  currentUpdate?: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
  current_objective_id?: string;
  avatar_url?: string | null;
  isOnShift?: boolean;
  profiles?: {
    avatar_url?: string;
    full_name?: string;
  };
}

interface Incident {
  id: string;
  entry_type: string;
  content: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  status?: string;
}

interface Checkpoint {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  order_index?: number;
}

interface MapViewProps {
  objectives?: Objective[];
  guards?: Guard[];
  incidents?: Incident[];
  checkpoints?: Checkpoint[];
  onCheckpointDragEnd?: (id: string, lat: number, lng: number) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
  pathData?: [number, number][]; // Tuple of [lat, lng]
  onObjectiveSelect?: (objective: Objective) => void;
  onMapClick?: (coords: { lat: number, lng: number }) => void;
  onReverseGeocode?: (address: string) => void;
  isPickerMode?: boolean;
  draftCoords?: { lat: number, lng: number } | null;
  draft_geofence_radius?: number;
  selectedObjectiveId?: string | null;
  tileStyle?: 'standard' | 'streets' | 'satellite' | 'dark' | 'navigation' | 'hybrid';
  showHeatmap?: boolean;
  onIncidentResolve?: (id: string) => void;
  previewCoords?: { lat: number, lng: number } | null;
  isRelocating?: boolean;
  onRelocationEnd?: (id: string, lat: number, lng: number) => void;
  onDraftDragEnd?: (lat: number, lng: number) => void;
}

const googleSatelliteStyle = {
  version: 8,
  sources: {
    'google-satellite': {
      type: 'raster',
      tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
      tileSize: 256
    }
  },
  layers: [
    {
      id: 'google-satellite-layer',
      type: 'raster',
      source: 'google-satellite',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

const googleStreetsStyle = {
  version: 8,
  sources: {
    'google-streets': {
      type: 'raster',
      tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
      tileSize: 256
    }
  },
  layers: [
    {
      id: 'google-streets-layer',
      type: 'raster',
      source: 'google-streets',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

const googleHybridStyle = {
  version: 8,
  sources: {
    'google-hybrid': {
      type: 'raster',
      tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
      tileSize: 256
    }
  },
  layers: [
    {
      id: 'google-hybrid-layer',
      type: 'raster',
      source: 'google-hybrid',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

const MAP_STYLES: Record<string, any> = {
  google_streets: googleStreetsStyle,
  google_satellite: googleSatelliteStyle,
  google_hybrid: googleHybridStyle,
  standard: 'mapbox://styles/mapbox/standard',
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  navigation: 'mapbox://styles/mapbox/navigation-night-v1'
};

/* ─── Helper for Geofence GeoJSON ─── */
const createCirclePolygon = (center: [number, number], radiusInMeters: number, points = 64) => {
  const coords = {
    latitude: center[0],
    longitude: center[1]
  };
  const km = radiusInMeters / 1000;
  const ret: [number, number][] = [];
  const distanceX = km / (111.32 * Math.cos(coords.latitude * Math.PI / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]); // close loop
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret]
    }
  };
};

/* ─── Memoized Marker Contents for high performance ─── */

const GuardMarkerContent = React.memo(({
  name,
  speed,
  heading,
  isOnShift,
  isAbandoned,
  avatarUrl,
  status,
  isSelected,
  accuracy
}: {
  name: string;
  speed?: number;
  heading?: number;
  isOnShift: boolean;
  isAbandoned: boolean;
  avatarUrl: string | null;
  status: string;
  isSelected: boolean;
  accuracy?: number;
}) => {
  const speedKmh = speed ? (speed * 3.6).toFixed(1) : '0';
  const hasHeading = heading !== undefined && heading !== null;

  return (
    <div className="relative flex flex-col items-center group">
      {/* Accuracy Halo */}
      {accuracy && accuracy > 15 && (
        <div 
          className="absolute rounded-full bg-[#0F4C5C]/5 border border-[#0F4C5C]/10 pointer-events-none"
          style={{ 
            width: `${accuracy * 2}px`, 
            height: `${accuracy * 2}px`,
            transition: 'all 1s ease-out' 
          }}
        />
      )}

      {/* Name Tag */}
      <div className={cn(
        "absolute -top-10 px-2.5 py-1 bg-black/90 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/20 shadow-2xl transition-all duration-300 pointer-events-none whitespace-nowrap",
        isSelected ? "opacity-100 scale-100 -translate-y-2" : "opacity-0 scale-90 translate-y-0 group-hover:opacity-100 group-hover:scale-100 group-hover:-translate-y-1",
        isAbandoned && "border-red-500 text-red-500 font-bold",
        !isOnShift && "border-zinc-500/50 text-zinc-400"
      )}>
        {name} {isAbandoned ? " (ABANDONADO)" : !isOnShift ? " (FUERA DE TURNO)" : ""}
        {speed && speed > 0.5 && <span className="ml-2 text-primary">| {speedKmh} km/h</span>}
      </div>

      {/* Main Marker with Transition */}
      <div 
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-2xl cursor-pointer border transition-all duration-[2500ms] ease-linear overflow-hidden",
          isSelected 
            ? "bg-[#0F4C5C] border-black scale-125 z-50" 
            : isAbandoned
              ? "bg-red-600 border-red-500 hover:scale-110"
              : (status === 'active' || status === 'online' || status === 'activo')
                ? isOnShift 
                  ? "bg-zinc-900 border-[#0F4C5C] hover:scale-110"
                  : "bg-zinc-900 border-zinc-500/50 hover:scale-110 grayscale-[0.8]"
                : "bg-zinc-900 border-zinc-200/20 hover:scale-110"
        )}
      >
        {isAbandoned && (
          <div className="absolute inset-0 rounded-full animate-ping border border-red-500 opacity-75"></div>
        )}
        {avatarUrl ? (
          <img src={avatarUrl} className="w-full h-full object-cover" alt={name} />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center", isSelected ? "bg-[#0F4C5C]" : isAbandoned ? "bg-red-600" : "bg-zinc-800")}>
            <User size={16} className={isSelected ? "text-black" : "text-white"} />
          </div>
        )}
        
        {/* Pulse Effect for Active Status - Only if ON SHIFT */}
        {(status === 'active' || status === 'online' || status === 'activo') && isOnShift && !isAbandoned && (
          <div className="absolute inset-0 rounded-full bg-[#0F4C5C] animate-ping opacity-10 pointer-events-none" />
        )}
      </div>

      {/* Direction Pointer - Only show if moving */}
      {hasHeading && speed && speed > 0.5 && (
        <div 
          className="absolute w-2.5 h-2.5 bg-black rotate-45 border-r border-b border-white/50 -bottom-1.5 z-[-1] transition-all duration-[2500ms] ease-linear"
          style={{ transform: `rotate(${heading}deg) translateY(18px) rotate(45deg)` }}
        />
      )}
    </div>
  );
});
GuardMarkerContent.displayName = 'GuardMarkerContent';

const ObjectiveMarkerContent = React.memo(({
  obj,
  isSelected,
  isRelocating
}: {
  obj: Objective;
  isSelected: boolean;
  isRelocating: boolean;
}) => {
  return (
    <div className="relative flex flex-col items-center group cursor-pointer">
      {/* Visual indicator for relocation */}
      {isRelocating && isSelected && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-black text-[#0F4C5C] text-[8px] font-black uppercase px-2.5 py-1.5 rounded-lg whitespace-nowrap animate-bounce border-2 border-[#0F4C5C] shadow-[0_0_20px_rgba(15, 76, 92,0.4)] z-[60]">
          MODO REUBICACIÓN: ARRASTRAR MARCADOR
        </div>
      )}
      {/* Objective Name Label */}
      <div className={cn(
        "absolute -top-10 px-2.5 py-1 bg-zinc-900/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10 shadow-2xl transition-all duration-300 pointer-events-none whitespace-nowrap",
        isSelected ? "opacity-100 scale-100 -translate-y-1" : "opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0"
      )}>
        {obj.name}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45 border-r border-b border-white/10" />
      </div>

      {/* Main Marker Icon */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shadow-2xl cursor-pointer border transition-all duration-300",
        isSelected 
          ? "bg-[#0F4C5C] border-black scale-125 z-50" 
          : "bg-zinc-950 border-white/10 group-hover:border-[#0F4C5C]/50 group-hover:scale-110"
      )}>
        <Building2 className={cn("w-5 h-5", isSelected ? "text-black" : "text-[#0F4C5C]")} />
      </div>
    </div>
  );
});
ObjectiveMarkerContent.displayName = 'ObjectiveMarkerContent';

const IncidentMarkerContent = React.memo(({
  entryType,
  content,
  urgency,
  status
}: {
  entryType: string;
  content: string;
  urgency?: string;
  status?: string;
}) => {
  const isEmergency = entryType === 'emergencia' || entryType === 'panic' || urgency === 'critica' || status === 'critica' || status === 'crítica' || content?.toLowerCase().includes('alerta') || content?.toLowerCase().includes('crítica');

  return (
    <div 
      className={cn(
        "p-2 rounded-xl shadow-2xl cursor-pointer border-2 transition-all hover:scale-110",
        isEmergency 
          ? "bg-red-600 border-white scale-125 animate-bounce shadow-[0_0_20px_rgba(220,38,38,0.8)]" 
          : "bg-zinc-950 border-[#0F4C5C]/50 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
      )}
    >
      {(() => {
        const text = content?.toLowerCase() || '';
        if (text.includes('vehículo')) return <Car size={18} className="text-white" />;
        if (text.includes('persona')) return <UserX size={18} className="text-white" />;
        if (text.includes('puerta')) return <DoorOpen size={18} className="text-white" />;
        if (text.includes('paquete')) return <Package size={18} className="text-white" />;
        if (text.includes('eléctrica')) return <Lightbulb size={18} className="text-white" />;
        if (isEmergency) return <Zap size={18} className="text-amber-300 animate-pulse" />;
        return <AlertTriangle size={18} className="text-[#0F4C5C]" />;
      })()}
    </div>
  );
});
IncidentMarkerContent.displayName = 'IncidentMarkerContent';

const PanicAlertMarkerContent = React.memo(() => {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center cursor-pointer hover:scale-110 transition-transform">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-80" />
      <span className="relative inline-flex rounded-full h-10 w-10 bg-red-600 border-2 border-white items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.8)] z-50">
         <Zap size={20} className="text-white animate-pulse" />
      </span>
    </div>
  );
});
PanicAlertMarkerContent.displayName = 'PanicAlertMarkerContent';

/* ─── Main Component ─── */

export default function MapView({
  objectives = [],
  guards = [],
  incidents = [],
  checkpoints = [],
  onCheckpointDragEnd,
  center = [-31.6350, -60.7000],
  zoom = 13,
  className = "",
  pathData = [],
  onObjectiveSelect,
  onMapClick,
  onReverseGeocode,
  isPickerMode = false,
  draftCoords = null,
  draft_geofence_radius = 200,
  selectedObjectiveId = null,
  tileStyle = 'standard',
  showHeatmap = false,
  onIncidentResolve,
  previewCoords = null,
  isRelocating = false,
  onRelocationEnd,
  onDraftDragEnd,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [is3D, setIs3D] = useState(true); 
  const [showStyles, setShowStyles] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: center[0],
    longitude: center[1],
    zoom: zoom,
    pitch: 60,
    bearing: -20
  });

  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeStyle, setActiveStyle] = useState<keyof typeof MAP_STYLES>(tileStyle as any || 'standard');
  const [nearbyPOIs, setNearbyPOIs] = useState<NearbyPOI[]>([]);
  const [showNearby, setShowNearby] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);

  // Separate incidents into panic and regular alerts
  const panicIncidents = useMemo(() => {
    return (incidents || []).filter(inc => {
      const isResolved = inc.status === 'resolved' || inc.status === 'resuelto' || (inc.content || '').includes('[RESUELTO]');
      if (isResolved) return false;
      return inc.entry_type === 'panic' || inc.entry_type === 'panico' || inc.entry_type === 'emergencia' || (inc.content || '').toLowerCase().includes('pánico') || (inc.content || '').toLowerCase().includes('panic');
    });
  }, [incidents]);

  const regularIncidents = useMemo(() => {
    return (incidents || []).filter(inc => {
      const isResolved = inc.status === 'resolved' || inc.status === 'resuelto' || (inc.content || '').includes('[RESUELTO]');
      const isFichaje = (inc.entry_type || '').toLowerCase().includes('fichaje') || (inc.content || '').toUpperCase().includes('FICHAJE');
      if (isResolved || isFichaje) return false;
      const isPanic = inc.entry_type === 'panic' || inc.entry_type === 'panico' || inc.entry_type === 'emergencia' || (inc.content || '').toLowerCase().includes('pánico') || (inc.content || '').toLowerCase().includes('panic');
      return !isPanic;
    });
  }, [incidents]);

  const activeIncidents = useMemo(() => 
    (incidents || []).filter(inc => {
      const isResolved = inc.status === 'resolved' || inc.status === 'resuelto' || (inc.content || '').includes('[RESUELTO]');
      const isFichaje = (inc.entry_type || '').toLowerCase().includes('fichaje') || (inc.content || '').toUpperCase().includes('FICHAJE');
      return !isResolved && !isFichaje;
    }),
  [incidents]);

  const toggle3D = () => {
    const next3D = !is3D;
    setIs3D(next3D);
    setViewState(prev => ({
      ...prev,
      pitch: next3D ? 60 : 0,
      bearing: next3D ? -20 : 0,
    }));
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (center && center.length === 2) {
      setViewState(prev => ({
        ...prev,
        latitude: center[0],
        longitude: center[1],
        zoom: 18,
        pitch: 45,
        transitionDuration: 2000
      }));
    }
  }, [center?.[0], center?.[1]]);
  
  const getAvatarUrl = (item: any) => {
    if (!item) return null;
    const profiles = item.profiles;
    const avatar = item.avatar_url;
    
    if (avatar) return avatar;
    
    // Check 'profiles' (plural)
    if (profiles) {
      if (Array.isArray(profiles) && profiles.length > 0) return profiles[0].avatar_url;
      if (typeof profiles === 'object' && (profiles as any).avatar_url) return (profiles as any).avatar_url;
    }
    
    // Check 'profile' (singular) as fallback
    const singleProfile = (item as any).profile;
    if (singleProfile) {
      if (Array.isArray(singleProfile) && singleProfile.length > 0) return singleProfile[0].avatar_url;
      if (typeof singleProfile === 'object' && singleProfile.avatar_url) return singleProfile.avatar_url;
    }
    
    return null;
  };

  const onMapLoad = useCallback(() => {
    if (mapRef.current) {
      (mapRef.current as any).setLight({
        anchor: 'viewport',
        color: 'white',
        intensity: 0.45,
        position: [1.15, 210, 30]
      });
    }
  }, []);

  const handleMapClick = useCallback(async (e: any) => {
    const feature = e.features && e.features[0];
    if (feature && feature.layer.id === 'guard-points') {
      e.originalEvent?.stopPropagation();
      const p = feature.properties;
      setSelectedGuard({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        status: p.status,
        role: p.role,
        lastUpdate: p.lastUpdate,
        accuracy: p.accuracy,
        speed: p.speed,
        heading: p.heading
      } as any);
      return;
    }

    const coords = e.lngLat;
    if (isPickerMode && onMapClick) {
      onMapClick({ lat: coords.lat, lng: coords.lng });
    }
    const result = await reverseGeocode(coords.lat, coords.lng);
    if (result && onReverseGeocode) {
      onReverseGeocode(result.displayName);
    }
  }, [isPickerMode, onMapClick, onReverseGeocode]);

  const geofenceData = useMemo(() => ({
    type: 'FeatureCollection',
    features: objectives.map(obj => createCirclePolygon([obj.latitude, obj.longitude], obj.geofence_radius || 200))
  }), [objectives]);

  const draftGeofenceData = useMemo(() => {
    if (!draftCoords) return null;
    return createCirclePolygon([draftCoords.lat, draftCoords.lng], draft_geofence_radius);
  }, [draftCoords, draft_geofence_radius]);

  const heatmapData = useMemo(() => ({
    type: 'FeatureCollection',
    features: activeIncidents
      .filter(inc => inc.latitude && inc.longitude)
      .map(inc => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [inc.longitude, inc.latitude]
        },
        properties: {
          intensity: 1 
        }
      }))
  }), [activeIncidents]);
          
  const guardAccuracyData = useMemo(() => ({
    type: 'FeatureCollection',
    features: (guards || [])
      .filter(g => g.latitude && g.longitude && g.accuracy)
      .map(g => createCirclePolygon([g.latitude, g.longitude], g.accuracy || 10))
  }), [guards]);

  const guardLinkLinesData = useMemo(() => ({
    type: 'FeatureCollection',
    features: (guards || [])
      .filter(g => g.current_objective_id && g.latitude && g.longitude)
      .map(g => {
        const obj = objectives.find(o => o.id === g.current_objective_id);
        if (!obj) return null;
        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[g.longitude, g.latitude], [obj.longitude, obj.latitude]]
          }
        };
      }).filter(Boolean)
  }), [guards, objectives]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center p-8 text-center">
        <p className="text-white font-bold">ERROR: Mapbox Token missing. Please check .env.local</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={MAP_STYLES[activeStyle]}
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
        onLoad={onMapLoad}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        terrain={is3D ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
        projection={is3D ? { name: 'globe' } : { name: 'mercator' }}
        interactiveLayerIds={['guard-points']}
        fog={is3D ? {
          'range': [1.0, 12],
          'color': '#aabacb',
          'horizon-blend': 0.1
        } : undefined}
      >
        <NavigationControl position="bottom-left" />
        <GeolocateControl position="bottom-left" />

        {activeStyle !== 'standard' && (
          <>
            <Source
              id="mapbox-dem"
              type="raster-dem"
              url="mapbox://mapbox.mapbox-terrain-dem-v1"
              tileSize={512}
            />
          </>
        )}

        {is3D && activeStyle !== 'standard' && (
          <Layer
            id="3d-buildings"
            source="composite"
            source-layer="building"
            filter={['==', 'extrude', 'true']}
            type="fill-extrusion"
            minzoom={15}
            paint={{
              'fill-extrusion-color': '#e2ded4',
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 1.0,
              'fill-extrusion-ambient-occlusion-intensity': 0.4
            }}
          />
        )}

        <Source id="geofences" type="geojson" data={geofenceData as any}>
          <Layer 
            id="geofence-fill" 
            type="fill" 
            minzoom={14}
            paint={{ 'fill-color': '#F59E0B', 'fill-opacity': 0.1 }} 
          />
          <Layer 
            id="geofence-outline" 
            type="line" 
            minzoom={14}
            paint={{ 'line-color': '#F59E0B', 'line-width': 1, 'line-dasharray': [2, 2] }} 
          />
        </Source>

        {draftGeofenceData && (
          <Source id="draft-geofence" type="geojson" data={draftGeofenceData as any}>
            <Layer id="draft-fill" type="fill" paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.2 }} />
            <Layer id="draft-outline" type="line" paint={{ 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [3, 1] }} />
          </Source>
        )}

        {showHeatmap && heatmapData.features.length > 0 && (
          <Source id="incidents-heatmap" type="geojson" data={heatmapData as any}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              maxzoom={15}
              paint={{
                'heatmap-weight': { property: 'intensity', type: 'exponential', stops: [[1, 0], [62, 1]] } as any,
                'heatmap-intensity': { stops: [[11, 1], [15, 3]] } as any,
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(33,102,172,0)', 0.2, 'rgb(103,169,207)', 0.4, 'rgb(209,229,240)',
                  0.6, 'rgb(253,219,199)', 0.8, 'rgb(239,138,98)', 1, 'rgb(178,24,43)'
                ] as any,
                'heatmap-radius': { stops: [[11, 15], [15, 20]] } as any,
                'heatmap-opacity': 0.6
              }}
            />
          </Source>
        )}

        <Source id="guard-link-lines" type="geojson" data={guardLinkLinesData as any}>
          <Layer
            id="guard-link-layer"
            type="line"
            paint={{ 'line-color': '#0F4C5C', 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': 0.4 }}
          />
        </Source>

        <Source id="guard-accuracy" type="geojson" data={guardAccuracyData as any}>
          <Layer id="guard-accuracy-fill" type="fill" paint={{ 'fill-color': '#0F4C5C', 'fill-opacity': 0.05 }} />
          <Layer id="guard-accuracy-outline" type="line" paint={{ 'line-color': '#0F4C5C', 'line-width': 1, 'line-opacity': 0.15 }} />
        </Source>



        {/* Nearby Emergency Services Markers */}
        {showNearby && nearbyPOIs.map((poi) => {
          const style = getPOIStyle(poi.type);
          return (
            <Marker key={`poi-${poi.id}`} latitude={poi.latitude} longitude={poi.longitude}>
              <div className="relative group cursor-pointer">
                <div className="p-1.5 rounded-lg shadow-xl border-2 border-white transition-transform hover:scale-125" style={{ backgroundColor: style.color }}>
                  <span className="text-sm">{style.emoji}</span>
                </div>
                {/* ETA Badge */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  ~{poi.estimatedETA} min
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Guard Markers with Professional Animation and Heading */}
        {(guards || []).map((g) => {
          if (!g.latitude || !g.longitude) return null;
          
          const isSelected = selectedGuard?.id === g.id;
          const isAbandoned = g.status === 'abandoned';
          
          return (
            <Marker
              key={`guard-${g.id}`}
              latitude={Number(g.latitude)}
              longitude={Number(g.longitude)}
              anchor="center"
              rotationAlignment="viewport"
              pitchAlignment="viewport"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedGuard(g);
              }}
            >
              <GuardMarkerContent
                name={g.name}
                speed={g.speed}
                heading={g.heading}
                isOnShift={!!g.isOnShift}
                isAbandoned={isAbandoned}
                avatarUrl={getAvatarUrl(g)}
                status={g.status}
                isSelected={isSelected}
                accuracy={g.accuracy}
              />
            </Marker>
          );
        })}

        {/* 🔥 PANIC ALERTS (REALTIME PULSING) 🔥 */}
        {panicIncidents.map((alert, index) => {
          if (!alert.latitude || !alert.longitude) return null;
          return (
            <Marker 
              key={`panic-${alert.id || index}`} 
              latitude={Number(alert.latitude)} 
              longitude={Number(alert.longitude)} 
              anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedIncident(alert);
              }}
            >
              <PanicAlertMarkerContent />
            </Marker>
          );
        })}

        {pathData && pathData.length > 1 && (
          <Source id="patrol-path" type="geojson" data={{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: pathData.map(p => [p[1], p[0]])
            }
          } as any}>
            <Layer
              id="patrol-path-layer"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': '#0F4C5C', // Tactical Gold
                'line-width': 5,
                'line-opacity': 1,
              }}
            />
          </Source>
        )}

        {regularIncidents.map((inc) => {
          if (!inc.latitude || !inc.longitude) return null;
          return (
            <Marker
              key={`inc-${inc.id}`}
              latitude={Number(inc.latitude)}
              longitude={Number(inc.longitude)}
              rotationAlignment="viewport"
              pitchAlignment="viewport"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedIncident(inc);
              }}
            >
              <IncidentMarkerContent
                entryType={inc.entry_type}
                content={inc.content}
                status={inc.status}
              />
            </Marker>
          );
        })}

        {/* Checkpoint Markers */}
        {(checkpoints || []).filter(cp => cp.latitude && cp.longitude && !isNaN(Number(cp.latitude)) && !isNaN(Number(cp.longitude))).map((cp) => (
          <Marker
            key={`cp-${cp.id}`}
            latitude={Number(cp.latitude)}
            longitude={Number(cp.longitude)}
            anchor="center"
            draggable={!!onCheckpointDragEnd}
            onDragEnd={(e) => {
              if (onCheckpointDragEnd) onCheckpointDragEnd(cp.id, e.lngLat.lat, e.lngLat.lng);
            }}
          >
            <div className="relative flex flex-col items-center group cursor-pointer">
              <div className="bg-amber-500 p-1.5 rounded-full border-2 border-white shadow-lg transition-transform group-hover:scale-110 flex items-center justify-center">
                <Target size={12} className="text-zinc-950 font-bold" />
              </div>
              <div className="absolute top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/90 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl pointer-events-none whitespace-nowrap border border-amber-500/20 z-[60]">
                {cp.name}
              </div>
            </div>
          </Marker>
        ))}

        {/* Objective Markers */}
        {(objectives || []).filter(o => o.latitude && o.longitude && !isNaN(Number(o.latitude)) && !isNaN(Number(o.longitude))).map((obj) => {
          if (!obj.latitude || !obj.longitude) return null;
          const isSelected = selectedObjectiveId === obj.id || selectedObjective?.id === obj.id;
          
          return (
            <Marker
              key={`obj-${obj.id}`}
              latitude={Number(obj.latitude)}
              longitude={Number(obj.longitude)}
              anchor="bottom"
              rotationAlignment="viewport"
              pitchAlignment="viewport"
              draggable={isRelocating && isSelected}
              onDragEnd={(e) => {
                if (onRelocationEnd) onRelocationEnd(obj.id, e.lngLat.lat, e.lngLat.lng);
              }}
              onClick={e => {
                e.originalEvent.stopPropagation();
                if (onObjectiveSelect) onObjectiveSelect(obj);
              }}
            >
              <ObjectiveMarkerContent
                obj={obj}
                isSelected={isSelected}
                isRelocating={isRelocating}
              />
            </Marker>
          );
        })}

        {draftCoords && (
          <Marker 
            latitude={draftCoords.lat} 
            longitude={draftCoords.lng}
            draggable={isPickerMode}
            rotationAlignment="viewport"
            pitchAlignment="viewport"
            onDragEnd={(e) => onDraftDragEnd && onDraftDragEnd(e.lngLat.lat, e.lngLat.lng)}
            anchor="bottom"
          >
            <div className="relative flex flex-col items-center group cursor-grab active:cursor-grabbing">
              {isPickerMode && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-[#0F4C5C] text-[8px] font-black uppercase px-2.5 py-1.5 rounded-lg whitespace-nowrap animate-bounce border border-[#0F4C5C] shadow-[0_0_15px_rgba(15, 76, 92,0.4)] z-[60]">
                  ARRASTRAR PARA AJUSTAR
                </div>
              )}
              <div className="bg-[#0F4C5C] p-2 rounded-full shadow-[0_0_20px_rgba(15, 76, 92,0.8)] border-2 border-white transition-transform hover:scale-110">
                <MapPin size={24} className="text-black" />
              </div>
              <div className="mt-1 px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[9px] font-black text-[#0F4C5C] uppercase tracking-widest border border-[#0F4C5C]/30">
                Nuevo Objetivo
              </div>
            </div>
          </Marker>
        )}
        
        {/* Search Preview Drop-Pin */}
        {previewCoords && (
          <Marker latitude={previewCoords.lat} longitude={previewCoords.lng} anchor="bottom" rotationAlignment="viewport" pitchAlignment="viewport">
             <div className="relative flex flex-col items-center">
                <div className="bg-[#0F4C5C] p-2 rounded-full shadow-[0_0_20px_rgba(15, 76, 92,0.6)] border-2 border-white animate-bounce">
                   <MapPin size={24} className="text-black" />
                </div>
                <div className="mt-1 px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[8px] font-black text-white uppercase tracking-[0.2em] border border-[#0F4C5C]/30">
                  Punto de Interés
                </div>
             </div>
          </Marker>
        )}

        {selectedObjective && (
          <Popup
            latitude={Number(selectedObjective.latitude)}
            longitude={Number(selectedObjective.longitude)}
            onClose={() => setSelectedObjective(null)}
            closeButton={false}
            offset={20}
          >
            <div className="p-3 min-w-[200px] bg-white text-zinc-900 rounded-xl border border-zinc-200 shadow-2xl">
              <h3 className="font-black text-xs uppercase tracking-tight mb-1">{selectedObjective.name}</h3>
              {selectedObjective.assigned_personnel && selectedObjective.assigned_personnel.length > 0 ? (
                <div className="flex flex-col gap-2 mt-3 mb-3 border-t border-zinc-100 pt-3">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Fuerza Asignada</p>
                  {selectedObjective.assigned_personnel.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-zinc-50 flex items-center justify-center overflow-hidden border border-zinc-200">
                        {getAvatarUrl(p) ? (
                          <img src={getAvatarUrl(p) || ''} className="w-full h-full object-cover" alt={p.name} />
                        ) : (
                          <span className="text-[9px] font-black text-[#0F4C5C]">{p.name?.split(' ').map((n:any) => n[0]).join('')}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-black text-zinc-900 uppercase">{p.name}</span>
                    </div>
                  ))}
                </div>
              ) : selectedObjective.is_manned ? (
                <div className="flex items-center gap-2 mt-2 mb-2 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0F4C5C]" />
                  <span className="text-[10px] font-black text-zinc-900 uppercase tracking-tighter">{selectedObjective.occupant_name}</span>
                </div>
              ) : (
                <p className="text-[9px] font-black text-amber-600/80 uppercase mt-2 mb-2 tracking-widest">• Sin personal activo</p>
              )}
              <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest leading-relaxed mt-2 border-t border-zinc-100 pt-2">{selectedObjective.address}</p>
            </div>
          </Popup>
        )}

        {selectedGuard && (
          <Popup
            latitude={Number(selectedGuard.latitude)}
            longitude={Number(selectedGuard.longitude)}
            onClose={() => setSelectedGuard(null)}
            closeButton={false}
            offset={15}
          >
            <div className="p-4 min-w-[200px] bg-zinc-950 text-zinc-100 rounded-2xl border border-white/5 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-[#0F4C5C]/20 overflow-hidden shadow-inner shadow-[#0F4C5C]/5">
                  {getAvatarUrl(selectedGuard) ? (
                    <img src={getAvatarUrl(selectedGuard) || ''} className="w-full h-full object-cover" alt={selectedGuard.name} />
                  ) : (
                    <User className="w-5 h-5 text-[#0F4C5C]" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-zinc-100 tracking-tight leading-none">{selectedGuard.name}</p>
                  <p className="text-[9px] font-black text-[#0F4C5C] uppercase tracking-[0.15em] mt-1">{selectedGuard.role || 'Operador'}</p>
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Estado</span>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full animate-pulse",
                      (selectedGuard.status === 'activo' || selectedGuard.status === 'active' || selectedGuard.status === 'online') ? "bg-[#0F4C5C]" : "bg-zinc-600"
                    )} />
                    <span className={cn(
                      "text-[9px] font-black uppercase",
                      (selectedGuard.status === 'activo' || selectedGuard.status === 'active' || selectedGuard.status === 'online') ? "text-[#0F4C5C]" : "text-zinc-500"
                    )}>
                      {selectedGuard.status === 'activo' || selectedGuard.status === 'active' || selectedGuard.status === 'online' ? 'En Línea' : 'Desconectado'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Sincronización</span>
                  <span className="text-[9px] font-black text-zinc-400 uppercase">
                    {selectedGuard.currentUpdate ? new Date(selectedGuard.currentUpdate).toLocaleTimeString() : 'Tiempo Real'}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        )}
        {selectedIncident && (
          <Popup
            latitude={Number(selectedIncident.latitude)}
            longitude={Number(selectedIncident.longitude)}
            onClose={() => setSelectedIncident(null)}
            closeButton={false}
            offset={25}
          >
            <div className="p-3 min-w-[220px]">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  (selectedIncident.entry_type === 'emergencia' || selectedIncident.content?.toLowerCase().includes('crítica')) 
                    ? "bg-red-100" : "bg-zinc-100"
                )}>
                  <AlertTriangle className={cn(
                    "w-4 h-4",
                    (selectedIncident.entry_type === 'emergencia' || selectedIncident.content?.toLowerCase().includes('crítica')) 
                      ? "text-red-600" : "text-zinc-600"
                  )} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-900 tracking-tight">Detalle de Alerta</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {selectedIncident.entry_type || 'Incidencia'}
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 mb-3">
                <p className="text-xs font-medium text-gray-700 leading-relaxed italic">
                  "{selectedIncident.content}"
                </p>
                {selectedIncident.created_at && (
                  <div className="flex items-center gap-1 mt-2 text-gray-400">
                    <Clock size={10} />
                    <span className="text-[9px] font-bold">
                      {new Date(selectedIncident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} HS
                    </span>
                  </div>
                )}
              </div>

              {onIncidentResolve && (
                <button
                  onClick={() => {
                    onIncidentResolve(selectedIncident.id);
                    setSelectedIncident(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl transition-all active:scale-95 shadow-lg shadow-zinc-200"
                >
                  <CheckCircle2 size={14} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Resolver Alerta</span>
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>

      <div className={cn("absolute z-10 flex flex-col items-end gap-2.5", isMobile ? "top-20 right-4" : "top-6 right-6")}>
        <button 
          onClick={() => setShowStyles(!showStyles)} 
          className="w-12 h-12 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.12)] flex items-center justify-center border border-zinc-200/80 hover:scale-105 active:scale-95 transition-all text-zinc-800"
          title="Estilo del mapa"
        >
          <Layers size={20} className="text-[#0F4C5C]" />
        </button>
        <AnimatePresence>
          {showStyles && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: -10, scale: 0.95 }} 
              className="flex flex-col gap-1 bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-zinc-200/80 shadow-[0_15px_40px_rgba(0,0,0,0.15)] min-w-[140px]"
            >
              <button 
                onClick={toggle3D} 
                className="px-3 py-2 text-[10px] font-black uppercase text-zinc-500 hover:text-zinc-900 transition-colors border-b border-zinc-100 text-left"
              >
                {is3D ? 'Ver: 3D Habilitado' : 'Ver: 2D Plano'}
              </button>
              {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map(style => (
                <button 
                  key={style} 
                  onClick={() => setActiveStyle(style)} 
                  className={cn(
                    "px-3 py-2 rounded-xl text-[10px] font-black uppercase text-left transition-all duration-200", 
                    activeStyle === style 
                      ? "bg-[#0F4C5C]/10 text-[#0F4C5C] border border-[#0F4C5C]/20" 
                      : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  {style}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ Nearby Emergency Services Panel ═══ */}
      <AnimatePresence>
        {showNearby && nearbyPOIs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "absolute z-20 w-80 max-h-72 overflow-y-auto rounded-2xl shadow-2xl border no-scrollbar",
              isMobile ? "bottom-4 left-4 right-4 w-auto" : "bottom-6 left-6"
            )}
            style={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="sticky top-0 bg-black/95 backdrop-blur px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-primary" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Servicios Cercanos</span>
              </div>
              <button
                onClick={() => setShowNearby(false)}
                className="text-[9px] font-bold text-white/40 hover:text-white uppercase tracking-wider"
              >
                Cerrar
              </button>
            </div>
            <div className="p-2 space-y-1">
              {nearbyPOIs.slice(0, 10).map((poi) => {
                const style = getPOIStyle(poi.type);
                return (
                  <div
                    key={poi.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => {
                      if (mapRef.current) {
                        mapRef.current.flyTo({ center: [poi.longitude, poi.latitude], zoom: 17, duration: 1500 });
                      }
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: style.color + '22' }}>
                      <span className="text-sm">{style.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{poi.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-white/40">{poi.distance < 1000 ? `${poi.distance}m` : `${(poi.distance/1000).toFixed(1)}km`}</span>
                        <span className="text-[9px] text-white/20">·</span>
                        <span className="text-[9px] font-black uppercase" style={{ color: style.color }}>{style.label}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-white/30" />
                        <span className="text-[10px] font-black text-white">~{poi.estimatedETA}min</span>
                      </div>
                      <p className="text-[8px] font-bold text-white/30 uppercase">ETA</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
