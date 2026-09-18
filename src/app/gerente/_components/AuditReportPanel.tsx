'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Map as MapIcon, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Download,
  X,
  MessageSquare,
  ShieldAlert,
  History,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function AuditReportPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchIncidents();

      // Realtime subscription for live geofence incidents & alerts
      const channel = supabase
        .channel('audit-geofence-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'geofence_alerts' }, () => fetchIncidents())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'geofencing_incidents' }, () => fetchIncidents())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchIncidents())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alarms' }, () => fetchIncidents())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guard_book_entries' }, () => fetchIncidents())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen]);

  async function fetchIncidents() {
    setLoading(true);
    try {
      // Fetch resources & objectives lookup maps first
      const [resLookup, objLookup] = await Promise.all([
        supabase.from('resources').select('id, name, assigned_to'),
        supabase.from('objectives').select('id, name')
      ]);

      const resMap = new Map<string, string>();
      (resLookup.data || []).forEach((r: any) => {
        if (r.id) resMap.set(r.id, r.name);
        if (r.assigned_to) resMap.set(r.assigned_to, r.name);
      });
      const objMap = new Map((objLookup.data || []).map((o: any) => [o.id, o.name]));

      // Execute safe queries on all 5 tracking alert tables (no PostgREST join syntax)
      const [rawAlerts, rawGeofencing, rawIncidents, rawAlarms, rawBook] = await Promise.all([
        supabase.from('geofence_alerts').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('geofencing_incidents').select('*').order('exit_at', { ascending: false }).limit(50),
        supabase.from('incidents').select('*').or('entry_type.eq.abandono_zona,content.ilike.%ABANDONO%,content.ilike.%geocerca%').order('created_at', { ascending: false }).limit(50),
        supabase.from('alarms').select('*').or('alarm_type.eq.geofence_exit,alarm_type.eq.abandono_zona,message.ilike.%ABANDONO%,message.ilike.%geocerca%').order('created_at', { ascending: false }).limit(50),
        supabase.from('guard_book_entries').select('*').or('entry_type.eq.abandono_zona,content.ilike.%ABANDONO%,content.ilike.%geocerca%').order('created_at', { ascending: false }).limit(50)
      ]);

      const unifiedMap = new Map<string, any>();

      // 1. Process geofence_alerts
      (rawAlerts.data || []).forEach((item: any) => {
        const opName = item.operator_name || resMap.get(item.operator_id) || 'Operador';
        const objName = item.objective_name || objMap.get(item.objective_id) || 'Objetivo Asignado';
        const statusStr = item.resolved ? (item.resolution_type || 'resuelto') : 'pendiente';

        unifiedMap.set(`alert_${item.id}`, {
          id: item.id,
          source_table: 'geofence_alerts',
          operator_name: opName,
          objective_name: objName,
          operator_id: item.operator_id,
          objective_id: item.objective_id,
          exit_at: item.created_at,
          return_at: item.resolved_at || null,
          max_distance_meters: item.distance || item.max_distance || 150,
          status: statusStr,
          supervisor_comment: item.comment || item.resolution_comment || '',
          latitude: item.latitude,
          longitude: item.longitude,
          content: `Abandono de Puesto en ${objName}`
        });
      });

      // 2. Process geofencing_incidents
      (rawGeofencing.data || []).forEach((item: any) => {
        const opName = item.operator_name || resMap.get(item.operator_id) || 'Operador';
        const objName = item.objective_name || objMap.get(item.objective_id) || 'Objetivo Asignado';

        unifiedMap.set(`geo_${item.id}`, {
          id: item.id,
          source_table: 'geofencing_incidents',
          operator_name: opName,
          objective_name: objName,
          operator_id: item.operator_id,
          objective_id: item.objective_id,
          exit_at: item.exit_at || item.created_at,
          return_at: item.return_at,
          max_distance_meters: item.max_distance_meters || 150,
          status: item.status || 'pendiente',
          supervisor_comment: item.supervisor_comment || '',
          map_snapshot_url: item.map_snapshot_url || null,
          content: `Abandono de Puesto en ${objName}`
        });
      });

      // 3. Process alarms
      (rawAlarms.data || []).forEach((item: any) => {
        const opName = item.operator_name || resMap.get(item.triggered_by || item.operator_id) || 'Operador';
        const objName = item.objective_name || objMap.get(item.objective_id) || 'Objetivo Asignado';
        
        let distMeters = 150;
        const match = (item.message || '').match(/(\d+)m/);
        if (match && match[1]) distMeters = parseInt(match[1], 10);

        const statusStr = item.status === 'resolved' || item.status === 'resuelto' ? 'resuelto' : 'pendiente';

        unifiedMap.set(`alarm_${item.id}`, {
          id: item.id,
          source_table: 'alarms',
          operator_name: opName,
          objective_name: objName,
          operator_id: item.triggered_by || item.operator_id,
          objective_id: item.objective_id,
          exit_at: item.created_at,
          return_at: item.resolved_at || null,
          max_distance_meters: distMeters,
          status: statusStr,
          supervisor_comment: item.resolution_comment || '',
          latitude: item.latitude,
          longitude: item.longitude,
          content: item.message || `Abandono de Puesto en ${objName}`
        });
      });

      // 4. Process incidents
      (rawIncidents.data || []).forEach((item: any) => {
        const opName = item.operator_name || resMap.get(item.operator_id || item.resource_id) || 'Operador';
        const objName = item.objective_name || objMap.get(item.objective_id) || 'Objetivo Asignado';

        let distMeters = 150;
        const match = (item.content || '').match(/(\d+)m/);
        if (match && match[1]) distMeters = parseInt(match[1], 10);

        const isResolved = item.status === 'resolved' || item.status === 'resuelto' || item.status === 'justificado' || item.status === 'sancionado';
        const statusStr = isResolved ? (item.status === 'resolved' ? 'resuelto' : item.status) : 'pendiente';

        unifiedMap.set(`inc_${item.id}`, {
          id: item.id,
          source_table: 'incidents',
          operator_name: opName,
          objective_name: objName,
          operator_id: item.operator_id || item.resource_id,
          objective_id: item.objective_id,
          exit_at: item.created_at,
          return_at: item.resolved_at || null,
          max_distance_meters: distMeters,
          status: statusStr,
          supervisor_comment: item.comment || item.resolution_comment || '',
          latitude: item.latitude,
          longitude: item.longitude,
          content: item.content || `Abandono de Puesto en ${objName}`
        });
      });

      // 5. Process guard_book_entries
      (rawBook.data || []).forEach((item: any) => {
        const key = `book_${item.id}`;
        if (!unifiedMap.has(key)) {
          const opName = item.operator_name || resMap.get(item.operator_id) || 'Operador';
          const objName = item.objective_name || objMap.get(item.objective_id) || 'Objetivo Asignado';

          let distMeters = 150;
          const match = (item.content || '').match(/(\d+)m/);
          if (match && match[1]) distMeters = parseInt(match[1], 10);

          unifiedMap.set(key, {
            id: item.id,
            source_table: 'guard_book_entries',
            operator_name: opName,
            objective_name: objName,
            operator_id: item.operator_id,
            objective_id: item.objective_id,
            exit_at: item.created_at,
            return_at: null,
            max_distance_meters: distMeters,
            status: 'pendiente',
            supervisor_comment: '',
            latitude: item.latitude,
            longitude: item.longitude,
            content: item.content || `Abandono de Puesto en ${objName}`
          });
        }
      });

      const sorted = Array.from(unifiedMap.values()).sort(
        (a, b) => new Date(b.exit_at).getTime() - new Date(a.exit_at).getTime()
      );

      setIncidents(sorted);
    } catch (err) {
      console.error("[AUDIT_PANEL] Error fetching incidents:", err);
    } finally {
      setLoading(false);
    }
  }

  async function resolveIncident(inc: any, status: 'justificado' | 'sancionado' | 'resuelto') {
    try {
      // 1. Send resolution API call (which also logs to guard_book_entries)
      await fetch(`/api/tracking/incidents/${inc.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment, operator_id: inc.operator_id, objective_id: inc.objective_id })
      });

      // 2. Direct Supabase fallbacks to update all tables in real time
      const now = new Date().toISOString();
      await Promise.allSettled([
        supabase.from('geofence_alerts').update({ resolved: true, resolved_at: now, comment }).eq('id', inc.id),
        supabase.from('geofencing_incidents').update({ status, return_at: now, supervisor_comment: comment }).eq('id', inc.id),
        supabase.from('incidents').update({ status, resolved_at: now }).eq('id', inc.id),
        supabase.from('alarms').update({ status: 'resolved', resolved_at: now }).eq('id', inc.id)
      ]);

      setComment('');
      setSelectedIncident(null);
      fetchIncidents();
    } catch (e) {
      console.error("[AUDIT_PANEL] Error resolving incident:", e);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-full max-w-2xl bg-zinc-950/80 backdrop-blur-2xl border-l border-white/10 shadow-tactical z-[150] flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/40 text-white">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                <FileText className="text-primary" />
                Auditoría de Geocercas
              </h2>
              <p className="text-xs text-zinc-400 font-medium tracking-wide mt-0.5">Control de Abandono de Puesto</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/gerente/trazabilidad" onClick={onClose}>
                <Button variant="ghost" className="h-10 px-4 bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-white/10 gap-2">
                  <History size={14} />
                  Trazabilidad
                </Button>
              </Link>
              <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black">
            {loading ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono tracking-wider animate-pulse">
                Analizando telemetría...
              </div>
            ) : incidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
                <CheckCircle2 size={48} className="opacity-20" />
                <p className="text-xs font-semibold tracking-wider uppercase">Sin incidencias registradas</p>
              </div>
            ) : (
              incidents.map((inc) => (
                <Card 
                  key={inc.id} 
                  className={cn(
                    "p-5 cursor-pointer transition-all hover:shadow-2xl border-white/10 bg-white/5 backdrop-blur-md border-l-4",
                    inc.status === 'pendiente' || inc.status === 'abierto' ? "border-l-red-500 bg-red-950/10 hover:bg-red-950/20" : 
                    inc.status === 'justificado' ? "border-l-emerald-500" : 
                    inc.status === 'sancionado' ? "border-l-amber-500" : "border-l-zinc-700"
                  )}
                  onClick={() => {
                    setSelectedIncident(inc);
                    setComment(inc.supervisor_comment || '');
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border",
                        inc.status === 'pendiente' || inc.status === 'abierto' ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-white/10 border-white/10 text-zinc-300"
                      )}>
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-white tracking-wide">{inc.operator_name}</p>
                        <p className="text-xs text-amber-400/90 font-medium">{inc.objective_name}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                      inc.status === 'pendiente' || inc.status === 'abierto' ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse" : 
                      inc.status === 'justificado' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : 
                      inc.status === 'sancionado' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    )}>
                      {inc.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono text-zinc-400 mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-zinc-500" />
                      <span>{new Date(inc.exit_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={13} className="text-amber-500" />
                      <span>Desvío: ~{Math.round(inc.max_distance_meters || 150)}m</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Incident Detail Modal Overlay */}
          <AnimatePresence>
            {selectedIncident && (
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="absolute inset-0 bg-zinc-950/95 backdrop-blur-3xl z-[160] flex flex-col"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black">
                  <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <ShieldAlert className="text-red-500" size={18} />
                    Detalle de Abandono de Puesto
                  </h3>
                  <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {selectedIncident.map_snapshot_url ? (
                    <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group">
                      <img src={selectedIncident.map_snapshot_url} alt="Desvío" className="w-full h-44 object-cover opacity-80" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <MapIcon className="text-white drop-shadow-lg" size={32} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-zinc-500 gap-2 border border-dashed border-white/10">
                      <MapIcon size={28} className="text-zinc-600" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Posición Registrada Telemétricamente</span>
                      <span className="text-[10px] font-mono text-zinc-500">{selectedIncident.latitude ? `${selectedIncident.latitude}, ${selectedIncident.longitude}` : 'En perímetro de objetivo'}</span>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Operador Módulo</p>
                      <p className="text-sm font-bold text-white">{selectedIncident.operator_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Objetivo Asignado</p>
                      <p className="text-sm font-bold text-amber-400">{selectedIncident.objective_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Hora de Salida</p>
                      <p className="text-xs font-mono text-zinc-300">{new Date(selectedIncident.exit_at).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Retorno / Cierre</p>
                      <p className="text-xs font-mono text-zinc-300">{selectedIncident.return_at ? new Date(selectedIncident.return_at).toLocaleString() : 'En curso / Pendiente'}</p>
                    </div>
                  </div>

                  {/* Validation Form */}
                  <div className="space-y-3 bg-black/40 p-5 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare size={14} className="text-amber-400" />
                      Resolución & Trazabilidad de Supervisión
                    </p>
                    <textarea 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-medium text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-amber-500/20 min-h-[90px] outline-none"
                      placeholder="Ingrese informe o comentario de resolución para el Libro de Guardia..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    
                    <div className="flex gap-3 pt-2">
                      <Button 
                        className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border-none shadow-lg shadow-emerald-900/30"
                        onClick={() => resolveIncident(selectedIncident, 'justificado')}
                      >
                        Justificar
                      </Button>
                      <Button 
                        className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border-none shadow-lg shadow-amber-900/30"
                        onClick={() => resolveIncident(selectedIncident, 'sancionado')}
                      >
                        Sancionar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-white/10 flex justify-center bg-black">
                   <Button variant="ghost" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 gap-2 hover:text-white">
                     <Download size={14} />
                     Exportar Acta Auditoría (PDF)
                   </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
