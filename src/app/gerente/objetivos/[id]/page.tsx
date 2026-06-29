'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Clock, 
  Shield, 
  Calendar, 
  FileText, 
  Hammer, 
  MessageSquare,
  Building2,
  Phone,
  User,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  RotateCw,
  Scan,
  Map as MapIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Package,
  Smartphone,
  Zap,
  BookOpen
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { geocodeForward } from '@/lib/geocoding';
import { motion, AnimatePresence } from 'framer-motion';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
import RecorridosTab from './_components/RecorridosTab';
import ObjectivePayrollTab from './_components/ObjectivePayrollTab';
import AssignmentHelperModal from '@/components/gerente/AssignmentHelperModal';


export default function ObjectiveDetail() {
  const routeParams = useParams();
  const id = routeParams?.id as string | undefined;
  const [mounted, setMounted] = useState(false);
  const [objective, setObjective] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [guardBook, setGuardBook] = useState<any[]>([]);
  
  // Guard Book state
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryType, setNewEntryType] = useState('novedad');
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  
  // Assignment state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedResForMsg, setSelectedResForMsg] = useState<any>(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [assignStartTime, setAssignStartTime] = useState('');
  const [assignEndTime, setAssignEndTime] = useState('');
  const [programmedShifts, setProgrammedShifts] = useState<any[]>([]);

  // Checkpoints & Rounds
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [patrolRounds, setPatrolRounds] = useState<any[]>([]);
  const [newCheckpoint, setNewCheckpoint] = useState({ name: '', description: '', order_index: 0 });
  const [isAddingCheckpoint, setIsAddingCheckpoint] = useState(false);
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [isRoundMapOpen, setIsRoundMapOpen] = useState(false);
  const [roundPath, setRoundPath] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [unassignedItems, setUnassignedItems] = useState<any[]>([]);

  // Billing state
  const [billingRate, setBillingRate] = useState<string>('3500');
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  // Shift requirements state
  const [requirements, setRequirements] = useState<any[]>([]);
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null);
  const [isAssignmentHelperOpen, setIsAssignmentHelperOpen] = useState(false);
  const [isNewRequirementModalOpen, setIsNewRequirementModalOpen] = useState(false);
  
  // New requirement form state
  const [newReqDate, setNewReqDate] = useState('');
  const [newReqStartTime, setNewReqStartTime] = useState('');
  const [newReqEndTime, setNewReqEndTime] = useState('');
  const [newReqRole, setNewReqRole] = useState('vigilador');
  const [newReqNotes, setNewReqNotes] = useState('');
  const [isCreatingRequirement, setIsCreatingRequirement] = useState(false);
  const [newReqError, setNewReqError] = useState<string | null>(null);

  const fetchRequirements = async () => {
    if (!id) return;
    try {
      const reqResponse = await fetch(`/api/shifts/requirements?objective_id=${id}`);
      if (reqResponse.ok) {
        const reqData = await reqResponse.json();
        setRequirements(reqData.requirements || []);
      }
    } catch (e) {
      console.warn('Shift requirements fetch failed:', e);
    }
  };

  // 1. Hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Fetch data when ID is ready
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch comprehensive data via single secure API route
        const response = await fetch(`/api/objectives/${id}/details`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "No se pudo cargar la información del objetivo.");
        }
        
        const data = await response.json();
        console.log("DEBUG: Datos recibidos del objetivo:", data);
        
        if (!data.objective) {
          throw new Error("El servidor no devolvió los datos base del objetivo.");
        }
        
        setObjective(data.objective);
        setShifts(Array.isArray(data.shifts) ? data.shifts : []);
        setCheckpoints(Array.isArray(data.checkpoints) ? data.checkpoints : []);
        setPatrolRounds(Array.isArray(data.patrolRounds) ? data.patrolRounds : []);
        setInventory(Array.isArray(data.inventory) ? data.inventory : []);
        setGuardBook(Array.isArray(data.guardBook) ? data.guardBook : []);
        setBillingRate((data.objective.hourly_billing_rate || 3500).toString());
        
        // Filter programmed shifts from the fetched shifts
        const prog = (Array.isArray(data.shifts) ? data.shifts : []).filter((s: any) => s.status === 'programado' || s.status === 'activo');
        setProgrammedShifts(prog);

        // Fetch assigned guards via existing API
        try {
          const allRes = await api.staff.list();
          setResources((allRes || []).filter((r: any) => r.current_objective_id === id && r.status !== 'baja'));
        } catch (e) { console.warn('Staff fetch failed:', e); }

        // Fetch shift requirements
        await fetchRequirements();

      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || "Error al cargar los datos. Por favor reintente.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // REAL-TIME: Suscribirse a novedades y cambios en personal
    const bookChannel = supabase
      .channel(`objective-${id}-book`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guard_book_entries', filter: `objective_id=eq.${id}` },
        (payload) => {
          setGuardBook(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    const resourceChannel = supabase
      .channel(`objective-${id}-resources`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'resources', filter: `current_objective_id=eq.${id}` },
        (payload) => {
          setResources(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        }
      )
      .subscribe();

    const requirementsChannel = supabase
      .channel(`objective-${id}-requirements`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_requirements', filter: `objective_id=eq.${id}` },
        () => {
          fetchRequirements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookChannel);
      supabase.removeChannel(resourceChannel);
      supabase.removeChannel(requirementsChannel);
    };
  }, [id]);

  const fetchAllStaff = async () => {
    try {
      const data = await api.staff.list();
      setAllStaff((data || []).filter((r: any) => r.status !== 'baja'));
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  };

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newReqDate || !newReqStartTime || !newReqEndTime) return;

    setIsCreatingRequirement(true);
    setNewReqError(null);

    try {
      let endDate = newReqDate;
      if (newReqEndTime < newReqStartTime) {
        const dateObj = new Date(newReqDate + 'T00:00:00');
        dateObj.setDate(dateObj.getDate() + 1);
        endDate = dateObj.toISOString().split('T')[0];
      }
      
      const start_time = new Date(`${newReqDate}T${newReqStartTime}:00`).toISOString();
      const end_time = new Date(`${endDate}T${newReqEndTime}:00`).toISOString();

      const response = await fetch('/api/shifts/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective_id: id,
          start_time,
          end_time,
          required_role: newReqRole,
          notes: newReqNotes
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el requerimiento');
      }

      // Reset form
      setNewReqDate('');
      setNewReqStartTime('');
      setNewReqEndTime('');
      setNewReqRole('vigilador');
      setNewReqNotes('');
      setIsNewRequirementModalOpen(false);
      
      // Refresh list
      await fetchRequirements();
    } catch (err: any) {
      console.error('[CREATE_REQUIREMENT]', err);
      setNewReqError(err.message || 'Error al crear el requerimiento');
    } finally {
      setIsCreatingRequirement(false);
    }
  };

  const handleAssign = async (staffId: string) => {
    setIsAssigning(true);
    try {
      if (assignStartTime && assignEndTime) {
        // Create programmed shift
        const startIso = new Date(`${new Date().toISOString().split('T')[0]}T${assignStartTime}`).toISOString();
        const endIso = new Date(`${new Date().toISOString().split('T')[0]}T${assignEndTime}`).toISOString();
        
        await api.shifts.program({
          operator_id: staffId,
          objective_id: id,
          start_time: startIso,
          end_time: endIso,
          notes: `Turno programado por gerencia para hoy ${assignStartTime} - ${assignEndTime}`
        });

        // Send detailed notification
        try {
          await api.notifications.create({
            resource_id: staffId,
            type: 'assignment',
            title: 'Turno Programado Asignado',
            body: `Tenés un nuevo turno programado para hoy en "${objective?.name || 'Nuevo Objetivo'}" de ${assignStartTime} a ${assignEndTime} HS.`,
            data: { objective_id: id, start_time: assignStartTime, end_time: assignEndTime },
          });
        } catch (e) {}

      } else {
        // Legacy permanent assignment
        await api.staff.update(staffId, { current_objective_id: id });
        
        // Send notification to the operator about their new assignment
        try {
          await api.notifications.create({
            resource_id: staffId,
            type: 'assignment',
            title: 'Nueva Asignación de Objetivo',
            body: `Has sido asignado al objetivo "${objective?.name || 'Nuevo Objetivo'}". Dirección: ${objective?.address || 'Sin dirección registrada'}.`,
            data: { objective_id: id, objective_name: objective?.name, objective_address: objective?.address },
          });
        } catch (notifErr) {
          console.warn('Notification send failed (non-blocking):', notifErr);
        }
      }

      const allRes = await api.staff.list();
      setResources((allRes || []).filter((r: any) => r.current_objective_id === id && r.status !== 'baja'));
      
      // Refresh programmed shifts
      const { data: progShifts } = await supabase
        .from('guard_shifts')
        .select('*, resources:operator_id(name, role)')
        .eq('objective_id', id)
        .in('status', ['programado', 'activo'])
        .order('checkin_time', { ascending: true });
      setProgrammedShifts(progShifts || []);

      setIsAssignModalOpen(false);
      setAssignStartTime('');
      setAssignEndTime('');
    } catch (err: any) {
      alert("Error al asignar: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (staffId: string) => {
    if (!confirm("¿Deseas desvincular a este guardia de este objetivo?")) return;
    try {
      await api.staff.update(staffId, { current_objective_id: null });
      setResources(prev => prev.filter(r => r.id !== staffId));
    } catch (err: any) {
      alert("Error al desvincular: " + err.message);
    }
  };

  const handleGeocode = async () => {
    if (!objective?.address) return;
    setIsUpdating(true);
    try {
      const results = await geocodeForward(objective.address);
      if (results.length === 0) {
        alert("No se pudo encontrar la ubicación para esta dirección.");
        return;
      }
      
      const { lat, lng } = results[0];
      const { error } = await supabase
        .from('objectives')
        .update({ latitude: lat, longitude: lng })
        .eq('id', id);
      
      if (error) throw error;
      
      setObjective({ ...objective, latitude: lat, longitude: lng });
      alert("¡Ubicación actualizada con éxito!");
    } catch (err: any) {
      alert("Error al geolocalizar: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRate = async () => {
    if (!id || !billingRate) return;
    setIsUpdatingRate(true);
    try {
      const { error } = await supabase
        .from('objectives')
        .update({ hourly_billing_rate: parseFloat(billingRate) })
        .eq('id', id);
      
      if (error) throw error;
      setObjective({ ...objective, hourly_billing_rate: parseFloat(billingRate) });
      alert("¡Tarifa actualizada con éxito!");
    } catch (err: any) {
      alert("Error al actualizar tarifa: " + err.message);
    } finally {
      setIsUpdatingRate(false);
    }
  };

  const handleAddBookEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryContent.trim()) return;

    setIsSubmittingEntry(true);
    try {
      // Manager entries use a fixed marker; resource_id will be the first assigned guard or a placeholder
      const assignedGuardId = resources[0]?.id;
      if (!assignedGuardId) {
        alert('Asigná al menos un guardia al objetivo antes de registrar novedades desde el panel.');
        return;
      }
      await api.guardBook.create({
        objective_id: id,
        resource_id: assignedGuardId,
        entry_type: newEntryType,
        content: `[GERENTE] ${newEntryContent}`,
        urgency: newEntryType === 'incidente' ? 'alta' : 'normal',
      });
      setNewEntryContent('');
      // Refresh list
      const bookData = await api.guardBook.list({ objective_id: id, limit: 100 });
      setGuardBook(Array.isArray(bookData) ? bookData : []);
    } catch (err: any) {
      alert("Error al guardar novedad: " + err.message);
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const handleAddCheckpoint = async () => {
    if (!newCheckpoint.name || !id) return;
    try {
      const { error } = await supabase
        .from('checkpoints')
        .insert({
          objective_id: id,
          name: newCheckpoint.name,
          description: newCheckpoint.description || '',
          order_index: checkpoints.length,
          latitude: objective.latitude || -31.6107, // Default coordinates to objective location
          longitude: objective.longitude || -60.6973
        });
      
      if (error) throw error;
      
      setNewCheckpoint({ name: '', description: '', order_index: 0 });
      setIsAddingCheckpoint(false);
      
      // Refresh checkpoints list
      const { data, error: fetchErr } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('objective_id', id)
        .order('order_index', { ascending: true });

      if (fetchErr) throw fetchErr;
      setCheckpoints(data || []);
    } catch (err: any) {
      alert("Error al agregar checkpoint: " + err.message);
    }
  };

  const handleDeleteCheckpoint = async (cpId: string) => {
    if (!confirm("¿Eliminar este punto de control?")) return;
    try {
      const { error } = await supabase.from('checkpoints').delete().eq('id', cpId);
      if (error) throw error;
      setCheckpoints(prev => prev.filter(c => c.id !== cpId));
    } catch (err: any) {
      alert("Error al eliminar checkpoint: " + err.message);
    }
  };

  const handleSendQuickMessage = async () => {
    if (!selectedResForMsg || !quickMessage.trim()) return;
    setIsSendingMsg(true);
    try {
      await api.notifications.create({
        resource_id: selectedResForMsg.id,
        title: 'Mensaje de Gerencia',
        body: quickMessage,
        type: 'mensaje'
      });
      setQuickMessage('');
      setIsMessageModalOpen(false);
      setSelectedResForMsg(null);
      alert('Mensaje enviado con éxito.');
    } catch (err: any) {
      alert('Error al enviar mensaje: ' + err.message);
    } finally {
      setIsSendingMsg(false);
    }
  };

  // Prevent SSR crashes
  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-zinc-50">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-[#0F4C5C] rounded-full animate-spin" />
        <p className="mt-6 text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] italic">Sincronizando Nodo Si.Ge.S...</p>
      </div>
    );
  }

  if (error || !objective) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center max-w-sm mx-auto bg-zinc-50">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-red-100">
           <AlertCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Nodo fuera de alcance</h2>
        <p className="mt-3 text-sm text-zinc-500 font-semibold leading-relaxed">{error || "El objetivo no existe o ha sido desvinculado del sistema."}</p>
        <Link href="/gerente/objetivos" className="mt-10">
          <Button variant="primary" className="h-14 px-10 text-[11px] font-black uppercase tracking-widest bg-zinc-900 text-white shadow-2xl shadow-zinc-900/20">Volver a Central</Button>
        </Link>
      </div>
    );
  }

  const mapCenter: [number, number] = [
    (objective?.latitude && !isNaN(Number(objective.latitude))) ? Number(objective.latitude) : -31.6107,
    (objective?.longitude && !isNaN(Number(objective.longitude))) ? Number(objective.longitude) : -60.6973
  ];

  const tabs = [
    { id: 'general', label: 'Resumen', icon: MapPin },
    { id: 'personal', label: 'Recursos', icon: Users },
    { id: 'rondines', label: 'Recorridos', icon: RotateCw },
    { id: 'libro', label: 'Bitácora', icon: MessageSquare },
    { id: 'historial', label: 'Turnos', icon: Clock },
    { id: 'herramientas', label: 'Activos', icon: Hammer },
    { id: 'liquidacion', label: 'Liquidación', icon: FileText },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 min-h-screen">
      
      {/* 1. HEADER */}
      <div className="flex flex-col gap-5">
        <Link href="/gerente/objetivos" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-900 transition-colors w-fit font-black uppercase tracking-widest text-[10px]">
          <ArrowLeft size={16} className="text-[#0F4C5C]" /> Volver a Objetivos
        </Link>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-[#0F4C5C] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0F4C5C]/20">
               <MapPin size={32} className="text-black" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase leading-none">{objective.name}</h1>
                <span className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-full border uppercase shadow-sm",
                  objective.status === 'Activo' ? "bg-[#0F4C5C]/10 text-[#0F4C5C] border-[#0F4C5C]/20" : "bg-zinc-100 text-zinc-500 border-zinc-200"
                )}>
                  {objective.status}
                </span>
              </div>
              <p className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
                <Building2 size={14} /> {objective.client_name || 'Particular'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none h-12 text-[10px] font-black uppercase tracking-widest bg-white border-zinc-200">
              <FileText size={16} className="mr-2" /> Contrato
            </Button>
            <button className="flex-1 sm:flex-none h-12 px-8 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-zinc-900/20 rounded-xl hover:bg-zinc-800 transition-colors">
              Operaciones
            </button>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION */}
      <div className="flex gap-2 p-1.5 bg-zinc-100 rounded-2xl overflow-x-auto no-scrollbar border border-zinc-200/50 max-w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3.5 text-[11px] font-black rounded-xl transition-all whitespace-nowrap uppercase tracking-widest",
              activeTab === tab.id
                ? "bg-white text-zinc-900 shadow-md ring-1 ring-zinc-900/5"
                : "text-zinc-400 hover:text-zinc-600 hover:bg-white/50"
            )}
          >
            <tab.icon size={14} className={activeTab === tab.id ? "text-[#0F4C5C]" : "text-zinc-400"} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. CONTENT AREA (Simplified without Framer Motion for stability) */}
      <div className="min-h-[400px]">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-1 p-8 space-y-8 border border-zinc-200 shadow-sm bg-white rounded-[2rem]">
                <div>
                  <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">Especificaciones</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 group/geo">
                      <div className="flex-1 overflow-hidden">
                        <InfoItem icon={MapPin} label="Dirección" value={objective.address} />
                      </div>
                      <Button 
                        onClick={handleGeocode}
                        disabled={isUpdating}
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-[9px] font-black uppercase tracking-widest bg-zinc-50 border border-zinc-100 hover:bg-[#0F4C5C] hover:text-black transition-all shrink-0"
                      >
                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <MapIcon size={12} className="mr-1" />}
                        Geolocalizar
                      </Button>
                    </div>
                    <InfoItem icon={Phone} label="Contacto" value={objective.contact_phone || 'N/A'} />
                    <InfoItem icon={Shield} label="Protocolo" value="ESTÁNDAR" />
                    <InfoItem icon={Calendar} label="Vigencia" value="ACTIVO" />
                    
                    <div className="pt-4 border-t border-gray-100">
                      <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-2 block">Tarifa de Facturación (Hora)</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                          <Input 
                            type="number"
                            value={billingRate}
                            onChange={(e) => setBillingRate(e.target.value)}
                            className="pl-7 h-10 text-sm font-black text-gray-900 border-gray-200"
                          />
                        </div>
                        <Button 
                          onClick={handleUpdateRate}
                          disabled={isUpdatingRate || parseFloat(billingRate) === objective.hourly_billing_rate}
                          variant="primary" 
                          className="h-10 text-[10px] font-black uppercase tracking-widest px-4"
                        >
                          {isUpdatingRate ? <Loader2 size={14} className="animate-spin" /> : 'Actualizar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-8 border-t border-zinc-100">
                  <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">Estado</h3>
                  <div className="p-5 bg-[#0F4C5C]/10 rounded-2xl border border-[#0F4C5C]/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-zinc-900 uppercase">Nodo Online</p>
                      <p className="text-[10px] text-[#0F4C5C] font-black uppercase mt-1">Operativo OK</p>
                    </div>
                    <CheckCircle2 size={24} className="text-[#0F4C5C]" />
                  </div>
                </div>
              </Card>

              <Card className="lg:col-span-2 overflow-hidden min-h-[400px] relative border border-zinc-200 shadow-sm rounded-[2rem] bg-white">
                <MapView 
                  objectives={objective?.latitude && objective?.longitude ? [objective] : []} 
                  guards={resources}
                  incidents={guardBook}
                  checkpoints={checkpoints}
                  onCheckpointDragEnd={async (cpId, lat, lng) => {
                    try {
                      const { error } = await supabase
                        .from('checkpoints')
                        .update({ latitude: lat, longitude: lng })
                        .eq('id', cpId);
                      if (error) throw error;
                      
                      // Refresh checkpoints list locally
                      setCheckpoints(prev => prev.map(c => c.id === cpId ? { ...c, latitude: lat, longitude: lng } : c));
                    } catch (err: any) {
                      alert("Error al reposicionar checkpoint: " + err.message);
                    }
                  }}
                  center={mapCenter}
                  zoom={16}
                  className="w-full h-full"
                  selectedObjectiveId={objective.id}
                  tileStyle="standard"
                />
                <div className="absolute top-6 right-6 z-10">
                  <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-zinc-200 flex items-center gap-3 shadow-xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0F4C5C] animate-pulse shadow-[0_0_10px_rgba(15, 76, 92,0.8)]" />
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">Live Monitoring</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Recursos Permanentes</h3>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="h-10 text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 rounded-xl"
                  onClick={() => {
                    fetchAllStaff();
                    setIsAssignModalOpen(true);
                  }}
                >
                  <Plus size={14} className="mr-2" /> Asignar Guardia
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources.length > 0 ? resources.map((res: any) => (
                    <Card key={res.id} className="p-6 hover:shadow-md transition-all border border-zinc-200 bg-white shadow-sm rounded-2xl group">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-[#0F4C5C]/10 transition-colors">
                          <User size={24} className="text-zinc-400 group-hover:text-[#0F4C5C]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{res.name}</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{res.role || 'Vigilador'}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-[#0F4C5C] hover:bg-[#0F4C5C]/5"
                            onClick={() => {
                              setSelectedResForMsg(res);
                              setIsMessageModalOpen(true);
                            }}
                          >
                            <MessageSquare size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleUnassign(res.id)}
                          >
                            <X size={14} />
                          </Button>
                          <Link href={`/gerente/personal/${res.id}`}>
                            <Button variant="ghost" size="icon" className="hover:text-[#0F4C5C]"><ExternalLink size={16} /></Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  )) : (
                    <div className="col-span-full py-12 text-center text-zinc-400 text-[10px] font-black uppercase tracking-widest italic border border-dashed border-zinc-200 rounded-[2rem]">
                      Sin personal asignado permanentemente
                    </div>
                  )}
              </div>

              {/* Requerimientos de Cobertura */}
              <div className="pt-8 border-t border-zinc-100">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-zinc-950/10 rounded-lg flex items-center justify-center text-zinc-950">
                        <Calendar size={16} />
                     </div>
                     <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Requerimientos de Cobertura</h3>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 text-[10px] font-black uppercase tracking-widest rounded-xl"
                    onClick={() => setIsNewRequirementModalOpen(true)}
                  >
                    <Plus size={14} className="mr-2" /> Programar Requerimiento
                  </Button>
                </div>

                <div className="space-y-3">
                  {requirements.length > 0 ? requirements.map((req: any) => {
                    const isAssigned = req.status === 'assigned';
                    
                    // Check if starts in less than 24 hours
                    const now = new Date();
                    const startTime = new Date(req.start_time);
                    const timeDiff = startTime.getTime() - now.getTime();
                    const isUnder24Hours = !isAssigned && timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000;

                    return (
                      <div key={req.id} className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-colors shadow-sm",
                        isAssigned ? "bg-zinc-50 border-zinc-100" : (isUnder24Hours ? "bg-red-50/50 border-red-200" : "bg-white border-zinc-200 hover:border-zinc-300")
                      )}>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border",
                            isAssigned ? "bg-emerald-50 border-emerald-100 text-emerald-600" : (isUnder24Hours ? "bg-red-100 border-red-200 text-red-600 animate-pulse" : "bg-zinc-50 border-zinc-100 text-zinc-400")
                          )}>
                             <Shield size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">
                                {req.required_role || 'Vigilador'}
                              </p>
                              {isAssigned ? (
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-2 py-0.5 bg-emerald-100 rounded-md">Asignado</span>
                              ) : (
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                  isUnder24Hours ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                                )}>
                                  Pendiente
                                </span>
                              )}
                              {isUnder24Hours && (
                                <span className="text-[9px] font-black text-red-600 uppercase tracking-widest bg-red-100 px-2 py-0.5 rounded-md animate-pulse">
                                  🚨 Próximas 24 hs
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium mt-1">
                              {req.notes || 'Requerimiento de cobertura programada'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Horario Programado</p>
                             <p className="text-sm font-mono font-black text-gray-900">
                                {new Date(req.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(req.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </p>
                             <p className="text-[10px] font-bold text-zinc-400 uppercase mt-0.5">
                                {new Date(req.start_time).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                             </p>
                           </div>
                           
                           {!isAssigned ? (
                             <Button 
                               variant="primary" 
                               size="sm" 
                               className="h-10 px-5 text-[9px] font-black uppercase tracking-widest bg-zinc-900 text-white rounded-xl"
                               onClick={() => {
                                 setSelectedRequirement(req);
                                 setIsAssignmentHelperOpen(true);
                               }}
                             >
                               Asignar
                             </Button>
                           ) : (
                             <Button
                               variant="ghost"
                               size="icon"
                               className="text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                               onClick={async () => {
                                 if (confirm("¿Desvincular guardia asignado a esta cobertura?")) {
                                   try {
                                     if (req.assigned_shift_id) {
                                       await api.shifts.delete(req.assigned_shift_id);
                                     }
                                     
                                     const { error: updateError } = await supabase
                                       .from('shift_requirements')
                                       .update({ status: 'unassigned', assigned_shift_id: null })
                                       .eq('id', req.id);
                                     
                                     if (updateError) throw updateError;
                                     
                                     await fetchRequirements();
                                     // Also refresh shifts list if it's there
                                     const detailsRes = await fetch(`/api/objectives/${id}/details`);
                                     if (detailsRes.ok) {
                                       const detailsData = await detailsRes.json();
                                       const prog = (detailsData.shifts || []).filter((s: any) => s.status === 'programado' || s.status === 'activo');
                                       setProgrammedShifts(prog);
                                     }
                                   } catch (err: any) {
                                     alert("Error al desasignar: " + err.message);
                                   }
                                 }
                               }}
                             >
                               <X size={16} />
                             </Button>
                           )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-12 text-center text-zinc-400 text-[10px] font-black uppercase tracking-widest italic border border-dashed border-zinc-200 rounded-2xl">
                      No hay requerimientos de cobertura planificados
                    </div>
                  )}
                </div>
              </div>

              {/* Programmed Reliefs (Relevos) */}
              <div className="pt-8 border-t border-zinc-100">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 bg-[#0F4C5C]/10 rounded-lg flex items-center justify-center text-[#0F4C5C]">
                      <Clock size={16} />
                   </div>
                   <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Cobertura Horaria Programada</h3>
                </div>

                <div className="space-y-3">
                  {programmedShifts.length > 0 ? programmedShifts.map((prog: any) => {
                    const isActive = prog.status === 'activo';
                    return (
                    <div key={prog.id} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-colors group shadow-sm", isActive ? "bg-emerald-50 border-emerald-200" : "bg-white border-zinc-200 hover:border-[#0F4C5C]/50")}>
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-colors", isActive ? "bg-emerald-100 border-emerald-200" : "bg-zinc-50 border-zinc-100 group-hover:bg-[#0F4C5C]/5")}>
                           <User size={18} className={isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-[#0F4C5C]"} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{(prog.resources as any)?.name || 'Operador'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{(prog.resources as any)?.role || 'Vigilador'}</p>
                            {isActive && (
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-2 py-0.5 bg-emerald-100 rounded-md">EN SERVICIO</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="text-right">
                           <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Horario de Cobertura</p>
                           <p className="text-sm font-mono font-black text-gray-900">
                              {new Date(prog.checkin_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {prog.checkout_time ? new Date(prog.checkout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'PRESENTE'}
                           </p>
                         </div>
                         <Button variant="ghost" size="icon" className="text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={async () => {
                            if(confirm("¿Cancelar este turno de cobertura programado?")) {
                               try {
                                 await api.shifts.delete(prog.id);
                                 setProgrammedShifts(prev => prev.filter(p => p.id !== prog.id));
                                 setShifts(prev => prev.filter(s => s.id !== prog.id));
                               } catch (err: any) {
                                 alert("Error al eliminar: " + err.message);
                                }
                            }
                         }}>
                            <X size={16} />
                         </Button>
                      </div>
                    </div>
                  )}) : (
                    <div className="py-12 text-center text-zinc-400 text-[10px] font-black uppercase tracking-widest italic border border-dashed border-zinc-200 rounded-2xl">
                      No hay cobertura horaria programada
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rondines' && (
            <div className="flex flex-col gap-8">
              {/* Strategic Checkpoints */}
              <div className="w-full">
                <Card className="p-8 border-none shadow-xl shadow-zinc-200/30 rounded-3xl bg-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#0F4C5C]/5 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#0F4C5C] rounded-full" />
                      Puntos de Inspección
                    </h3>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="h-8 text-[9px] font-black uppercase tracking-widest px-4"
                      onClick={() => setIsAddingCheckpoint(true)}
                    >
                      <Plus size={12} className="mr-1" /> Agregar
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence>
                      {isAddingCheckpoint && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3 mb-4">
                            <Input placeholder="Nombre del punto" value={newCheckpoint.name} onChange={e => setNewCheckpoint({...newCheckpoint, name: e.target.value})} className="h-9 bg-white border-zinc-200 text-xs rounded-xl" />
                            <Input placeholder="Descripción" value={newCheckpoint.description} onChange={e => setNewCheckpoint({...newCheckpoint, description: e.target.value})} className="h-9 bg-white border-zinc-200 text-xs rounded-xl" />
                            <div className="flex gap-2">
                              <Button className="flex-1 h-9 bg-zinc-900 text-white font-black uppercase text-[10px] rounded-xl" onClick={handleAddCheckpoint}>Guardar</Button>
                              <Button variant="ghost" className="h-9 px-4 rounded-xl text-[10px] text-zinc-400 hover:text-red-400" onClick={() => setIsAddingCheckpoint(false)}>Cancel</Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {checkpoints.length > 0 ? checkpoints.map((cp, idx) => (
                      <div key={cp.id} className="flex items-center gap-4 group/cp">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-[10px] font-black text-zinc-400 group-hover/cp:bg-[#0F4C5C] group-hover/cp:text-black transition-all">
                          {idx + 1}
                        </div>
                        <div className="flex-1 border-b border-zinc-100 pb-3">
                          <p className="text-xs font-black text-zinc-800 uppercase tracking-tight">{cp.name}</p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{cp.description || 'Punto de control'}</p>
                        </div>
                        <button onClick={() => handleDeleteCheckpoint(cp.id)} className="opacity-0 group-hover/cp:opacity-100 p-2 text-zinc-400 hover:text-red-400 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )) : (
                      !isAddingCheckpoint && (
                        <div className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
                          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Sin puntos</p>
                        </div>
                      )
                    )}
                  </div>
                </Card>
              </div>

              {/* Rounds History */}
              <div className="w-full">
                {id && <RecorridosTab objectiveId={id} />}
              </div>
            </div>
          )}

          {activeTab === 'libro' && (
            <div className="space-y-6">
              {/* Formulario de Nueva Novedad */}
              <Card className="p-8 border-none shadow-2xl shadow-gray-200/30 rounded-3xl bg-white">
                <form onSubmit={handleAddBookEntry} className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Reportar Novedad</h3>
                    <div className="flex gap-2">
                      {['novedad', 'incidente', 'ronda'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewEntryType(t)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                            newEntryType === t 
                              ? "bg-gray-900 text-white shadow-lg" 
                              : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      required
                      value={newEntryContent}
                      onChange={e => setNewEntryContent(e.target.value)}
                      placeholder="Escribe aquí las novedades, incidencias o detalles del turno..."
                      className="w-full min-h-[120px] p-6 bg-gray-50 border-none rounded-2xl text-sm font-medium text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                    <Button 
                      type="submit" 
                      disabled={isSubmittingEntry || !newEntryContent.trim()}
                      className="absolute bottom-4 right-4 h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-xl group"
                    >
                      {isSubmittingEntry ? "Enviando..." : (
                        <>
                          Publicar <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Listado de Entradas */}
              <Card className="overflow-hidden border-none shadow-2xl shadow-gray-200/30 rounded-3xl bg-white">
                <div className="divide-y divide-gray-50">
                  {guardBook.length > 0 ? guardBook.map((entry: any) => (
                    <div key={entry.id} className="px-8 py-6 flex items-start gap-6 hover:bg-gray-50/30 transition-colors">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        entry.entry_type === 'incidente' ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                      )}>
                        {entry.entry_type === 'incidente' ? <AlertCircle size={20} /> : <MessageSquare size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em]",
                            entry.entry_type === 'incidente' ? "text-red-600" : "text-blue-600"
                          )}>{entry.entry_type}</span>
                          <span className="text-[10px] font-black text-gray-400">{new Date(entry.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-base font-bold text-gray-800 italic leading-relaxed">"{entry.content}"</p>
                      </div>
                    </div>
                  )) : (
                    <div className="py-24 text-center">
                      <MessageSquare size={48} className="text-gray-100 mx-auto mb-4" />
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">Diario de guardia vacío</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'historial' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-4 mb-2">
                <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Historial Operativo & Auditoría</h3>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">Tarifa: ${(objective?.hourly_billing_rate || 3500).toLocaleString('es-AR')} / HR</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {shifts.length > 0 ? shifts.map((shift: any) => {
                  const checkin = new Date(shift.checkin_time);
                  const checkout = shift.checkout_time ? new Date(shift.checkout_time) : null;
                  const durationHours = shift.total_hours || (checkout 
                    ? (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60)
                    : (new Date().getTime() - checkin.getTime()) / (1000 * 60 * 60));
                  const hourlyRate = objective?.hourly_billing_rate || 3500;
                  const totalAmount = durationHours * hourlyRate;

                  return (
                    <div key={shift.id} className="bg-white border border-zinc-200 rounded-2xl p-6 flex items-center justify-between hover:shadow-lg transition-all group">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 overflow-hidden">
                          {shift.operator_avatar ? (
                            <img src={shift.operator_avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} className="text-zinc-300" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-black text-zinc-900 uppercase tracking-tight group-hover:text-[#0F4C5C] transition-colors">
                              {shift.operator_name || 'Operativo Táctico'}
                            </p>
                            {!checkout && (
                              <div className="flex items-center gap-2 px-3 py-0.5 bg-[#0F4C5C]/10 border border-[#0F4C5C]/20 rounded-full">
                                <div className="w-1.5 h-1.5 bg-[#0F4C5C] rounded-full" />
                                <span className="text-[9px] font-black text-[#0F4C5C] uppercase tracking-widest">En Curso</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Calendar size={12} className="text-zinc-300" />
                              {checkin.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                            </p>
                            <div className="h-3 w-px bg-zinc-100" />
                            <p className="text-[10px] font-mono text-zinc-500 font-bold">
                              {checkin.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {checkout ? checkout.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'PRESENTE'}
                            </p>
                          </div>
                        </div>
                      </div>

                       <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Audit. Financiera</p>
                          <p className="text-xl font-mono font-black text-zinc-900 tracking-tighter">
                            $ {totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">
                            {durationHours.toFixed(1)} HORAS ACUM.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm("¿Eliminar este registro de turno permanentemente?")) return;
                              try {
                                await api.shifts.delete(shift.id);
                                setShifts(prev => prev.filter(s => s.id !== shift.id));
                              } catch (err: any) {
                                alert("Error: " + err.message);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                          <ChevronRight size={20} className="text-zinc-200 group-hover:text-zinc-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-24 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100">
                    <Clock size={48} className="text-zinc-200 mx-auto mb-4" strokeWidth={1} />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Sin registros de despliegue</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'libro' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-4 mb-2">
                <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Libro de Guardia - Nodo {objective.name}</h3>
                <Link href="/gerente/libro">
                  <Button variant="ghost" className="text-[9px] font-black uppercase tracking-widest text-[#0F4C5C] hover:bg-[#0F4C5C]/5">
                    Ver Todo <ChevronRight size={12} className="ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {guardBook.length > 0 ? guardBook.map((entry: any) => (
                  <div key={entry.id} className="bg-white border border-zinc-200 rounded-2xl p-6 hover:shadow-lg transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-100">
                          {entry.entry_type === 'emergencia' ? <Zap size={18} className="text-red-500" /> : <FileText size={18} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">{entry.resources?.name || 'Operador'}</p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                            {new Date(entry.created_at).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {entry.entry_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        entry.urgency === 'critica' ? "bg-red-50 text-red-600 border-red-100" : "bg-zinc-50 text-zinc-500 border-zinc-100"
                      )}>
                        {entry.urgency}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 font-semibold bg-zinc-50/50 p-4 rounded-xl border border-zinc-100 mb-4 italic">
                      "{entry.content}"
                    </p>
                    
                    {(entry.image_url || entry.audio_url) && (
                      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-100">
                        {entry.image_url && (
                          <div className="relative group/img overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm transition-all hover:shadow-md h-24 w-24">
                            <img 
                              src={entry.image_url} 
                              alt="Evidencia" 
                              className="h-full w-full object-cover cursor-zoom-in"
                              onClick={() => window.open(entry.image_url, '_blank')}
                            />
                          </div>
                        )}
                        {entry.audio_url && (
                          <div className="flex-1 min-w-[200px] p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                            <audio controls className="h-6 w-full scale-90 origin-left">
                              <source src={entry.audio_url} type="audio/mpeg" />
                            </audio>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="py-24 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-100">
                    <BookOpen size={48} className="text-zinc-200 mx-auto mb-4" strokeWidth={1} />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Sin novedades registradas</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'herramientas' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Equipamiento Asignado</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{inventory.length} elementos vinculados a este nodo</p>
                </div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white shadow-lg shadow-zinc-900/10 border-none"
                  onClick={async () => {
                    const { data } = await supabase.from('resource_inventory').select('*').is('objective_id', null);
                    setUnassignedItems(data || []);
                    setIsInventoryModalOpen(true);
                  }}
                >
                  <Plus size={14} className="mr-2" /> Vincular Elemento
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventory.length > 0 ? inventory.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Card className="border border-zinc-200 shadow-sm rounded-[2rem] bg-white overflow-hidden group hover:shadow-md transition-all">
                      <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                           <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-[#0F4C5C]/10 group-hover:text-[#0F4C5C] transition-all">
                              {item.category === 'celular' ? <Smartphone size={24} /> : 
                               item.category === 'linterna' ? <Zap size={24} /> :
                               item.category === 'detector_metales' ? <Shield size={24} /> : <Package size={24} />}
                           </div>
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                             item.condition === 'operativo' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                           )}>
                             {item.condition}
                           </span>
                        </div>
                        <h4 className="text-base font-black text-zinc-900 uppercase leading-none mb-1">{item.item_name}</h4>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-6">Herramienta</p>
                        
                        <div className="bg-zinc-50 rounded-2xl p-4 flex justify-between items-center border border-zinc-100">
                           <span className="text-[10px] font-black text-zinc-400 uppercase">S/N:</span>
                           <span className="text-[10px] font-bold text-zinc-900 font-mono">{item.serial_number || 'S/N'}</span>
                        </div>

                        <div className="mt-6 flex gap-2">
                           <Button 
                             variant="outline" 
                             className="flex-1 h-10 rounded-xl text-[9px] font-black uppercase border-zinc-100 text-red-400 hover:bg-red-50 hover:border-red-100"
                             onClick={async () => {
                               if(!confirm("¿Desvincular este elemento y enviarlo a Depósito Central?")) return;
                               await supabase.from('resource_inventory').update({ objective_id: null }).eq('id', item.id);
                               setInventory(prev => prev.filter(i => i.id !== item.id));
                             }}
                           >
                             Desvincular
                           </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )) : (
                  <div className="col-span-full py-24 text-center bg-zinc-50 rounded-[3rem] border border-dashed border-zinc-200">
                     <Package size={48} className="text-zinc-200 mx-auto mb-4" />
                     <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">No hay herramientas asignadas</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'liquidacion' && objective && (
            <ObjectivePayrollTab
              objectiveId={objective.id}
              objectiveName={objective.name}
              billingRate={parseFloat(billingRate) || objective.hourly_billing_rate || 3500}
            />
          )}
    </div>

      {/* ====== MODAL: Asignar Personal ====== */}
      <BottomSheet isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Vincular Personal">
        <div className="space-y-6 pb-12 px-2">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                placeholder="Buscar por nombre..." 
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                className="pl-10 h-14 rounded-2xl bg-gray-50 border-gray-100"
              />
            </div>
            <div className="flex items-center gap-2">
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 ml-1">Desde</span>
                  <Input 
                    type="time" 
                    value={assignStartTime} 
                    onChange={e => setAssignStartTime(e.target.value)}
                    className="h-10 w-28 rounded-xl bg-gray-50"
                  />
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 ml-1">Hasta</span>
                  <Input 
                    type="time" 
                    value={assignEndTime} 
                    onChange={e => setAssignEndTime(e.target.value)}
                    className="h-10 w-28 rounded-xl bg-gray-50"
                  />
               </div>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {(() => {
              const availableStaff = allStaff.filter(s => !s.current_objective_id || s.current_objective_id === id);
              const unavailableCount = allStaff.length - availableStaff.length;
              const filteredStaff = availableStaff.filter(s => 
                (s.name || '').toLowerCase().includes(assignSearch.toLowerCase()) || 
                (s.role || '').toLowerCase().includes(assignSearch.toLowerCase())
              );
              
              return (
                <>
                  {filteredStaff.map(staff => (
                    <div 
                      key={staff.id} 
                      className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <User size={18} className="text-gray-400 group-hover:text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{staff.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{staff.role || 'Vigilador'}</p>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant={staff.current_objective_id === id ? "outline" : "primary"}
                        disabled={isAssigning || staff.current_objective_id === id}
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => handleAssign(staff.id)}
                      >
                        {staff.current_objective_id === id ? 'Ya vinculado' : 'Vincular'}
                      </Button>
                    </div>
                  ))}
                  
                  {filteredStaff.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest italic">
                      No hay personal disponible para vincular
                    </div>
                  )}

                  {unavailableCount > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {unavailableCount} operador{unavailableCount !== 1 ? 'es' : ''} no disponible{unavailableCount !== 1 ? 's' : ''} (vinculados a otros objetivos)
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
            {/* Round Map Modal is now moved to the end of the component */}
          </div>
        </div>
      </BottomSheet>

      {/* ====== MODAL: Enviar Mensaje Rápido ====== */}
      <BottomSheet isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title="Enviar Mensaje">
        <div className="space-y-6 pb-12 px-2">
          {selectedResForMsg && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100">
                  <User size={18} className="text-primary" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Para:</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{selectedResForMsg.name}</p>
               </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contenido del Mensaje</label>
            <textarea 
              placeholder="Escribe tu mensaje aquí..." 
              value={quickMessage}
              onChange={e => setQuickMessage(e.target.value)}
              className="w-full h-32 p-4 rounded-2xl bg-gray-50 border-gray-100 focus:border-primary focus:ring-0 text-sm font-medium resize-none"
            />
          </div>

          <Button 
            className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
            disabled={isSendingMsg || !quickMessage.trim()}
            onClick={handleSendQuickMessage}
          >
            {isSendingMsg ? <Loader2 className="animate-spin" /> : 'Enviar Mensaje de Gestión'}
          </Button>
        </div>
      </BottomSheet>

      {/* ====== MODAL: Vincular Inventario ====== */}
      <BottomSheet isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} title="Vincular Equipamiento">
        <div className="space-y-6 pb-12 px-2">
           <div className="bg-amber-50 p-6 rounded-3xl flex gap-4 border border-amber-100 mb-4">
              <Package size={24} className="text-amber-600 shrink-0" />
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                Seleccione los elementos disponibles en el Depósito Central para asignarlos a este nodo operativo.
              </p>
           </div>

           <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {unassignedItems.length > 0 ? unassignedItems.map(item => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                        {item.category === 'celular' ? <Smartphone size={18} /> : 
                         item.category === 'linterna' ? <Zap size={18} /> : <Package size={18} />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900 uppercase">{item.item_name}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.serial_number || 'S/N'}</p>
                      </div>
                   </div>
                   <Button 
                     variant="primary" 
                     size="sm" 
                     className="h-9 px-4 rounded-xl text-[9px] font-black uppercase"
                     onClick={async () => {
                       await supabase.from('resource_inventory').update({ objective_id: id }).eq('id', item.id);
                       setInventory(prev => [...prev, {...item, objective_id: id}]);
                       setUnassignedItems(prev => prev.filter(i => i.id !== item.id));
                       setIsInventoryModalOpen(false);
                     }}
                   >
                     Vincular
                   </Button>
                </div>
              )) : (
                <div className="py-12 text-center text-gray-400 uppercase text-[10px] font-black italic">
                  No hay elementos disponibles en Depósito
                </div>
              )}
           </div>
        </div>
      </BottomSheet>

      {/* ====== MODAL: Programar Requerimiento de Cobertura ====== */}
      <BottomSheet 
        isOpen={isNewRequirementModalOpen} 
        onClose={() => {
          setIsNewRequirementModalOpen(false);
          setNewReqError(null);
        }} 
        title="Programar Requerimiento de Turno"
      >
        <form onSubmit={handleCreateRequirement} className="space-y-6 pb-12 px-2">
          {newReqError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-semibold">
              <AlertCircle size={16} />
              <span>{newReqError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Fecha</label>
              <Input 
                type="date"
                required
                value={newReqDate}
                onChange={e => setNewReqDate(e.target.value)}
                className="mt-1 h-12 rounded-xl bg-gray-50 border-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Hora Inicio</label>
                <Input 
                  type="time"
                  required
                  value={newReqStartTime}
                  onChange={e => setNewReqStartTime(e.target.value)}
                  className="mt-1 h-12 rounded-xl bg-gray-50 border-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Hora Fin</label>
                <Input 
                  type="time"
                  required
                  value={newReqEndTime}
                  onChange={e => setNewReqEndTime(e.target.value)}
                  className="mt-1 h-12 rounded-xl bg-gray-50 border-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Rol Requerido</label>
              <select
                value={newReqRole}
                onChange={e => setNewReqRole(e.target.value)}
                className="mt-1 w-full h-12 rounded-xl bg-gray-50 border border-gray-100 px-4 text-sm font-medium"
              >
                <option value="vigilador">Vigilador</option>
                <option value="supervisor">Supervisor</option>
                <option value="sereno">Sereno</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Notas / Observaciones</label>
              <Input 
                placeholder="Ej: Cobertura por evento especial"
                value={newReqNotes}
                onChange={e => setNewReqNotes(e.target.value)}
                className="mt-1 h-12 rounded-xl bg-gray-50 border-gray-100"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsNewRequirementModalOpen(false)}
              className="flex-1 h-12 rounded-xl uppercase text-[10px] font-black tracking-wider"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isCreatingRequirement}
              className="flex-1 h-12 rounded-xl uppercase text-[10px] font-black tracking-wider bg-zinc-900 text-white"
            >
              {isCreatingRequirement ? <Loader2 className="animate-spin" size={16} /> : 'Crear'}
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* ====== MODAL: Asistente Inteligente de Asignación ====== */}
      <AssignmentHelperModal 
        isOpen={isAssignmentHelperOpen}
        onClose={() => {
          setIsAssignmentHelperOpen(false);
          setSelectedRequirement(null);
        }}
        requirement={selectedRequirement}
        onAssignmentComplete={async () => {
          await fetchRequirements();
          // Refresh programmed shifts too
          const detailsRes = await fetch(`/api/objectives/${id}/details`);
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            const prog = (detailsData.shifts || []).filter((s: any) => s.status === 'programado' || s.status === 'activo');
            setProgrammedShifts(prog);
          }
        }}
      />

      {/* Round Map Modal */}
      <AnimatePresence>
        {isRoundMapOpen && selectedRound && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsRoundMapOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[80vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between z-10 bg-white">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                    Recorrido de Inspección
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                    Auditoría GPS • Operador {selectedRound.resources?.name || selectedRound.resource_id}
                  </p>
                </div>
                <button onClick={() => setIsRoundMapOpen(false)} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 relative bg-gray-100">
                 {roundPath.length > 0 ? (
                    <MapView 
                       guards={[]} 
                       objectives={[]} 
                       onObjectiveSelect={() => {}} 
                       center={[Number(roundPath[0].latitude), Number(roundPath[0].longitude)]}
                       pathData={roundPath.map(p => [Number(p.latitude), Number(p.longitude)])}
                       tileStyle="dark"
                    />
                 ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <MapPin size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-black uppercase tracking-widest italic">No hay coordenadas registradas</p>
                    </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4 py-1.5 px-1 hover:translate-x-1 transition-transform cursor-default group">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 border border-zinc-200 shadow-sm group-hover:border-[#0F4C5C]/50 group-hover:shadow-[#0F4C5C]/10 transition-all">
        <Icon size={16} className="text-[#0F4C5C]" />
      </div>
      <div className="flex-1 border-b border-zinc-100 pb-1.5 group-hover:border-[#0F4C5C]/20 transition-colors">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-black text-zinc-900 mt-0.5 tracking-tight uppercase truncate">{value || 'No definido'}</p>
      </div>
    </div>
  );
}
