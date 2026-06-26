'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/lib/supabase';
import { Card } from './ui/Card';

interface MapProps {
  objectives?: any[];
  resources?: any[];
  trajectory?: [number, number][]; // New: List of coordinates for traceability
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export default function TacticalMap({ 
  objectives = [], 
  resources = [], 
  trajectory = [],
  center = [-60.7, -31.63], 
  zoom = 12,
  className = ""
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;

    if (!token) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: center,
      zoom: zoom,
      attributionControl: false
    });

    map.current.on('load', () => {
      setIsLoaded(true);
      
      if (map.current) {
        // Source for Objectives
        map.current.addSource('objectives', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: objectives.map(obj => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [obj.longitude, obj.latitude] },
              properties: { id: obj.id, title: obj.name }
            }))
          }
        });

        map.current.addLayer({
          id: 'objective-points',
          type: 'circle',
          source: 'objectives',
          paint: {
            'circle-radius': 8,
            'circle-color': '#00ff00',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        // SOURCE FOR TRAJECTORY (Traceability)
        map.current.addSource('trajectory', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: trajectory
            }
          }
        });

        map.current.addLayer({
          id: 'trajectory-line',
          type: 'line',
          source: 'trajectory',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#3b82f6', // Bright blue
            'line-width': 3,
            'line-dasharray': [2, 1]
          }
        });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update Trajectory data when it changes
  useEffect(() => {
    if (!isLoaded || !map.current || !map.current.getSource('trajectory')) return;
    
    (map.current.getSource('trajectory') as mapboxgl.GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: trajectory
      }
    });
  }, [trajectory, isLoaded]);

  // Update resource markers in real-time
  useEffect(() => {
    if (!isLoaded || !map.current) return;

    // Clear old markers that are not in the current resources list
    const currentResIds = new Set(resources.map(r => r.id));
    Object.keys(markers.current).forEach(id => {
      if (!currentResIds.has(id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    // Add or update markers for resources
    resources.forEach(res => {
      if (res.latitude && res.longitude) {
        if (markers.current[res.id]) {
          markers.current[res.id].setLngLat([res.longitude, res.latitude]);
        } else {
          // Create a new marker element
          const el = document.createElement('div');
          el.className = 'resource-marker';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.backgroundColor = res.status === 'activo' ? '#ff0000' : '#0000ff';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';

          const marker = new mapboxgl.Marker(el)
            .setLngLat([res.longitude, res.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<h3>${res.name}</h3><p>Status: ${res.status}</p>`))
            .addTo(map.current!);
          
          markers.current[res.id] = marker;
        }
      }
    });
  }, [resources, isLoaded]);

  // Handle Real-time position updates via Supabase
  useEffect(() => {
    if (!isLoaded) return;

    const channel = supabase
      .channel('realtime:resources')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'resources' 
      }, (payload) => {
        const updatedRes = payload.new;
        if (updatedRes.latitude && updatedRes.longitude && markers.current[updatedRes.id]) {
          markers.current[updatedRes.id].setLngLat([updatedRes.longitude, updatedRes.latitude]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoaded]);

  return (
    <div className={`relative w-full h-full min-h-[400px] bg-[#111] ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      {!token && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <Card className="p-6 border-red-500/50 bg-black/80 backdrop-blur-md">
            <p className="text-red-500 font-bold uppercase tracking-widest text-sm">Error: Token de Mapbox Faltante</p>
            <p className="text-gray-400 text-xs mt-2">Por favor configura NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN en tu entorno.</p>
          </Card>
        </div>
      )}
      {!isLoaded && token && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
