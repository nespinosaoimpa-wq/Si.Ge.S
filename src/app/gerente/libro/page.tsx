'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, Download, Clock, User, MapPin, AlertTriangle,
  Calendar, CheckCircle2, ChevronRight, ShieldCheck, FileText, Zap,
  RefreshCw, Building2, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import DailyScorecard from '@/components/gerente/DailyScorecard';

// ─── Severity Config ──────────────────────────────────────────────────────────
const SEVERITY: Record<string, {
  bar: string; badge: string; badgeText: string; label: string; dot: string;
}> = {
  critica:  { bar: 'bg-red-500',    badge: 'bg-red-50 border-red-200',    badgeText: 'text-red-600',    label: 'CRÍTICA',  dot: 'bg-red-500' },
  alta:     { bar: 'bg-orange-500', badge: 'bg-orange-50 border-orange-200', badgeText: 'text-orange-600', label: 'ALTA',     dot: 'bg-orange-500' },
  media:    { bar: 'bg-amber-400',  badge: 'bg-amber-50 border-amber-200', badgeText: 'text-amber-600',  label: 'MEDIA',    dot: 'bg-amber-400' },
  baja:     { bar: 'bg-blue-500',   badge: 'bg-blue-50 border-blue-200',   badgeText: 'text-blue-600',   label: 'BAJA',     dot: 'bg-blue-500' },
  normal:   { bar: 'bg-zinc-200',   badge: 'bg-zinc-50 border-zinc-200',       badgeText: 'text-zinc-500',   label: 'NORMAL',   dot: 'bg-zinc-400' },
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; barColor: string; label: string }> = {
  fichaje:      { icon: <CheckCircle2 size={16} />, barColor: 'bg-emerald-500', label: 'Fichaje' },
  incidente:    { icon: <AlertTriangle size={16} />, barColor: 'bg-red-500',    label: 'Incidente' },
  emergencia:   { icon: <Zap size={16} />,           barColor: 'bg-red-600',    label: 'Emergencia' },
  libro_guardia:{ icon: <FileText size={16} />,      barColor: 'bg-blue-500',   label: 'Guardia' },
  ronda:        { icon: <ShieldCheck size={16} />,   barColor: 'bg-amber-500',  label: 'Ronda' },
  inventario:   { icon: <Building2 size={16} />,     barColor: 'bg-purple-500', label: 'Inventario' },
};

// ─── Avatar Helper ────────────────────────────────────────────────────────────
function OperatorAvatar({ name, url }: { name?: string; url?: string | null }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-10 h-10 rounded-full object-cover border-2 border-white/10 shadow-lg shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-yellow-400/20 border-2 border-yellow-400/30 flex items-center justify-center shrink-0 shadow-lg">
      <span className="text-[11px] font-semibold text-yellow-500 tracking-tight">{initials}</span>
    </div>
  );
}

