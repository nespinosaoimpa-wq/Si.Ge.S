'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book, ArrowLeft, Search, Shield, Calendar, Clock,
  AlertTriangle, CheckCircle2, Info, Filter, Send, Loader2,
  AlertCircle, MessageSquare, Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ─── Tipos de novedad ────────────────────────────────────────────────────────
const ENTRY_TYPES = [
  { id: 'novedad',   label: 'Novedad',   color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-200', icon: Info },
  { id: 'incidente', label: 'Incidente', color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-200', icon: Shield },
  { id: 'emergencia',label: 'Emergencia',color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-200',  icon: AlertTriangle },
  { id: 'ronda',     label: 'Ronda',     color: 'text-emerald-500',bg: 'bg-emerald-500/10',border: 'border-emerald-200', icon: Clock },
] as const;

type EntryTypeId = (typeof ENTRY_TYPES)[number]['id'];

// ─── Helper ──────────────────────────────────────────────────────────────────
const getTypeConfig = (type: string) =>
  ENTRY_TYPES.find((t) => t.id === type) ?? ENTRY_TYPES[0];

// ─── Component ───────────────────────────────────────────────────────────────
export default function GuardBookPage() {
  const { isShiftActive, shiftData, theme } = useShift();
  const { user } = useAuth();

  const objectiveId =
    (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;
  const resourceId  =
    (shiftData as any)?.operator_id  || (shiftData as any)?.resource_id;

  const [entries,      setEntries]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeFilter, setActiveFilter] = useState<EntryTypeId | 'all'>('all');
  const [filterDate,   setFilterDate]   = useState('');

  // ── Form State ──────────────────────────────────────────────────────────
  const [newContent,   setNewContent]   = useState('');
  const [newType,      setNewType]      = useState<EntryTypeId>('novedad');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  // ── Fetch Entries ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!objectiveId) {
      setLoading(false);
      return;
    }

    const fetchEntries = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('guard_book_entries')
          .select('*, resources:operator_id(id, name, role, avatar_url)')
          .eq('objective_id', objectiveId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (filterDate) {
          query = query
            .gte('created_at', `${filterDate}T00:00:00.000Z`)
            .lte('created_at', `${filterDate}T23:59:59.999Z`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setEntries(data || []);
      } catch (err) {
        console.error('[GuardBook] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();

    // Realtime — new entries appear instantly
    const channel = supabase
      .channel(`guard-book-operator-${objectiveId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guard_book_entries',
        filter: `objective_id=eq.${objectiveId}`,
      }, (payload) => {
        setEntries((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [objectiveId, filterDate]);

  // ── Submit new entry ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !objectiveId) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/guard-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective_id: objectiveId,
          resource_id:  resourceId || user?.id,
          entry_type:   newType,
          content:      newContent.trim(),
          urgency:      newType === 'emergencia' ? 'critica' : newType === 'incidente' ? 'alta' : 'normal',
          latitude:     null,
          longitude:    null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }

      setNewContent('');
      // Entry will appear via Realtime subscription — no manual state update needed
    } catch (err: any) {
      setSubmitError(err.message || 'Error al enviar la novedad');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered entries ─────────────────────────────────────────────────────
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = (entry.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === 'all' || entry.entry_type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // ── Not on shift ─────────────────────────────────────────────────────────
  if (!isShiftActive) {
    return (
      <div className={cn(
        'min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-8',
        theme === 'dark' ? 'bg-black' : 'bg-gray-50'
      )}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20 shadow-2xl"
        >
          <Book className="w-12 h-12 text-primary" />
        </motion.div>
        <div className="space-y-3">
          <h2 className={cn('text-2xl font-black uppercase tracking-tighter italic', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
            Acceso Restringido
          </h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
            Debe tener un <span className="text-primary font-bold">turno activo</span> para acceder al Libro de Guardia.
          </p>
        </div>
        <Link href="/operador">
          <Button className="h-14 px-8 uppercase font-black text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20">
            Volver
          </Button>
        </Link>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className={cn(
      'min-h-screen p-5 pb-32 transition-colors duration-500',
      isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'
    )}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operador">
            <button className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90',
              isDark ? 'bg-zinc-900/80 border border-white/5 text-white' : 'bg-white border border-gray-100 text-gray-900'
            )}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className={cn('text-xl font-black uppercase tracking-tighter italic', isDark ? 'text-white' : 'text-gray-900')}>
              Libro de Guardia
            </h1>
            <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">
              Registro de Novedades
            </p>
          </div>
        </div>
        {/* Live indicator */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest',
          isDark ? 'bg-white/5 text-emerald-400' : 'bg-white border border-emerald-100 text-emerald-600'
        )}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          En Vivo
        </div>
      </div>

      <div className="max-w-lg mx-auto space-y-5">

        {/* ── New Entry Form ───────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className={cn(
            'rounded-3xl p-5 space-y-4 border shadow-xl',
            isDark
              ? 'bg-zinc-900/80 border-white/5 shadow-black/40'
              : 'bg-white border-gray-100 shadow-gray-100'
          )}
        >
          <p className={cn('text-[10px] font-black uppercase tracking-[0.25em]', isDark ? 'text-white/30' : 'text-gray-400')}>
            Nueva Novedad
          </p>

          {/* Type selector */}
          <div className="flex gap-2 flex-wrap">
            {ENTRY_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setNewType(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                  newType === t.id
                    ? `${t.bg} ${t.color} ${t.border}`
                    : isDark
                      ? 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'
                      : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                )}
              >
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              required
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Describa la novedad, incidente o situación observada..."
              rows={3}
              className={cn(
                'w-full rounded-2xl p-4 pr-14 text-sm font-medium resize-none transition-all focus:outline-none focus:ring-2',
                isDark
                  ? 'bg-black/40 border border-white/5 text-white placeholder:text-white/20 focus:ring-primary/30'
                  : 'bg-gray-50 border border-gray-100 text-gray-800 placeholder:text-gray-300 focus:ring-primary/20'
              )}
            />
            <button
              type="submit"
              disabled={submitting || !newContent.trim()}
              className={cn(
                'absolute bottom-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                'bg-primary text-black hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/30'
              )}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>

          {submitError && (
            <p className="text-xs font-bold text-red-500 flex items-center gap-2">
              <AlertCircle size={12} /> {submitError}
            </p>
          )}
        </form>

        {/* ── Search, Filter & Date ────────────────────────────── */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar en el historial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full h-12 pl-11 pr-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 transition-all',
                isDark
                  ? 'bg-zinc-900/60 border border-white/5 text-white focus:ring-primary/20'
                  : 'bg-white border border-gray-100 text-gray-900 focus:ring-primary/20'
              )}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Type filter chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border',
                  activeFilter === 'all'
                    ? 'bg-primary text-black border-primary'
                    : isDark ? 'bg-zinc-900/40 text-gray-500 border-white/5' : 'bg-white text-gray-500 border-gray-100'
                )}
              >
                Todos
              </button>
              {ENTRY_TYPES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border',
                    activeFilter === f.id
                      ? `${f.bg} ${f.color} ${f.border}`
                      : isDark ? 'bg-zinc-900/40 text-gray-500 border-white/5' : 'bg-white text-gray-500 border-gray-100'
                  )}
                >
                  <f.icon size={11} />
                  {f.label}
                </button>
              ))}
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-2 ml-auto">
              <Calendar size={13} className={isDark ? 'text-white/30' : 'text-gray-400'} />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={cn(
                  'h-9 px-3 rounded-xl text-[11px] font-black focus:outline-none focus:ring-2 focus:ring-primary/20',
                  isDark
                    ? 'bg-zinc-900/60 border border-white/5 text-white'
                    : 'bg-white border border-gray-100 text-gray-700'
                )}
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="text-[10px] font-black text-gray-400 hover:text-red-400 transition-colors uppercase tracking-widest"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Entries List ─────────────────────────────────────── */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Sincronizando...</p>
            </div>
          ) : filteredEntries.length > 0 ? (
            filteredEntries.map((entry, i) => {
              const typeConfig = getTypeConfig(entry.entry_type);
              const TypeIcon = typeConfig.icon;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.025, 0.3) }}
                >
                  <Card className={cn(
                    'p-5 border-none shadow-xl relative overflow-hidden group',
                    isDark ? 'bg-zinc-900/60 backdrop-blur-md' : 'bg-white'
                  )}>
                    {/* Urgency strip */}
                    <div className={cn(
                      'absolute top-0 left-0 w-1 h-full rounded-l-2xl',
                      entry.entry_type === 'emergencia' ? 'bg-red-500' :
                      entry.entry_type === 'incidente'  ? 'bg-amber-500' :
                      entry.entry_type === 'ronda'      ? 'bg-emerald-500' : 'bg-primary'
                    )} />

                    <div className="pl-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className={cn('p-1.5 rounded-lg shrink-0', typeConfig.bg)}>
                            <TypeIcon size={13} className={typeConfig.color} />
                          </div>
                          <span className={cn(
                            'text-[9px] font-black uppercase tracking-widest',
                            typeConfig.color
                          )}>
                            {entry.entry_type}
                          </span>
                          {entry.resources?.name && (
                            <>
                              <span className={cn('text-[9px]', isDark ? 'text-white/20' : 'text-gray-300')}>·</span>
                              <span className={cn('text-[9px] font-bold uppercase tracking-wide', isDark ? 'text-white/40' : 'text-gray-400')}>
                                {entry.resources.name}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] font-mono text-gray-400">
                            {new Date(entry.created_at).toLocaleDateString('es-AR')}
                          </p>
                          <p className="text-[9px] font-mono text-gray-400">
                            {new Date(entry.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Content */}
                      <p className={cn(
                        'text-sm font-medium leading-relaxed',
                        isDark ? 'text-gray-200' : 'text-gray-800'
                      )}>
                        {entry.content}
                      </p>

                      {/* Resolved badge */}
                      {entry.is_resolved && (
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-2">
                          <CheckCircle2 size={11} className="text-emerald-500" />
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                            Gestionado por Gerencia
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <div className="py-20 text-center space-y-4">
              <MessageSquare size={48} className="text-gray-300 mx-auto opacity-20" />
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest italic">
                {filterDate ? 'Sin novedades para la fecha seleccionada' : 'Sin novedades registradas'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
