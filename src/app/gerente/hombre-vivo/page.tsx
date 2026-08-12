'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, AlertTriangle, CheckCircle2, Clock, User, 
  MapPin, ShieldAlert, Phone, RefreshCw, Send, 
  Search, Filter, Globe, ChevronRight, FileText, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface HombreVivoCheck {
  id: string;
  created_at: string;
  operator_id: string;
  operator_name?: string;
  operator_avatar?: string | null;
  objective_id?: string;
  objective_name?: string;
  status: 'sin_responder' | 'respondido' | 'pendiente' | 'resuelto';
  time_elapsed_minutes?: number;
  latitude?: number;
  longitude?: number;
  notes?: string | null;
  urgency?: string;
}

export default function HombreVivoPage() {
  const [checks, setChecks] = useState<HombreVivoCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('sin_responder');
  const [selectedCheck, setSelectedCheck] = useState<HombreVivoCheck | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [activeGuards, setActiveGuards] = useState<any[]>([]);
  const [sendingCheckOperatorId, setSendingCheckOperatorId] = useState<string | null>(null);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  const fetchHombreVivoData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hombre-vivo/dispatch');
      if (res.ok) {
        const data = await res.json();
        setActiveGuards(data.activeGuards || []);
        setChecks(data.checks || []);
      }
    } catch (err) {
      console.error('[HOMBRE_VIVO_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHombreVivoData();

    const channel = supabase
      .channel('hombre-vivo-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guard_book_entries' }, () => {
        fetchHombreVivoData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alarms' }, () => {
        fetchHombreVivoData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredChecks = useMemo(() => {
    return checks.filter(c => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        (c.operator_name?.toLowerCase() || '').includes(q) ||
        (c.objective_name?.toLowerCase() || '').includes(q) ||
        (c.notes?.toLowerCase() || '').includes(q);

      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [checks, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    unanswered: checks.filter(c => c.status === 'sin_responder').length,
    answered: checks.filter(c => c.status === 'respondido').length,
    resolved: checks.filter(c => c.status === 'resuelto').length,
    total: checks.length
  }), [checks]);

  // Dispatch an immediate manual Hombre Vivo check request to an operator
  const handleDispatchManualCheck = async (operatorId: string, objectiveId?: string, operatorName?: string) => {
    try {
      setSendingCheckOperatorId(operatorId);
      setDispatchSuccessMsg(null);

      // 1. Call server API route with service role permissions
      const res = await fetch('/api/hombre-vivo/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: operatorId,
          objective_id: objectiveId || null,
          operator_name: operatorName || null
        })
      });

      if (!res.ok) {
        throw new Error('Error al enviar check en servidor');
      }

      // 3. Broadcast instant Realtime WebSocket signal
      try {
        const broadcastChannel = supabase.channel('hombre-vivo-broadcast-channel');
        
        broadcastChannel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await broadcastChannel.send({
              type: 'broadcast',
              event: 'hombre_vivo_dispatch',
              payload: {
                alarm_id: 'manual-' + Date.now(),
                operator_id: operatorId,
                operator_name: operatorName,
                objective_id: objectiveId,
                timestamp: new Date().toISOString()
              }
            });
            console.log('[HombreVivo] ✅ Broadcast enviado en canal hombre-vivo-broadcast-channel');
            setTimeout(() => {
              supabase.removeChannel(broadcastChannel);
            }, 2000);
          }
        });
      } catch (err) {
        console.warn('[RealtimeBroadcast] Error:', err);
      }

      // 4. Send Push Notification
      fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          notification: {
            title: '⚡ CONTROL DE HOMBRE VIVO',
            body: 'Gerencia requiere tu verificación de presencia inmediata.',
            url: '/operador'
          }
        })
      });

      setDispatchSuccessMsg(`✅ Check de Hombre Vivo enviado a ${operatorName || 'operador'}`);
      setTimeout(() => setDispatchSuccessMsg(null), 4000);
      fetchHombreVivoData();
    } catch (e: any) {
      alert('Error al solicitar check: ' + (e?.message || e));
    } finally {
      setSendingCheckOperatorId(null);
    }
  };

  // Resolve an unanswered check with supervisor notes
  const handleResolveCheck = async () => {
    if (!selectedCheck) return;
    try {
      setIsResolving(true);

      const now = new Date().toISOString();

      // 1. Update alarm record
      await supabase
        .from('alarms')
        .update({
          status: 'resolved',
          acknowledged_at: now,
          message: `${selectedCheck.notes || 'Hombre vivo'} [RESUELTO POR GERENCIA: ${resolutionNotes || 'Verificado'}]`
        })
        .eq('id', selectedCheck.id);

      // 2. Update guard book entry if present
      await supabase
        .from('guard_book_entries')
        .update({
          status: 'resolved',
          content: `${selectedCheck.notes || 'Hombre vivo'} [DESCARGO SUPERVISOR: ${resolutionNotes || 'Verificado'}]`
        })
        .eq('id', selectedCheck.id);

      setSelectedCheck(null);
      setResolutionNotes('');
      fetchHombreVivoData();
    } catch (e: any) {
      alert('Error al registrar descargo: ' + (e?.message || e));
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 bg-zinc-50 min-h-screen text-zinc-900 pb-32 font-sans">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-600 border border-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30">
            <Activity size={28} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase text-zinc-950">
              Control de Hombre Vivo
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping inline-block" />
              <span className="text-[11px] font-black text-zinc-600 uppercase tracking-widest">
                {stats.unanswered} reportes sin responder · monitoreo y auditoría táctica
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHombreVivoData}
            className="h-12 w-12 flex items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 transition-all shadow-sm"
            title="Actualizar"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <Link href="/gerente/mapa">
            <Button className="h-12 px-6 rounded-2xl bg-zinc-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all">
              <MapPin size={16} className="mr-2 text-[#D4AF37]" /> Ver en Mapa Vivo
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Success Dispatch Alert ─── */}
      {dispatchSuccessMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg border border-emerald-400 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{dispatchSuccessMsg}</span>
          </div>
        </motion.div>
      )}

      {/* ─── Hero Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={cn(
          "bg-white border-2 rounded-3xl p-6 flex items-center gap-5 shadow-sm transition-all",
          stats.unanswered > 0 ? "border-red-500/40 bg-red-500/5 shadow-red-500/10" : "border-zinc-200"
        )}>
          <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert size={28} className="text-red-600 animate-bounce" />
          </div>
          <div>
            <p className="text-3xl font-black text-red-600 leading-none mb-1">{stats.unanswered}</p>
            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Sin Responder</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-3xl font-black text-zinc-950 leading-none mb-1">{stats.answered}</p>
            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Respondidos OK</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
            <FileText size={28} className="text-[#D4AF37]" />
          </div>
          <div>
            <p className="text-3xl font-black text-zinc-950 leading-none mb-1">{stats.resolved}</p>
            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Verificados / Resueltos</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
            <User size={28} className="text-zinc-700" />
          </div>
          <div>
            <p className="text-3xl font-black text-zinc-950 leading-none mb-1">{activeGuards.length}</p>
            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Guardias en Posición</p>
          </div>
        </div>
      </div>

      {/* ─── Active Guards Instant Dispatch Section ─── */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center">
              <Send size={16} className="text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-950">
                Lanzar Check de Hombre Vivo Manual
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">
                Seleccioná un operador activo para solicitar verificación instantánea de presencia
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeGuards.map((guard) => (
            <div
              key={guard.id}
              className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between gap-3 hover:border-zinc-300 transition-all"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-950 uppercase truncate">{guard.name}</p>
                <p className="text-[9px] font-bold text-zinc-600 uppercase truncate">
                  {guard.objectives?.name || 'Puesto Activo'}
                </p>
              </div>
              <Button
                onClick={() => handleDispatchManualCheck(guard.id, guard.current_objective_id, guard.name)}
                disabled={sendingCheckOperatorId === guard.id}
                className="h-9 px-3 text-[9px] font-black uppercase tracking-widest rounded-xl bg-zinc-900 hover:bg-black text-white shrink-0"
              >
                {sendingCheckOperatorId === guard.id ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  '⚡ Enviar Check'
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Search & Filters ─── */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="BUSCAR POR OPERADOR, PUESTO O DESCRIPCIÓN..."
            className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl pl-11 pr-4 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 text-zinc-900 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex p-1 bg-zinc-50 rounded-xl gap-1 flex-wrap shrink-0">
          {[
            { id: 'sin_responder', label: '🚨 Sin Responder' },
            { id: 'respondido', label: '✅ Respondidos' },
            { id: 'resuelto', label: '📄 Resueltos' },
            { id: 'all', label: 'Todo el Historial' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                statusFilter === tab.id
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Unattended Checks Feed ─── */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 flex flex-col items-center gap-3 bg-white rounded-3xl border border-zinc-200">
            <div className="w-8 h-8 border-3 border-zinc-200 border-t-red-600 rounded-full animate-spin" />
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
              Sincronizando auditoría de hombre vivo...
            </p>
          </div>
        ) : filteredChecks.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-zinc-200 border-dashed space-y-4">
            <ShieldAlert size={48} className="text-zinc-300 mx-auto" />
            <div>
              <h3 className="text-base font-black text-zinc-900 uppercase tracking-tight">
                Sin reportes en esta categoría
              </h3>
              <p className="text-zinc-500 text-xs font-semibold mt-1">
                No hay checks de hombre vivo pendientes bajo el filtro seleccionado.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChecks.map((check) => {
              const isUnanswered = check.status === 'sin_responder';

              return (
                <motion.div
                  key={check.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-white border-2 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all shadow-sm",
                    isUnanswered ? "border-red-500/50 bg-red-500/5 shadow-red-500/10" : "border-zinc-200 hover:border-zinc-300"
                  )}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-inner",
                      isUnanswered ? "bg-red-600 text-white border-red-500 animate-pulse" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    )}>
                      {isUnanswered ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-zinc-950 text-base uppercase tracking-tight">
                          {check.operator_name}
                        </span>
                        <span className="text-[10px] font-black text-zinc-600 uppercase">
                          · {check.objective_name}
                        </span>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider",
                          isUnanswered ? "bg-red-600 text-white animate-pulse" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {isUnanswered ? `🚨 SIN RESPONDER (${check.time_elapsed_minutes}m)` : `OK`}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-zinc-800 leading-relaxed">
                        {check.notes || 'Control de presencia Hombre Vivo'}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-zinc-400 uppercase">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(check.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} HS
                        </span>
                        {check.latitude && check.longitude && (
                          <span className="flex items-center gap-1 text-zinc-500">
                            <MapPin size={12} />
                            GPS: {check.latitude.toFixed(4)}, {check.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-zinc-100 pt-3 md:pt-0">
                    <Button
                      onClick={() => setSelectedCheck(check)}
                      className={cn(
                        "h-12 px-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md",
                        isUnanswered 
                          ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/30" 
                          : "bg-zinc-900 hover:bg-black text-white"
                      )}
                    >
                      {isUnanswered ? '⚡ Intervenir / Registrar Descargo' : 'Ver Detalle'}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Resolution / Supervisor Descargo Modal ─── */}
      <AnimatePresence>
        {selectedCheck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-950 border-2 border-red-600/40 p-8 rounded-[3rem] max-w-lg w-full text-zinc-100 shadow-[0_0_80px_rgba(220,38,38,0.4)] relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-600/20 border border-red-500 rounded-2xl flex items-center justify-center">
                    <ShieldAlert size={24} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tight text-white">
                      Auditoría de Hombre Vivo
                    </h3>
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                      Intervención de Supervisión
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCheck(null)}
                  className="w-10 h-10 hover:bg-white/10 rounded-full text-zinc-400 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-6 text-xs font-medium bg-zinc-900 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Operador:</span>
                  <span className="text-white font-black uppercase">{selectedCheck.operator_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Objetivo:</span>
                  <span className="text-white font-black uppercase">{selectedCheck.objective_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Hora de Alerta:</span>
                  <span className="text-[#D4AF37] font-mono font-bold">
                    {new Date(selectedCheck.created_at).toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-bold uppercase">Detalle:</span>
                  <span className="text-red-400 font-bold uppercase">{selectedCheck.notes || 'Sin respuesta'}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">
                  Observación / Descargo de Gerencia *
                </label>
                <textarea
                  placeholder="Ej: Verificado por llamada de voz / frecuencia VHF. Operador realizando patrullaje exterior..."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  className="w-full h-28 p-4 rounded-2xl bg-zinc-900 border border-white/10 text-xs font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleResolveCheck}
                  disabled={isResolving}
                  className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/30"
                >
                  {isResolving ? 'Guardando...' : '✅ Registrar Verificación / Resolver'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
