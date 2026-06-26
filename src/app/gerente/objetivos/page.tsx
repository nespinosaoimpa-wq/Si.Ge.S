'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Plus, ChevronRight, MapPin, Building2, Phone, X, 
  CheckCircle2, AlertCircle, Clock, Map as MapIcon, Filter, Trash2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isConfigured } from '@/lib/supabase';
import { geocodeForward } from '@/lib/geocoding';

export default function ObjetivosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('Todos');
  
  const [newObjective, setNewObjective] = useState({
    id: '', name: '', address: '', client_name: '', contact_phone: '', status: 'Activo'
  });

  const fetchObjectives = async () => {
    try {
      setLoading(true);
      const data = await api.objectives.list();
      setObjectives(data || []);
    } catch (err) {
      console.error("Error fetching objectives:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchObjectives(); }, []);

  const handleDeleteObjective = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el objetivo "${name}"?`)) return;
    
    // Optimistic update
    const previousObjectives = [...objectives];
    setObjectives(prev => prev.filter(o => o.id !== id));

    try {
      await api.objectives.delete(id);
    } catch (err) {
      setObjectives(previousObjectives); // Rollback
      alert("Error al eliminar: " + (err as any).message);
    }
  };

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Remove manual id and coordinate fetch
      const { id, ...objectiveData } = newObjective;
      
      // Automatic Geocoding
      let coords = { latitude: -31.6107, longitude: -60.6973 }; // Default Si.Ge.S
      try {
        const results = await geocodeForward(objectiveData.address);
        if (results.length > 0) {
          coords.latitude = results[0].lat;
          coords.longitude = results[0].lng;
        }
      } catch (gErr) {
        console.warn("Geocoding failed, using default", gErr);
      }

      await api.objectives.create({
        ...objectiveData,
        ...coords
      });
      setIsModalOpen(false);
      setNewObjective({ id: '', name: '', address: '', client_name: '', contact_phone: '', status: 'Activo' });
      fetchObjectives();
    } catch (err) {
      alert("Error al crear: " + (err as any).message);
    }
  };

  const filteredObjectives = useMemo(() => {
    let list = objectives.filter(o => 
      (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filter === 'Activos') list = list.filter(o => o.status === 'Activo' || o.is_active);
    if (filter === 'Inactivos') list = list.filter(o => o.status !== 'Activo' && !o.is_active);
    return list;
  }, [searchTerm, objectives, filter]);

  const activeCount = objectives.filter(o => o.status === 'Activo' || o.is_active).length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-white border-2 border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm">
                <Building2 size={28} className="text-zinc-950" />
             </div>
             <div>
                <h1 className="text-4xl font-black text-zinc-950 tracking-tighter uppercase">Gestión de Objetivos</h1>
                <div className="flex items-center gap-2 mt-1">
                   <div className={cn("w-2 h-2 rounded-full animate-pulse", isConfigured ? "bg-[#0F4C5C]" : "bg-amber-500")} />
                   <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600">{isConfigured ? 'Sistema Operativo Vivo' : 'Entorno de Demostración'}</span>
                </div>
             </div>
          </div>
          <p className="text-xs font-black text-zinc-600 mt-4 uppercase tracking-widest">{objectives.length} ubicaciones protegidas · {activeCount} activas</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
           <Link href="/gerente" className="flex-1 sm:flex-none">
             <button className="h-12 px-6 flex items-center justify-center gap-3 bg-white border-2 border-zinc-200 rounded-2xl text-xs font-black text-zinc-950 uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm">
               <MapIcon size={18} /> Ver Mapa
             </button>
           </Link>
           <button 
             className="h-12 px-6 flex items-center justify-center gap-3 bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-zinc-900/20" 
             onClick={() => setIsModalOpen(true)}
           >
             <Plus size={18} /> Nuevo Objetivo
           </button>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Nodos', value: objectives.length, icon: MapPin, color: 'text-zinc-700', bg: 'bg-zinc-100' },
          { label: 'Activos', value: activeCount, icon: CheckCircle2, color: 'text-[#0F4C5C]', bg: 'bg-[#0F4C5C]/10' },
          { label: 'Fuerza Operativa', value: '100%', icon: MapIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Alertas Hoy', value: 0, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 sm:p-5 border border-zinc-200 shadow-sm bg-white hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tighter truncate">{stat.value}</p>
                <p className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-600 tracking-widest mt-1 truncate">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o cliente..."
            className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {['Todos', 'Activos', 'Inactivos'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-tight transition-all",
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List Container */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredObjectives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <MapPin size={32} className="text-gray-200" />
            </div>
            <p className="text-base font-bold text-gray-400">No se encontraron objetivos</p>
            <p className="text-sm text-gray-300 mt-1">Intentá ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredObjectives.map((obj, i) => (
              <motion.div
                key={obj.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center gap-4 p-5 hover:bg-gray-50/50 transition-colors"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-gray-50 group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                  <Building2 size={20} className="text-gray-400 group-hover:text-primary transition-colors" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-black text-zinc-950 uppercase tracking-tighter truncate">{obj.name}</p>
                    {obj.is_active && <div className="w-2 h-2 bg-[#0F4C5C] rounded-full" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest truncate">{obj.client_name || 'Sin cliente'}</p>
                    <span className="text-zinc-300">•</span>
                    <p className="text-[10px] text-zinc-600 font-black uppercase truncate tracking-widest">{obj.address || 'Sin dirección'}</p>
                  </div>
                </div>

                {/* Status Column (Desktop) */}
                <div className="hidden sm:flex flex-col items-end gap-1 px-4">
                   <p className="text-[10px] font-black uppercase text-gray-300">Estado del Nodo</p>
                   <div className={cn(
                     "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                     (obj.status === 'Activo' || obj.is_active) ? "bg-green-50 text-green-600 border border-green-100" : "bg-gray-100 text-gray-500"
                   )}>
                     {obj.status || (obj.is_active ? 'Activo' : 'Inactivo')}
                   </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDeleteObjective(obj.id, obj.name)}
                    className="p-3 hover:bg-red-50 rounded-xl transition-all group/del"
                  >
                    <Trash2 size={18} className="text-zinc-300 group-hover/del:text-red-500 transition-colors" />
                  </button>
                  <Link href={`/gerente/objetivos/${obj.id}`}>
                    <button className="p-3 hover:bg-zinc-50 rounded-xl shadow-none hover:shadow-sm border border-transparent hover:border-zinc-200 transition-all">
                      <ChevronRight size={18} className="text-zinc-300 group-hover:text-[#0F4C5C]" />
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* New Objective Modal */}
      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Objetivo Operativo">
        <form onSubmit={handleCreateObjective} className="space-y-4 pb-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider ml-1">Nombre del Lugar</label>
                <Input required placeholder="Ej: Edificio Central" value={newObjective.name}
                  onChange={e => setNewObjective({...newObjective, name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider ml-1">Cliente / Cuenta</label>
                <Input required placeholder="Ej: Banco Galicia" value={newObjective.client_name}
                  onChange={e => setNewObjective({...newObjective, client_name: e.target.value})} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider ml-1">Dirección Física</label>
                <Input required placeholder="Ej: Av. Alem 1234, Si.Ge.S" value={newObjective.address}
                  onChange={e => setNewObjective({...newObjective, address: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider ml-1">Teléfono Directo</label>
                <Input placeholder="+54 342 555-0100" value={newObjective.contact_phone}
                  onChange={e => setNewObjective({...newObjective, contact_phone: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider ml-1">Estado Inicial</label>
                <select 
                   value={newObjective.status}
                   onChange={e => setNewObjective({...newObjective, status: e.target.value})}
                   className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-gray-50 focus:bg-white transition-colors"
                >
                   <option value="Activo">ACTIVO / OPERATIVO</option>
                   <option value="Inactivo">INACTIVO / SUSPENDIDO</option>
                </select>
              </div>
           </div>
           
           <div className="bg-amber-50 p-4 border border-amber-100 rounded-2xl flex gap-3 mt-4">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Al crear el objetivo de forma manual desde esta lista, las coordenadas geográficas deberán ser ajustadas posteriormente desde la herramienta de Mapa para habilitar el control de proximidad (Geofencing).
              </p>
           </div>

           <div className="flex gap-4 pt-6">
             <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>
               Cancelar
             </Button>
             <Button type="submit" variant="primary" className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/20">
               Guardar Nodo
             </Button>
           </div>
        </form>
      </BottomSheet>
    </div>
  );
}
