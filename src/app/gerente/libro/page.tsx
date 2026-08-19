'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, Download, Clock, User, MapPin, AlertTriangle,
  Calendar, CheckCircle2, ChevronRight, ShieldCheck, FileText, Zap,
  RefreshCw, Building2, Filter, Radio, Eye, Layers, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import DailyScorecard from '@/components/gerente/DailyScorecard';

// ─── Severidades Config ──────────────────────────────────────────────────────────
const SEVERITY: Record<string, {
  bar: string; badge: string; badgeText: string; label: string; dot: string;
}> = {
  critica:  { bar: 'bg-red-600',    badge: 'bg-red-500/10 border-red-500/30',  badgeText: 'text-red-600',    label: '🔴 CRÍTICA',  dot: 'bg-red-600' },
  alta:     { bar: 'bg-orange-500', badge: 'bg-orange-500/10 border-orange-500/30', badgeText: 'text-orange-600', label: '🟧 ALTA',     dot: 'bg-orange-500' },
  media:    { bar: 'bg-amber-500',  badge: 'bg-amber-500/10 border-amber-500/30',  badgeText: 'text-amber-700',  label: '🟨 MEDIA',    dot: 'bg-amber-500' },
  baja:     { bar: 'bg-blue-500',   badge: 'bg-blue-500/10 border-blue-500/30',   badgeText: 'text-blue-600',   label: '🟦 BAJA',     dot: 'bg-blue-500' },
  normal:   { bar: 'bg-zinc-300',   badge: 'bg-zinc-100 border-zinc-200',       badgeText: 'text-zinc-600',   label: '⚪ NORMAL',   dot: 'bg-zinc-400' },
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; barColor: string; label: string }> = {
  fichaje:      { icon: <CheckCircle2 size={15} />, barColor: 'bg-emerald-500', label: 'Fichaje' },
  incidente:    { icon: <AlertTriangle size={15} />, barColor: 'bg-red-500',    label: 'Incidente' },
  emergencia:   { icon: <Zap size={15} />,           barColor: 'bg-red-600',    label: 'Emergencia' },
  libro_guardia:{ icon: <FileText size={15} />,      barColor: 'bg-blue-500',   label: 'Novedad' },
  ronda:        { icon: <ShieldCheck size={15} />,   barColor: 'bg-amber-500',  label: 'Ronda' },
  inventario:   { icon: <Building2 size={15} />,     barColor: 'bg-purple-500', label: 'Inventario' },
};

// ─── Avatar Helper ────────────────────────────────────────────────────────────
function OperatorAvatar({ name, url }: { name?: string; url?: string | null }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'OP';

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-11 h-11 rounded-2xl object-cover border-2 border-zinc-200 shadow-sm shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-zinc-800">
      <span>{initials}</span>
    </div>
  );
}

// ─── Enriched CSV Export ──────────────────────────────────────────────────────
function buildTacticalCSV(entries: any[], periodLabel: string) {
  const now = new Date().toLocaleString('es-AR');

  const header = [
    '========================================================',
    'SIGPAD OS — INFORME DE AUDITORÍA Y BITÁCORA TÁCTICA',
    `Filtro de Período: ${periodLabel}  |  Exportado: ${now}`,
    `Total Registros Exportados: ${entries.length}`,
    '========================================================',
    '',
  ].join('\n');

  const cols = [
    'Fecha Exacta', 'Hora Exacta', 'Puesto / Objetivo', 'Dirección Objetivo',
    'Operador / Autor', 'Rol', 'Categoría', 'Urgencia', 'Descripción / Detalle Novedad',
    'Latitud', 'Longitud', 'Tiene Imagen', 'Tiene Audio'
  ];

  const rows = entries.map(e => {
    const dt = new Date(e.created_at);
    return [
      dt.toLocaleDateString('es-AR'),
      dt.toLocaleTimeString('es-AR'),
      `"${(e.objectives?.name || 'Objetivo General').replace(/"/g, '""')}"`,
      `"${(e.objectives?.address || '').replace(/"/g, '""')}"`,
      `"${(e.resources?.name || e.author_name || e.written_by || 'Sin identificar').replace(/"/g, '""')}"`,
      e.resources?.role || 'Vigilador',
      TYPE_CONFIG[e.entry_type]?.label || e.entry_type || 'Novedad',
      SEVERITY[e.urgency || 'normal']?.label || 'NORMAL',
      `"${(e.content || '').replace(/"/g, '""')}"`,
      e.latitude ?? '',
      e.longitude ?? '',
      e.image_url ? 'SÍ' : 'NO',
      e.audio_url ? 'SÍ' : 'NO',
    ].join(',');
  });

  return header + [cols.join(','), ...rows].join('\n');
}

