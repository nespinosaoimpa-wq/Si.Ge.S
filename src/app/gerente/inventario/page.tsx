'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Search, Plus, Shield, Zap, 
  AlertTriangle, Filter, Smartphone, Camera, Lightbulb, 
  Activity, MoreVertical, Trash2, Edit3, MapPin, 
  CheckCircle2, Clock, Box, Home, Car, Bike
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { supabase } from '@/lib/supabase';

// Categorías configuradas según requerimiento
const assetCategories = [
  { id: 'linterna', name: 'Linternas', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'radio', name: 'Radios', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'chaleco', name: 'Chalecos', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'celular', name: 'Celulares', icon: Smartphone, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'detector_metales', name: 'Det. Metales', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'camara_seguridad', name: 'Cámaras', icon: Camera, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'reflector', name: 'Reflectores', icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { id: 'garita', name: 'Garitas', icon: Home, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'vehiculo', name: 'Vehículos', icon: Car, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { id: 'moto', name: 'Motos', icon: Bike, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'otros', name: 'Otros', icon: Package, color: 'text-zinc-400', bg: 'bg-zinc-50' },
];

export default function InventarioHub() {
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    item_name: '',
    category: 'linterna',
    serial_number: '',
    status: 'operativo',
    objective_id: '',
    notes: '',
    quantity: 1
  });

  // Edit and Sort states
  const [selectedEditItem, setSelectedEditItem] = useState<any | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('recent');

  useEffect(() => {
    fetchInventory();
    fetchObjectives();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      if (data && data.length > 0) {
        const objectiveIds = [...new Set(data.map((i: any) => i.objective_id).filter(Boolean))];
        if (objectiveIds.length > 0) {
          const { data: objData } = await supabase.from('objectives').select('id, name').in('id', objectiveIds);
          const objMap = Object.fromEntries(objData?.map(o => [o.id, o.name]) || []);
          const itemsWithObj = data.map((i: any) => ({ 
            ...i, 
            objectives: i.objective_id ? { name: objMap[i.objective_id] || 'Desconocido' } : null 
          }));
          setItems(itemsWithObj);
        } else {
          setItems(data);
        }
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchObjectives = async () => {
    try {
      const { data } = await supabase.from('objectives').select('id, name').eq('is_active', true);
      if (data) setObjectives(data);
    } catch (e) {}
  };

  const handleCreate = async () => {
    if (!newItem.item_name) return;
    try {
      setLoading(true);
      const targetObjId = (newItem.objective_id && newItem.objective_id.trim() !== '' && newItem.objective_id !== 'null') ? newItem.objective_id : null;
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: newItem.item_name,
          category: newItem.category,
          serial_number: newItem.serial_number || null,
          status: newItem.status,
          objective_id: targetObjId,
          notes: newItem.notes || null,
          quantity: newItem.quantity || 1
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn('[INVENTORY] API returned error, retrying direct DB insert fallback:', result.error);
        const { error: dbError } = await supabase.from('resource_inventory').insert({
          item_name: newItem.item_name,
          serial_number: newItem.serial_number || null,
          status: newItem.status || 'operativo',
          objective_id: targetObjId
        });
        if (dbError) throw dbError;
      }
      
      setIsSheetOpen(false);
      setNewItem({ item_name: '', category: 'linterna', serial_number: '', status: 'operativo', objective_id: '', notes: '', quantity: 1 });
      await fetchInventory();
    } catch (e: any) {
      console.error('Error creating item:', e);
      alert('Error al guardar: ' + (e?.message || 'Intente nuevamente'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" del inventario? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { error } = await supabase.from('resource_inventory').delete().eq('id', id);
        if (error) throw error;
      }
      fetchInventory();
    } catch (e: any) {
      console.error('Error deleting item:', e);
      alert('Error al eliminar: ' + (e?.message || 'Intente nuevamente'));
    }
  };

  const handleAssignObjective = async (itemId: string, objId: string) => {
    try {
      const targetObjId = objId || null;
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, objective_id: targetObjId }),
      });

      let hasError = !res.ok;
      let errorText = '';
      if (hasError) {
        try {
          const r = await res.json();
          errorText = r.error || `HTTP ${res.status}`;
        } catch (e) {
          errorText = `HTTP ${res.status}`;
        }
      }

      if (hasError) {
        // Direct Supabase Client fallback
        const { error } = await supabase
          .from('resource_inventory')
          .update({ objective_id: targetObjId })
          .eq('id', itemId);
        if (error) throw new Error(errorText || error.message);
      }

      fetchInventory();
    } catch (e: any) {
      console.error('Error assigning objective:', e);
      alert('Error al asignar: ' + (e?.message || 'Intente nuevamente'));
    }
  };

  const handleUpdateItem = async () => {
    if (!selectedEditItem || !selectedEditItem.item_name) return;
    try {
      setLoading(true);
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEditItem.id,
          item_name: selectedEditItem.item_name,
          category: selectedEditItem.category,
          serial_number: selectedEditItem.serial_number || null,
          status: selectedEditItem.status,
          objective_id: selectedEditItem.objective_id || null,
          notes: selectedEditItem.notes || null,
        }),
      });

      let hasError = !res.ok;
      if (hasError) {
        const { error } = await supabase
          .from('resource_inventory')
          .update({
            item_name: selectedEditItem.item_name,
            category: selectedEditItem.category,
            serial_number: selectedEditItem.serial_number || null,
            status: selectedEditItem.status,
            objective_id: selectedEditItem.objective_id || null,
          })
          .eq('id', selectedEditItem.id);
        if (error) throw error;
      }

      setIsEditSheetOpen(false);
      setSelectedEditItem(null);
      await fetchInventory();
    } catch (e: any) {
      console.error('Error updating item:', e);
      alert('Error al actualizar: ' + (e?.message || 'Intente nuevamente'));
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (id: string, newCondition: string) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newCondition }),
      });

      if (!res.ok) {
        const { error } = await supabase
          .from('resource_inventory')
          .update({ status: newCondition })
          .eq('id', id);
        if (error) throw error;
      }

      fetchInventory();
    } catch (e: any) {
      console.error(e);
      alert('Error al actualizar: ' + (e?.message || 'Intente nuevamente'));
    }
  };

  const filteredItems = useMemo(() => {
    const filtered = items.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.serial_number && item.serial_number.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Apply sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (sortBy === 'name_asc') {
        return a.item_name.localeCompare(b.item_name);
      }
      if (sortBy === 'name_desc') {
        return b.item_name.localeCompare(a.item_name);
      }
      if (sortBy === 'serial_asc') {
        const sA = a.serial_number || '';
        const sB = b.serial_number || '';
        if (!sA && sB) return 1;
        if (sA && !sB) return -1;
        return sA.localeCompare(sB);
      }
      if (sortBy === 'serial_desc') {
        const sA = a.serial_number || '';
        const sB = b.serial_number || '';
        if (!sA && sB) return 1;
        if (sA && !sB) return -1;
        return sB.localeCompare(sA);
      }
      return 0;
    });
  }, [items, search, categoryFilter, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total: items.length,
    operativo: items.filter(i => i.status === 'operativo').length,
    problemas: items.filter(i => i.status === 'roto' || i.status === 'mantenimiento').length,
    asignados: items.filter(i => i.objective_id).length
  }), [items]);

  // Stock agrupado por categoría para el panel de resumen por rubro
  const stockByCategory = useMemo(() => {
    return assetCategories.map(cat => ({
      ...cat,
      total: items.filter(i => i.category === cat.id).length,
      operativo: items.filter(i => i.category === cat.id && i.status === 'operativo').length,
    })).filter(cat => cat.total > 0);
  }, [items]);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-zinc-50">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-zinc-900 border border-zinc-200">
               <Box size={24} />
            </div>
            <h1 className="text-4xl font-black text-zinc-950 tracking-tighter uppercase">Recursos Logísticos</h1>
          </div>
          <p className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-16">
            Gestión patrimonial de activos, armamento y equipamiento
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            className="flex-1 md:flex-none h-14 px-8 rounded-2xl bg-zinc-900 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-zinc-900/20 hover:bg-black transition-all active:scale-95 flex items-center justify-center"
            onClick={() => setIsSheetOpen(true)}
          >
            <Plus size={18} className="mr-3" />
            Nuevo Elemento
          </button>
        </div>
      </div>

      {/* Hero Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Activos', value: stats.total, icon: Package, color: 'text-zinc-900', bg: 'bg-white' },
          { label: 'En Operación', value: stats.operativo, icon: CheckCircle2, color: 'text-[#0F4C5C]', bg: 'bg-[#0F4C5C]/5' },
          { label: 'Con Reportes', value: stats.problemas, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Asignados', value: stats.asignados, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn("bg-white border border-zinc-200 shadow-sm rounded-3xl p-6 flex items-center gap-5 group hover:border-zinc-300 transition-all", stat.bg)}
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", stat.bg === 'bg-white' ? 'bg-zinc-50' : 'bg-white/50')}>
              <stat.icon size={28} className={stat.color} />
            </div>
            <div>
              <p className="text-3xl font-black text-zinc-950 leading-none mb-1">{stat.value}</p>
              <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Panel: Stock por Rubro */}
      {stockByCategory.length > 0 && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-[2rem] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-zinc-100 rounded-xl flex items-center justify-center">
              <Package size={16} className="text-zinc-600" />
            </div>
            <h2 className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.25em]">Stock por Rubro</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            {stockByCategory.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                  categoryFilter === cat.id
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-100 bg-zinc-50 hover:border-zinc-300'
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', categoryFilter === cat.id ? 'bg-white/10' : cat.bg)}>
                  <cat.icon size={20} className={categoryFilter === cat.id ? 'text-white' : cat.color} />
                </div>
                <p className={cn('text-2xl font-black leading-none', categoryFilter === cat.id ? 'text-white' : 'text-zinc-900')}>{cat.total}</p>
                <p className={cn('text-[9px] font-black uppercase tracking-wider text-center leading-tight', categoryFilter === cat.id ? 'text-zinc-300' : 'text-zinc-500')}>{cat.name}</p>
                {cat.operativo < cat.total && (
                  <span className="text-[8px] font-black text-amber-500 uppercase">{cat.total - cat.operativo} c/falla</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white border border-zinc-200 shadow-sm p-5 rounded-[2rem] flex flex-col lg:flex-row gap-5">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
          <input 
            placeholder="BUSCAR POR NOMBRE, MODELO O NÚMERO DE SERIE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 pl-14 pr-6 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-black text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 transition-all uppercase tracking-widest"
          />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
          <select 
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-14 px-8 bg-white border-2 border-zinc-200 rounded-2xl text-[10px] font-black uppercase text-zinc-900 tracking-widest focus:border-[#0F4C5C] focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">TODAS LAS CATEGORÍAS</option>
            {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-14 px-8 bg-white border-2 border-zinc-200 rounded-2xl text-[10px] font-black uppercase text-zinc-900 tracking-widest focus:border-[#0F4C5C] focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">TODOS LOS ESTADOS</option>
            <option value="operativo">OPERATIVO</option>
            <option value="mantenimiento">EN REPARACIÓN</option>
            <option value="roto">FUERA DE SERVICIO</option>
            <option value="faltante">EXTRAVIADO</option>
          </select>
          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="h-14 px-8 bg-white border-2 border-zinc-200 rounded-2xl text-[10px] font-black uppercase text-zinc-900 tracking-widest focus:border-[#0F4C5C] focus:outline-none transition-all cursor-pointer"
          >
            <option value="recent">ORDEN: MÁS RECIENTES</option>
            <option value="oldest">ORDEN: MÁS ANTIGUOS</option>
            <option value="name_asc">ORDEN: NOMBRE (A-Z)</option>
            <option value="name_desc">ORDEN: NOMBRE (Z-A)</option>
            <option value="serial_asc">ORDEN: Nº SERIE (A-Z)</option>
            <option value="serial_desc">ORDEN: Nº SERIE (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Main Grid/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Sincronizando inventario...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full py-32 text-center bg-zinc-50 rounded-[3rem] border border-dashed border-zinc-200">
               <Package size={64} className="text-zinc-200 mx-auto mb-4" />
               <p className="text-lg font-black text-zinc-600 uppercase">Sin registros en el radar</p>
               <p className="text-sm text-zinc-500 mt-1 uppercase font-black tracking-tight">No se detectaron activos con los parámetros de búsqueda actuales</p>
            </div>
          ) : (
            filteredItems.map((item, i) => {
              const cat = assetCategories.find(c => c.id === item.category) || assetCategories[5];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-none shadow-sm hover:shadow-xl transition-all group bg-white rounded-[2rem] overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", cat.bg, cat.color)}>
                          <cat.icon size={24} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            item.status === 'operativo' ? "bg-green-50 text-green-600" : 
                            item.status === 'roto' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 mb-6">
                        <h3 className="text-lg font-black text-zinc-950 uppercase leading-none truncate group-hover:text-[#0F4C5C] transition-colors tracking-tight">
                          {item.item_name}
                        </h3>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{cat.name}</p>
                      </div>

                      <div className="bg-zinc-50 rounded-2xl p-4 space-y-3 mb-6 border border-zinc-100">
                        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-tight">
                          <span className="text-zinc-600">Nº de Serie:</span>
                          <span className="text-zinc-950 font-mono">{item.serial_number || 'S/N'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-tight">
                          <span className="text-zinc-600">Ubicación:</span>
                          <span className={cn("flex items-center gap-1", item.objective_id ? "text-blue-600" : "text-[#0F4C5C]")}>
                            {item.objective_id ? <Shield size={12} /> : <Box size={12} />}
                            {item.objectives?.name || 'DEPÓSITO CENTRAL'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button 
                            className="flex-1 h-10 rounded-xl text-[9px] font-black uppercase border-2 border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50 transition-all flex items-center justify-center"
                            onClick={() => updateItemStatus(item.id, item.status === 'operativo' ? 'roto' : 'operativo')}
                          >
                            <Activity size={12} className="mr-1.5" />
                            {item.status === 'operativo' ? 'Reportar Falla' : 'Restaurar'}
                          </button>
                          <button 
                            className="w-10 h-10 p-0 rounded-xl text-zinc-300 hover:text-zinc-900 hover:bg-zinc-100 transition-all flex items-center justify-center border border-zinc-100 bg-white" 
                            onClick={() => {
                              setSelectedEditItem({
                                id: item.id,
                                item_name: item.item_name,
                                category: item.category,
                                serial_number: item.serial_number || '',
                                status: item.status,
                                objective_id: item.objective_id || '',
                                notes: item.notes || ''
                              });
                              setIsEditSheetOpen(true);
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button className="w-10 h-10 p-0 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-zinc-100 bg-white" onClick={() => handleDelete(item.id, item.item_name)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <select
                          className="w-full h-9 rounded-xl bg-gray-50 border border-gray-100 text-[9px] font-bold uppercase text-gray-600 px-3 cursor-pointer"
                          value={item.objective_id || ''}
                          onChange={(e) => handleAssignObjective(item.id, e.target.value)}
                        >
                          <option value="">[ DEPÓSITO CENTRAL ]</option>
                          {objectives.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* New Asset BottomSheet */}
      <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Alta de Activo Operativo">
        <div className="space-y-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Nombre / Modelo *</label>
              <Input 
                value={newItem.item_name} 
                onChange={e => setNewItem({...newItem, item_name: e.target.value})}
                placeholder="Ej. Linterna Maglite ML300L"
                className="h-14 rounded-2xl bg-gray-50 border-none shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Categoría del Equipo *</label>
              <select 
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
                className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 text-xs font-bold uppercase text-gray-700 focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Nº de Serie / Identificador</label>
              <Input 
                value={newItem.serial_number} 
                onChange={e => setNewItem({...newItem, serial_number: e.target.value})}
                placeholder="SN-XXXXX"
                className="h-14 rounded-2xl bg-gray-50 border-none shadow-inner font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Objetivo de Asignación</label>
              <select 
                value={newItem.objective_id}
                onChange={e => setNewItem({...newItem, objective_id: e.target.value})}
                className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 text-xs font-bold uppercase text-gray-700 focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">[ DEPÓSITO CENTRAL ]</option>
                {objectives.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Cantidad (Unidades a Generar) *</label>
              <Input 
                type="number"
                min="1"
                max="100"
                value={newItem.quantity} 
                onChange={e => setNewItem({...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                placeholder="1"
                className="h-14 rounded-2xl bg-gray-50 border-none shadow-inner text-lg font-black text-center"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Condición Inicial</label>
            <div className="grid grid-cols-3 gap-2">
              {['operativo', 'mantenimiento', 'roto'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewItem({...newItem, status: c})}
                  className={cn(
                    "h-12 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all",
                    newItem.status === c ? "bg-gray-900 text-white shadow-lg" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-3xl flex gap-4 border border-blue-100">
             <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Box size={20} />
             </div>
             <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
               Este activo será registrado en el sistema central y aparecerá disponible para los reportes de entrega de puesto en el objetivo seleccionado.
             </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              className="flex-1 h-14 rounded-2xl bg-primary text-black font-black uppercase shadow-xl shadow-primary/20" 
              onClick={handleCreate}
              disabled={!newItem.item_name || loading}
            >
              {loading ? 'Sincronizando...' : 'Registrar Activo'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Edit Asset BottomSheet */}
      <BottomSheet isOpen={isEditSheetOpen} onClose={() => { setIsEditSheetOpen(false); setSelectedEditItem(null); }} title="Editar Activo Operativo">
        {selectedEditItem && (
          <div className="space-y-6 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Nombre / Modelo *</label>
                <Input 
                  value={selectedEditItem.item_name} 
                  onChange={e => setSelectedEditItem({...selectedEditItem, item_name: e.target.value})}
                  placeholder="Ej. Linterna Maglite ML300L"
                  className="h-14 rounded-2xl bg-gray-50 border-none shadow-inner"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Categoría del Equipo *</label>
                <select 
                  value={selectedEditItem.category}
                  onChange={e => setSelectedEditItem({...selectedEditItem, category: e.target.value})}
                  className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 text-xs font-bold uppercase text-gray-700 focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Nº de Serie / Identificador</label>
                <Input 
                  value={selectedEditItem.serial_number} 
                  onChange={e => setSelectedEditItem({...selectedEditItem, serial_number: e.target.value})}
                  placeholder="SN-XXXXX"
                  className="h-14 rounded-2xl bg-gray-50 border-none shadow-inner font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Objetivo de Asignación</label>
                <select 
                  value={selectedEditItem.objective_id}
                  onChange={e => setSelectedEditItem({...selectedEditItem, objective_id: e.target.value})}
                  className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 text-xs font-bold uppercase text-gray-700 focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">[ DEPÓSITO CENTRAL ]</option>
                  {objectives.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Notas / Observaciones</label>
                <textarea 
                  value={selectedEditItem.notes || ''} 
                  onChange={e => setSelectedEditItem({...selectedEditItem, notes: e.target.value})}
                  placeholder="Detalles sobre el estado actual, accesorios incluidos o historial..."
                  className="w-full h-24 p-4 rounded-2xl bg-gray-50 border-none shadow-inner text-xs font-medium text-gray-700 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Condición Actual</label>
              <div className="grid grid-cols-4 gap-2">
                {['operativo', 'mantenimiento', 'roto', 'faltante'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedEditItem({...selectedEditItem, status: c})}
                    className={cn(
                      "h-12 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all",
                      selectedEditItem.status === c ? "bg-gray-900 text-white shadow-lg" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    )}
                  >
                    {c === 'mantenimiento' ? 'reparación' : c === 'roto' ? 'fuera serv.' : c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                className="flex-1 h-14 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black uppercase shadow-xl" 
                onClick={handleUpdateItem}
                disabled={!selectedEditItem.item_name || loading}
              >
                {loading ? 'Actualizando...' : 'Guardar Cambios'}
              </Button>
              <Button 
                type="button"
                className="h-14 px-6 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black uppercase" 
                onClick={() => { setIsEditSheetOpen(false); setSelectedEditItem(null); }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
