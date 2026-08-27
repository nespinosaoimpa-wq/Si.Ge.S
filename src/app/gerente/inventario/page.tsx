'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Search, Plus, Shield, Zap, 
  AlertTriangle, Filter, Smartphone, Camera, Lightbulb, 
  Activity, MoreVertical, Trash2, Edit3, MapPin, 
  CheckCircle2, Clock, Box, Home, Car, Bike, UserCheck, User
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
  { id: 'radio', name: 'Radios HT', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'chaleco', name: 'Chalecos Balísticos', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'celular', name: 'Celulares / Tablets', icon: Smartphone, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'detector_metales', name: 'Det. Metales', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'camara_seguridad', name: 'Cámaras Bodycam', icon: Camera, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'reflector', name: 'Reflectores', icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { id: 'garita', name: 'Garitas / Casetas', icon: Home, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'vehiculo', name: 'Vehículos / Patrullas', icon: Car, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { id: 'moto', name: 'Motos', icon: Bike, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'armamento', name: 'Armamento / Munición', icon: Shield, color: 'text-red-700', bg: 'bg-red-100' },
  { id: 'otros', name: 'Otros Activos', icon: Package, color: 'text-zinc-400', bg: 'bg-zinc-50' },
];

export default function InventarioHub() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const [newItem, setNewItem] = useState({
    item_name: '',
    category: 'linterna',
    serial_number: '',
    status: 'operativo',
    objective_id: '',
    resource_id: '',
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
    fetchStaff();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = session?.user?.user_metadata?.tenant_id || null;

      let query = supabase
        .from('resource_inventory')
        .select('*, objectives(name), resources(name, role)')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      
      if (error || !data) {
        // Fallback to API
        const res = await fetch('/api/inventory');
        const apiData = await res.json();
        setItems(apiData || []);
        return;
      }

      setItems(data);
    } catch (e) {
      console.error(e);
      setItems([]);
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

  const fetchStaff = async () => {
    try {
      const { data } = await supabase.from('resources').select('id, name, role').order('name', { ascending: true });
      if (data) setStaff(data || []);
    } catch (e) {}
  };

  const handleCreate = async () => {
    if (!newItem.item_name.trim()) return;
    try {
      setLoading(true);
      const targetObjId = (newItem.objective_id && newItem.objective_id.trim() !== '' && newItem.objective_id !== 'null') ? newItem.objective_id : null;
      const targetResId = (newItem.resource_id && newItem.resource_id.trim() !== '' && newItem.resource_id !== 'null') ? newItem.resource_id : null;

      const { data: { session } } = await supabase.auth.getSession();
      const tenantId = session?.user?.user_metadata?.tenant_id || null;

      const quantity = Math.max(1, newItem.quantity || 1);
      const itemsToInsert: any[] = [];

      for (let i = 0; i < quantity; i++) {
        itemsToInsert.push({
          item_name: quantity > 1 ? `${newItem.item_name.trim()} #${i + 1}` : newItem.item_name.trim(),
          category: newItem.category,
          serial_number: newItem.serial_number ? (quantity > 1 ? `${newItem.serial_number.trim()}-${i + 1}` : newItem.serial_number.trim()) : null,
          status: newItem.status,
          objective_id: targetObjId,
          resource_id: targetResId,
          notes: newItem.notes ? newItem.notes.trim() : null,
          tenant_id: tenantId
        });
      }

      const { error } = await supabase.from('resource_inventory').insert(itemsToInsert as any).select();

      if (error) {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_name: newItem.item_name.trim(),
            category: newItem.category,
            serial_number: newItem.serial_number ? newItem.serial_number.trim() : null,
            status: newItem.status,
            objective_id: targetObjId,
            resource_id: targetResId,
            notes: newItem.notes ? newItem.notes.trim() : null,
            quantity: quantity
          }),
        });
      }

      setIsSheetOpen(false);
      setNewItem({ item_name: '', category: 'linterna', serial_number: '', status: 'operativo', objective_id: '', resource_id: '', notes: '', quantity: 1 });
      await fetchInventory();
    } catch (e: any) {
      console.error('Notice on item creation:', e);
      setIsSheetOpen(false);
      await fetchInventory();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" del inventario? Esta acción no se puede deshacer.`)) return;
    try {
      const { error } = await supabase.from('resource_inventory').delete().eq('id', id);
      if (error) {
        await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
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

      if (!res.ok) {
        await supabase
          .from('resource_inventory')
          .update({ objective_id: targetObjId } as any)
          .eq('id', itemId);
      }
      fetchInventory();
    } catch (e: any) {
      console.error('Error assigning objective:', e);
    }
  };

  const handleAssignResource = async (itemId: string, resId: string) => {
    try {
      const targetResId = resId || null;
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, resource_id: targetResId }),
      });

      if (!res.ok) {
        await supabase
          .from('resource_inventory')
          .update({ resource_id: targetResId } as any)
          .eq('id', itemId);
      }
      fetchInventory();
    } catch (e: any) {
      console.error('Error assigning resource:', e);
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
          item_name: selectedEditItem.item_name.trim(),
          category: selectedEditItem.category,
          serial_number: selectedEditItem.serial_number ? selectedEditItem.serial_number.trim() : null,
          status: selectedEditItem.status,
          objective_id: selectedEditItem.objective_id || null,
          resource_id: selectedEditItem.resource_id || null,
          notes: selectedEditItem.notes ? selectedEditItem.notes.trim() : null,
        }),
      });

      if (!res.ok) {
        await supabase
          .from('resource_inventory')
          .update({
            item_name: selectedEditItem.item_name.trim(),
            category: selectedEditItem.category,
            serial_number: selectedEditItem.serial_number ? selectedEditItem.serial_number.trim() : null,
            status: selectedEditItem.status,
            objective_id: selectedEditItem.objective_id || null,
            resource_id: selectedEditItem.resource_id || null,
          } as any)
          .eq('id', selectedEditItem.id);
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
      const { error } = await supabase.from('resource_inventory').update({ status: newCondition } as any).eq('id', id);
      if (error) {
        await fetch('/api/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newCondition }),
        });
      }
      fetchInventory();
    } catch (e: any) {
      console.error(e);
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
      return 0;
    });
  }, [items, search, categoryFilter, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total: items.length,
    operativo: items.filter(i => i.status === 'operativo').length,
    problemas: items.filter(i => i.status === 'roto' || i.status === 'mantenimiento').length,
    asignadosObj: items.filter(i => i.objective_id).length,
    asignadosPersonal: items.filter(i => i.resource_id).length,
  }), [items]);

  const stockByCategory = useMemo(() => {
    return assetCategories.map(cat => ({
      ...cat,
      total: items.filter(i => i.category === cat.id).length,
      operativo: items.filter(i => i.category === cat.id && i.status === 'operativo').length,
    })).filter(cat => cat.total > 0);
  }, [items]);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-zinc-50 font-sans">
      
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-zinc-950 border border-zinc-200">
               <Box size={24} />
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-zinc-950 tracking-tighter uppercase italic">Recursos Logísticos</h1>
          </div>
          <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-16">
            Carga y Gestión Patrimonial de Artículos, Equipamiento y Armamento
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            className="flex-1 md:flex-none h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            onClick={() => setIsSheetOpen(true)}
          >
            <Plus size={18} />
            ✍️ Cargar Nuevos Artículos
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Artículos', value: stats.total, icon: Package, color: 'text-zinc-900', bg: 'bg-white' },
          { label: 'Operativos', value: stats.operativo, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
          { label: 'Con Reporte / Falla', value: stats.problemas, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50/50' },
          { label: 'Asignados a Personal', value: stats.asignadosPersonal, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50/50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn("bg-white border border-zinc-200 shadow-sm rounded-3xl p-6 flex items-center gap-5 group hover:border-zinc-300 transition-all", stat.bg)}
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
              <stat.icon size={28} className={stat.color} />
            </div>
            <div>
              <p className="text-3xl font-black text-zinc-950 leading-none mb-1">{stat.value}</p>
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stock por Rubro */}
      {stockByCategory.length > 0 && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-[2rem] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-zinc-100 rounded-xl flex items-center justify-center">
              <Package size={16} className="text-zinc-700" />
            </div>
            <h2 className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.25em]">Stock Logístico por Rubro</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
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
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white border border-zinc-200 shadow-sm p-5 rounded-[2rem] flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            placeholder="BUSCAR ARTÍCULO, MODELO O NÚMERO DE SERIE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-14 pr-6 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all uppercase tracking-wider"
          />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 lg:pb-0">
          <select 
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-[10px] font-black uppercase text-zinc-900 tracking-wider focus:outline-none cursor-pointer"
          >
            <option value="all">TODAS LAS CATEGORÍAS</option>
            {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-[10px] font-black uppercase text-zinc-900 tracking-wider focus:outline-none cursor-pointer"
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
            className="h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-[10px] font-black uppercase text-zinc-900 tracking-wider focus:outline-none cursor-pointer"
          >
            <option value="recent">MÁS RECIENTES</option>
            <option value="oldest">MÁS ANTIGUOS</option>
            <option value="name_asc">NOMBRE (A-Z)</option>
            <option value="name_desc">NOMBRE (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="w-10 h-10 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Cargando inventario logístico...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-zinc-200 p-8 space-y-3">
               <Box size={56} className="text-zinc-300 mx-auto mb-2" />
               <p className="text-base font-black text-zinc-900 uppercase">
                 {items.length > 0 ? "Sin coincidencias con los filtros aplicados" : "Sin artículos cargados"}
               </p>
               <p className="text-xs text-zinc-500 max-w-md mx-auto uppercase font-bold">
                 {items.length > 0 
                   ? "Existen artículos registrados, pero ninguno coincide con los filtros seleccionados (Categoría / Estado / Búsqueda)." 
                   : "Haga clic en 'Cargar Nuevos Artículos' para dar de alta equipamiento."}
               </p>
               {items.length > 0 && (categoryFilter !== 'all' || statusFilter !== 'all' || search) && (
                 <button 
                   onClick={() => { setCategoryFilter('all'); setStatusFilter('all'); setSearch(''); }}
                   className="mt-4 px-6 py-3 bg-zinc-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-md active:scale-95"
                 >
                   🔄 Mostrar Todos los Artículos ({items.length})
                 </button>
               )}
            </div>
          ) : (
            filteredItems.map((item, i) => {
              const cat = assetCategories.find(c => c.id === item.category) || assetCategories[11];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="border border-zinc-200 shadow-sm hover:shadow-xl transition-all group bg-white rounded-[2rem] overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", cat.bg, cat.color)}>
                          <cat.icon size={22} />
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          item.status === 'operativo' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                          item.status === 'roto' ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {item.status}
                        </span>
                      </div>

                      <div className="space-y-1 mb-5">
                        <h3 className="text-base font-black text-zinc-950 uppercase leading-snug truncate group-hover:text-emerald-600 transition-colors">
                          {item.item_name}
                        </h3>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{cat.name}</p>
                      </div>

                      {/* Detalles de Ubicación y Asignación */}
                      <div className="bg-zinc-50 rounded-2xl p-4 space-y-2.5 mb-5 border border-zinc-100 text-[10px] font-black uppercase">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Nº de Serie:</span>
                          <span className="text-zinc-900 font-mono">{item.serial_number || 'S/N'}</span>
                        </div>
                        
                        {/* Puesto Asignado */}
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Puesto / Objetivo:</span>
                          <span className={cn("truncate max-w-[140px]", item.objective_id ? "text-emerald-700 font-bold" : "text-zinc-500")}>
                            {item.objectives?.name || 'DEPÓSITO CENTRAL'}
                          </span>
                        </div>

                        {/* Personal Asignado */}
                        <div className="flex justify-between items-center pt-1 border-t border-zinc-200/60">
                          <span className="text-zinc-400">Asignado a Persona:</span>
                          <span className={cn("truncate max-w-[140px]", item.resource_id ? "text-blue-700 font-bold" : "text-zinc-400")}>
                            {item.resources?.name || 'SIN ASIGNAR'}
                          </span>
                        </div>
                      </div>

                      {/* Selectores Rápidos de Asignación */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button 
                            className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 transition-all flex items-center justify-center gap-1"
                            onClick={() => updateItemStatus(item.id, item.status === 'operativo' ? 'roto' : 'operativo')}
                          >
                            <Activity size={12} />
                            {item.status === 'operativo' ? 'Reportar Falla' : 'Restaurar'}
                          </button>
                          <button 
                            className="w-9 h-9 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center border border-zinc-200 bg-white" 
                            onClick={() => {
                              setSelectedEditItem({
                                id: item.id,
                                item_name: item.item_name,
                                category: item.category,
                                serial_number: item.serial_number || '',
                                status: item.status,
                                objective_id: item.objective_id || '',
                                resource_id: item.resource_id || '',
                                notes: item.notes || ''
                              });
                              setIsEditSheetOpen(true);
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            className="w-9 h-9 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center border border-zinc-200 bg-white" 
                            onClick={() => handleDelete(item.id, item.item_name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Cambiar Objetivo rápidamente */}
                        <select
                          className="w-full h-8 rounded-lg bg-zinc-50 border border-zinc-200 text-[9px] font-bold uppercase text-zinc-700 px-2 cursor-pointer"
                          value={item.objective_id || ''}
                          onChange={(e) => handleAssignObjective(item.id, e.target.value)}
                        >
                          <option value="">🏢 [ DEPÓSITO CENTRAL ]</option>
                          {objectives.map((o: any) => <option key={o.id} value={o.id}>🏢 {o.name}</option>)}
                        </select>

                        {/* Cambiar Personal asignado rápidamente */}
                        <select
                          className="w-full h-8 rounded-lg bg-zinc-50 border border-zinc-200 text-[9px] font-bold uppercase text-zinc-700 px-2 cursor-pointer"
                          value={item.resource_id || ''}
                          onChange={(e) => handleAssignResource(item.id, e.target.value)}
                        >
                          <option value="">👤 [ SIN ASIGNAR A PERSONA ]</option>
                          {staff.map((s: any) => <option key={s.id} value={s.id}>👤 {s.name} ({s.role || 'Personal'})</option>)}
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

      {/* MODAL / SHEET: ALTA DE NUEVOS ARTÍCULOS LOGÍSTICOS */}
      <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Cargar Artículos a Recursos Logísticos">
        <div className="space-y-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Nombre / Modelo del Articulo *</label>
              <Input 
                value={newItem.item_name} 
                onChange={e => setNewItem({...newItem, item_name: e.target.value})}
                placeholder="Ej. Radio Motorola DEP450 / Chaleco Nivel III"
                className="h-14 rounded-2xl bg-zinc-50 border-zinc-200 font-bold text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Categoría del Equipo *</label>
              <select 
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
                className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-xs font-bold uppercase text-zinc-900 cursor-pointer"
              >
                {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Nº de Serie / Código Único</label>
              <Input 
                value={newItem.serial_number} 
                onChange={e => setNewItem({...newItem, serial_number: e.target.value})}
                placeholder="SN-XXXXX"
                className="h-14 rounded-2xl bg-zinc-50 border-zinc-200 font-mono text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Asignar a Puesto / Objetivo</label>
              <select 
                value={newItem.objective_id}
                onChange={e => setNewItem({...newItem, objective_id: e.target.value})}
                className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-xs font-bold uppercase text-zinc-900 cursor-pointer"
              >
                <option value="">🏢 [ DEPÓSITO CENTRAL ]</option>
                {objectives.map(o => <option key={o.id} value={o.id}>🏢 {o.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Asignar a Persona / Vigilador</label>
              <select 
                value={newItem.resource_id}
                onChange={e => setNewItem({...newItem, resource_id: e.target.value})}
                className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-xs font-bold uppercase text-zinc-900 cursor-pointer"
              >
                <option value="">👤 [ SIN ASIGNAR A PERSONA ]</option>
                {staff.map(s => <option key={s.id} value={s.id}>👤 {s.name} ({s.role || 'Personal'})</option>)}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Cantidad de Unidades a Cargar *</label>
              <Input 
                type="number"
                min="1"
                max="100"
                value={newItem.quantity} 
                onChange={e => setNewItem({...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                placeholder="1"
                className="h-14 rounded-2xl bg-zinc-50 border-zinc-200 text-lg font-black text-center"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Condición Inicial</label>
            <div className="grid grid-cols-3 gap-2">
              {['operativo', 'mantenimiento', 'roto'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewItem({...newItem, status: c})}
                  className={cn(
                    "h-12 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border",
                    newItem.status === c ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-zinc-50 text-zinc-500 border-zinc-200"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase shadow-xl shadow-emerald-600/20" 
              onClick={handleCreate}
              disabled={!newItem.item_name.trim() || loading}
            >
              {loading ? 'Guardando Artículos...' : '✍️ Registrar e Cargar Artículos'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* MODAL / SHEET: EDITAR ARTÍCULO LOGÍSTICO */}
      <BottomSheet isOpen={isEditSheetOpen} onClose={() => { setIsEditSheetOpen(false); setSelectedEditItem(null); }} title="Editar Articulo Logístico">
        {selectedEditItem && (
          <div className="space-y-6 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Nombre / Modelo *</label>
                <Input 
                  value={selectedEditItem.item_name} 
                  onChange={e => setSelectedEditItem({...selectedEditItem, item_name: e.target.value})}
                  className="h-14 rounded-2xl bg-zinc-50 border-zinc-200 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Categoría del Equipo *</label>
                <select 
                  value={selectedEditItem.category}
                  onChange={e => setSelectedEditItem({...selectedEditItem, category: e.target.value})}
                  className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-xs font-bold uppercase text-zinc-900 cursor-pointer"
                >
                  {assetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Nº de Serie / Identificador</label>
                <Input 
                  value={selectedEditItem.serial_number} 
                  onChange={e => setSelectedEditItem({...selectedEditItem, serial_number: e.target.value})}
                  className="h-14 rounded-2xl bg-zinc-50 border-zinc-200 font-mono text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Asignar a Puesto / Objetivo</label>
                <select 
                  value={selectedEditItem.objective_id}
                  onChange={e => setSelectedEditItem({...selectedEditItem, objective_id: e.target.value})}
                  className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-xs font-bold uppercase text-zinc-900 cursor-pointer"
                >
                  <option value="">🏢 [ DEPÓSITO CENTRAL ]</option>
                  {objectives.map(o => <option key={o.id} value={o.id}>🏢 {o.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Asignar a Persona / Vigilador</label>
                <select 
                  value={selectedEditItem.resource_id}
                  onChange={e => setSelectedEditItem({...selectedEditItem, resource_id: e.target.value})}
                  className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 text-xs font-bold uppercase text-zinc-900 cursor-pointer"
                >
                  <option value="">👤 [ SIN ASIGNAR A PERSONA ]</option>
                  {staff.map(s => <option key={s.id} value={s.id}>👤 {s.name} ({s.role || 'Personal'})</option>)}
                </select>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Estado / Condición</label>
              <div className="grid grid-cols-4 gap-2">
                {['operativo', 'mantenimiento', 'roto', 'faltante'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedEditItem({...selectedEditItem, status: c})}
                    className={cn(
                      "h-12 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border",
                      selectedEditItem.status === c ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-zinc-50 text-zinc-500 border-zinc-200"
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
                disabled={!selectedEditItem.item_name.trim() || loading}
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button 
                type="button"
                className="h-14 px-6 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black uppercase" 
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
