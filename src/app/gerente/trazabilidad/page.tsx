'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Map as MapIcon, 
  Search, 
  Filter, 
  Calendar, 
  ChevronRight, 
  User, 
  Clock, 
  AlertCircle,
  Activity,
  History,
  FileSearch,
  ArrowLeft,
  Flame
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import RoutePlayback from '@/components/gerente/RoutePlayback';
import StayHeatmap from '@/components/gerente/StayHeatmap';
import Link from 'next/link';

export default function TrazabilidadForense() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [tracePoints, setTracePoints] = useState<any[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'route' | 'heatmap'>('route');

  useEffect(() => {
    fetchRounds();
  }, []);

  const fetchRounds = async () => {
    setLoadingRounds(true);
    try {
      const { data, error } = await supabase
        .from('patrol_rounds')
        .select(`
          *,
          objectives(name),
          resources(name)
        `)
        .order('round_start', { ascending: false })
        .limit(20);
      
      if (data) setRounds(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRounds(false);
    }
  };

  const fetchTrace = async (roundId: string) => {
    setLoadingTrace(true);
    try {
      const { data, error } = await supabase
        .from('patrol_trace')
        .select('*')
        .eq('round_id', roundId)
        .order('created_at', { ascending: true });
      
      if (data) setTracePoints(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTrace(false);
    }
  };

  const handleSelectRound = (round: any) => {
    setSelectedRound(round);
    fetchTrace(round.id);
  };

  const filteredRounds = rounds.filter(r => 
    (r.objectives?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.resources?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black p-8 space-y-10">
      
      {/* 1. SPECTACULAR HEADER */}
      <div className="flex justify-between items-end relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <Link href="/gerente">
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white">
                    <ArrowLeft size={18} />
                </Button>
             </Link>
             <div className="h-[2px] w-12 bg-primary/40" />
             <span className="text-[11px] text-primary uppercase font-black tracking-[0.4em]">Forensic Traceability Network</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter shadow-sm">
            HISTORIAL <span className="text-primary italic">DE RUTAS</span>
          </h1>
          <p className="text-zinc-500 text-[10px] tracking-[0.3em] font-mono italic uppercase">Audit Compliance Module V.Si.Ge.S</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10 h-[calc(100vh-250px)]">
        
        {/* LEFT: ROUNDS LIST (40%) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="BUSCAR PATRULLA U OPERATIVO..." 
                className="w-full pl-12 h-14 bg-white/5 border border-white/10 rounded-2xl text-[10px] text-white uppercase tracking-widest focus:border-primary/50 outline-none transition-all shadow-2xl" 
              />
           </div>

           <Card className="flex-1 liquid-glass border-white/5 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                 <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <History size={14} className="text-primary" /> RONDINES RECIENTES
                 </h4>
                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-600">
                    <Filter size={14} />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                 {loadingRounds ? (
                    Array.from({ length: 5 }).map((_, i) => (
                       <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />
                    ))
                 ) : filteredRounds.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 opacity-50">
                       <FileSearch size={48} />
                       <p className="text-[10px] font-black uppercase tracking-widest text-center">No se encontraron <br/>registros tácticos</p>
                    </div>
                 ) : filteredRounds.map((round) => (
                    <motion.div
                      key={round.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleSelectRound(round)}
                      className={cn(
                        "p-6 rounded-[2.5rem] border cursor-pointer transition-all group",
                        selectedRound?.id === round.id 
                          ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/5" 
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                      )}
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                            selectedRound?.id === round.id ? "bg-primary text-black" : "bg-white/5 text-zinc-500 group-hover:text-primary"
                          )}>
                             <MapIcon size={20} />
                          </div>
                          <span className="text-[9px] font-mono font-black text-zinc-500">
                             {new Date(round.round_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                       <div>
                          <p className={cn("text-xs font-black uppercase tracking-tight truncate", selectedRound?.id === round.id ? "text-primary" : "text-white group-hover:text-primary transition-all")}>
                            {round.objectives?.name || 'Objetivo Desconocido'}
                          </p>
                          <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1 flex items-center gap-2">
                             <User size={10} /> {round.resources?.name || 'Sin Nombre'}
                          </p>
                       </div>
                    </motion.div>
                 ))}
              </div>
           </Card>
        </div>

        {/* RIGHT: MAP PLAYBACK (60%) */}
        <div className="col-span-12 lg:col-span-8 relative">
           <AnimatePresence mode="wait">
              {selectedRound ? (
                  <motion.div 
                    key="map-visible"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full h-full flex flex-col"
                  >
                    {/* View Toggle Tabs */}
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                      <button
                        onClick={() => setViewMode('route')}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                          viewMode === 'route'
                            ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                            : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:text-white'
                        )}
                      >
                        <MapIcon size={14} /> Ruta
                      </button>
                      <button
                        onClick={() => setViewMode('heatmap')}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                          viewMode === 'heatmap'
                            ? 'bg-orange-400/10 border-orange-400/30 text-orange-400'
                            : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:text-white'
                        )}
                      >
                        <Flame size={14} /> Heatmap
                      </button>
                    </div>

                    {/* Map Content */}
                    <div className="flex-1 relative min-h-0">
                      {viewMode === 'route' ? (
                        <RoutePlayback 
                          points={tracePoints} 
                          roundData={{
                            resource_name: selectedRound.resources?.name,
                            round_start: selectedRound.round_start
                          }}
                        />
                      ) : (
                        <StayHeatmap
                          roundId={selectedRound.id}
                          tracePoints={tracePoints}
                        />
                      )}
                    </div>
                    
                    {loadingTrace && (
                       <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-6">
                          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">Analizando Trazas Forenses...</p>
                       </div>
                    )}

                    {!loadingTrace && tracePoints.length === 0 && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12 text-center space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                <AlertCircle className="text-red-500" size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-white uppercase italic">Sin Datos de Trayectoria</h3>
                                <p className="text-zinc-500 text-xs max-w-xs mx-auto leading-relaxed uppercase font-bold tracking-widest">
                                    No se encontraron puntos de alta frecuencia para esta ronda. Es posible que el operador no tuviera el modo de rastreo activo.
                                </p>
                            </div>
                        </div>
                    )}
                 </motion.div>
              ) : (
                 <motion.div 
                    key="map-placeholder"
                    className="w-full h-full liquid-glass border-white/5 rounded-[4rem] flex flex-col items-center justify-center p-20 text-center space-y-10 shadow-2xl"
                 >
                    <div className="relative">
                       <div className="w-40 h-40 bg-primary/5 rounded-[4rem] flex items-center justify-center border border-primary/10 shadow-inner">
                          <Activity className="text-primary/20 w-20 h-20" />
                       </div>
                       <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full animate-pulse pointer-events-none" />
                    </div>
                    <div className="space-y-4">
                       <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Seleccione una <span className="text-primary italic">Patrulla</span></h2>
                       <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">
                          Haga clic en un registro de la izquierda para reconstruir la ruta táctica y auditar la precisión del GPS.
                       </p>
                    </div>
                 </motion.div>
              )}
           </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
