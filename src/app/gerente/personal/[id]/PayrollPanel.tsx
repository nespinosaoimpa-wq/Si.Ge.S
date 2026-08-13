'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Loader2, DollarSign, Calculator, FileText,
  Download, Calendar, Clock, TrendingUp, Hash, Filter, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
// xlsx se importa dinámicamente (lazy) — ahorra ~300KB en el bundle inicial.

interface PayrollPanelProps {
  operatorId: string;
  operatorName: string;
  operatorRole?: string;
  initialRate: number;
  shifts: any[]; // kept for backwards compat but we fetch our own
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatHours = (h: number) => h.toFixed(2);
const formatMoney = (n: number) =>
  `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const defaultStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
};
const defaultEnd = () => new Date().toISOString().split('T')[0];

// ─── Component ──────────────────────────────────────────────────────────────
export function PayrollPanel({
  operatorId,
  operatorName,
  operatorRole,
  initialRate,
}: PayrollPanelProps) {
  const [payRate, setPayRate]       = useState<string>(initialRate.toString());
  const [isUpdating, setIsUpdating] = useState(false);
  const [startDate, setStartDate]   = useState(defaultStart);
  const [endDate, setEndDate]       = useState(defaultEnd);
  const [periodShifts, setPeriodShifts] = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Fetch shifts for chosen period ──────────────────────────────────────
  const fetchPeriodShifts = useCallback(async () => {
    if (!operatorId || !startDate || !endDate) return;
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        operator_id: operatorId,
        start_date: startDate,
        end_date:   endDate,
      });
      const res = await fetch(`/api/payroll?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error HTTP ${res.status}`);
      }
      const json = await res.json();
      // `shifts` contiene el desglose por turno individual
      setPeriodShifts(Array.isArray(json.shifts) ? json.shifts : []);
    } catch (e: any) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  }, [operatorId, startDate, endDate]);

  useEffect(() => {
    fetchPeriodShifts();
  }, [fetchPeriodShifts]);

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalHours   = periodShifts.reduce((s, r) => s + (r.total_hours ?? 0), 0);
  const rate         = parseFloat(payRate) || 0;
  const totalPay     = periodShifts.reduce((s, r) => s + (r.pay_amount ?? 0), 0);
  const shiftsCount  = periodShifts.length;
  const daysCovered  = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1)
    : 30;
  const avgHoursDay  = totalHours / daysCovered;

  // ── Rate update ──────────────────────────────────────────────────────────
  const handleUpdateRate = async () => {
    if (!operatorId || !payRate) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('resources')
        .update({ hourly_pay_rate: parseFloat(payRate), salary: parseFloat(payRate) })
        .eq('id', operatorId);
      if (error) throw error;
      alert('¡Valor/Hora actualizado con éxito!');
    } catch (err: any) {
      alert('Error al actualizar tarifa: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('¿Eliminar este registro de turno permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/shifts/${shiftId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Error al eliminar');
      }
      // Actualizar lista local
      setPeriodShifts(prev => prev.filter(s => s.id !== shiftId));
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // ── Export Excel ─────────────────────────────────────────────────────────
  const exportExcel = async () => {
    if (periodShifts.length === 0) return;
    // Importar xlsx solo cuando se necesita
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      ...periodShifts.map((s) => ({
        Fecha:          new Date(s.checkin_time).toLocaleDateString('es-AR'),
        'Puesto de Servicio': s.objective_name ?? '—',
        'Hora Entrada': new Date(s.checkin_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        'Hora Salida':  s.checkout_time ? new Date(s.checkout_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'ACTIVO',
        'Horas':        (s.total_hours ?? 0).toFixed(2),
        'Tarifa/Hora':  `$${(s.hourly_pay_rate ?? 0).toLocaleString('es-AR')}`,
        'Subtotal':     `$${(s.pay_amount ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      })),
      // Totals row
      {
        Fecha: 'TOTAL DEL PERÍODO',
        'Puesto de Servicio': '',
        'Hora Entrada': '',
        'Hora Salida': '',
        'Horas': totalHours.toFixed(2),
        'Tarifa/Hora': '',
        'Subtotal': `$${totalPay.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Haberes');
    XLSX.writeFile(wb, `Haberes_${operatorName.replace(/\s+/g, '_')}_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-10 mt-10 print:p-0 print:border-none print:shadow-none print:bg-white">

      {/* ── Print Header ─────────────────────────────────────────────── */}
      <div className="hidden print:block text-center mb-8 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-black uppercase text-gray-900 tracking-widest">SIGPAD SEGURIDAD PRIVADA</h1>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Cómputo de Haberes — Liquidación Individual</p>
        <p className="text-[10px] text-gray-400 font-mono mt-2">
          Prestador: {operatorName} | Período: {startDate} al {endDate} | Emisión: {new Date().toLocaleDateString('es-AR')}
        </p>
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 print:hidden">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#0F4C5C]/10 rounded-2xl flex items-center justify-center">
            <Calculator size={26} className="text-[#0F4C5C]" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900">Cómputo de Haberes</h2>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-0.5">
              {operatorRole ?? 'Operador'} · Liquidación Individual
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportExcel}
            disabled={loading || periodShifts.length === 0}
            className="flex items-center gap-2 h-10 px-5 border border-zinc-200 bg-white text-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all disabled:opacity-40"
          >
            <Download size={14} /> Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 h-10 px-5 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg"
          >
            <FileText size={14} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* ── Rate Config (pantalla) ───────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 mb-8 p-5 bg-zinc-50 border border-zinc-100 rounded-2xl print:hidden">
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor Hora</p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="number"
                value={payRate}
                onChange={(e) => setPayRate(e.target.value)}
                className="h-10 pl-8 pr-4 w-36 bg-white border border-zinc-200 rounded-xl text-sm font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30"
              />
            </div>
            <button
              onClick={handleUpdateRate}
              disabled={isUpdating || parseFloat(payRate) === initialRate}
              className="h-10 px-4 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-40"
            >
              {isUpdating ? <Loader2 size={14} className="animate-spin" /> : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-3 flex-wrap ml-auto">
          <Filter size={14} className="text-zinc-300" />
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-zinc-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 bg-white border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30"
            />
          </div>
          <span className="text-zinc-300 font-bold text-sm">→</span>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-zinc-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 bg-white border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30"
            />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Horas Totales',   value: loading ? '—' : `${formatHours(totalHours)} hs`, icon: Clock,      color: 'text-zinc-900', bg: 'bg-zinc-100' },
          { label: 'Turnos',          value: loading ? '—' : shiftsCount,                      icon: Hash,       color: 'text-zinc-900', bg: 'bg-zinc-100' },
          { label: 'Prom. / Día',     value: loading ? '—' : `${formatHours(avgHoursDay)} hs`, icon: TrendingUp, color: 'text-zinc-900', bg: 'bg-zinc-100' },
          { label: 'Total Haberes',   value: loading ? '—' : formatMoney(totalPay),            icon: DollarSign, color: 'text-[#0F4C5C]', bg: 'bg-[#0F4C5C]/5' },
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

      {/* ── Shifts Table ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-black text-zinc-900 uppercase tracking-[0.15em]">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Puesto de Servicio</th>
                <th className="px-6 py-4 text-center">Entrada</th>
                <th className="px-6 py-4 text-center">Salida</th>
                <th className="px-6 py-4 text-right">Horas</th>
                <th className="px-6 py-4 text-right">Tarifa/H</th>
                <th className="px-6 py-4 text-right text-[#0F4C5C]">Subtotal</th>
                <th className="px-6 py-4 text-center w-10">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-6 py-5">
                      <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : fetchError ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-red-500 text-xs font-bold">
                    Error al cargar: {fetchError}
                  </td>
                </tr>
              ) : periodShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    No hay turnos completados en el período seleccionado
                  </td>
                </tr>
              ) : (
                periodShifts.map((s) => {
                  const checkin  = new Date(s.checkin_time);
                  const checkout = s.checkout_time ? new Date(s.checkout_time) : null;
                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-zinc-900">
                        {checkin.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 text-xs font-bold uppercase max-w-[180px] truncate">
                        {s.objective_name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-zinc-700">
                        {checkin.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-zinc-700">
                        {checkout
                          ? checkout.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-[#0F4C5C] font-black text-[9px] uppercase">Activo</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-zinc-950">
                        {(s.total_hours ?? 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-zinc-500 text-xs">
                        ${(s.hourly_pay_rate ?? 0).toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-[#0F4C5C] font-mono">
                          {formatMoney(s.pay_amount ?? 0)}
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
            {!loading && periodShifts.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-900 text-white">
                  <td colSpan={4} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-400">
                    TOTAL DEL PERÍODO
                  </td>
                  <td className="px-6 py-5 text-right font-mono font-black text-lg">
                    {formatHours(totalHours)} hs
                  </td>
                  <td className="px-6 py-5" />
                  <td className="px-6 py-5 text-right font-mono font-black text-[#0F4C5C] text-xl">
                    {formatMoney(totalPay)}
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
