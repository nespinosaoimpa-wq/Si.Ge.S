'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Bell,
  Shield,
  Layers,
  Zap,
  X,
  Plus,
  FileText,
  AlertTriangle,
  Monitor
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { supabase, isConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { 
  geocodeForward, 
  searchAddresses, 
  searchBoxRetrieve, 
  GeocodingResult 
} from '@/lib/geocoding';

// Optimized Components (Extracted for better performance)
import { ObjectiveSidebar } from './_components/ObjectiveSidebar';
import { LiveActivityFeed } from './_components/LiveActivityFeed';
import { ObjectiveDetailPanel, NewObjectiveForm } from './_components/ObjectivePanels';
import { AuditReportPanel } from './_components/AuditReportPanel';

const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-100 animate-pulse flex items-center justify-center text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px]">Sincronizando Nodo Central...</div>
});

export default function AdminDashboard() {
  const [data, setData] = useState<any>({ objectives: [], resources: [], recentIncidents: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

  // Status/Notifications
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [newIncidentNotification, setNewIncidentNotification] = useState<any>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isMonitorMode, setIsMonitorMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMonitorMode(window.location.search.includes('monitor=true'));
    }
  }, []);

  const toggleMonitorMode = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (isMonitorMode) {
      url.searchParams.delete('monitor');
    } else {
      url.searchParams.set('monitor', 'true');
    }
    window.location.href = url.pathname + url.search;
  };

  // New Objective State
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [lastClickedCoords, setLastClickedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [newObjective, setNewObjective] = useState({
    name: '', address: '', client_name: '', contact_phone: ''
  });
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodingResult[]>([]);
  const [mapboxSuggestions, setMapboxSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearchingMapbox, setIsSearchingMapbox] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isAuditPanelOpen, setIsAuditPanelOpen] = useState(false);
  const [previewCoords, setPreviewCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isRelocating, setIsRelocating] = useState(false);

  // --- EMERGENCY STATE ---
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleEmergencyTrigger = useCallback((entry: any) => {
    setActiveEmergency(entry);
    
    // Reproducir audio en bucle
    if (!audioRef.current) {
      audioRef.current = new Audio('/emergency.mp3');
      audioRef.current.loop = true;
    }
    audioRef.current.play().catch(e => console.error("Audio autoplay blocked:", e));

    // Notificación Push Nativa
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🚨 ALERTA DE SEGURIDAD", {
        body: entry.content || "Se ha activado un protocolo de intervención.",
        icon: "/icons/icon-192x192.png",
        vibrate: [200, 100, 200, 100, 500, 100, 500]
      } as any);
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  const handleAcknowledgeEmergency = () => {
    setActiveEmergency(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // --- MEMOIZED DATA (Optimization) ---
  const enrichedObjectives = useMemo(() => {
    return (data.objectives || []).map((obj: any) => {
      // Find if anyone is currently at this objective in the resources list (more up-to-date via pulses)
      const occupant = (data.resources || []).find((r: any) => r.current_objective_id === obj.id);
      
      // Merge: Prioritize occupant from resources (live pulses), fallback to deep join from DB
      const dbPersonnel = obj.assigned_personnel || [];
      const finalPersonnel = occupant ? [occupant] : dbPersonnel;

      return {
        ...obj,
        occupant_name: occupant?.name || (dbPersonnel.length > 0 ? dbPersonnel[0].name : null),
        is_manned: !!occupant || dbPersonnel.length > 0,
        assigned_personnel: finalPersonnel
      };
    });
  }, [data.objectives, data.resources]);

  const filteredObjectives = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return enrichedObjectives;
    
    // Check if query matches any objective metadata (name, address, client, occupant)
    const matches = enrichedObjectives.filter((o: any) =>
      (o.name || '').toLowerCase().includes(query) ||
      (o.address || '').toLowerCase().includes(query) ||
      (o.client_name || '').toLowerCase().includes(query) ||
      (o.occupant_name || '').toLowerCase().includes(query)
    );

    // If we have matches in objectives, show only those.
    // IF NOT, return all objectives (don't hide them if the user is searching for an ADDRESS in Mapbox)
    let finalResults = matches.length > 0 ? matches : enrichedObjectives;

    // SIDEBAR OVERRIDE: If an objective is selected, ensure it's in the list even if filtered out
    if (selectedObjective && !finalResults.some(o => o.id === selectedObjective.id)) {
      finalResults = [selectedObjective, ...finalResults];
    }

    return finalResults;
  }, [enrichedObjectives, searchQuery, selectedObjective]);

  const activeGuards = useMemo(() => {
    return (data.resources || []).map((r: any) => {
      const activeShift = (data.activeShifts || []).find((s: any) => s.operator_id === r.id);
      const isAbandoned = activeShift?.status === 'abandoned' || activeShift?.geofence_status === 'out' || activeShift?.geofence_status === 'outside';
      
      // Calculate offline status (no GPS updates for more than 3 minutes while on an active shift)
      const lastUpdate = r.last_gps_update ? new Date(r.last_gps_update).getTime() : 0;
      const isOffline = activeShift && (Date.now() - lastUpdate > 3 * 60 * 1000);

      return {
        ...r,
        isOnShift: !!activeShift,
        shiftId: activeShift?.id,
        status: isAbandoned ? 'abandoned' : (isOffline ? 'offline' : r.status)
      };
    }).filter((r: any) => r.status !== 'baja' && r.status !== 'inactivo');
  }, [data.resources, data.activeShifts]);

  // --- HANDLERS ---
  const fetchData = useCallback(async () => {
    try {
      const res = await api.dashboard.getMapData();
      setData(res);
    } catch (err) {
      console.error("Error fetching map data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMapboxSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setMapboxSuggestions([]);
      return;
    }
    setIsSearchingMapbox(true);
    try {
      const results = await searchAddresses(query);
      setMapboxSuggestions(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMapbox(false);
    }
  };

  const handleSelectMapboxResult = async (result: any) => {
    if (!result) return;
    let finalCoords: [number, number] | null = null;
    let displayName = result.displayName;

    if (result.mapbox_id) {
      const details = await searchBoxRetrieve(result.mapbox_id);
      if (details) {
        finalCoords = [details.lat, details.lng];
        displayName = details.displayName;
      }
    } else if (result.lat && result.lng) {
      finalCoords = [result.lat, result.lng];
    }

    if (finalCoords) {
      setMapCenter(finalCoords as [number, number]);
      setPreviewCoords({ lat: finalCoords[0], lng: finalCoords[1] });
      setLastClickedCoords({ lat: finalCoords[0], lng: finalCoords[1] });
      setNewObjective((prev: any) => ({ ...prev, address: displayName }));
      setSearchQuery(displayName);
    }
    setMapboxSuggestions([]);
  };

  const handleQuickCreateAtAddress = async (result: any) => {
    await handleSelectMapboxResult(result);
    setIsAddingPoint(true);
  };

  const handleDeleteObjective = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el objetivo "${name}"?`)) return;
    try {
      // Optimistically remove from screen immediately
      setData((prev: any) => ({
        ...prev,
        objectives: (prev.objectives || []).filter((o: any) => o.id !== id)
      }));
      setSelectedObjective(null);

      // Perform deletion
      try {
        await api.objectives.delete(id);
      } catch (apiErr) {
        // Direct Supabase Client delete fallback
        await supabase.from('objectives').delete().eq('id', id);
        await supabase.from('objectives').update({ is_active: false }).eq('id', id);
      }

      fetchData();
    } catch (err) {
      alert("Error al eliminar: " + (err as any).message);
    }
  };

  const handleRelocateObjective = async (objectiveId: string, lat: number, lng: number) => {
    try {
      const { error } = await supabase.from('objectives').update({ latitude: lat, longitude: lng }).eq('id', objectiveId);
      if (error) throw error;
      setData((prev: any) => ({
        ...prev,
        objectives: prev.objectives.map((o: any) => o.id === objectiveId ? { ...o, latitude: lat, longitude: lng } : o)
      }));
      if (selectedObjective?.id === objectiveId) {
        setSelectedObjective((prev: any) => ({ ...prev, latitude: lat, longitude: lng }));
      }
      setIsRelocating(false);
    } catch (err: any) {
      alert("Error al reubicar: " + err.message);
    }
  };

  const handleRelocateToOperator = async (objectiveId: string) => {
    const occupant = data.resources.find((r: any) => r.current_objective_id === objectiveId);
    if (!occupant || !occupant.latitude || !occupant.longitude) {
      setIsRelocating(!isRelocating);
      return;
    }

    if (!confirm(`¿Reubicar el objetivo "${selectedObjective.name}" en la posición actual de ${occupant.name}?`)) {
      setIsRelocating(!isRelocating);
      return;
    }

    await handleRelocateObjective(objectiveId, occupant.latitude, occupant.longitude);
  };

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastClickedCoords) return;

    const parseCoord = (val: any, fallback: number = 0) => {
      if (val === null || val === undefined || val === '') return fallback;
      const str = String(val).trim().replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? fallback : num;
    };

    const latVal = parseCoord(lastClickedCoords.lat, -31.6107);
    const lngVal = parseCoord(lastClickedCoords.lng, -60.6973);

    const tempId = `obj-temp-${Date.now()}`;
    const optimisticObj = {
      id: tempId,
      name: newObjective.name || 'Nuevo Objetivo',
      address: newObjective.address || '',
      client_name: newObjective.client_name || '',
      contact_phone: newObjective.contact_phone || '',
      latitude: latVal,
      longitude: lngVal,
      status: 'Activo',
      is_active: true
    };

    // 1. Optimistic update (0ms UI feedback)
    setData((prev: any) => ({
      ...prev,
      objectives: [optimisticObj, ...(prev.objectives || []).filter((o: any) => o.id !== tempId)]
    }));

    setMapCenter([latVal, lngVal]);
    setSelectedObjective(optimisticObj);
    setIsAddingPoint(false);

    try {
      const createdObj = await api.objectives.create({
        ...newObjective,
        latitude: latVal,
        longitude: lngVal,
        status: 'Activo'
      });

      if (createdObj) {
        const realObj = {
          ...createdObj,
          latitude: parseCoord(createdObj.latitude, latVal),
          longitude: parseCoord(createdObj.longitude, lngVal),
        };
        setData((prev: any) => ({
          ...prev,
          objectives: [realObj, ...(prev.objectives || []).filter((o: any) => o.id !== tempId && o.id !== realObj.id)]
        }));
        setSelectedObjective(realObj);
      }

      setLastClickedCoords(null);
      setPreviewCoords(null);
      setNewObjective({ name: '', address: '', client_name: '', contact_phone: '' });
      fetchData();
    } catch (err: any) {
      // Rollback optimistic update
      setData((prev: any) => ({
        ...prev,
        objectives: (prev.objectives || []).filter((o: any) => o.id !== tempId)
      }));
      alert(err.message || 'Error al guardar el objetivo');
    }
  };

  const handleAssignOperator = async (objectiveId: string, operatorId: string) => {
    try {
      // Free operator first if assigning an empty string, or update existing
      const targetOperator = operatorId || (data.resources.find((r: any) => r.current_objective_id === objectiveId)?.id);
      if (!targetOperator) return;
      await api.staff.update(targetOperator, {
        current_objective_id: operatorId ? objectiveId : null
      });
      fetchData(); // Refresh the data
    } catch (err) {
      alert("Error al asignar operador: " + (err as any).message);
    }
  };

  const handleResolveIncident = async (id: string) => {
    try {
      let resolved = false;

      // 1. Try guard_book_entries
      try {
        await api.guardBook.update(id, { status: 'resolved' });
        resolved = true;
      } catch (err: any) {
        if (!err.message || (!err.message.includes('JSON object') && !err.message.includes('results'))) {
          throw err;
        }
      }

      // 2. Try incidents
      if (!resolved) {
        try {
          await api.incidents.update(id, { status: 'resolved' });
          resolved = true;
        } catch (err: any) {
          if (!err.message || (!err.message.includes('JSON object') && !err.message.includes('results'))) {
            throw err;
          }
        }
      }

      // 3. Try alarms (with resolved_at for audit trail)
      if (!resolved) {
        try {
          const { data, error } = await supabase
            .from('alarms')
            .update({ status: 'resolved', resolved_at: new Date().toISOString() })
            .eq('id', id)
            .select();
          
          if (!error && data && data.length > 0) {
            resolved = true;
          }
        } catch (err) {}
      }

      // 4. Try geofencing_incidents
      if (!resolved) {
        try {
          const res = await fetch(`/api/tracking/incidents/${id}/resolve`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resuelto', comment: 'Resuelto por gerencia' })
          });
          if (res.ok) {
            resolved = true;
          }
        } catch (err) {}
      }

      if (!resolved) {
        throw new Error("No se pudo encontrar la alerta en ninguna tabla activa del sistema.");
      }

      // Optimistic update for local state to hide from map immediately
      setData((prev: any) => ({
        ...prev,
        recentIncidents: (prev.recentIncidents || []).filter((inc: any) => inc.id !== id)
      }));
    } catch (err: any) {
      alert("Error al resolver incidente: " + err.message);
    }
  };


  // --- EFFECTS ---
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      const isSmall = window.innerWidth < 1024;
      setIsMobile(isTouch || isSmall);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const resourcesRef = React.useRef(data.resources);
  useEffect(() => {
    resourcesRef.current = data.resources;
  }, [data.resources]);

  useEffect(() => {
    fetchData();
    if (isMobile) setIsSidebarOpen(false);

    const channel = supabase
      .channel('map-realtime-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gps_tracking' }, (payload) => {
        const log = payload.new as any;
        const res = resourcesRef.current?.find((r: any) => r.id === log.operator_id);
        setLiveFeed(prev => [{ ...log, resource_name: res?.name, type: 'gps' }, ...prev].slice(0, 15));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guard_book_entries' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const entry = payload.new as any;
          
          // Fetch operator name for better UI
          const { data: res } = await supabase.from('resources').select('name').eq('id', entry.resource_id).single();
          const enrichedEntry = { ...entry, resource_name: res?.name || 'Personal', type: 'event' };
          
          setLiveFeed(prev => [enrichedEntry, ...prev].slice(0, 15));

          if (entry.entry_type === 'emergencia' || entry.urgency === 'critica' || (entry.content && entry.content.includes('PÁNICO'))) {
            handleEmergencyTrigger(enrichedEntry);
            // Also add critical entries as incidents on the map
            if (entry.latitude && entry.longitude) {
              setData((prev: any) => ({
                ...prev,
                recentIncidents: [enrichedEntry, ...(prev.recentIncidents || [])].slice(0, 20)
              }));
            }
          } else if (entry.entry_type === 'incidente' || entry.entry_type === 'alerta' || (entry.content && entry.content.includes('ALERTA'))) {
             setNewIncidentNotification(enrichedEntry);
             setTimeout(() => setNewIncidentNotification(null), 8000);
             // Add alert-type entries to map incidents
             if (entry.latitude && entry.longitude) {
               setData((prev: any) => ({
                 ...prev,
                 recentIncidents: [enrichedEntry, ...(prev.recentIncidents || [])].slice(0, 20)
               }));
             }
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          if (updated.status === 'resolved' || updated.status === 'resuelto') {
            setData((prev: any) => ({
              ...prev,
              recentIncidents: (prev.recentIncidents || []).filter((inc: any) => inc.id !== updated.id)
            }));
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const entry = payload.new as any;
          const { data: res } = await supabase.from('resources').select('name').eq('id', entry.operator_id).single();
          const enrichedEntry = { 
            ...entry, 
            resource_name: res?.name || 'Personal',
            resource_id: entry.operator_id,
            urgency: entry.status === 'critica' || entry.status === 'crítica' ? 'critica' : 'normal'
          };
          
          setData((prev: any) => ({
            ...prev,
            recentIncidents: [enrichedEntry, ...(prev.recentIncidents || [])].slice(0, 15)
          }));
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          if (updated.status === 'resolved' || updated.status === 'resuelto') {
            setData((prev: any) => ({
              ...prev,
              recentIncidents: (prev.recentIncidents || []).filter((inc: any) => inc.id !== updated.id)
            }));
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          setData((prev: any) => {
            const exists = prev.resources?.some((r: any) => r.id === updated.id);
            const isActive = ['activo', 'active'].includes(updated.status);
            let resources;

            if (exists) {
              if (isActive) {
                // Update existing active resource
                resources = prev.resources.map((r: any) => 
                  r.id === updated.id ? { ...r, ...updated, profiles: r.profiles } : r
                );
              } else {
                // Remove resource that is no longer active
                resources = prev.resources.filter((r: any) => r.id !== updated.id);
              }
            } else if (isActive) {
              // Add new active resource to the map list
              resources = [updated, ...(prev.resources || [])];
            } else {
              resources = prev.resources;
            }
            return { ...prev, resources };
          });
        } else if (payload.eventType === 'INSERT') {
          fetchData();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        const updated = payload.new as any;
        setData((prev: any) => {
          const resources = prev.resources?.map((r: any) => 
            r.profile_id === updated.id ? { ...r, profiles: { ...r.profiles, ...updated } } : r
          );
          return { ...prev, resources };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guard_shifts' }, (payload) => {
         if (payload.eventType === 'INSERT') {
           const newShift = payload.new as any;
           setData((prev: any) => ({
             ...prev,
             activeShifts: [newShift, ...(prev.activeShifts || [])]
           }));
         } else if (payload.eventType === 'UPDATE') {
           const updated = payload.new as any;
           setData((prev: any) => {
             // If checkout happened, remove from active shifts
             if (updated.status === 'completado' || updated.checkout_time) {
               return {
                 ...prev,
                 activeShifts: (prev.activeShifts || []).filter((s: any) => s.id !== updated.id)
               };
             }
             // Otherwise update in place
             return {
               ...prev,
               activeShifts: (prev.activeShifts || []).map((s: any) =>
                 s.id === updated.id ? { ...s, ...updated } : s
               )
             };
           });
         } else {
           fetchData();
         }
       })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          setData((prev: any) => ({
            ...prev,
            objectives: (prev.objectives || []).map((o: any) => 
              o.id === updated.id ? { ...o, ...updated } : o
            )
          }));
        } else {
          fetchData();
        }
      })
      // ═══ GEOFENCING INCIDENTS (abandonment alerts) ═══
      .on('postgres_changes', { event: '*', schema: 'public', table: 'geofencing_incidents' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const incident = payload.new as any;
          // Fetch operator and objective names for rich display
          let operatorName = 'Operador';
          let objectiveName = 'Objetivo';
          try {
            const [opRes, objRes] = await Promise.all([
              supabase.from('resources').select('name, latitude, longitude').eq('id', incident.operator_id).single(),
              supabase.from('objectives').select('name, latitude, longitude').eq('id', incident.objective_id).single()
            ]);
            if (opRes.data?.name) operatorName = opRes.data.name;
            if (objRes.data?.name) objectiveName = objRes.data.name;

            const enrichedIncident = {
              ...incident,
              resource_name: operatorName,
              resource_id: incident.operator_id,
              entry_type: 'alerta',
              content: `⚠️ ALERTA GEOCERCA: ${operatorName} se alejó ${Math.round(incident.max_distance_meters || 0)}m de ${objectiveName}`,
              latitude: opRes.data?.latitude || objRes.data?.latitude,
              longitude: opRes.data?.longitude || objRes.data?.longitude,
              urgency: 'critica',
              created_at: incident.exit_at || new Date().toISOString()
            };

            // Add to map incidents
            setData((prev: any) => ({
              ...prev,
              recentIncidents: [enrichedIncident, ...(prev.recentIncidents || [])].slice(0, 20)
            }));

            // Trigger emergency overlay
            handleEmergencyTrigger(enrichedIncident);

            // Show notification banner
            setNewIncidentNotification(enrichedIncident);
            setTimeout(() => setNewIncidentNotification(null), 8000);
          } catch (e) {
            console.error('[GEOFENCE_REALTIME] Error enriching incident:', e);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          if (updated.status === 'resolved' || updated.status === 'resuelto') {
            setData((prev: any) => ({
              ...prev,
              recentIncidents: (prev.recentIncidents || []).filter((inc: any) => inc.id !== updated.id)
            }));
          }
        }
      })
      // ═══ ALARMS TABLE (panic, geofence, SOS) ═══
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alarms' }, async (payload) => {
        const newAlarm = payload.new as any;
        if (newAlarm && newAlarm.status === 'active') {
          let resourceName = newAlarm.operator_name || 'Operador';
          let latitude = newAlarm.latitude || newAlarm.operator_latitude;
          let longitude = newAlarm.longitude || newAlarm.operator_longitude;

          if (newAlarm.triggered_by === 'system_scheduler' || newAlarm.alarm_type === 'cobertura_pendiente') {
            resourceName = 'Sistema';
            
            // Try to find the objective coordinates in our local state data
            if (newAlarm.objective_id && data.objectives) {
              const obj = data.objectives.find((o: any) => o.id === newAlarm.objective_id);
              if (obj) {
                latitude = obj.latitude;
                longitude = obj.longitude;
              }
            }
          }

          const enrichedAlert = {
            ...newAlarm,
            entry_type: newAlarm.alarm_type === 'panico' ? 'emergencia' : (newAlarm.alarm_type || 'alerta'),
            content: newAlarm.message || 'Alerta activada por operador',
            resource_name: resourceName,
            resource_id: newAlarm.triggered_by,
            latitude: latitude,
            longitude: longitude,
            urgency: 'critica',
            created_at: newAlarm.created_at || new Date().toISOString()
          };

          // Add to map incidents for immediate visual feedback
          if (enrichedAlert.latitude && enrichedAlert.longitude) {
            setData((prev: any) => ({
              ...prev,
              recentIncidents: [enrichedAlert, ...(prev.recentIncidents || [])].slice(0, 20)
            }));
          }

          // Trigger emergency overlay
          handleEmergencyTrigger(enrichedAlert);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alarms' }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === 'acknowledged' || updated.status === 'resolved') {
          // Remove resolved alarms from map incidents
          setData((prev: any) => ({
            ...prev,
            recentIncidents: (prev.recentIncidents || []).filter((inc: any) => inc.id !== updated.id)
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMobile, fetchData]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative">
      
      {!isMonitorMode && (
        <ObjectiveSidebar 
          isSidebarOpen={isSidebarOpen}
          isMobile={isMobile}
          isConfigured={isConfigured}
          isAddingPoint={isAddingPoint}
          setIsAddingPoint={setIsAddingPoint}
          setLastClickedCoords={setLastClickedCoords}
          setIsSidebarOpen={setIsSidebarOpen}
          searchQuery={searchQuery}
          handleMapboxSearch={handleMapboxSearch}
          filteredObjectives={filteredObjectives}
          selectedObjective={selectedObjective}
          setSelectedObjective={setSelectedObjective}
          activeGuards={activeGuards}
          mapboxSuggestions={mapboxSuggestions}
          isSearchingMapbox={isSearchingMapbox}
          handleSelectMapboxResult={handleSelectMapboxResult}
          onQuickCreateAtAddress={handleQuickCreateAtAddress}
          onGuardSelect={(guard) => {
            setMapCenter([guard.latitude, guard.longitude]);
            if (isMobile) setIsSidebarOpen(false);
          }}
        />
      )}

      {/* ====== MAP AREA ====== */}
      <div className="flex-1 relative flex flex-col">

        {/* Picker mode instruction */}
        {isAddingPoint && !lastClickedCoords && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[45] pointer-events-none">
            <div className="bg-blue-500 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 animate-bounce">
              <MapPin size={14} />
              Tocá el mapa para marcar la ubicación
            </div>
          </div>
        )}

        {/* The Map */}
        <div className="flex-1 relative z-0">
          {/* Main Map Search (Floating) */}
          <div className={cn(
            "absolute z-[45] transition-all duration-300 safe-top",
            isMobile ? "top-2 left-2 right-2" : "top-6 left-6 w-96 lg:w-[450px]"
          )}>
            <Card className={cn(
              "p-1 px-3 flex flex-col shadow-[0_15px_45px_rgba(0,0,0,0.12)] border border-zinc-200/80 bg-white/90 backdrop-blur-xl transition-all duration-300 rounded-[22px] focus-within:border-zinc-300 focus-within:shadow-[0_15px_50px_rgba(0,0,0,0.16)]",
              isMobile && "rounded-2xl"
            )}>
              <div className="flex items-center gap-2">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (mapboxSuggestions.length > 0) {
                      handleSelectMapboxResult(mapboxSuggestions[0]);
                    }
                  }}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  {isMobile ? (
                    <>
                      <button type="button" onClick={() => setIsSidebarOpen(true)} className="text-[#0F4C5C] p-2 -ml-1 border-r border-zinc-100 mr-1 shrink-0">
                        <MapPin size={20} />
                      </button>
                      <input type="text" placeholder="Buscar dirección o POI..." className="flex-1 w-full min-w-0 bg-transparent border-none focus:ring-0 text-xs py-2 font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none" value={searchQuery} onChange={(e) => handleMapboxSearch(e.target.value)} />
                    </>
                  ) : (
                    <>
                      <div className="text-[#0F4C5C] pl-1.5 flex items-center justify-center shrink-0">
                        {isSearchingMapbox ? <div className="w-4 h-4 border-2 border-[#0F4C5C] border-t-transparent animate-spin rounded-full" /> : <Search size={18} />}
                      </div>
                      <input type="text" placeholder="Buscar dirección o POI..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2.5 font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none" value={searchQuery} onChange={(e) => handleMapboxSearch(e.target.value)} />
                      {searchQuery && (
                        <button 
                          type="button"
                          onClick={() => handleMapboxSearch('')}
                          className="p-1 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 mr-1"
                          title="Limpiar búsqueda"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </>
                  )}
                </form>

                <div className="flex items-center gap-1.5 ml-1 pl-2.5 pr-1 border-l border-zinc-100">
                  {/* 🔥 Botón Filtro Mapa de Calor */}
                  <button 
                    type="button"
                    onClick={() => setShowHeatmap(!showHeatmap)} 
                    className={cn(
                      "p-2 rounded-xl transition-all flex items-center justify-center gap-1",
                      showHeatmap ? "bg-amber-500/20 text-amber-600 font-bold border border-amber-500/30" : "text-zinc-400 hover:bg-zinc-100 border border-transparent"
                    )}
                    title="Activar / Desactivar Mapa de Calor (Heatmap)"
                  >
                    <Layers size={18} />
                  </button>

                  {/* 🔔 Campanita de Notificaciones / Alertas */}
                  <button 
                    type="button"
                    onClick={() => setIsAuditPanelOpen(true)} 
                    className="relative p-2 text-zinc-400 hover:bg-zinc-100 rounded-xl transition-all border border-transparent"
                    title="Centro de Alertas Tácticas y Notificaciones"
                  >
                    <Bell size={18} className={data.recentIncidents?.some((i: any) => i.urgency === 'critica' || i.status === 'activo') ? "text-red-500 animate-bounce" : "text-zinc-500"} />
                    {data.recentIncidents?.some((i: any) => i.urgency === 'critica' || i.status === 'activo') && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                    )}
                  </button>

                  <button 
                    type="button"
                    onClick={() => setIsAuditPanelOpen(true)}
                    className="p-2 rounded-xl transition-all hover:bg-zinc-100 border border-transparent text-zinc-400" 
                    title="Auditoría de Geocercas"
                  >
                    <FileText size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={toggleMonitorMode}
                    className={cn("p-2 rounded-xl transition-all hover:bg-zinc-100 border border-transparent", isMonitorMode ? "bg-[#0F4C5C]/10 text-[#0F4C5C]" : "text-zinc-400")} 
                    title="Modo TV / Pantalla Completa"
                  >
                    <Monitor size={18} />
                  </button>
                  <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100 ml-1">
                    <Shield className="text-[#0F4C5C]" size={14} />
                  </div>
                </div>
              </div>

              {/* Suggestions Dropdown */}
              {mapboxSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-zinc-200/80 rounded-[22px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[60] max-h-[300px] overflow-y-auto no-scrollbar p-2 space-y-1">
                  {mapboxSuggestions.map((res, i) => (
                    <button 
                      key={i} 
                      className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 rounded-xl transition-all duration-200 flex items-start gap-3 group/item" 
                      onClick={() => handleSelectMapboxResult(res)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover/item:bg-[#0F4C5C]/10 group-hover/item:text-[#0F4C5C] group-hover/item:border-[#0F4C5C]/20 transition-all shrink-0">
                        {res.type === 'coordinate' ? <MapPin size={15} /> : <Search size={15} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-800 line-clamp-1 group-hover/item:text-zinc-950 transition-colors">{res.displayName}</p>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5 uppercase tracking-wider">{res.city ? `${res.city}, ` : ''}{res.state}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <MapView
            center={mapCenter}
            objectives={enrichedObjectives}
            guards={activeGuards}
            incidents={data.recentIncidents}
            className="w-full h-full"
            onObjectiveSelect={(obj) => setSelectedObjective(obj)}
            onMapClick={(coords) => { if (isAddingPoint) setLastClickedCoords(coords); }}
            onReverseGeocode={(address) => { if (isAddingPoint) setNewObjective(prev => ({ ...prev, address })); }}
            isPickerMode={isAddingPoint}
            draftCoords={lastClickedCoords}
            previewCoords={previewCoords}
            selectedObjectiveId={selectedObjective?.id}
            showHeatmap={showHeatmap}
            onIncidentResolve={handleResolveIncident}
            isRelocating={isRelocating}
            onRelocationEnd={handleRelocateObjective}
            searchQuery={searchQuery}
            onAddObjectiveAtCoords={(lat, lng) => {
              setIsAddingPoint(true);
              setLastClickedCoords({ lat, lng });
              setNewObjective({
                name: '',
                address: searchQuery || '',
                client_name: '',
                contact_phone: ''
              });
              setPreviewCoords(null);
            }}
          />
        </div>
        
        <LiveActivityFeed liveFeed={liveFeed} isMobile={isMobile} />

        <AnimatePresence>
          {newIncidentNotification && (
            <motion.div initial={{ y: -100, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -100, opacity: 0, scale: 0.8 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
              <div className="bg-red-600 text-white rounded-2xl shadow-[0_20px_50px_rgba(220,38,38,0.5)] p-4 border border-white/20 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                  <Zap size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium opacity-80">Alerta en tiempo real</p>
                  <p className="text-sm font-bold leading-tight">{newIncidentNotification.content}</p>
                </div>
                <button onClick={() => setNewIncidentNotification(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ObjectiveDetailPanel 
          selectedObjective={selectedObjective}
          isAddingPoint={isAddingPoint}
          isMobile={isMobile}
          activeGuards={activeGuards}
          activeShifts={data.activeShifts || []}
          onAssignOperator={handleAssignOperator}
          setSelectedObjective={setSelectedObjective}
          handleDeleteObjective={handleDeleteObjective}
          isRelocating={isRelocating}
          setIsRelocating={setIsRelocating}
          onRelocateToOperator={handleRelocateToOperator}
        />

        <NewObjectiveForm 
          lastClickedCoords={lastClickedCoords}
          isMobile={isMobile}
          newObjective={newObjective}
          setNewObjective={setNewObjective}
          setLastClickedCoords={setLastClickedCoords}
          addressSuggestions={addressSuggestions}
          setAddressSuggestions={setAddressSuggestions}
          isSearchingAddress={isSearchingAddress}
          searchAddresses={searchAddresses}
          geocodeForward={geocodeForward}
          handleAddObjective={handleAddObjective}
        />


        <AuditReportPanel 
        isOpen={isAuditPanelOpen} 
        onClose={() => setIsAuditPanelOpen(false)} 
      />
    </div>

      {isMobile && !isAddingPoint && (
        <button
          onClick={() => setIsAddingPoint(true)}
          className="fixed bottom-28 right-6 w-14 h-14 bg-primary text-black rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center justify-center z-[60] border-4 border-white active:scale-95 transition-transform"
        >
          <Plus size={28} />
        </button>
      )}
      {/* --- EMERGENCY FULLSCREEN MODAL --- */}
      <AnimatePresence>
        {activeEmergency && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6"
          >
            <div className="absolute inset-0 border-[8px] border-red-600 animate-pulse pointer-events-none" />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-gray-900 border border-red-500/50 p-8 rounded-[2rem] max-w-md w-full shadow-2xl shadow-red-600/20 text-center relative z-10"
            >
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-[0_0_40px_rgba(220,38,38,0.5)]">
                <AlertTriangle size={40} className="text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-red-500 mb-2">
                Intervención requerida
              </h2>
              
              <p className="text-white/80 font-medium mb-6">
                {activeEmergency.content || "Alerta de pánico activada por operador."}
              </p>
              
              <div className="bg-white/5 rounded-xl p-4 mb-8 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs font-medium">Operador</span>
                  <span className="text-white font-semibold">{activeEmergency.resource_name || 'Desconocido'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs font-medium">Hora</span>
                  <span className="text-white font-semibold">
                    {new Date(activeEmergency.created_at).toLocaleTimeString('es-AR')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleAcknowledgeEmergency}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-semibold tracking-wide rounded-xl transition-all shadow-lg shadow-red-600/30"
              >
                Confirmar Recepción
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
