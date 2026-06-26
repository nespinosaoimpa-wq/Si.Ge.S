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
  History
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
    if (isOpen) fetchIncidents();
  }, [isOpen]);

  async function fetchIncidents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('geofencing_incidents')
      .select(`
        *,
        shift:guard_shifts(id, checkin_time),
        objective:objectives(name),
        operator:resources!operator_id(name)
      `)
      .order('exit_at', { ascending: false });

    if (!error) setIncidents(data || []);
    setLoading(false);
  }

  async function resolveIncident(id: string, status: 'justificado' | 'sancionado') {
    try {
      const res = await fetch(`/api/tracking/incidents/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment })
      });
      if (res.ok) {
        setComment('');
        setSelectedIncident(null);
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
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
              <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                <FileText className="text-primary" />
                Auditoría de Geocercas
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Control de Abandono de Puesto</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/gerente/trazabilidad" onClick={onClose}>
                <Button variant="ghost" className="h-10 px-4 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-white/10 gap-2">
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
              <div className="h-full flex items-center justify-center text-gray-400 uppercase text-[10px] font-black tracking-widest animate-pulse">
                Analizando telemetría...
              </div>
            ) : incidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <CheckCircle2 size={48} className="opacity-20" />
                <p className="uppercase text-[10px] font-black tracking-widest">Sin incidencias registradas</p>
              </div>
            ) : (
              incidents.map((inc) => (
                <Card 
                  key={inc.id} 
                  className={cn(
                    "p-5 cursor-pointer transition-all hover:shadow-xl border-white/5 bg-white/5 backdrop-blur-md border-l-4",
                    inc.status === 'pendiente' ? "border-l-red-500" : 
                    inc.status === 'justificado' ? "border-l-green-500" : "border-l-zinc-700"
                  )}
                  onClick={() => {
                    setSelectedIncident(inc);
                    setComment(inc.supervisor_comment || '');
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                        <User size={14} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-white">{inc.operator?.name || 'Operador'}</p>
                        <p className="text-[10px] text-zinc-500">{inc.objective?.name}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest",
                      inc.status === 'pendiente' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                    )}>
                      {inc.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock size={12} />
                      Salida: {new Date(inc.exit_at).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={12} />
                      Desvío Máx: {Math.round(inc.max_distance_meters)}m
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
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-white">Detalle de Incidencia</h3>
                  <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {selectedIncident.map_snapshot_url ? (
                    <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 relative group">
                      <img src={selectedIncident.map_snapshot_url} alt="Desvío" className="w-full h-48 object-cover opacity-80" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <MapIcon className="text-white drop-shadow-lg" size={32} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-white/5 rounded-[2rem] flex flex-col items-center justify-center text-zinc-600 gap-2 border border-dashed border-white/10">
                      <MapIcon size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mapa no disponible</span>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Operador</p>
                      <p className="text-sm font-bold text-white">{selectedIncident.operator?.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Objetivo</p>
                      <p className="text-sm font-bold text-white">{selectedIncident.objective?.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Inicio Desvío</p>
                      <p className="text-sm font-bold text-white">{new Date(selectedIncident.exit_at).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Retorno</p>
                      <p className="text-sm font-bold text-white">{selectedIncident.return_at ? new Date(selectedIncident.return_at).toLocaleString() : 'En curso...'}</p>
                    </div>
                  </div>

                  {/* Validation Form */}
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare size={12} />
                      Validación de Supervisión
                    </p>
                    <textarea 
                      className="w-full bg-white/5 border-white/5 rounded-2xl p-4 text-xs font-medium text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-primary/20 min-h-[100px] outline-none"
                      placeholder="Ingrese comentarios sobre el incidente..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    
                    <div className="flex gap-3">
                      <Button 
                        className="flex-1 h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border-none"
                        onClick={() => resolveIncident(selectedIncident.id, 'justificado')}
                      >
                        Justificar
                      </Button>
                      <Button 
                        className="flex-1 h-14 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10"
                        onClick={() => resolveIncident(selectedIncident.id, 'sancionado')}
                      >
                        Sancionar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-white/5 flex justify-center">
                   <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 gap-2 hover:text-white">
                     <Download size={14} />
                     Descargar Reporte PDF (Próximamente)
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
