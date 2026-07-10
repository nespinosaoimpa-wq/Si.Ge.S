'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Users, Shield, TrendingUp, Globe,
  CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronDown, Search, RefreshCw, ExternalLink,
  Crown, Zap, Star
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

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<TenantMetric[]>([]);
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
      // Demo data if API not available
      setTenants(DEMO_TENANTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const updateTenant = async (tenantId: string, updates: Record<string, string>) => {
    setActionLoading(tenantId);
    try {
      await fetch('/api/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...updates }),
      });
      await fetchTenants();
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = tenants.filter(t => {
    const matchSearch = t.tenant_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.billing_status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Global stats
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
            <Crown size={20} className="text-amber-400" />
            <span className="font-black text-sm tracking-tight">SIGPAD <span className="text-amber-400">SUPER ADMIN</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTenants}
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
        <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/80">
                  {['Empresa', 'Estado', 'Plan', 'Guardias', 'Objetivos', 'Turnos activos', 'Registro', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">
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
                        <td key={j} className="px-4 py-4">
                          <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-zinc-500 text-sm">
                      No se encontraron empresas
                    </td>
                  </tr>
                ) : (
                  filtered.map((tenant) => {
                    const status = STATUS_CONFIG[tenant.billing_status] || STATUS_CONFIG.trial;
                    const plan = PLAN_CONFIG[tenant.plan_tier] || PLAN_CONFIG.trial;
                    const isLoading = actionLoading === tenant.tenant_id;
                    return (
                      <motion.tr
                        key={tenant.tenant_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{COUNTRY_FLAGS[tenant.country_code] || '🌐'}</span>
                            <div>
                              <div className="text-sm font-semibold text-white">{tenant.tenant_name}</div>
                              <div className="text-[10px] text-zinc-500">{tenant.tenant_id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${status.color}`}>
                            <status.icon size={10} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-semibold ${plan.color}`}>
                            <plan.icon size={12} />
                            {plan.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">{tenant.total_operators || 0}</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">{tenant.total_objectives || 0}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${tenant.active_shifts > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {tenant.active_shifts || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {new Date(tenant.created_at).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {tenant.billing_status !== 'suspended' ? (
                              <button
                                onClick={() => updateTenant(tenant.tenant_id, { billing_status: 'suspended' })}
                                disabled={isLoading}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-semibold disabled:opacity-50"
                              >
                                Suspender
                              </button>
                            ) : (
                              <button
                                onClick={() => updateTenant(tenant.tenant_id, { billing_status: 'active' })}
                                disabled={isLoading}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-semibold disabled:opacity-50"
                              >
                                Reactivar
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo data for when API is not configured
const DEMO_TENANTS: TenantMetric[] = [
  { tenant_id: 'demo-1', tenant_name: 'Seguridad Norte S.A.', billing_status: 'active', plan_tier: 'professional', country_code: 'ar', created_at: '2025-01-15', total_users: 5, total_operators: 48, total_objectives: 12, active_shifts: 8, open_alarms: 0 },
  { tenant_id: 'demo-2', tenant_name: 'Vigilancia del Sur', billing_status: 'trial', plan_tier: 'starter', country_code: 'ar', created_at: '2025-07-01', total_users: 2, total_operators: 8, total_objectives: 3, active_shifts: 2, open_alarms: 1 },
  { tenant_id: 'demo-3', tenant_name: 'SecureMex Corp', billing_status: 'active', plan_tier: 'enterprise', country_code: 'mx', created_at: '2024-11-20', total_users: 12, total_operators: 150, total_objectives: 45, active_shifts: 32, open_alarms: 0 },
  { tenant_id: 'demo-4', tenant_name: 'SafeGuard Chile', billing_status: 'suspended', plan_tier: 'professional', country_code: 'cl', created_at: '2025-03-10', total_users: 3, total_operators: 22, total_objectives: 8, active_shifts: 0, open_alarms: 0 },
];
