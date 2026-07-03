'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Download, Calendar, Clock, Users,
  DollarSign, Filter, TrendingUp, Loader2, Building2, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface ObjectivePayrollTabProps {
  objectiveId: string;
  objectiveName: string;
  billingRate: number; // hourly_billing_rate
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (h: number) => h.toFixed(2);
const money = (n: number) =>
  `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const defaultStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
};
const defaultEnd = () => new Date().toISOString().split('T')[0];

// ─── Component ──────────────────────────────────────────────────────────────
export default function ObjectivePayrollTab({
  objectiveId,
  objectiveName,
  billingRate,
}: ObjectivePayrollTabProps) {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate]     = useState(defaultEnd);
  const [shifts, setShifts]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchShifts = useCallback(async () => {
    if (!objectiveId || !startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start_date:   startDate,
        end_date:     endDate,
      });
      const res = await fetch(`/api/payroll?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      // Filter server-side aggregation by this objective
      const filtered = (json.shifts ?? []).filter(
        (s: any) => s.objective_id === objectiveId
      );
      setShifts(filtered);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [objectiveId, startDate, endDate]);

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('¿Eliminar este registro de planilla permanentemente?')) return;
    try {
      const res = await fetch(`/api/shifts/${shiftId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Error al eliminar');
      }
      setShifts(prev => prev.filter(s => s.id !== shiftId));
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // ── Computed Totals ──────────────────────────────────────────────────────
  const totalHours   = shifts.reduce((s, r) => s + (r.total_hours ?? 0), 0);
  const totalCost    = totalHours * billingRate;
  const totalShifts  = shifts.length;
  // Unique operators in period
  const operators    = Array.from(new Set(shifts.map((s) => s.operator_name)));

  // ── Export Excel ─────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (shifts.length === 0) return;
    const ws = XLSX.utils.json_to_sheet([
      ...shifts.map((s) => ({
        Fecha:          new Date(s.checkin_time).toLocaleDateString('es-AR'),
        'Prestador':    s.operator_name,
        'Hora Entrada': new Date(s.checkin_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        'Hora Salida':  s.checkout_time
          ? new Date(s.checkout_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
          : 'ACTIVO',
        'Horas':        (s.total_hours ?? 0).toFixed(2),
        'Tarifa/Hora':  `$${billingRate.toLocaleString('es-AR')}`,
        'Subtotal':     `$${(s.total_hours * billingRate).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      })),
      // Totals row
      {
        Fecha: 'TOTAL DEL PERÍODO',
        'Prestador': '',
        'Hora Entrada': '',
        'Hora Salida': '',
        'Horas': totalHours.toFixed(2),
        'Tarifa/Hora': `$${billingRate.toLocaleString('es-AR')}`,
        'Subtotal': `$${totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servicio');
    XLSX.writeFile(wb, `Servicio_${objectiveName.replace(/\s+/g, '_')}_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6 print:block">

      {/* ── Print Header ─────────────────────────────────────────── */}
      <div className="hidden print:block text-center mb-8 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-black uppercase text-gray-900 tracking-widest">SIGPAD SEGURIDAD PRIVADA</h1>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Planilla de Servicio — Liquidación de Objetivo</p>
        <p className="text-[10px] text-gray-400 font-mono mt-2">
          Objetivo: {objectiveName} | Período: {startDate} al {endDate} | Tarifa: ${billingRate}/hs | Emisión: {new Date().toLocaleDateString('es-AR')}
        </p>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Planilla de Servicio</h3>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
            Horas brindadas al objetivo · Tarifa: ${billingRate.toLocaleString('es-AR')}/hs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportExcel}
            disabled={loading || shifts.length === 0}
            className="flex items-center gap-2 h-10 px-5 border border-zinc-200 bg-white text-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all disabled:opacity-40"
          >
            <Download size={14} /> Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 h-10 px-5 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg"
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* ── Date Filter ──────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-wrap gap-4 items-center print:hidden shadow-sm">
        <div className="flex items-center gap-2 text-zinc-400">
          <Filter size={15} />
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">Período</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-zinc-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30"
            />
          </div>
          <span className="text-zinc-300 font-bold">→</span>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-zinc-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30"
            />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Horas de Servicio', value: loading ? '—' : `${fmt(totalHours)} hs`, icon: Clock,      color: 'text-zinc-900', bg: 'bg-zinc-100' },
          { label: 'Turnos Cubiertos', value: loading ? '—' : totalShifts,              icon: Users,      color: 'text-zinc-900', bg: 'bg-zinc-100' },
          { label: 'Personal Rotó',    value: loading ? '—' : operators.length,         icon: Building2,  color: 'text-zinc-900', bg: 'bg-zinc-100' },
          { label: 'Total a Facturar', value: loading ? '—' : money(totalCost),          icon: DollarSign, color: 'text-[#0F4C5C]', bg: 'bg-[#0F4C5C]/5' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-lg font-black text-zinc-950 leading-none">{stat.value}</p>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Operators in Period ───────────────────────────────────── */}
      {!loading && operators.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm print:bg-gray-50">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
            Personal que prestó servicio en este período
          </p>
          <div className="flex flex-wrap gap-2">
            {operators.map((op) => (
              <span
                key={op}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-xl text-[11px] font-black text-zinc-700 uppercase tracking-wide"
              >
                <Users size={12} className="text-[#0F4C5C]" /> {op}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Shifts Table ─────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden print:shadow-none print:border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-black text-zinc-900 uppercase tracking-[0.15em]">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Prestador</th>
                <th className="px-6 py-4 text-center">Entrada</th>
                <th className="px-6 py-4 text-center">Salida</th>
                <th className="px-6 py-4 text-right">Horas</th>
                <th className="px-6 py-4 text-right">Tarifa/H</th>
                <th className="px-6 py-4 text-right text-[#0F4C5C]">Costo</th>
                <th className="px-6 py-4 text-center w-10">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-6 py-5">
                      <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-red-500 text-xs font-bold">
                    Error: {error}
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    No hay turnos registrados en el período seleccionado
                  </td>
                </tr>
              ) : (
                shifts.map((s) => {
                  const checkin  = new Date(s.checkin_time);
                  const checkout = s.checkout_time ? new Date(s.checkout_time) : null;
                  const hrs      = s.total_hours ?? 0;
                  const cost     = hrs * billingRate;
                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/80 transition-colors border-b border-zinc-50 last:border-0">
                      <td className="px-6 py-4 font-bold text-zinc-900">
                        {checkin.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-700 uppercase tracking-tight text-xs">
                        {s.operator_name}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-zinc-600 text-xs">
                        {checkin.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-zinc-600 text-xs">
                        {checkout
                          ? checkout.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-[#0F4C5C] font-black text-[9px] uppercase tracking-wide">Activo</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-zinc-950">
                        {hrs.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-zinc-500 text-xs">
                        ${billingRate.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-[#0F4C5C] font-mono">
                          {money(cost)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDeleteShift(s.id)}
                          className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals Footer */}
            {!loading && shifts.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-900 text-white">
                  <td colSpan={4} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-400">
                    TOTAL DEL PERÍODO
                  </td>
                  <td className="px-6 py-5 text-right font-mono font-black text-lg">
                    {fmt(totalHours)} hs
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-zinc-400 text-xs">
                    ${billingRate.toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-5 text-right font-mono font-black text-[#0F4C5C] text-xl">
                    {money(totalCost)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  );
}
