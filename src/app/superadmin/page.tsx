'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, Shield, TrendingUp, Globe,
  CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronDown, Search, RefreshCw, Crown, Zap, Star,
  Activity, ShieldAlert, DollarSign, ListFilter, Play
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
  starter: { label: 'Starter', icon: Zap, color: 'text-blue-400' },
  professional: { label: 'Professional', icon: Star, color: 'text-violet-400' },
  enterprise: { label: 'Enterprise', icon: Crown, color: 'text-amber-400' },
  trial: { label: 'Trial', icon: Clock, color: 'text-zinc-400' },
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

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'tenants' | 'audit'>('tenants');
  const [tenants, setTenants] = useState<TenantMetric[]>([]);
  
  // Audit stats
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [recentShifts, setRecentShifts] = useState<GuardShift[]>([]);
  const [criticalAlarms, setCriticalAlarms] = useState<Alarm[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenants');
      if (!res.ok) throw new Error('No autorizado');
      const data = await res.json();
      setTenants(data.tenants || []);
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

  useEffect(() => {
    fetchTenants();
    fetchAuditLogs();
  }, [fetchTenants, fetchAuditLogs]);

  const handleRefresh = () => {
    fetchTenants();
    fetchAuditLogs();
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

  const filtered = tenants.filter(t => {
    const matchSearch = t.tenant_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.billing_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.billing_status === 'active').length,
    trial: tenants.filter(t => t.billing_status === 'trial').length,
    suspended: tenants.filter(t => t.billing_status === 'suspended').length,
    totalOperators: tenants.reduce((s, t) => s + (t.total_operators || 0), 0),
    activeShifts: tenants.reduce((s, t) => s + (t.active_shifts || 0), 0),
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-amber-400 animate-pulse" />
            <span className="font-black text-sm tracking-tight">SIGPAD <span className="text-amber-400">SUPER ADMIN</span></span>
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
          </div>

          <div className="flex items-center gap-3">
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
                      <tr className="border-b border-zinc-800/80 bg-zinc-950/20">
                        {['Empresa', 'Estado', 'Plan', 'Guardias', 'Objetivos', 'Turnos activos', 'Registro', 'Acciones'].map(h => (
                          <th key={h} className="px-5 py-4.5 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">
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
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{COUNTRY_FLAGS[tenant.country_code] || '🌐'}</span>
                                  <div>
                                    <div className="text-sm font-bold text-white">{tenant.tenant_name}</div>
                                    <div className="text-[9px] text-zinc-500 font-mono">{tenant.tenant_id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wide ${status.color}`}>
                                  <status.icon size={10} />
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`flex items-center gap-1.5 text-xs font-bold ${plan.color}`}>
                                  <plan.icon size={12} />
                                  {plan.label}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm font-semibold text-zinc-300">{tenant.total_operators || 0}</td>
                              <td className="px-5 py-4 text-sm font-semibold text-zinc-300">{tenant.total_objectives || 0}</td>
                              <td className="px-5 py-4">
                                <span className={`text-sm font-black ${tenant.active_shifts > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                  {tenant.active_shifts || 0}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-xs text-zinc-500 font-medium">
                                {new Date(tenant.created_at).toLocaleDateString('es-AR')}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  {tenant.billing_status !== 'suspended' ? (
                                    <button
                                      onClick={() => updateTenant(tenant.tenant_id, { billing_status: 'suspended' })}
                                      disabled={isLoading}
                                      className="text-[10px] px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 transition-all font-black uppercase tracking-wider disabled:opacity-50"
                                    >
                                      Suspender
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => updateTenant(tenant.tenant_id, { billing_status: 'active' })}
                                      disabled={isLoading}
                                      className="text-[10px] px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 transition-all font-black uppercase tracking-wider disabled:opacity-50"
                                    >
                                      Reactivar
                                    </button>
                                  )}
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