// ─── Duración de Abandono ───────────────────────────────────────────
function AbandonDuration({ seconds }: { seconds?: number | null }) {
  if (seconds === undefined || seconds === null) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse inline-block" />
        En seguimiento...
      </span>
    );
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = seconds < 60 ? 'Desvío breve (<1 min)' : `Tiempo de Abandono: ${mins}m ${secs}s`;

  return (
    <span className={cn(
      "flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border",
      seconds < 60
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-red-700 bg-red-50 border-red-200"
    )}>
      <span className={cn("w-2 h-2 rounded-full inline-block", seconds < 60 ? "bg-amber-500" : "bg-red-600 animate-ping")} />
      {label}
    </span>
  );
}

export default function GuardBookPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filterObjective, setFilterObjective] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  
  const [objectives, setObjectives] = useState<any[]>([]);
  const [newEntryFlash, setNewEntryFlash] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Manejo de períodos de tiempo
      const todayStr = new Date().toISOString().split('T')[0];
      if (filterPeriod === 'today') {
        params.set('date', todayStr);
      } else if (filterPeriod === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.set('start_date', d.toISOString().split('T')[0]);
      } else if (filterPeriod === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.set('start_date', d.toISOString().split('T')[0]);
      } else if (filterPeriod === 'custom') {
        if (customStartDate) params.set('start_date', customStartDate);
        if (customEndDate) params.set('end_date', customEndDate);
      }

      if (filterObjective !== 'all') params.set('objective_id', filterObjective);
      if (filterType !== 'all') params.set('entry_type', filterType);
      if (filterUrgency !== 'all') params.set('urgency', filterUrgency);
      params.set('limit', '300');

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

  useEffect(() => {
    fetchEntries();
  }, [filterPeriod, customStartDate, customEndDate, filterObjective, filterType, filterUrgency]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('libro-gerente-realtime-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guard_book_entries' }, async (payload) => {
        const newEntry = payload.new as any;
        if (!newEntry?.id) return;
        try {
          const res = await fetch(`/api/guard-book?entry_id=${newEntry.id}`);
          const data = await res.json();
          const entry = Array.isArray(data) ? data[0] : data;
          if (entry) {
            setEntries(prev => [entry, ...prev]);
            setNewEntryFlash(entry.id);
            setTimeout(() => setNewEntryFlash(null), 5000);
          }
        } catch {
          setEntries(prev => [newEntry, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Búsqueda en cliente sobre las entradas obtenidas
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const q = searchTerm.toLowerCase().trim();
    return entries.filter(e => {
      return (
        (e.content?.toLowerCase() || '').includes(q) ||
        (e.resources?.name?.toLowerCase() || '').includes(q) ||
        (e.resources?.role?.toLowerCase() || '').includes(q) ||
        (e.author_name?.toLowerCase() || '').includes(q) ||
        (e.objectives?.name?.toLowerCase() || '').includes(q) ||
        (e.objectives?.address?.toLowerCase() || '').includes(q)
      );
    });
  }, [entries, searchTerm]);

  const handleExport = () => {
    const periodLabel = filterPeriod === 'today' ? 'Hoy' : filterPeriod === '7days' ? 'Últimos 7 días' : filterPeriod === '30days' ? 'Este Mes' : 'Historial General';
    const csv = buildTacticalCSV(filteredEntries, periodLabel);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIGPAD_Bitacora_Auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 font-sans">

      {/* ─── Encabezado Principal ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white border-2 border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm">
            <BookOpen size={28} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-950">Libro de Guardia</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
              <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                {filteredEntries.length} novedades registradas · Sincronización activa
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={fetchEntries} 
            className="h-11 px-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-zinc-500" : "text-zinc-700"} />
            Actualizar
          </button>
          <button
            onClick={handleExport}
            disabled={filteredEntries.length === 0}
            className="h-11 px-5 rounded-xl text-xs font-black gap-2 bg-zinc-900 hover:bg-zinc-800 text-white transition-all flex items-center justify-center shadow-lg uppercase tracking-widest disabled:opacity-40"
          >
            <Download size={16} className="text-emerald-400" />
            Exportar Auditoría (CSV)
          </button>
        </div>
      </div>

      {/* ─── Daily Scorecard KPI ─── */}
      <DailyScorecard entries={entries} totalObjectives={objectives.length} />

      {/* ─── BARRA DE FILTROS AVANZADOS ─── */}
      <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-zinc-900 font-black text-xs uppercase tracking-wider">
            <Filter size={16} className="text-[#0F4C5C]" />
            Filtros de Auditoría y Búsqueda
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {filteredEntries.length} de {entries.length} resultados
          </span>
        </div>

        {/* Fila 1: Buscador + Selector de Período + Selector de Objetivo */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          {/* Buscador de Texto */}
          <div className="relative md:col-span-1 lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por operador, puesto o contenido..."
              className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro por Objetivo */}
          <div className="relative">
            <div className="flex items-center gap-2 h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <Building2 size={16} className="text-zinc-400 shrink-0" />
              <select
                value={filterObjective}
                onChange={e => setFilterObjective(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer uppercase truncate"
              >
                <option value="all">🏢 Todos los Objetivos</option>
                {objectives.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtro por Período */}
          <div className="relative">
            <div className="flex items-center gap-2 h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <Calendar size={16} className="text-zinc-400 shrink-0" />
              <select
                value={filterPeriod}
                onChange={e => setFilterPeriod(e.target.value as any)}
                className="w-full bg-transparent text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer uppercase"
              >
                <option value="all">📌 Historial Completo</option>
                <option value="today">📅 Hoy</option>
                <option value="7days">🗓️ Últimos 7 Días</option>
                <option value="30days">📆 Este Mes</option>
                <option value="custom">⚙️ Rango Personalizado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sub-fila: Rango de Fechas Personalizado (si elige custom) */}
        {filterPeriod === 'custom' && (
          <div className="flex items-center gap-3 pt-2 flex-wrap bg-zinc-50 p-3 rounded-xl border border-zinc-200">
            <span className="text-[10px] font-black uppercase text-zinc-500">Rango de fechas:</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Desde</span>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={e => setCustomStartDate(e.target.value)}
                className="h-9 px-3 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Hasta</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={e => setCustomEndDate(e.target.value)}
                className="h-9 px-3 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-900"
              />
            </div>
          </div>
        )}

        {/* Fila 2: Chips de Categoría + Severidad */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-zinc-100">
          
          {/* Categoría */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mr-1">Tipo:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'libro_guardia', label: 'Novedades' },
              { id: 'incidente', label: 'Incidentes' },
              { id: 'emergencia', label: 'Emergencias' },
              { id: 'fichaje', label: 'Fichajes' },
              { id: 'ronda', label: 'Rondas' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  filterType === t.id
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                    : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Severidad */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Urgencia:</span>
            <select
              value={filterUrgency}
              onChange={e => setFilterUrgency(e.target.value)}
              className="h-9 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer uppercase"
            >
              <option value="all">Todas las severidades</option>
              <option value="critica">🔴 Crítica</option>
              <option value="alta">🟧 Alta</option>
              <option value="media">🟨 Media</option>
              <option value="baja">🟦 Baja</option>
              <option value="normal">⚪ Normal</option>
            </select>
          </div>

        </div>
      </div>

      {/* ─── LISTADO DE REGISTROS DE BITÁCORA ─── */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3 bg-white rounded-[2rem] border border-zinc-200">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Sincronizando bitácoras de objetivos...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-zinc-200">
            <BookOpen size={48} className="text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Sin registros para estos filtros</h3>
            <p className="text-zinc-500 text-xs font-bold mt-1">Pruebe seleccionando "Historial Completo" o cambiando el objetivo/tipo de novedad.</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredEntries.map((entry, i) => {
              const sev = SEVERITY[entry.urgency || 'normal'] || SEVERITY.normal;
              const typeCfg = TYPE_CONFIG[entry.entry_type] || TYPE_CONFIG.libro_guardia;
              const isNew = entry.id === newEntryFlash;
              const isCritical = entry.urgency === 'critica' || entry.entry_type === 'emergencia';
              const createdDate = new Date(entry.created_at);

              const operatorName = entry.author_name || entry.written_by || entry.resources?.name || 
                (entry.content?.startsWith('[GERENTE]') ? 'Mesa de Control (Gerencia)' : 
                (entry.entry_type === 'fichaje' ? 'Sistema (Fichaje Automático)' : 'Personal Autorizado'));

              const operatorRole = entry.resources?.role || (entry.content?.startsWith('[GERENTE]') ? 'Gerente' : 'Vigilador');
              const objectiveName = entry.objectives?.name || 'Objetivo General';
              const objectiveAddress = entry.objectives?.address || '';

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className={cn(
                    'group relative bg-white border rounded-[1.8rem] overflow-hidden transition-all duration-200 hover:shadow-lg',
                    isNew && 'ring-2 ring-emerald-500 ring-offset-2 shadow-lg shadow-emerald-500/10',
                    isCritical ? 'border-red-300 bg-red-50/10' : 'border-zinc-200'
                  )}
                >
                  {/* Borde izquierdo distintivo según tipo */}
                  <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', typeCfg.barColor)} />

                  <div className="p-6 pl-7 space-y-4">
                    
                    {/* ENCABEZADO SUPERIOR: OPERADOR + PUESTO + FECHA EXACTA */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                      
                      {/* Información del Operador y Puesto */}
                      <div className="flex items-center gap-4">
                        <OperatorAvatar
                          name={operatorName}
                          url={entry.resources?.avatar_url}
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-zinc-950 uppercase tracking-tight leading-none">
                              {operatorName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-600 border border-zinc-200">
                              {operatorRole}
                            </span>
                          </div>

                          {/* PUESTO / OBJETIVO DE ORIGEN */}
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-zinc-700">
                            <Building2 size={14} className="text-[#0F4C5C] shrink-0" />
                            <span className="text-zinc-900 uppercase font-black">{objectiveName}</span>
                            {objectiveAddress && (
                              <span className="text-zinc-400 font-normal truncate max-w-[250px]">
                                ({objectiveAddress})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BADGE DE FECHA Y HORA EXACTA + SEVERIDAD */}
                      <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border uppercase tracking-wider',
                            'bg-zinc-100 border-zinc-200 text-zinc-800'
                          )}>
                            {typeCfg.icon}
                            {typeCfg.label}
                          </span>

                          {entry.urgency && entry.urgency !== 'normal' && (
                            <span className={cn(
                              'px-3 py-1 rounded-xl text-xs font-black border uppercase tracking-wider',
                              sev.badge, sev.badgeText
                            )}>
                              {sev.label}
                            </span>
                          )}
                        </div>

                        {/* Fecha y Hora formateada */}
                        <div className="flex items-center gap-2 text-xs font-black text-zinc-900 bg-zinc-100/80 px-3 py-1 rounded-lg border border-zinc-200/80 font-mono">
                          <Calendar size={13} className="text-zinc-500" />
                          <span>{createdDate.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          <span className="text-zinc-300">|</span>
                          <Clock size={13} className="text-zinc-500" />
                          <span>{createdDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} hs</span>
                        </div>
                      </div>

                    </div>

                    {/* CUERPO DEL REGISTRO / NOVEDAD */}
                    <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                      <p className="text-sm text-zinc-900 font-medium leading-relaxed whitespace-pre-wrap">
                        {entry.content}
                      </p>
                    </div>

                    {/* ADJUNTOS MULTIMEDIA (IMÁGENES Y AUDIOS) */}
                    {(entry.image_url || entry.audio_url) && (
                      <div className="flex flex-wrap gap-4 pt-1">
                        {entry.image_url && (
                          <div className="relative group/img overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-sm transition-all hover:shadow-md">
                            <img 
                              src={entry.image_url} 
                              alt="Evidencia visual" 
                              className="h-36 w-auto object-cover cursor-zoom-in transition-transform group-hover/img:scale-105"
                              onClick={() => window.open(entry.image_url, '_blank')}
                            />
                            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                              Ver foto HD 🔍
                            </div>
                          </div>
                        )}
                        {entry.audio_url && (
                          <div className="flex flex-col gap-2 p-3.5 bg-zinc-100 border border-zinc-200 rounded-2xl w-full max-w-[320px] shadow-sm">
                            <p className="text-[10px] font-black text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Zap size={12} className="text-[#0F4C5C]" />
                              Nota de Voz Grabada
                            </p>
                            <audio controls className="h-8 w-full">
                              <source src={entry.audio_url} type="audio/mpeg" />
                              Tu navegador no soporta audio.
                            </audio>
                          </div>
                        )}
                      </div>
                    )}

                    {/* METADATOS TÁCTICOS (COORDENADAS GPS / ZONA / ABANDONO) */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-100 text-xs">
                      
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Coordenadas GPS */}
                        {entry.latitude && (
                          <div className="flex items-center gap-1.5 bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200">
                            <MapPin size={13} className="text-zinc-500 shrink-0" />
                            <span className="font-mono text-[11px] font-bold text-zinc-800">
                              {Number(entry.latitude).toFixed(5)}, {Number(entry.longitude).toFixed(5)}
                            </span>
                            {entry.tactical_zone && (
                              <span className="ml-1 text-[9px] font-black text-[#0F4C5C] uppercase tracking-wider bg-[#0F4C5C]/10 px-1.5 py-0.5 rounded border border-[#0F4C5C]/20">
                                {entry.tactical_zone}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Duración de abandono */}
                        {entry.entry_type === 'incidente' && (
                          <AbandonDuration seconds={entry.abandon_duration_seconds ?? null} />
                        )}

                        {/* Alerta de Reincidencia */}
                        {entry.weekly_alert_count > 3 && (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black border bg-red-500/10 border-red-500/30 text-red-600 flex items-center gap-1 uppercase tracking-wider">
                            <AlertTriangle size={12} />
                            Reincidente ({entry.weekly_alert_count} alertas esta semana)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-auto">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        Sincronizado en Nube
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
