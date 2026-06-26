'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Map as MapIcon, History, Search, Loader2, Play, Pause, AlertCircle } from 'lucide-react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface HistoricalTimelineProps {
  operatorId: string;
}

export function HistoricalTimeline({ operatorId }: HistoricalTimelineProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [pathData, setPathData] = useState<{ lat: number, lng: number, timestamp: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [routeCollection, setRouteCollection] = useState<any>(null);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);

  useEffect(() => {
    if (!operatorId || !selectedDate) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const fromDate = new Date(`${selectedDate}T00:00:00.000Z`);
        const toDate = new Date(`${selectedDate}T23:59:59.999Z`);
        
        // Fetch PostGIS GeoJSON Routes
        const resRoutes = await fetch(`/api/tracking/routes?operator_id=${operatorId}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`);
        if (resRoutes.ok) {
           const geojson = await resRoutes.json();
           setRouteCollection(geojson);
        }

        // Fetch Raw Points for playback
        const resPoints = await fetch(`/api/tracking/history?operator_id=${operatorId}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`);
        if (!resPoints.ok) throw new Error('No se pudo cargar el historial');
        
        const data = await resPoints.json();
        
        if (data && Array.isArray(data)) {
           setPathData(data.map(d => ({ lat: d.latitude, lng: d.longitude, timestamp: d.recorded_at })));
        } else {
           setPathData([]);
        }
        setPlaybackIndex(0);
        setIsPlaying(false);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [operatorId, selectedDate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && pathData.length > 0) {
      interval = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev >= pathData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500); // Speed of playback
    }
    return () => clearInterval(interval);
  }, [isPlaying, pathData]);

  const routeGeoJSON = useMemo(() => {
    if (pathData.length < 2) return null;
    // For playback, only show path up to current index
    const activePoints = isPlaying || playbackIndex > 0 ? pathData.slice(0, playbackIndex + 1) : pathData;
    
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: activePoints.map(p => [p.lng, p.lat])
      }
    };
  }, [pathData, playbackIndex, isPlaying]);

  const currentPlaybackPoint = pathData[playbackIndex];

  return (
    <div className="flex flex-col gap-6">
       {/* Controls Header */}
       <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
             <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="text-blue-600" size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Fecha de Consulta</p>
                <Input 
                   type="date"
                   value={selectedDate}
                   onChange={e => setSelectedDate(e.target.value)}
                   className="h-8 border-none bg-transparent p-0 shadow-none text-sm font-bold w-36 cursor-pointer"
                />
             </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
             {pathData.length > 0 && (
                <Button 
                   variant={isPlaying ? 'outline' : 'primary'}
                   className="h-10 px-6 gap-2 rounded-xl text-[10px] font-black uppercase"
                   onClick={() => {
                     if (playbackIndex >= pathData.length - 1) setPlaybackIndex(0);
                     setIsPlaying(!isPlaying);
                   }}
                >
                   {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                   {isPlaying ? 'Pausar' : 'Reproducir'}
                </Button>
             )}
          </div>
       </div>

       {loading ? (
         <div className="h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <Loader2 className="animate-spin text-primary mb-4" size={32} />
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Analizando registros satelitales...</p>
         </div>
       ) : error ? (
         <div className="h-[400px] flex flex-col items-center justify-center bg-red-50 rounded-3xl border border-dashed border-red-200 text-red-500">
            <AlertCircle size={32} className="mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">{error}</p>
         </div>
       ) : pathData.length === 0 ? (
         <div className="h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <MapIcon size={32} className="text-gray-300 mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Sin datos de GPS para esta fecha</p>
         </div>
       ) : (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Area */}
            <div className="lg:col-span-2 h-[500px] rounded-3xl overflow-hidden relative shadow-md border border-gray-100">
               <Map
                 initialViewState={{
                   longitude: pathData[0]?.lng || -60.7000,
                   latitude: pathData[0]?.lat || -31.6350,
                   zoom: 14
                 }}
                 mapStyle="mapbox://styles/mapbox/light-v11"
                 mapboxAccessToken={MAPBOX_TOKEN}
                 style={{ width: '100%', height: '100%' }}
               >
                 <NavigationControl position="top-right" />
                                   
                  {routeCollection && (
                    <Source id="postgis-routes" type="geojson" data={routeCollection}>
                       <Layer
                         id="postgis-line"
                         type="line"
                         layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                         paint={{
                           'line-color': '#6366f1',
                           'line-width': 2,
                           'line-dasharray': [2, 2],
                           'line-opacity': 0.6
                         }}
                       />
                    </Source>
                  )}
                 {routeGeoJSON && (
                   <Source id="history-route" type="geojson" data={routeGeoJSON as any}>
                      {/* Glow Layer */}
                      <Layer
                        id="history-glow"
                        type="line"
                        layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                        paint={{
                          'line-color': '#2563eb',
                          'line-width': 10,
                          'line-opacity': 0.2,
                          'line-blur': 3
                        }}
                      />
                      {/* Main Line */}
                      <Layer
                        id="history-line"
                        type="line"
                        layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                        paint={{
                          'line-color': '#1d4ed8',
                          'line-width': 4,
                        }}
                      />
                   </Source>
                 )}

                 {/* Start Point */}
                 {pathData.length > 0 && (
                   <Marker latitude={pathData[0].lat} longitude={pathData[0].lng}>
                     <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-lg" />
                   </Marker>
                 )}

                 {/* End Point / Current Playback Point */}
                 {currentPlaybackPoint && (
                   <Marker latitude={currentPlaybackPoint.lat} longitude={currentPlaybackPoint.lng}>
                     <div className="w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-2xl flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                     </div>
                   </Marker>
                 )}
               </Map>
               
               {/* Overlay Status */}
               {currentPlaybackPoint && (
                 <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-100 flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Punto de Control</p>
                       <p className="text-sm font-bold text-gray-900 mt-1">
                         {new Date(currentPlaybackPoint.timestamp).toLocaleTimeString('es-AR')}
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-mono text-gray-400">
                         {currentPlaybackPoint.lat.toFixed(5)}, {currentPlaybackPoint.lng.toFixed(5)}
                       </p>
                    </div>
                 </div>
               )}
            </div>

            {/* Timeline Sidebar */}
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 h-[500px] overflow-y-auto custom-scrollbar relative">
               <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-6 sticky top-0 bg-gray-50/90 backdrop-blur-sm py-2">
                 Línea de Tiempo
               </h3>
               
               <div className="space-y-6 relative pl-4">
                 <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gray-200" />
                 
                 {pathData.map((point, idx) => {
                   // Render fewer points in the list if there are too many (e.g., sample every N points, but keep start/end)
                   const isStart = idx === 0;
                   const isEnd = idx === pathData.length - 1;
                   const isSample = idx % Math.ceil(pathData.length / 20) === 0; // Show ~20 items max
                   
                   if (!isStart && !isEnd && !isSample) return null;

                   const isPast = playbackIndex >= idx;

                   return (
                     <div 
                       key={point.timestamp + idx} 
                       className="relative pl-6"
                     >
                        <div className={cn(
                          "absolute left-[-5px] top-1 w-3 h-3 rounded-full border-2 transition-all",
                          isPast ? "bg-blue-600 border-blue-200" : "bg-white border-gray-300",
                          idx === playbackIndex && "scale-150 shadow-md border-blue-400 animate-pulse"
                        )} />
                        
                        <div>
                           <p className={cn("text-[11px] font-black uppercase tracking-wider", isPast ? "text-gray-900" : "text-gray-400")}>
                              {new Date(point.timestamp).toLocaleTimeString('es-AR')}
                           </p>
                           <p className="text-[9px] text-gray-500 font-bold mt-1">
                              {isStart ? 'Inicio de recorrido' : isEnd ? 'Fin de recorrido' : 'Punto de registro'}
                           </p>
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>
         </div>
       )}
    </div>
  );
}
