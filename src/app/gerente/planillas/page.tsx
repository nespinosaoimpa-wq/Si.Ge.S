'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator,
  Download,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Building2,
  ChevronDown,
  FileSpreadsheet,
  Calendar,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
// xlsx se importa dinámicamente (lazy) — ahorra ~300KB en el bundle inicial.
// Solo se carga cuando el usuario hace clic en Exportar.

type PayrollData = {
  shifts: any[]
  nomina: any[]
  facturacion: any[]
  totals: {
    total_hours: number
    total_pay: number
    total_billing: number
    shifts_count: number
  }
}

export default function PayrollPage() {
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'nomina' | 'facturacion'>('nomina')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetchPayroll = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
      const res = await fetch(`/api/payroll?${params}`)
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP Error ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Error inesperado al cargar planillas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayroll()
  }, [startDate, endDate])

  const exportNomina = async () => {
    if (!data) return
    // Importar xlsx solo cuando se necesita
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(
      data.nomina.map((r) => ({
        'Apellido y Nombre': r.operator_name,
        Función: r.operator_role,
        'Turnos Realizados': r.shifts_count,
        'Horas Totales': (r.total_hours ?? 0).toFixed(2),
        'Tarifa/Hora': `$${(r.hourly_pay_rate ?? 0).toLocaleString('es-AR')}`,
        'Total Haberes': `$${(r.total_pay ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Nómina')
    XLSX.writeFile(wb, `Nomina_SIGPAD_${startDate}_${endDate}.xlsx`)
  }

  const exportFacturacion = async () => {
    if (!data) return
    // Importar xlsx solo cuando se necesita
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(
      data.facturacion.map((r) => ({
        'Puesto de Servicio': r.objective_name,
        'Personal Asignado': r.operators.join(', '),
        'Turnos Cubiertos': r.shifts_count,
        'Horas Facturables': (r.total_hours ?? 0).toFixed(2),
        'Tarifa/Hora': `$${(r.hourly_billing_rate ?? 0).toLocaleString('es-AR')}`,
        'Total a Facturar': `$${(r.total_billing ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Facturación')
    XLSX.writeFile(wb, `Facturacion_SIGPAD_${startDate}_${endDate}.xlsx`)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white border-t-4 border-red-500 shadow-xl rounded-2xl p-10">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calculator size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-black text-zinc-900 uppercase mb-2">Error en el Módulo</h2>
          <p className="text-sm text-zinc-500 font-medium mb-8 leading-relaxed">
            {error}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => fetchPayroll()}
              className="h-12 w-full bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-zinc-800 transition-all uppercase tracking-widest"
            >
              Reintentar
            </button>
            <button
              onClick={() => { setError(null); setStartDate(''); setEndDate(''); }}
              className="h-12 w-full border border-zinc-200 text-zinc-400 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all uppercase tracking-widest"
            >
              Limpiar y Volver
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-10 pb-32 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white border-2 border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm">
            <Calculator size={28} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-zinc-950 tracking-tighter uppercase">Cómputo de Haberes</h1>
            <p className="text-[11px] font-black text-zinc-600 mt-0.5 uppercase tracking-[0.2em]">
              Nómina · Facturación · Liquidación Mensual
            </p>
          </div>
        </div>

        <button
          onClick={activeTab === 'nomina' ? exportNomina : exportFacturacion}
          disabled={loading || !data}
          className="flex items-center gap-2 h-12 px-7 bg-zinc-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-40 uppercase tracking-widest"
        >
          <Download size={18} />
          Exportar {activeTab === 'nomina' ? 'Nómina' : 'Facturación'}
        </button>
      </div>

      {/* DATE FILTER BAR */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-4 flex flex-wrap gap-4 items-center mb-8">
        <div className="flex items-center gap-2 text-zinc-400">
          <Filter size={16} />
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">Período de Análisis</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-zinc-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30 uppercase"
            />
          </div>
          <span className="text-zinc-300 font-bold">/</span>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-zinc-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C5C]/30 uppercase"
            />
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Horas Totales',
            value: `${data?.totals?.total_hours?.toFixed(1) ?? '0'} hs`,
            icon: Clock,
            color: 'text-zinc-900',
            bg: 'bg-zinc-100',
          },
          {
            label: 'Total Turnos',
            value: data?.totals?.shifts_count ?? 0,
            icon: Users,
            color: 'text-zinc-900',
            bg: 'bg-zinc-100',
          },
          {
            label: 'Nómina a Pagar',
            value: `$${(data?.totals?.total_pay ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
            icon: DollarSign,
            color: 'text-[#0F4C5C]',
            bg: 'bg-[#0F4C5C]/5',
          },
          {
            label: 'Total a Facturar',
            value: `$${(data?.totals?.total_billing ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
            icon: TrendingUp,
            color: 'text-[#0F4C5C]',
            bg: 'bg-[#0F4C5C]/5',
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-4 sm:p-5 flex items-center gap-4 overflow-hidden"
          >
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center transition-colors shrink-0', stat.bg)}>
              <stat.icon size={22} className={stat.color} />
            </div>
            <div className="min-w-0">
              <p className={cn(
                "font-black text-zinc-950 leading-none truncate",
                stat.value.toString().length > 12 ? "text-base sm:text-lg" : "text-xl"
              )}>
                {loading ? '—' : stat.value}
              </p>
              <p className="text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1.5 truncate">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6">
        {(['nomina', 'facturacion'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
              activeTab === tab
                ? 'bg-zinc-900 text-white shadow-lg'
                : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800'
            )}
          >
            {tab === 'nomina' ? <Users size={14} /> : <Building2 size={14} />}
            {tab === 'nomina' ? 'Liquidación de Operadores' : 'Facturación por Objetivo'}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">
                {activeTab === 'nomina' ? (
                  <>
                    <th className="px-6 py-4">Apellido y Nombre</th>
                    <th className="px-6 py-4">Función</th>
                    <th className="px-6 py-4 text-center">Turnos</th>
                    <th className="px-6 py-4 text-right">Horas</th>
                    <th className="px-6 py-4 text-right">Tarifa/Hora</th>
                    <th className="px-6 py-4 text-right text-[#0F4C5C]">Total Haberes</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4">Puesto de Servicio</th>
                    <th className="px-6 py-4">Personal Asignado</th>
                    <th className="px-6 py-4 text-center">Turnos</th>
                    <th className="px-6 py-4 text-right">Horas</th>
                    <th className="px-6 py-4 text-right">Tarifa/Hora</th>
                    <th className="px-6 py-4 text-right text-[#0F4C5C]">Total Facturación</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-zinc-50 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-zinc-50 rounded-full animate-pulse w-[40%]" />
                          <div className="h-2 bg-zinc-50 rounded-full animate-pulse w-[20%]" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'nomina' ? (
                (data?.nomina ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      No hay registros en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  (data?.nomina ?? []).map((r) => (
                    <tr key={r.operator_id} className="hover:bg-zinc-50/80 transition-colors border-b border-zinc-50 last:border-0">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white">
                            {r.operator_name?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-zinc-900 tracking-tight">{r.operator_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-zinc-600 text-[10px] font-black uppercase tracking-[0.1em]">
                        {r.operator_role}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-white border-2 border-zinc-200 text-xs font-black text-zinc-950">
                          {r.shifts_count}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right font-mono font-black text-zinc-950">
                        {(r.total_hours ?? 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-zinc-600 text-xs">
                        ${(r.hourly_pay_rate ?? 0).toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="font-black text-[#0F4C5C] text-base font-mono">
                          ${(r.total_pay ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))
                )
              ) : (data?.facturacion ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    No hay registros en el período seleccionado
                  </td>
                </tr>
              ) : (
                (data?.facturacion ?? []).map((r) => (
                  <tr key={r.objective_id} className="hover:bg-zinc-50/80 transition-colors border-b border-zinc-50 last:border-0">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center">
                          <Building2 size={16} className="text-[#0F4C5C]" />
                        </div>
                        <span className="font-bold text-zinc-900 tracking-tight">{r.objective_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-zinc-600 text-[10px] font-black uppercase tracking-[0.1em] max-w-[200px] truncate">
                      {r.operators.join(', ')}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-white border-2 border-zinc-200 text-xs font-black text-zinc-950">
                        {r.shifts_count}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-mono font-black text-zinc-950">
                      {(r.total_hours ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-5 text-right font-mono text-zinc-600 text-xs">
                      ${(r.hourly_billing_rate ?? 0).toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="font-black text-[#0F4C5C] text-base font-mono">
                        ${(r.total_billing ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* TOTALS FOOTER */}
            {!loading && data && (data.nomina.length > 0 || data.facturacion.length > 0) && (
              <tfoot>
                <tr className="bg-zinc-900 text-white">
                  <td colSpan={3} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-400">
                    TOTAL DEL PERÍODO
                  </td>
                  <td className="px-6 py-6 text-right font-mono font-black text-lg">
                    {(data.totals?.total_hours ?? 0).toFixed(2)} hs
                  </td>
                  <td className="px-6 py-6" />
                  <td className="px-6 py-6 text-right font-mono font-black text-[#0F4C5C] text-2xl">
                    ${(activeTab === 'nomina' ? (data.totals?.total_pay ?? 0) : (data.totals?.total_billing ?? 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
