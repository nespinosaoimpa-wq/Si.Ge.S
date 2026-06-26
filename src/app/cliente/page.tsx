'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  HelpCircle, 
  Wrench, 
  Search, 
  Star, 
  ChevronRight,
  Clock,
  CheckCircle2,
  Map as MapIcon,
  Navigation,
  Globe,
  Activity
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

const MobileLeaflet = dynamic(() => import('@/components/operador/MobileLeaflet'), { ssr: false });

const categories = [
  { id: 'emergencia', name: 'EMERGENCIA', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  { id: 'asistencia', name: 'ASISTENCIA', icon: HelpCircle, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  { id: 'mantenimiento', name: 'MANTENIMIENTO', icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 'anomalia', name: 'ANOMALÍA', icon: Search, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
];

const mockTickets = [
  { id: '#4512', category: 'Seguridad', status: 'En Camino', time: '14:20', date: 'HOY' },
  { id: '#4498', category: 'Asistencia', status: 'Resuelto', time: 'Ayer', date: '30 MAR', solved: true },
];

export default function ClienteHome() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [showMap, setShowMap] = useState(false);

  const handleCreateTicket = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      await api.tickets.create({
        client_id: '550e8400-e29b-41d4-a716-446655440002', // Placeholder
        category: selectedCategory.toLowerCase(),
        subject: `Solicitud de ${selectedCategory}`,
        description: description || 'Generado desde interfaz rápida V.I.P.',
        priority: selectedCategory === 'EMERGENCIA' ? 'critica' : 'media'
      });
      setSelectedCategory(null);
      setDescription('');
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24 bg-[#0a0a0a] min-h-screen text-white">
      
      {/* Status Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <p className="text-[10px] text-primary uppercase tracking-[0.4em] font-display mb-1">Status Operativo</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">Integridad<br/>Blindada</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono italic">Protección Activa 24/7</span>
          </div>
        </div>
        
        {/* Integrity Gauge */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="48" cy="48" r="40" stroke="rgba(255,215,0,0.05)" strokeWidth="6" fill="none" />
            <motion.circle 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 0.98 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="none" 
              className="text-primary"
              strokeDasharray="251.2"
              strokeDashoffset="0"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black font-mono">98</span>
            <span className="text-[7px] uppercase font-bold text-gray-500">Integrity</span>
          </div>
        </div>
      </div>

      {/* Coverage Map */}
      <Card className="border-primary/20 bg-primary/5 overflow-hidden group">
        <div 
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setShowMap(!showMap)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-black/40 border border-primary/20 flex items-center justify-center group-hover:border-primary/50 transition-colors">
              <Globe size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Cobertura Satelital</p>
              <p className="text-[9px] text-gray-500 uppercase">2 Unidades patrullando su zona</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-[9px] tracking-widest uppercase">
            {showMap ? 'OCULTAR MAPA' : 'VER EN VIVO'}
          </Button>
        </div>
        <AnimatePresence>
          {showMap && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 300 }}
              exit={{ height: 0 }}
              className="relative border-t border-primary/10"
            >
              <MobileLeaflet 
                currentPosition={[-31.6107, -60.6973]} 
                destinations={[
                  { id: 'HQ', name: 'Su Ubicación', position: [-31.6107, -60.6973] }
                ]}
              />
              <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md p-2 rounded-sm border border-primary/30 z-10">
                <p className="text-[8px] font-mono text-primary uppercase flex items-center gap-1">
                  <Navigation size={8} /> Syncing
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Grid Actions */}
      <div className="grid grid-cols-2 gap-4">
        {categories.map((cat) => (
          <motion.div
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <Card className={cn(
              "p-6 h-36 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden group",
              cat.bg, cat.border,
              selectedCategory === cat.id ? "ring-[1.5px] ring-primary border-primary shadow-[0_0_20px_rgba(255,215,0,0.1)]" : ""
            )}>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/5 blur-xl group-hover:bg-white/10 transition-colors" />
              <cat.icon className={cn(cat.color, "transition-transform group-hover:scale-110")} size={28} />
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white leading-tight block">
                  {cat.name}
                </span>
                <p className="text-[8px] text-gray-500 uppercase tracking-tighter">Respuesta inmediata</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Selected Action Details */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <Card className="border-primary/40 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-primary uppercase font-black tracking-widest flex items-center gap-2">
                    <Clock size={14} className="animate-pulse" /> Solicitud Crítica: {selectedCategory}
                  </p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedCategory(null)}>
                    <AlertCircle size={14} />
                  </Button>
                </div>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-28 bg-black/40 border border-primary/10 p-4 text-sm text-white focus:outline-none focus:border-primary/40 mb-4 transition-all focus:bg-black/60 font-mono text-[11px]"
                  placeholder="ESPECIFIQUE DETALLES PARA LA CENTRAL DE OPERACIONES..."
                />
                <div className="flex gap-2">
                  <Button 
                    variant="tactical"
                    className="flex-1 h-14 text-sm tracking-[0.3em]" 
                    onClick={handleCreateTicket}
                    disabled={loading}
                  >
                    {loading ? 'TRANSMITIENDO...' : 'TRANSMITIR SOLICITUD'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Historial */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-3 h-3 text-primary" /> Historial de Asistencia
          </h3>
          <button className="text-primary text-[10px] uppercase font-bold tracking-widest hover:underline focus:outline-none transition-all">Ver Histórico</button>
        </div>
        
        <div className="space-y-3">
          {mockTickets.map((ticket, i) => (
            <Card key={i} className="group hover:border-primary/30 transition-all border-white/5 bg-zinc-900/40 cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-sm border transition-all",
                    ticket.solved ? "bg-green-500/5 text-green-500 border-green-500/20" : "bg-primary/5 text-primary border-primary/20 animate-pulse"
                  )}>
                    {ticket.solved ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-600 font-mono font-bold tracking-tighter">{ticket.id}</span>
                      <span className="text-xs font-black uppercase text-white tracking-widest">{ticket.category}</span>
                    </div>
                    <p className={cn(
                      "text-[10px] uppercase tracking-[0.15em] font-black mt-0.5",
                      ticket.solved ? "text-green-500/80" : "text-primary shadow-[0_0_10px_rgba(255,215,0,0.2)]"
                    )}>
                      {ticket.status}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-[10px] text-white font-mono font-bold tracking-widest">{ticket.time}</p>
                    <p className="text-[8px] text-gray-600 uppercase font-black">{ticket.date}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-800 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
