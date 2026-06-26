'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, GeolocateControl, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { Shield, User, Navigation, Target, Search, X, MapPin, Loader2, AlertTriangle, Clock, CheckCircle2, Zap, Car, UserX, DoorOpen, Package, Lightbulb } from 'lucide-react';
import { searchAddresses, GeocodingResult, searchBoxRetrieve } from '@/lib/geocoding';


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const MAP_STYLES = {
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  NAVIGATION: 'mapbox://styles/mapbox/navigation-night-v1',
  STREETS: 'mapbox://styles/mapbox/streets-v12'
};

interface Objective {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface Resource {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  avatar_url?: string | null;
  routePoints?: [number, number][];
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

interface TacticalLeafletProps {
  objectives?: Objective[];
  resources?: Resource[];
  incidents?: Incident[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onPointSelect?: (point: Objective) => void;
  onResourceSelect?: (res: Resource) => void;
  onMapClick?: (coords: { lat: number, lng: number }) => void;
  isPickerMode?: boolean;
  draftCoords?: { lat: number, lng: number } | null;
  onIncidentResolve?: (id: string) => void;
  selectedRoute?: [number, number][]; // [lat, lng][]
}

const createCirclePolygon = (center: [number, number], radiusInMeters: number, points = 64) => {
  const latitude = Number(center[0]);
  const longitude = Number(center[1]);
  if (isNaN(latitude) || isNaN(longitude)) return null;

  const km = radiusInMeters / 1000;
  const ret: any[] = [];
  const distanceX = km / (111.32 * Math.cos(latitude * Math.PI / 180));
  const distanceY = km / 110.574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([longitude + x, latitude + y]);
  }
  ret.push(ret[0]);
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ret] } };
};