// ─── Enriched CSV Export ──────────────────────────────────────────────────────
function buildTacticalCSV(entries: any[], dateFilter: string) {
  const dateStr = dateFilter || new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleString('es-AR');

  const firstTs = entries.length > 0
    ? new Date(entries[entries.length - 1].created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const lastTs = entries.length > 0
    ? new Date(entries[0].created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const critCount = entries.filter(e => e.urgency === 'critica' || e.entry_type === 'emergencia').length;
  const incidentCount = entries.filter(e => e.entry_type === 'incidente').length;
  const checkinCount = entries.filter(e => e.entry_type === 'fichaje').length;

  const header = [
    '========================================================',
    'SIGPAD OS - INFORME DE CUMPLIMIENTO TÁCTICO',
    `Fecha: ${dateStr}  |  Exportado: ${now}`,
    `Período: ${firstTs} - ${lastTs}  |  Total eventos: ${entries.length}`,
    `Alertas Críticas: ${critCount}  |  Incidentes: ${incidentCount}  |  Fichajes: ${checkinCount}`,
    '========================================================',
    '',
  ].join('\n');

  const cols = [
    'Fecha/Hora', 'Categoría', 'Severidad', 'Objetivo', 'Dirección Objetivo',
    'Operador', 'Rol', 'Descripción', 'Latitud', 'Longitud'
  ];

  const rows = entries.map(e => [
    new Date(e.created_at).toLocaleString('es-AR'),
    TYPE_CONFIG[e.entry_type]?.label || e.entry_type || 'Evento',
    SEVERITY[e.urgency || 'normal']?.label || 'NORMAL',
    e.objectives?.name || 'Objetivo General',
    e.objectives?.address || '',
    e.resources?.name || e.resource_id || 'Sin identificar',
    e.resources?.role || '',
    `"${(e.content || '').replace(/"/g, '""')}"`,
    e.latitude ?? '',
    e.longitude ?? '',
  ].join(','));

  const footer = [
    '',
    '========================================================',
    `Generado por SIGPAD OS · ${now}`,
    'Documento confidencial — uso interno exclusivo',
    '========================================================',
  ].join('\n');

  return header + [cols.join(','), ...rows].join('\n') + footer;
}

// ─── Tarea 3: Duración de Abandono ───────────────────────────────────────────
// < 60s  → amarillo  "Desvío breve"
// >= 60s → rojo      "Abandono: 14m 30s"
// null   → gris      "En curso..." (sin reingreso aún)
function AbandonDuration({ seconds }: { seconds?: number | null }) {
  if (seconds === undefined || seconds === null) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse inline-block" />
        En curso...
      </span>
    );
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = seconds < 60
    ? 'Desvío breve'
    : `Abandono: ${mins}m ${secs}s`;

  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
      seconds < 60
        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
        : 'text-red-500 bg-red-500/10 border-red-500/20'
    }`}>
      {/* Dot indicator */}
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${seconds < 60 ? 'bg-amber-400' : 'bg-red-500 animate-ping'}`} />
      {label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GuardBookPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterObjective, setFilterObjective] = useState('all');
  const [objectives, setObjectives] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [newEntryFlash, setNewEntryFlash] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();

    const channel = supabase
      .channel('libro-gerente-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guard_book_entries' }, async (payload) => {
        // Fetch the full enriched entry
        const res = await fetch(`/api/guard-book?limit=1`);
        const data = await res.json();
        if (data?.[0]) {
          setEntries(prev => [data[0], ...prev]);
          setNewEntryFlash(data[0].id);
          setTimeout(() => setNewEntryFlash(null), 5000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dateFilter]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter) params.set('date', dateFilter);
      if (filterObjective !== 'all') params.set('objective_id', filterObjective);
      params.set('limit', '200');

      const [entriesRes, objRes] = await Promise.all([
        fetch(`/api/guard-book?${params}`).then(r => r.json()),
        fetch('/api/objectives').then(r => r.json()),
      ]);

      setEntries(Array.isArray(entriesRes) ? entriesRes : []);
      setObjectives(Array.isArray(objRes) ? objRes : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, [filterObjective]);

  const filteredEntries = useMemo(() => entries.filter(e => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      (e.content?.toLowerCase() || '').includes(q) ||
      (e.resources?.name?.toLowerCase() || '').includes(q) ||
      (e.objectives?.name?.toLowerCase() || '').includes(q);
    const matchType = filterType === 'all' || e.entry_type === filterType;
    return matchSearch && matchType;
  }), [entries, searchTerm, filterType]);

  const handleExport = () => {
    const csv = buildTacticalCSV(filteredEntries, dateFilter);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `REPORTE_CUMPLIMIENTO_SIGPAD_${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">

      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white border-2 border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm">
            <BookOpen size={28} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Libro de guardia</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 bg-[#0F4C5C] rounded-full animate-pulse inline-block" />
              <span className="text-xs font-normal text-zinc-500">
                {filteredEntries.length} registros hoy
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="date"
              className="bg-white border border-zinc-200 rounded-xl h-10 pl-9 pr-4 text-xs font-medium text-zinc-950 focus:outline-none focus:ring-1 focus:ring-[#0F4C5C]/50 shadow-sm"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
          <button onClick={fetchEntries} className="h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 transition-all shadow-sm">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleExport}
            className="h-10 px-4 rounded-xl text-xs font-medium gap-2 bg-zinc-900 text-white hover:bg-black transition-all flex items-center justify-center shadow-sm"
          >
            <Download size={15} /> Exportar reporte
          </button>
        </div>
      </div>

      {/* ─── Daily Scorecard ─── */}
      <DailyScorecard entries={entries} totalObjectives={objectives.length} />

      {/* ─── Filters ─── */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-2.5 rounded-[1.5rem] border border-zinc-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por operador, objetivo o contenido..."
            className="w-full h-11 bg-zinc-50 border border-zinc-100 rounded-xl pl-11 pr-4 text-[13px] font-normal focus:outline-none focus:ring-1 focus:ring-[#0F4C5C]/50 transition-all text-zinc-950 placeholder:text-zinc-400"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 px-2 border-l border-zinc-100">
          <Building2 size={14} className="text-zinc-400 shrink-0" />
          <select
            value={filterObjective}
            onChange={e => setFilterObjective(e.target.value)}
            className="text-xs font-medium bg-transparent border-none focus:outline-none text-zinc-500 cursor-pointer"
          >
            <option value="all">Todos los objetivos</option>
            {objectives.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className="flex p-1 bg-zinc-50 rounded-xl gap-1 flex-wrap shrink-0">
          {(['all', 'fichaje', 'incidente', 'emergencia', 'ronda', 'libro_guardia'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filterType === type ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
              )}
            >
              {type === 'all' ? 'Todo' : type === 'libro_guardia' ? 'Novedades' : type === 'fichaje' ? 'Fichajes' : type === 'incidente' ? 'Incidentes' : type === 'emergencia' ? 'Emergencias' : type === 'ronda' ? 'Rondas' : type}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Timeline Feed ─── */}
      <div className="space-y-2">
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-yellow-400 rounded-full animate-spin" />
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Sincronizando...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-20 text-center border border-zinc-200 border-dashed">
            <BookOpen size={40} className="text-zinc-200 mx-auto mb-6" />
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Sin registros</h3>
            <p className="text-zinc-400 text-sm font-semibold mt-2">No hay entradas para los filtros seleccionados.</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredEntries.map((entry, i) => {
              const sev = SEVERITY[entry.urgency || 'normal'] || SEVERITY.normal;
              const typeCfg = TYPE_CONFIG[entry.entry_type] || TYPE_CONFIG.libro_guardia;
              const isNew = entry.id === newEntryFlash;
              const isCritical = entry.urgency === 'critica' || entry.entry_type === 'emergencia';

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -16, scale: 0.99 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.025, 0.4) }}
                  className={cn(
                    'group relative bg-white border rounded-[1.5rem] overflow-hidden transition-all duration-300',
                    'hover:shadow-xl hover:shadow-gray-100/80',
                    isNew && 'ring-2 ring-yellow-400 ring-offset-2 shadow-lg shadow-yellow-400/10',
                    isCritical && 'border-red-200'
                  )}
                >
                  {/* NEW badge */}
                  {isNew && (
                    <div className="absolute -top-px -right-0 bg-yellow-400 text-zinc-900 text-[10px] font-medium px-2.5 py-0.5 rounded-bl-xl animate-pulse">
                      Nuevo
                    </div>
                  )}

                  {/* Severity bar (left border accent) */}
                  <div className={cn('absolute left-0 top-0 bottom-0 w-1', typeCfg.barColor)} />

                  <div className="flex gap-4 p-5 pl-6">
                    {/* Time column */}
                    <div className="hidden lg:flex flex-col items-center gap-1 w-12 shrink-0 pt-1">
                      <span className="text-[11px] font-black text-zinc-950 tabular-nums">
                        {new Date(entry.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className={cn('w-1.5 h-1.5 rounded-full mt-1', sev.dot)} />
                      <div className="w-px flex-1 bg-gray-100" />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Top row: avatar + info + severity badge */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Operator Avatar */}
                          <OperatorAvatar
                            name={entry.resources?.name}
                            url={entry.resources?.avatar_url}
                          />
                          <div>
                            <p className="text-sm font-semibold text-zinc-900 leading-tight">
                              {entry.resources?.name || 'Operador desconocido'}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {entry.objectives?.name || 'Objetivo general'}
                            </p>
                          </div>
                        </div>

                        {/* Category + Severity chips */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border',
                            'bg-zinc-50 border-zinc-100 text-zinc-600'
                          )}>
                            {typeCfg.icon}
                            {typeCfg.label}
                          </span>
                          {entry.urgency && entry.urgency !== 'normal' && (
                            <span className={cn(
                              'px-2.5 py-1 rounded-lg text-[11px] font-medium border',
                              sev.badge, sev.badgeText
                            )}>
                              {sev.label}
                            </span>
                          )}
                          {entry.weekly_alert_count > 3 && (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium border bg-red-500/10 border-red-500/30 text-red-500 flex items-center gap-1">
                              <AlertTriangle size={10} />
                              Reincidente ({entry.weekly_alert_count})
                            </span>
                          )}
                          {isCritical && (
                            <span className="flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-[13px] text-zinc-700 font-normal leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                        {entry.content}
                      </p>

                      {/* Multimedia Evidence */}
                      {(entry.image_url || entry.audio_url) && (
                        <div className="flex flex-wrap gap-4 pt-2">
                          {entry.image_url && (
                            <div className="relative group/img overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-sm transition-all hover:shadow-md">
                              <img 
                                src={entry.image_url} 
                                alt="Evidencia visual" 
                                className="h-32 w-auto object-cover cursor-zoom-in transition-transform group-hover/img:scale-105"
                                onClick={() => window.open(entry.image_url, '_blank')}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors pointer-events-none" />
                            </div>
                          )}
                          {entry.audio_url && (
                            <div className="flex flex-col gap-2 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl w-full max-w-[300px] shadow-sm">
                              <p className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
                                <Zap size={10} className="text-[#0F4C5C]" />
                                Evidencia de Audio
                              </p>
                              <audio controls className="h-8 w-full">
                                <source src={entry.audio_url} type="audio/mpeg" />
                                Tu navegador no soporta audio.
                              </audio>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer metadata */}
                      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-zinc-50">
                        {/* Timestamp (mobile) */}
                        <span className="text-[10px] font-bold text-gray-400 lg:hidden">
                          {new Date(entry.created_at).toLocaleString('es-AR', {
                            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
                          })}
                        </span>

                        {/* Coordinates → human label */}
                        {entry.latitude && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} className="text-gray-300 shrink-0" />
                            <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                              {Number(entry.latitude).toFixed(5)}, {Number(entry.longitude).toFixed(5)}
                            </span>
                            {entry.tactical_zone && (
                              <span className="ml-1 text-[10px] font-bold text-blue-500 uppercase tracking-wide bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100">
                                {entry.tactical_zone}
                              </span>
                            )}
                          </div>
                        )}

                        {/* For abandonment incidents: show address + duration */}
                        {entry.entry_type === 'incidente' && entry.objectives?.address && (
                          <div className="flex items-center gap-1.5">
                            <ChevronRight size={11} className="text-gray-300 shrink-0" />
                            <span className="text-[10px] font-bold text-gray-500 truncate max-w-[200px]">
                              {entry.objectives.address}
                            </span>
                          </div>
                        )}

                        {/* Tarea 3: Duración de abandono — solo en incidentes */}
                        {/* Duration */}
                        {entry.entry_type === 'incidente' && (
                          <AbandonDuration seconds={entry.abandon_duration_seconds ?? null} />
                        )}

                        {/* Cloud sync badge */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[11px] font-medium text-zinc-400">
                            Sincronizado
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

