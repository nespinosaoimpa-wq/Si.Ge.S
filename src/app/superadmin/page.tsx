'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Building2, Users, Shield, TrendingUp, Globe,
  CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronDown, Search, RefreshCw, Crown, Zap, Star,
  Activity, ShieldAlert, DollarSign, ListFilter, Play,
  Plus, X, Mail, Key, Phone, Copy, Check, Trash2
} from 'lucide-react';

interface TenantMetric {
  tenant_id: string;
  tenant_name: string;
  billing_status: string;
  plan_tier: string;
  country_code: string;
  created_at: string;
  total_users: number;
  total_operators: number;
  total_objectives: number;
  active_shifts: number;
  open_alarms: number;
}

interface BillingEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  amount: number | null;
  currency: string;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
  tenants: { name: string } | null;
}

interface GuardShift {
  id: string;
  checkin_time: string;
  checkout_time: string | null;
  status: string;
  resources: { name: string } | null;
  objectives: { name: string } | null;
  tenants: { name: string } | null;
}

interface Alarm {
  id: string;
  alarm_type: string;
  status: string;
  created_at: string;
  objectives: { name: string } | null;
  tenants: { name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Activo', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle2 },
  trial: { label: 'Prueba', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Clock },
  suspended: { label: 'Suspendido', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20', icon: XCircle },
};

const PLAN_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  starter: { label: 'Básico', icon: Zap, color: 'text-blue-400' },
  professional: { label: 'Profesional', icon: Star, color: 'text-violet-400' },
  full: { label: 'Único Full', icon: Star, color: 'text-violet-400' },
  enterprise: { label: 'Corporativo', icon: Crown, color: 'text-amber-400' },
  trial: { label: 'Prueba Gratuita', icon: Clock, color: 'text-zinc-400' },
};

const COUNTRY_FLAGS: Record<string, string> = {
  ar: '🇦🇷', mx: '🇲🇽', cl: '🇨🇱', co: '🇨🇴',
  uy: '🇺🇾', br: '🇧🇷', pe: '🇵🇪', us: '🇺🇸', es: '🇪🇸',
};

const BILLING_EVENT_LABELS: Record<string, { label: string; color: string }> = {
  subscription_started: { label: 'Suscripción Iniciada', color: 'text-emerald-400 bg-emerald-500/10' },
  payment_received: { label: 'Pago Recibido', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
  payment_failed: { label: 'Pago Rechazado', color: 'text-red-400 bg-red-500/10 border border-red-500/20' },
  plan_upgraded: { label: 'Plan Elevado', color: 'text-violet-400 bg-violet-500/10' },
  plan_downgraded: { label: 'Plan Reducido', color: 'text-zinc-400 bg-zinc-500/10' },
  trial_started: { label: 'Trial Iniciado', color: 'text-blue-400 bg-blue-500/10 border border-blue-500/20' },
  trial_expired: { label: 'Trial Vencido', color: 'text-orange-400 bg-orange-500/10' },
  account_suspended: { label: 'Cuenta Suspendida', color: 'text-red-400 bg-red-500/10 border border-red-500/30' },
  account_reactivated: { label: 'Cuenta Reactivada', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' },
};

interface FinancialRecord {
  id: string;
  type: 'gasto' | 'ingreso' | 'inversion';
  category: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'tenants' | 'audit' | 'finance'>('tenants');
  const [tenants, setTenants] = useState<TenantMetric[]>([]);
  const [deletedTenantIds, setDeletedTenantIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('sigpad_deleted_tenants') || '[]');
      } catch { return []; }
    }
    return [];
  });
  
  // Audit stats
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [recentShifts, setRecentShifts] = useState<GuardShift[]>([]);
  const [criticalAlarms, setCriticalAlarms] = useState<Alarm[]>([]);

  // Finance & Market state
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [finType, setFinType] = useState<'gasto' | 'ingreso' | 'inversion'>('gasto');
  const [finCategory, setFinCategory] = useState('Servicios / Hosting');
  const [finDescription, setFinDescription] = useState('');
  const [finAmount, setFinAmount] = useState('');
  const [finCurrency, setFinCurrency] = useState('ARS');
  const [isAddingFinRecord, setIsAddingFinRecord] = useState(false);

  // Market Simulator State
  const [simGuards, setSimGuards] = useState(15);
  const [simObjectives, setSimObjectives] = useState(3);
  const [simPricePerGuard, setSimPricePerGuard] = useState(45000);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New Tenant Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Form State
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('ar');
  const [planTier, setPlanTier] = useState('full');
  const [adminEmail, setAdminEmail] = useState('');

  // Invitation Success States
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [createdCompanyName, setCreatedCompanyName] = useState('');
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSwitchTenant = async (tenantId: string, tenantName: string) => {
    setActionLoading(tenantId);
    try {
      const res = await fetch('/api/tenants/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conmutar empresa');

      if (data.user) {
        localStorage.setItem('SIGPAD_user', JSON.stringify(data.user));
        document.cookie = `SIGPAD_user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=2592000`;
        document.cookie = "SIGPAD_bypass_active=true; path=/; max-age=2592000";
      }
      window.location.href = '/gerente';
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      const res = await fetch('/api/tenants/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          taxId,
          phone,
          countryCode,
          planTier,
          adminEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la empresa.');
      
      // Si el plan no es trial, actualizar estado a active y asignar plan correcto
      if (planTier !== 'trial') {
        await fetch('/api/tenants', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: data.tenantId, plan_tier: planTier, billing_status: 'active' }),
        });
      }

      const newTenantId = data.tenantId || `tenant-${Date.now()}`;
      const newTenantMetric: TenantMetric = {
        tenant_id: newTenantId,
        tenant_name: companyName,
        billing_status: planTier === 'trial' ? 'trial' : 'active',
        plan_tier: planTier,
        country_code: countryCode,
        created_at: new Date().toISOString(),
        total_users: 1,
        total_operators: 0,
        total_objectives: 0,
        active_shifts: 0,
        open_alarms: 0,
      };

      setTenants(prev => [newTenantMetric, ...prev.filter(t => t.tenant_id !== newTenantMetric.tenant_id)]);

      // Establecer estados de éxito de invitación
      setGeneratedInviteLink(data.inviteLink || `https://sigpad.com.ar/register?email=${encodeURIComponent(adminEmail.toLowerCase().trim())}`);
      setCreatedCompanyName(companyName);
      setCreatedTenantId(newTenantId);
      setCopiedLink(false);

      // Reset form
      setCompanyName('');
      setTaxId('');
      setPhone('');
      setCountryCode('ar');
      setPlanTier('full');
      setAdminEmail('');
      
      fetchTenants();
      fetchAuditLogs();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenants');
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json();
      const dbTenants = data.tenants || [];
      if (dbTenants.length > 0) {
        setTenants(dbTenants);
      } else {
        setTenants(DEMO_TENANTS);
      }
    } catch {
      setTenants(DEMO_TENANTS);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/audit');
      if (res.ok) {
        const data = await res.json();
        setBillingEvents(data.billingEvents || []);
        setRecentShifts(data.recentShifts || []);
        setCriticalAlarms(data.criticalAlarms || []);
      } else {
        setBillingEvents(DEMO_BILLING_EVENTS);
        setRecentShifts(DEMO_SHIFTS);
        setCriticalAlarms(DEMO_ALARMS);
      }
    } catch {
      setBillingEvents(DEMO_BILLING_EVENTS);
      setRecentShifts(DEMO_SHIFTS);
      setCriticalAlarms(DEMO_ALARMS);
    }
  }, []);

  const fetchFinancialRecords = useCallback(async () => {
    let localRecs: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sigpad_financial_records');
        if (stored) localRecs = JSON.parse(stored);
      } catch (e) {
        console.warn('localStorage parse error:', e);
      }
    }

    try {
      const res = await fetch('/api/superadmin/finance');
      if (res.ok) {
        const data = await res.json();
        const apiRecords = data.records || [];
        const merged = [...apiRecords];
        localRecs.forEach(lr => {
          if (!merged.some(mr => mr.id === lr.id)) {
            merged.push(lr);
          }
        });
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setFinancialRecords(merged);
        return;
      }
    } catch (e) {
      console.warn('[FINANCE_FETCH] API error, using local fallback:', e);
    }

    setFinancialRecords(localRecs);
  }, []);

  useEffect(() => {
    fetchTenants();
    fetchAuditLogs();
    fetchFinancialRecords();
  }, [fetchTenants, fetchAuditLogs, fetchFinancialRecords]);

  const handleRefresh = () => {
    fetchTenants();
    fetchAuditLogs();
    fetchFinancialRecords();
  };

  const handleAddFinancialRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finDescription || !finAmount) return;
    setIsAddingFinRecord(true);

    const newRecord = {
      id: `fin-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: finType,
      category: finCategory,
      description: finDescription,
      amount: parseFloat(finAmount),
      currency: finCurrency,
      status: 'pagado',
      created_at: new Date().toISOString()
    };

    // 🚀 Actualización optimista de UI y persistencia local inmediata
    setFinancialRecords(prev => {
      const next = [newRecord, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('sigpad_financial_records', JSON.stringify(next));
      }
      return next;
    });

    const currentDesc = finDescription;
    const currentAmount = finAmount;
    setFinDescription('');
    setFinAmount('');

    try {
      const res = await fetch('/api/superadmin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: finType,
          category: finCategory,
          description: currentDesc,
          amount: parseFloat(currentAmount),
          currency: finCurrency,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn('[FINANCE_POST] DB sync notice:', errData.error);
      } else {
        fetchFinancialRecords();
      }
    } catch (err: any) {
      console.warn('[FINANCE_POST] Network notice:', err.message);
    } finally {
      setIsAddingFinRecord(false);
    }
  };

  const handleDeleteFinancialRecord = async (id: string) => {
    if (!confirm('¿Eliminar este registro financiero?')) return;
    setFinancialRecords(prev => {
      const next = prev.filter(r => r.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sigpad_financial_records', JSON.stringify(next));
      }
      return next;
    });

    try {
      await fetch(`/api/superadmin/finance?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[FINANCE_DELETE] Error:', e);
    }
  };

  const updateTenant = async (tenantId: string, updates: Record<string, string>) => {
    setActionLoading(tenantId);
    try {
      await fetch('/api/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...updates }),
      });
      await fetchTenants();
      await fetchAuditLogs();
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`¿Estás seguro de ELIMINAR permanentemente la empresa "${tenantName}"?\nEsta acción borrará sus objetivos, turnos y personal asociado.`)) {
      return;
    }
    setActionLoading(tenantId);

    // 1. Guardar en el conjunto de eliminados persistente
    setDeletedTenantIds(prev => {
      const next = [...prev, tenantId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('sigpad_deleted_tenants', JSON.stringify(next));
      }
      return next;
    });

    try {
      // 2. Ejecutar borrado en backend
      const res = await fetch(`/api/tenants?tenantId=${tenantId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn('API delete tenant error:', data);
      }
    } catch (e) {
      console.warn('Fetch delete tenant error:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const visibleTenants = tenants.filter(t => !deletedTenantIds.includes(t.tenant_id));

  const filtered = visibleTenants.filter(t => {
    const matchSearch = t.tenant_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.billing_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: visibleTenants.length,
    active: visibleTenants.filter(t => t.billing_status === 'active').length,
    trial: visibleTenants.filter(t => t.billing_status === 'trial').length,
    suspended: visibleTenants.filter(t => t.billing_status === 'suspended').length,
    totalOperators: visibleTenants.reduce((s, t) => s + (t.total_operators || 0), 0),
    activeShifts: visibleTenants.reduce((s, t) => s + (t.active_shifts || 0), 0),
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-amber-400 animate-pulse" />
            <span className="font-black text-sm tracking-tight">SIGPAD <span className="text-amber-400">DUEÑO DE PLATAFORMA</span></span>
          </div>

          {/* Tab Selection */}
          <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('tenants')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'tenants' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 size={13} className="inline mr-1.5" />
              Empresas (Tenants)
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'audit' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Activity size={13} className="inline mr-1.5" />
              Auditoría Global
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'finance' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <DollarSign size={13} className="inline mr-1.5" />
              Finanzas y Mercado
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-md shadow-amber-500/10"
            >
              <Plus size={13} />
              Crear Empresa
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <div className="w-px h-4 bg-zinc-800" />
            <a href="/login" className="text-xs text-zinc-500 hover:text-white transition-colors">Cerrar sesión</a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Empresas', value: stats.total, color: 'text-white', icon: Building2 },
            { label: 'Activas', value: stats.active, color: 'text-emerald-400', icon: CheckCircle2 },
            { label: 'En prueba', value: stats.trial, color: 'text-blue-400', icon: Clock },
            { label: 'Suspendidas', value: stats.suspended, color: 'text-red-400', icon: XCircle },
            { label: 'Guardias totales', value: stats.totalOperators, color: 'text-violet-400', icon: Users },
            { label: 'Turnos activos', value: stats.activeShifts, color: 'text-amber-400', icon: Shield },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} className={stat.color} />
                <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─── TAB 1: TENANTS LIST ─── */}
          {activeTab === 'tenants' && (
            <motion.div
              key="tenants"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar empresa..."
                    className="w-full h-10 pl-9 pr-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'active', 'trial', 'suspended'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-4 h-10 rounded-xl text-xs font-semibold transition-all ${
                        filterStatus === s
                          ? 'bg-white text-zinc-950'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {s === 'all' ? 'Todas' : STATUS_CONFIG[s]?.label || s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tenants Table */}
              <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/80 bg-zinc-950/40">
                        {['Empresa', 'Estado', 'Plan', 'Guardias', 'Objetivos', 'Turnos activos', 'Registro', 'Acciones'].map(h => (
                          <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="border-b border-zinc-800/40">
                            {Array.from({ length: 8 }).map((_, j) => (
                              <td key={j} className="px-5 py-4.5">
                                <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-12 text-center text-zinc-500 text-sm font-semibold">
                            No se encontraron empresas registradas.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((tenant) => {
                          const status = STATUS_CONFIG[tenant.billing_status] || STATUS_CONFIG.trial;
                          const plan = PLAN_CONFIG[tenant.plan_tier] || PLAN_CONFIG.trial;
                          const isLoading = actionLoading === tenant.tenant_id;
                          return (
                            <tr
                              key={tenant.tenant_id}
                              className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg">{COUNTRY_FLAGS[tenant.country_code] || '🌐'}</span>
                                  <div>
                                    <div className="text-sm font-bold text-white tracking-tight">{tenant.tenant_name}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono">{tenant.tenant_id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wider ${status.color}`}>
                                  <status.icon size={11} />
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`flex items-center gap-1.5 text-xs font-semibold ${plan.color}`}>
                                  <plan.icon size={13} />
                                  {plan.label}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm font-mono font-semibold text-zinc-300">{tenant.total_operators || 0}</td>
                              <td className="px-5 py-4 text-sm font-mono font-semibold text-zinc-300">{tenant.total_objectives || 0}</td>
                              <td className="px-5 py-4">
                                <span className={`text-sm font-mono font-bold ${tenant.active_shifts > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                  {tenant.active_shifts || 0}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-xs font-mono text-zinc-400">
                                {new Date(tenant.created_at).toLocaleDateString('es-AR')}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSwitchTenant(tenant.tenant_id, tenant.tenant_name)}
                                    disabled={isLoading}
                                    className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all font-semibold uppercase tracking-wider disabled:opacity-50 flex items-center gap-1 shadow-sm"
                                    title="Ingresar a esta empresa como Gerente"
                                  >
                                    ⚡ Entrar / Probar
                                  </button>
                                  {tenant.billing_status !== 'suspended' ? (
                                    <button
                                      onClick={() => updateTenant(tenant.tenant_id, { billing_status: 'suspended' })}
                                      disabled={isLoading}
                                      className="text-xs px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-all font-semibold uppercase tracking-wider disabled:opacity-50"
                                    >
                                      Suspender
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => updateTenant(tenant.tenant_id, { billing_status: 'active' })}
                                      disabled={isLoading}
                                      className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 transition-all font-semibold uppercase tracking-wider disabled:opacity-50"
                                    >
                                      Reactivar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteTenant(tenant.tenant_id, tenant.tenant_name)}
                                    disabled={isLoading}
                                    className="p-1.5 rounded-xl bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-800 transition-all disabled:opacity-50"
                                    title="Eliminar Empresa Permanentemente"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── TAB 2: SYSTEM AUDIT LOGS ─── */}
          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Column 1: Billing & SaaS Events */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historial de Cobros y SaaS</h3>
                  </div>
                  <span className="text-[9px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono">Live</span>
                </div>
                <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                  {billingEvents.length === 0 ? (
                    <p className="text-xs text-zinc-650 text-center py-8">Sin eventos de facturación registrados.</p>
                  ) : (
                    billingEvents.map(evt => {
                      const meta = BILLING_EVENT_LABELS[evt.event_type] || { label: evt.event_type, color: 'bg-zinc-800 text-white' };
                      return (
                        <div key={evt.id} className="bg-zinc-950/40 p-3 rounded-2xl border border-zinc-850 hover:border-zinc-800 transition-all">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-white font-bold text-xs">{evt.tenants?.name || 'Empresa Desconocida'}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wide ${meta.color}`}>
                              {meta.label}
                            </span>
                          </div>
                          {evt.notes && <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">{evt.notes}</p>}
                          {evt.amount && (
                            <div className="text-[10px] text-emerald-400 font-black mt-1">
                              Monto: {evt.currency} {evt.amount.toLocaleString()}
                            </div>
                          )}
                          <div className="text-[9px] text-zinc-600 font-medium mt-1.5 flex items-center justify-between">
                            <span>{evt.invoice_number ? `Factura: ${evt.invoice_number}` : ''}</span>
                            <span>{new Date(evt.created_at).toLocaleString('es-AR')}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 2: Guard Shifts Activity (Check-ins) */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-violet-400 animate-pulse" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Actividad de Guardias (Fichajes)</h3>
                  </div>
                  <span className="text-[9px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono">Live</span>
                </div>
                <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                  {recentShifts.length === 0 ? (
                    <p className="text-xs text-zinc-650 text-center py-8">Sin registros de fichaje en la plataforma.</p>
                  ) : (
                    recentShifts.map(shift => (
                      <div key={shift.id} className="bg-zinc-950/40 p-3 rounded-2xl border border-zinc-850">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-white font-bold text-xs">{shift.resources?.name || 'Operador'}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-lg",
                            shift.status === 'activo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                          )}>
                            {shift.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          📍 Objetivo: <strong className="text-zinc-200">{shift.objectives?.name || 'No asignado'}</strong>
                        </p>
                        <p className="text-[9px] text-zinc-650 font-bold uppercase tracking-wider mt-1">
                          🏢 Empresa: {shift.tenants?.name || 'SIGPAD'}
                        </p>
                        <div className="text-[9px] text-zinc-600 font-medium mt-2 flex items-center justify-between">
                          <span>Entrada: {new Date(shift.checkin_time).toLocaleTimeString('es-AR')}</span>
                          <span>{new Date(shift.checkin_time).toLocaleDateString('es-AR')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Critical Security Alarms */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-red-400 animate-bounce" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Alarmas de Pánico Globales</h3>
                  </div>
                  <span className="text-[9px] bg-red-950/30 text-red-500 px-2 py-0.5 rounded font-mono">Live</span>
                </div>
                <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                  {criticalAlarms.length === 0 ? (
                    <p className="text-xs text-zinc-650 text-center py-8">No se han disparado alarmas en la plataforma.</p>
                  ) : (
                    criticalAlarms.map(alarm => (
                      <div key={alarm.id} className="bg-red-950/10 p-3 rounded-2xl border border-red-900/25">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-red-400 font-bold text-xs uppercase tracking-wide flex items-center gap-1">
                            ⚠️ Alarma {alarm.alarm_type}
                          </span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border",
                            alarm.status === 'active' 
                              ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          )}>
                            {alarm.status === 'active' ? 'Crítica / Activa' : alarm.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-300 font-semibold mt-1">
                          Ubicación: {alarm.objectives?.name || 'Desconocida'}
                        </p>
                        <p className="text-[9px] text-red-400/60 font-black uppercase tracking-wider">
                          Empresa: {alarm.tenants?.name || 'Socio Externo'}
                        </p>
                        <div className="text-[9px] text-zinc-600 font-medium mt-2 flex justify-between">
                          <span>Reporte: {new Date(alarm.created_at).toLocaleTimeString('es-AR')}</span>
                          <span>{new Date(alarm.created_at).toLocaleDateString('es-AR')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── TAB 3: FINANZAS Y ESTUDIO DE MERCADO ─── */}
          {activeTab === 'finance' && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Financial KPIs Summary */}
              {(() => {
                const totalGastos = financialRecords
                  .filter(r => r.type === 'gasto')
                  .reduce((sum, r) => sum + r.amount, 0);
                const totalIngresos = financialRecords
                  .filter(r => r.type === 'ingreso')
                  .reduce((sum, r) => sum + r.amount, 0);
                const totalInversiones = financialRecords
                  .filter(r => r.type === 'inversion')
                  .reduce((sum, r) => sum + r.amount, 0);
                const resultadoNeto = totalIngresos - totalGastos;
                const margenPct = totalIngresos > 0 ? ((resultadoNeto / totalIngresos) * 100).toFixed(1) : '100';

                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                      <div className="flex items-center gap-2 mb-2 text-emerald-400">
                        <TrendingUp size={16} />
                        <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Ingresos Totales</span>
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono">$ {totalIngresos.toLocaleString('es-AR')}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">Cobros de membresías SaaS + Venta directa</div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                      <div className="flex items-center gap-2 mb-2 text-red-400">
                        <DollarSign size={16} />
                        <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Gastos Operativos</span>
                      </div>
                      <div className="text-2xl font-black text-red-400 font-mono">$ {totalGastos.toLocaleString('es-AR')}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">Hosting, Vercel, Supabase, Servicios</div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                      <div className="flex items-center gap-2 mb-2 text-amber-400">
                        <Zap size={16} />
                        <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Inversiones en Desarrollo</span>
                      </div>
                      <div className="text-2xl font-black text-amber-400 font-mono">$ {totalInversiones.toLocaleString('es-AR')}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">Publicidad, equipamiento y licencias</div>
                    </div>

                    <div className="bg-zinc-900/60 border border-amber-500/30 bg-amber-500/5 rounded-3xl p-5 shadow-xl">
                      <div className="flex items-center gap-2 mb-2 text-amber-300">
                        <Crown size={16} />
                        <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Resultado Neto (Profit)</span>
                      </div>
                      <div className="text-2xl font-black text-white font-mono">$ {resultadoNeto.toLocaleString('es-AR')}</div>
                      <div className="text-[10px] text-emerald-400 font-bold mt-1">Margen Neto: {margenPct}%</div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1 & 2: Financial Movements & Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Register New Movement */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Plus size={16} className="text-amber-400" />
                      Registrar Movimiento Financiero (Gasto / Ingreso / Inversión)
                    </h3>
                    <form onSubmit={handleAddFinancialRecord} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Tipo de Flujo</label>
                        <select
                          value={finType}
                          onChange={e => setFinType(e.target.value as any)}
                          className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                        >
                          <option value="gasto">🔻 Gasto Operativo</option>
                          <option value="ingreso">🟢 Ingreso / Cobro</option>
                          <option value="inversion">⚡ Inversión / Capital</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Categoría</label>
                        <select
                          value={finCategory}
                          onChange={e => setFinCategory(e.target.value)}
                          className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                        >
                          <option value="Servicios / Hosting">Servicios / Hosting (Supabase, Vercel)</option>
                          <option value="Marketing / Publicidad">Marketing / Publicidad</option>
                          <option value="Desarrollo / Personal">Desarrollo / Personal</option>
                          <option value="Membresía Cliente">Membresía Cliente (Ingreso)</option>
                          <option value="Equipamiento / Licencias">Equipamiento / Licencias</option>
                          <option value="Otros Gastos">Otros Gastos</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Monto ($)</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={finAmount}
                          onChange={e => setFinAmount(e.target.value)}
                          placeholder="Ej: 25000"
                          className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-4 flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Descripción</label>
                          <input
                            type="text"
                            required
                            value={finDescription}
                            onChange={e => setFinDescription(e.target.value)}
                            placeholder="Ej: Pago mensual Supabase Pro + Vercel"
                            className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isAddingFinRecord}
                          className="h-10 px-6 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 whitespace-nowrap disabled:opacity-50"
                        >
                          {isAddingFinRecord ? 'Guardando...' : '+ Guardar'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Movements Table */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Historial de Movimientos Registrados</h3>
                    {financialRecords.length === 0 ? (
                      <div className="text-center py-10 text-zinc-500 text-xs font-semibold">
                        No hay movimientos registrados. Agrega gastos, ingresos o inversiones arriba.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-zinc-800 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              <th className="py-3 px-4">Fecha</th>
                              <th className="py-3 px-4">Tipo</th>
                              <th className="py-3 px-4">Categoría</th>
                              <th className="py-3 px-4">Descripción</th>
                              <th className="py-3 px-4 text-right">Monto</th>
                              <th className="py-3 px-4 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/40">
                            {financialRecords.map(rec => (
                              <tr key={rec.id} className="hover:bg-zinc-800/20 text-xs">
                                <td className="py-3 px-4 font-mono text-zinc-400">
                                  {new Date(rec.created_at).toLocaleDateString('es-AR')}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    rec.type === 'ingreso' ? 'bg-emerald-500/10 text-emerald-400' :
                                    rec.type === 'inversion' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                                  }`}>
                                    {rec.type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-zinc-300 font-semibold">{rec.category}</td>
                                <td className="py-3 px-4 text-zinc-400">{rec.description}</td>
                                <td className={`py-3 px-4 text-right font-mono font-bold ${
                                  rec.type === 'ingreso' ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {rec.type === 'ingreso' ? '+' : '-'}$ {rec.amount.toLocaleString('es-AR')}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => handleDeleteFinancialRecord(rec.id)}
                                    className="p-1 hover:text-red-400 text-zinc-600 transition-colors"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 3: Market Study & Pricing Simulator */}
                <div className="bg-zinc-900/40 border border-amber-500/20 rounded-3xl p-6 shadow-xl space-y-6">
                  <div className="border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Star size={18} />
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Simulador de Cotización y Mercado</h3>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">Calcula el margen neto antes de enviar una propuesta comercial a una empresa cliente.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Cantidad de Guardias del Cliente: <strong className="text-amber-400 font-mono text-xs">{simGuards}</strong>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={200}
                        value={simGuards}
                        onChange={e => setSimGuards(parseInt(e.target.value) || 1)}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Puestos / Objetivos Activos: <strong className="text-amber-400 font-mono text-xs">{simObjectives}</strong>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={simObjectives}
                        onChange={e => setSimObjectives(parseInt(e.target.value) || 1)}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Tarifa Estimada Membresía ($/mes)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={simPricePerGuard}
                        onChange={e => setSimPricePerGuard(parseFloat(e.target.value) || 0)}
                        className="w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Simulator Results */}
                  {(() => {
                    const ingresoMensual = simPricePerGuard;
                    // Costo infra aproximado (Supabase/Vercel) asignable por cliente
                    const costoInfraEstimado = 3500 + (simGuards * 150);
                    const gananciaNeta = ingresoMensual - costoInfraEstimado;
                    const margenPct = ingresoMensual > 0 ? ((gananciaNeta / ingresoMensual) * 100).toFixed(1) : '0';

                    return (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">Ingreso Mensual Cobrado:</span>
                          <span className="font-mono font-bold text-emerald-400">$ {ingresoMensual.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">Costo Servidor Atribuido:</span>
                          <span className="font-mono font-bold text-red-400">$ {costoInfraEstimado.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="border-t border-zinc-800 pt-2 flex justify-between items-center text-sm">
                          <span className="text-white font-bold">Ganancia Neta Estimada:</span>
                          <span className="font-mono font-black text-amber-400">$ {gananciaNeta.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="text-right text-[10px] font-bold text-emerald-400">
                          Margen Neto de Rentabilidad: {margenPct}%
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL CREAR EMPRESA */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6"
              >
                <div className="flex justify-between items-center mb-6 border-b border-zinc-900 pb-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="text-amber-400" size={20} />
                    <h2 className="text-base font-black text-white uppercase tracking-wider">Crear Nueva Empresa (SaaS)</h2>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-1.5 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {createError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
                    {createError}
                  </div>
                )}

                {generatedInviteLink ? (
                  <div className="space-y-6 py-4 text-center">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
                      <Check className="text-amber-400" size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">¡Empresa Registrada!</h3>
                      <p className="text-xs text-zinc-400">
                        La estructura para <strong className="text-white">{createdCompanyName}</strong> fue creada en la nube.
                      </p>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-left space-y-2">
                      <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Enlace de Registro para el Gerente</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedInviteLink}
                          className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedInviteLink);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          className="px-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                        >
                          {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                          {copiedLink ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-normal">
                        Envíale este enlace al gerente de la empresa para que pueda configurar su nombre y elegir su contraseña de forma segura.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          if (createdTenantId) {
                            handleSwitchTenant(createdTenantId, createdCompanyName);
                          }
                        }}
                        className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                      >
                        ⚡ Ingresar a {createdCompanyName} ahora →
                      </button>
                      <button
                        onClick={() => {
                          setIsCreateModalOpen(false);
                          setGeneratedInviteLink(null);
                        }}
                        className="w-full h-11 bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        Cerrar Ventana
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateTenant} className="space-y-4">
                    {/* SECCIÓN 1: DATOS DE LA EMPRESA */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">1. Datos de la Empresa</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-zinc-400">Razón Social</label>
                          <div className="relative">
                            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                              type="text"
                              required
                              placeholder="Ej: Seguridad Norte S.A."
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-xs pl-9 pr-3 focus:border-zinc-600 focus:outline-none placeholder:text-zinc-600 transition-colors"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-zinc-400">CUIT / ID Fiscal (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ej: 30-12345678-9"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-xs px-3 focus:border-zinc-600 focus:outline-none placeholder:text-zinc-600 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5 col-span-2">
                          <label className="text-[10px] font-semibold text-zinc-400">Teléfono</label>
                          <div className="relative">
                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                              type="text"
                              placeholder="Ej: +54 341 555-0000"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-xs pl-9 pr-3 focus:border-zinc-600 focus:outline-none placeholder:text-zinc-600 transition-colors"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-zinc-400">País</label>
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-xs px-3 focus:border-zinc-600 focus:outline-none transition-colors"
                          >
                            <option value="ar">🇦🇷 Argentina</option>
                            <option value="mx">🇲🇽 México</option>
                            <option value="cl">🇨🇱 Chile</option>
                            <option value="co">🇨🇴 Colombia</option>
                            <option value="uy">🇺🇾 Uruguay</option>
                            <option value="br">🇧🇷 Brasil</option>
                            <option value="pe">🇵🇪 Perú</option>
                            <option value="us">🇺🇸 EE.UU.</option>
                            <option value="es">🇪🇸 España</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-400">Plan Inicial</label>
                        <select
                          value={planTier}
                          onChange={(e) => setPlanTier(e.target.value)}
                          className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-xs px-3 focus:border-zinc-600 focus:outline-none transition-colors"
                        >
                          <option value="full">Plan Único Full — $400.000 ARS/mes (20 obj / 50 guardias)</option>
                          <option value="trial">Prueba Gratis (14 días)</option>
                        </select>
                      </div>
                    </div>

                    <div className="h-px bg-zinc-900 my-2" />

                    {/* SECCIÓN 2: DATOS DEL ADMINISTRADOR */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">2. Cuenta de Administrador (Gerente)</h3>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-400">Correo Electrónico del Gerente</label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input
                            type="email"
                            required
                            placeholder="Ej: gerente@empresa.com"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-xs pl-9 pr-3 focus:border-zinc-600 focus:outline-none placeholder:text-zinc-600 transition-colors"
                          />
                        </div>
                        <p className="text-[9px] text-zinc-500 leading-normal pl-1">
                          El gerente recibirá el enlace para crear su contraseña y completar sus datos.
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="flex-1 h-11 bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={createLoading}
                        className="flex-1 h-11 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        {createLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Pre-registrando...
                          </>
                        ) : (
                          'Registrar Empresa'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── DEMO DATA FALLBACKS ───

const DEMO_TENANTS: TenantMetric[] = [
  { tenant_id: 'demo-1', tenant_name: 'Seguridad Norte S.A.', billing_status: 'active', plan_tier: 'professional', country_code: 'ar', created_at: '2025-01-15', total_users: 5, total_operators: 48, total_objectives: 12, active_shifts: 8, open_alarms: 0 },
  { tenant_id: 'demo-2', tenant_name: 'Vigilancia del Sur', billing_status: 'trial', plan_tier: 'starter', country_code: 'ar', created_at: '2025-07-01', total_users: 2, total_operators: 8, total_objectives: 3, active_shifts: 2, open_alarms: 1 },
  { tenant_id: 'demo-3', tenant_name: 'SecureMex Corp', billing_status: 'active', plan_tier: 'enterprise', country_code: 'mx', created_at: '2024-11-20', total_users: 12, total_operators: 150, total_objectives: 45, active_shifts: 32, open_alarms: 0 },
  { tenant_id: 'demo-4', tenant_name: 'SafeGuard Chile', billing_status: 'suspended', plan_tier: 'professional', country_code: 'cl', created_at: '2025-03-10', total_users: 3, total_operators: 22, total_objectives: 8, active_shifts: 0, open_alarms: 0 },
];

const DEMO_BILLING_EVENTS: BillingEvent[] = [
  { id: 'b-1', tenant_id: 'demo-1', event_type: 'payment_received', amount: 129.00, currency: 'USD', invoice_number: 'FAC-00483', notes: 'Cobro mensual exitoso — Plan Professional', created_at: '2026-07-09T18:30:00Z', tenants: { name: 'Seguridad Norte S.A.' } },
  { id: 'b-2', tenant_id: 'demo-2', event_type: 'trial_started', amount: null, currency: 'USD', invoice_number: null, notes: 'Comienzo de período de prueba de 14 días', created_at: '2026-07-08T10:15:00Z', tenants: { name: 'Vigilancia del Sur' } },
  { id: 'b-3', tenant_id: 'demo-4', event_type: 'payment_failed', amount: 129.00, currency: 'USD', invoice_number: 'FAC-00481', notes: 'Rechazo de tarjeta corporativa — Intento 2 fallido', created_at: '2026-07-05T00:00:00Z', tenants: { name: 'SafeGuard Chile' } },
];

const DEMO_SHIFTS: GuardShift[] = [
  { id: 's-1', checkin_time: '2026-07-10T12:00:00Z', checkout_time: null, status: 'activo', resources: { name: 'Carlos Méndez' }, objectives: { name: 'Supermercado Norte' }, tenants: { name: 'Seguridad Norte S.A.' } },
  { id: 's-2', checkin_time: '2026-07-10T11:45:00Z', checkout_time: null, status: 'activo', resources: { name: 'Marta Ruiz' }, objectives: { name: 'Banco Centro' }, tenants: { name: 'Seguridad Norte S.A.' } },
  { id: 's-3', checkin_time: '2026-07-10T08:00:00Z', checkout_time: null, status: 'activo', resources: { name: 'José Luis' }, objectives: { name: 'Planta Industrial Sur' }, tenants: { name: 'SecureMex Corp' } },
];

const DEMO_ALARMS: Alarm[] = [
  { id: 'a-1', alarm_type: 'PÁNICO', status: 'active', created_at: '2026-07-10T12:45:00Z', objectives: { name: 'Banco Centro' }, tenants: { name: 'Seguridad Norte S.A.' } },
  { id: 'a-2', alarm_type: 'INTRUSIÓN', status: 'acknowledged', created_at: '2026-07-10T10:20:00Z', objectives: { name: 'Planta Industrial Sur' }, tenants: { name: 'SecureMex Corp' } },
];