export default function TacticalLeaflet({
  objectives = [],
  resources = [],
  incidents = [],
  center = [-31.6107, -60.6973],
  zoom = 14,
  className = "",
    onPointSelect,
    onResourceSelect,
    onMapClick,
    isPickerMode = false,
    draftCoords = null,
    onIncidentResolve,
    selectedRoute = []
  }: TacticalLeafletProps) {
    const mapRef = React.useRef<MapRef>(null);
    const [activeStyle, setActiveStyle] = useState<keyof typeof MAP_STYLES>('NAVIGATION');
    const [viewState, setViewState] = useState({
      latitude: center[0],
      longitude: center[1],
      zoom: zoom
    });
    const [selectedPoint, setSelectedPoint] = useState<Objective | null>(null);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

    // Fly to center coordinates when they change
    useEffect(() => {
      if (center && mapRef.current) {
        const [lat, lng] = center;
        if (!isNaN(lat) && !isNaN(lng)) {
          const mapCenter = mapRef.current.getCenter();
          const dist = Math.sqrt(Math.pow(mapCenter.lat - lat, 2) + Math.pow(mapCenter.lng - lng, 2));
          if (dist > 0.001) {
            mapRef.current.flyTo({
              center: [lng, lat],
              zoom: 15,
              duration: 1500
            });
          }
        }
      }
    }, [center?.[0], center?.[1]]);

    const activeIncidents = useMemo(() => 
      incidents.filter(inc => inc.status !== 'resolved' && inc.status !== 'resuelto' && !(inc.content || '').includes('[RESUELTO]')),
    [incidents]);

    const routeData = useMemo(() => {
      if (!selectedRoute || selectedRoute.length === 0) return null;
      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: selectedRoute.map(p => [p[1], p[0]])
        }
      };
    }, [selectedRoute]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);

    useEffect(() => {
      const performSearch = async () => {
        if (searchQuery.length < 3) {
          setSearchResults([]);
          return;
        }
        setIsSearching(true);
        try {
          const results = await searchAddresses(searchQuery);
          setSearchResults(results);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      };

      const timer = setTimeout(performSearch, 500);
      return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectResult = async (res: any) => {
      setSearchQuery('');
      setSearchResults([]);
      setSearchFocused(false);
      
      let target = { lat: res.lat, lng: res.lng };

      // If it's a Search Box Suggestion, we need to retrieve details
      if (res.mapbox_id) {
        const details = await searchBoxRetrieve(res.mapbox_id);
        if (details) {
          target = { lat: details.lat, lng: details.lng };
        }
      }

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [target.lng, target.lat],
          zoom: 16,
          duration: 2000
        });
      }

      if (isPickerMode && onMapClick) {
        onMapClick(target);
      }
    };

    const geofenceData = useMemo(() => ({
      type: 'FeatureCollection',
      features: objectives
        .map(obj => createCirclePolygon([obj.latitude, obj.longitude], 150))
        .filter(f => f !== null)
    }), [objectives]);

    if (!MAPBOX_TOKEN) return null;

    return (
      <div className={cn("relative w-full h-full z-0 bg-zinc-100 overflow-hidden", isPickerMode ? "cursor-crosshair" : "", className)}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={MAP_STYLES[activeStyle]}
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={(e) => isPickerMode && onMapClick && onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="bottom-right" />
          <GeolocateControl position="bottom-right" />

          {/* Route Line */}
          {routeData && (
            <Source id="patrol-route" type="geojson" data={routeData as any}>
              <Layer
                id="route-line"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{
                  'line-color': '#3b82f6',
                  'line-width': 4,
                  'line-opacity': 0.8,
                  'line-dasharray': [2, 1]
                }}
              />
            </Source>
          )}

          <Source id="geofences" type="geojson" data={geofenceData as any}>
            <Layer
              id="geofence-fill"
              type="fill"
              paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.05 }}
            />
            <Layer
              id="geofence-outline"
              type="line"
              paint={{ 'line-color': '#3b82f6', 'line-width': 1, 'line-opacity': 0.2 }}
            />
          </Source>

          {objectives.filter(o => o && o.latitude && o.longitude && !isNaN(Number(o.latitude)) && !isNaN(Number(o.longitude))).map((obj) => (
            <Marker
              key={`obj-${obj.id}`}
              latitude={Number(obj.latitude)}
              longitude={Number(obj.longitude)}
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedPoint(obj);
                if (onPointSelect) onPointSelect(obj);
              }}
            >
              <div className="relative group cursor-pointer">
                <div className="absolute w-8 h-8 -top-4 -left-4 bg-amber-500/20 rounded-full animate-ping group-hover:bg-amber-500/40" />
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-all group-hover:scale-125",
                  obj.status === 'Activo' ? "bg-amber-500" : "bg-red-500"
                )}>
                  <Shield className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
            </Marker>
          ))}

          {/* Tactical Professional Resource Markers */}
          {resources.filter(r => r && r.latitude && r.longitude && !isNaN(Number(r.latitude)) && !isNaN(Number(r.longitude))).map((res: any) => {
            const isActive = res.status === 'activo' || res.status === 'active' || res.status === 'En Turno';
            const hasHeading = res.heading !== undefined && res.heading !== null;
            const speedKmh = res.speed ? (res.speed * 3.6).toFixed(1) : '0';

            return (
              <Marker
                key={`res-${res.id}`}
                latitude={Number(res.latitude)}
                longitude={Number(res.longitude)}
                anchor="center"
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  if (onResourceSelect) onResourceSelect(res);
                }}
              >
                <div className="relative flex flex-col items-center group transition-all duration-[2500ms] ease-linear cursor-pointer">
                  {/* Name Tag (HUD Style) */}
                  <div className="absolute -top-10 px-2 py-1 bg-black/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-tighter rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {res.name} {isActive && <span className="text-primary ml-1">●</span>}
                  </div>

                  {/* Animated Body */}
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-2xl border-2 transition-all duration-[2500ms] ease-linear overflow-hidden",
                      isActive ? "bg-zinc-900 border-primary" : "bg-zinc-800 border-zinc-600 opacity-60"
                    )}
                  >
                    {res.avatar_url ? (
                      <img src={res.avatar_url} className="w-full h-full object-cover" alt={res.name} />
                    ) : hasHeading && res.speed > 0.5 ? (
                      <Navigation className="w-4 h-4 text-primary" style={{ transform: `rotate(${res.heading}deg)` }} />
                    ) : (
                      <User className={cn("w-4 h-4", isActive ? "text-primary" : "text-zinc-500")} />
                    )}

                    {/* Pulse for High Speed */}
                    {isActive && res.speed > 2 && (
                      <div className="absolute inset-0 rounded-xl bg-primary animate-ping opacity-20" />
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className={cn(
                    "mt-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border",
                    isActive ? "bg-primary text-black border-primary" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                  )}>
                    {isActive ? (res.speed > 0.5 ? `${speedKmh} KM/H` : 'EN TURNO') : (res.status?.toUpperCase() || 'OFFLINE')}
                  </div>
                </div>
              </Marker>
            );
          })}

        {activeIncidents.map((inc) => {
          if (!inc.latitude || !inc.longitude) return null;
          return (
            <Marker
              key={`inc-${inc.id}`}
              latitude={Number(inc.latitude)}
              longitude={Number(inc.longitude)}
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedIncident(inc);
              }}
            >
              <div className={cn(
                "p-2 rounded-xl shadow-2xl cursor-pointer border-2 border-white transition-all hover:scale-125 z-[100]",
                (inc.entry_type === 'emergencia' || inc.entry_type === 'panic' || (inc as any).urgency === 'critica' || inc.status === 'critica' || inc.status === 'crítica' || inc.content?.toLowerCase().includes('alerta') || inc.content?.toLowerCase().includes('crítica')) 
                  ? "bg-red-600 scale-125 animate-bounce shadow-[0_0_25px_rgba(239,68,68,0.8)]" 
                  : "bg-zinc-900"
              )}>
                {(() => {
                  const content = inc.content?.toLowerCase() || '';
                  if (content.includes('vehículo')) return <Car size={14} className="text-white" />;
                  if (content.includes('persona')) return <UserX size={14} className="text-white" />;
                  if (content.includes('puerta')) return <DoorOpen size={14} className="text-white" />;
                  if (content.includes('paquete')) return <Package size={14} className="text-white" />;
                  if (content.includes('eléctrica')) return <Lightbulb size={14} className="text-white" />;
                  if (content.includes('crítica') || content.includes('alerta') || inc.entry_type === 'panic' || (inc as any).urgency === 'critica' || inc.status === 'critica' || inc.status === 'crítica') return <Zap size={14} className="text-amber-300 animate-pulse" />;
                  return <AlertTriangle size={14} className="text-white" />;
                })()}
              </div>
            </Marker>
          );
        })}

        {draftCoords && (
          <Marker latitude={draftCoords.lat} longitude={draftCoords.lng}>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
              <Target className="w-6 h-6 text-primary" />
            </div>
          </Marker>
        )}

        {selectedPoint && (
          <Popup
            latitude={Number(selectedPoint.latitude)}
            longitude={Number(selectedPoint.longitude)}
            onClose={() => setSelectedPoint(null)}
            closeButton={false}
            offset={20}
          >
            <div className="p-3 bg-white min-w-[200px] rounded-lg shadow-xl">
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">{selectedPoint.name}</h3>
              <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold tracking-tighter">Punto de vigilancia</p>
              
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-[8px] font-black uppercase tracking-widest text-primary mb-1.5">Personal Presente</p>
                {(() => {
                  const present = (resources as any[]).filter(r => 
                    r.current_objective_id === selectedPoint.id && 
                    (r.status === 'active' || r.status === 'activo')
                  );
                  if (present.length === 0) return <p className="text-[10px] text-zinc-400 font-medium italic">Ningún operador en posición</p>;
                  
                  return (
                    <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar">
                      {present.map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                          <span className="text-[10px] font-bold text-zinc-800 uppercase leading-none">{p.name || 'Operador'}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="mt-3 flex gap-2 items-center">
                <div className={cn("w-2 h-2 rounded-full", selectedPoint.status === 'Activo' ? "bg-green-500" : "bg-red-500")} />
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{selectedPoint.status}</span>
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
            offset={20}
          >
            <div className="p-3 min-w-[180px] bg-white rounded-lg shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-900">{selectedIncident.entry_type || 'Alerta'}</p>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase">Incidencia</p>
                </div>
              </div>
              <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100 mb-3">
                <p className="text-[10px] font-medium text-zinc-600 leading-tight">
                  {selectedIncident.content}
                </p>
              </div>
              {onIncidentResolve && (
                <button
                  onClick={() => {
                    onIncidentResolve(selectedIncident.id);
                    setSelectedIncident(null);
                  }}
                  className="w-full py-2 bg-zinc-900 hover:bg-black text-white rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={12} className="text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Resolver</span>
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>

      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 bg-black/80 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/10">
        {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map(style => (
          <button
            key={style}
            onClick={() => setActiveStyle(style)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeStyle === style ? "bg-primary text-black" : "text-white/40 hover:text-white"
            )}
          >
            {style}
          </button>
        ))}
      </div>

      <div className="absolute top-6 left-6 z-[10] pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md px-4 py-2 border border-white/10 rounded-lg shadow-2xl">
           <p className="text-[10px] font-black text-white uppercase tracking-widest">Si.Ge.S Intelligence Unit</p>
           <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] text-white/60 uppercase font-bold tracking-tighter italic">Sincronización Tactical Activa</span>
           </div>
        </div>
      </div>

      {/* Improved Search Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4">
        <div className={cn(
          "bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden",
          searchFocused ? "ring-2 ring-primary/40 ring-offset-0 border-primary/30" : ""
        )}>
          <div className="flex items-center gap-3 px-4 py-3">
             {isSearching ? <Loader2 size={16} className="text-primary animate-spin" /> : <Search size={16} className="text-white/40" />}
             <input 
               placeholder="Buscar dirección o punto..."
               className="bg-transparent border-none text-xs font-bold text-white placeholder:text-white/20 focus:ring-0 w-full uppercase tracking-tighter"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               onFocus={() => setSearchFocused(true)}
             />
             {searchQuery && (
               <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-white/10 rounded-full">
                 <X size={14} className="text-white/40" />
               </button>
             )}
          </div>
          
          {searchQuery.length >= 3 && (
            <div className="border-t border-white/5 max-h-[300px] overflow-y-auto">
               {searchResults.length > 0 ? (
                 searchResults.map((res, i) => (
                   <button
                     key={i}
                     onClick={() => handleSelectResult(res)}
                     className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-start gap-3 border-b border-white/5 last:border-none transition-colors"
                   >
                     <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-primary" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-tight">{res.displayName}</p>
                        <p className="text-[8px] text-white/40 uppercase font-bold mt-0.5">{res.city}, {res.state}</p>
                     </div>
                   </button>
                 ))
               ) : !isSearching && (
                 <div className="px-4 py-6 text-center">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Sin resultados</p>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
