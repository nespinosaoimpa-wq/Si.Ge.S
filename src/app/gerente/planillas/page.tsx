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
  ChevronRight,
  FileSpreadsheet,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowUpDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

// Formateador de duración en horas y minutos exactos + horas decimales
const formatHoursDuration = (decimalHours: number = 0) => {
  const totalSec = Math.round(decimalHours * 3600)
  const hrs = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  
  if (hrs === 0 && mins === 0 && decimalHours > 0) {
    return { main: `${totalSec}s`, decimal: `${decimalHours.toFixed(2)} hs` }
  }
  if (hrs === 0) {
    return { main: `${mins} min`, decimal: `${decimalHours.toFixed(2)} hs` }
  }
  return { main: `${hrs}h ${mins}m`, decimal: `${decimalHours.toFixed(2)} hs` }
}

// Formateador de moneda ARS
const formatMoney = (amount: number = 0) => {
  return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PayrollPage() {
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'nomina' | 'facturacion'>('nomina')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  
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

  // Presets de fechas
  const setPresetPeriod = (preset: 'today' | 'this_week' | 'this_month' | 'last_month') => {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    if (preset === 'today') {
      start = now
      end = now
    } else if (preset === 'this_week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      start = new Date(now.setDate(diff))
      end = new Date()
    } else if (preset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date()
    } else if (preset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
    }

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  // Filtrado por búsqueda en tiempo real
  const filteredNomina = useMemo(() => {
    if (!data?.nomina) return []
    if (!searchQuery.trim()) return data.nomina
    const q = searchQuery.toLowerCase().trim()
    return data.nomina.filter(
      (r) =>
        (r.operator_name || '').toLowerCase().includes(q) ||
        (r.operator_role || '').toLowerCase().includes(q)
    )
  }, [data?.nomina, searchQuery])

  const filteredFacturacion = useMemo(() => {
    if (!data?.facturacion) return []
    if (!searchQuery.trim()) return data.facturacion
    const q = searchQuery.toLowerCase().trim()
    return data.facturacion.filter(
      (r) =>
        (r.objective_name || '').toLowerCase().includes(q) ||
        (r.operators || []).some((op: string) => op.toLowerCase().includes(q))
    )
  }, [data?.facturacion, searchQuery])

  const exportNomina = async () => {
    if (!data) return
    const XLSX = await import('xlsx')
    
    // Solapa 1: Resumen
    const wsNomina = XLSX.utils.json_to_sheet(
      data.nomina.map((r) => {
        const dur = formatHoursDuration(r.total_hours)
        return {
          'Apellido y Nombre': r.operator_name,
          Función: r.operator_role,
          'Turnos Realizados': r.shifts_count,
          'Tiempo Trabajado': dur.main,
          'Horas Decimales': (r.total_hours ?? 0).toFixed(4),
          'Tarifa/Hora': formatMoney(r.hourly_pay_rate ?? 0),
          'Total Haberes ($)': (r.total_pay ?? 0),
        }
      })
    )

    // Solapa 2: Auditoría Detallada de Fichajes
    const wsDetalle = XLSX.utils.json_to_sheet(
      data.shifts.map((s) => {
        const dur = formatHoursDuration(s.total_hours)
        return {
          'ID Turno': s.id,
          Operador: s.operator_name,
          Rol: s.operator_role,
          'Objetivo / Puesto': s.objective_name,
          'Check-in (Entrada)': new Date(s.checkin_time).toLocaleString('es-AR'),
          'Check-out (Salida)': s.checkout_time ? new Date(s.checkout_time).toLocaleString('es-AR') : 'PRESENTE',
          'Duración Exacta': dur.main,
          'Horas Decimales': s.total_hours,
          'Tarifa Pago ($/hr)': s.hourly_pay_rate,
          'Subtotal Pago ($)': s.pay_amount,
          'Tarifa Cobro ($/hr)': s.hourly_billing_rate,
          'Subtotal Facturación ($)': s.billing_amount,
        }
      })
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsNomina, 'Resumen Liquidación')
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Auditoría Fichajes')
    XLSX.writeFile(wb, `SIGPAD_Auditoria_Nomina_${startDate}_a_${endDate}.xlsx`)
  }

  const exportFacturacion = async () => {
    if (!data) return
    const XLSX = await import('xlsx')
    
    // Solapa 1: Resumen Facturación
    const wsFacturacion = XLSX.utils.json_to_sheet(
      data.facturacion.map((r) => {
        const dur = formatHoursDuration(r.total_hours)
        return {
          'Puesto de Servicio': r.objective_name,
          'Personal Asignado': r.operators.join(', '),
          'Turnos Cubiertos': r.shifts_count,
          'Tiempo Total': dur.main,
          'Horas Decimales': (r.total_hours ?? 0).toFixed(4),
          'Tarifa/Hora Cobro': formatMoney(r.hourly_billing_rate ?? 0),
          'Total Facturación ($)': (r.total_billing ?? 0),
        }
      })
    )

    // Solapa 2: Auditoría de Fichajes por Objetivo
    const wsDetalle = XLSX.utils.json_to_sheet(
      data.shifts.map((s) => {
        const dur = formatHoursDuration(s.total_hours)
        return {
          'Objetivo / Puesto': s.objective_name,
          Operador: s.operator_name,
          'Check-in (Entrada)': new Date(s.checkin_time).toLocaleString('es-AR'),
          'Check-out (Salida)': s.checkout_time ? new Date(s.checkout_time).toLocaleString('es-AR') : 'PRESENTE',
          'Duración Exacta': dur.main,
          'Horas Decimales': s.total_hours,
          'Tarifa Facturación ($/hr)': s.hourly_billing_rate,
          'Total a Facturar ($)': s.billing_amount,
        }
      })
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsFacturacion, 'Resumen Facturación')
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Auditoría Fichajes')
    XLSX.writeFile(wb, `SIGPAD_Auditoria_Facturacion_${startDate}_a_${endDate}.xlsx`)
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
              onClick={() => { setError(null); fetchPayroll(); }}
              className="h-12 w-full border border-zinc-200 text-zinc-400 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all uppercase tracking-widest"
            >
              Limpiar y Volver
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totalFormatted = formatHoursDuration(data?.totals?.total_hours || 0)

  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-10 pb-32 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white border-2 border-zinc-200 rounded-2xl flex items-center justify-center shadow-sm">
            <Calculator size={28} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-zinc-950 tracking-tighter uppercase">Cómputo de Haberes</h1>
            <p className="text-[11px] font-black text-zinc-600 mt-0.5 uppercase tracking-[0.2em]">
              Nómina · Facturación · Auditoría de Horas Trabajadas
            </p>
          </div>
        </div>

        <button
          onClick={activeTab === 'nomina' ? exportNomina : exportFacturacion}
          disabled={loading || !data}
          className="flex items-center justify-center gap-2.5 h-12 px-7 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-40 uppercase tracking-widest"
        >
          <FileSpreadsheet size={18} className="text-emerald-400" />
          Exportar Auditoría Excel ({activeTab === 'nomina' ? 'Nómina' : 'Facturación'})
        </button>
      </div>

      {/* FILTROS Y BARRA DE PERÍODO */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Selector de Rango de Fechas */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-zinc-400 shrink-0">
              <Filter size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">Período de Análisis:</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-zinc-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 uppercase"
              />
            </div>
            <span className="text-zinc-300 font-bold">/</span>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-zinc-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 uppercase"
              />
            </div>
          </div>

          {/* Botones de Presets Rápidos */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mr-1">Accesos rápidos:</span>
            {[
              { id: 'today', label: 'Hoy' },
              { id: 'this_week', label: 'Esta Semana' },
              { id: 'this_month', label: 'Este Mes' },
              { id: 'last_month', label: 'Mes Anterior' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetPeriod(p.id as any)}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-black uppercase tracking-wider transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TARJETAS DE AUDITORÍA KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Horas Totales Auditoría */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-black text-zinc-950 font-mono leading-none">
                {loading ? '—' : totalFormatted.main}
              </p>
              <span className="text-[11px] font-bold text-zinc-400 font-mono">
                ({totalFormatted.decimal})
              </span>
            </div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1.5">
              Horas Auditadas
            </p>
          </div>
        </motion.div>

        {/* Total Turnos */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black text-zinc-950 leading-none">
              {loading ? '—' : `${data?.totals?.shifts_count ?? 0} turnos`}
            </p>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1.5">
              Fichajes Realizados
            </p>
          </div>
        </motion.div>

        {/* Nómina a Pagar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-[#0F4C5C]/10 text-[#0F4C5C] flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black text-[#0F4C5C] font-mono leading-none truncate">
              {loading ? '—' : formatMoney(data?.totals?.total_pay ?? 0)}
            </p>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1.5">
              Nómina a Pagar
            </p>
          </div>
        </motion.div>

        {/* Total a Facturar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black text-emerald-800 font-mono leading-none truncate">
              {loading ? '—' : formatMoney(data?.totals?.total_billing ?? 0)}
            </p>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1.5">
              Total a Facturar
            </p>
          </div>
        </motion.div>
      </div>

      {/* CONTROLES SUPERIORES TABLA (TABS Y BÚSQUEDA) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          {(['nomina', 'facturacion'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setExpandedRow(null)
              }}
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

        {/* Buscador Interactivo */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={activeTab === 'nomina' ? "Buscar por operador..." : "Buscar por puesto..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      {/* TABLA PRINCIPAL DE AUDITORÍA */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-black text-zinc-900 uppercase tracking-[0.15em]">
                <th className="w-12 px-4 py-4 text-center"></th>
                {activeTab === 'nomina' ? (
                  <>
                    <th className="px-6 py-4">Apellido y Nombre</th>
                    <th className="px-6 py-4">Función</th>
                    <th className="px-6 py-4 text-center">Turnos</th>
                    <th className="px-6 py-4 text-right">Tiempo Trabajado</th>
                    <th className="px-6 py-4 text-right">Tarifa/Hora</th>
                    <th className="px-6 py-4 text-right text-[#0F4C5C]">Total Haberes</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4">Puesto de Servicio</th>
                    <th className="px-6 py-4">Personal Asignado</th>
                    <th className="px-6 py-4 text-center">Turnos</th>
                    <th className="px-6 py-4 text-right">Tiempo Total</th>
                    <th className="px-6 py-4 text-right">Tarifa/Hora</th>
                    <th className="px-6 py-4 text-right text-emerald-700">Total Facturación</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-[40%]" />
                          <div className="h-2 bg-zinc-100 rounded-full animate-pulse w-[20%]" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'nomina' ? (
                filteredNomina.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      {searchQuery ? 'No se encontraron resultados para la búsqueda' : 'No hay registros en el período seleccionado'}
                    </td>
                  </tr>
                ) : (
                  filteredNomina.map((r) => {
                    const isExpanded = expandedRow === r.operator_id
                    const dur = formatHoursDuration(r.total_hours)
                    const operatorShifts = (data?.shifts || []).filter((s) => s.operator_id === r.operator_id)

                    return (
                      <React.Fragment key={r.operator_id}>
                        <tr
                          onClick={() => setExpandedRow(isExpanded ? null : r.operator_id)}
                          className={cn(
                            "cursor-pointer transition-colors border-b border-zinc-50",
                            isExpanded ? "bg-zinc-100/70" : "hover:bg-zinc-50/80"
                          )}
                        >
                          <td className="px-4 py-5 text-center">
                            <button className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-500 transition-colors">
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                                {r.operator_name?.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-zinc-900 tracking-tight">{r.operator_name}</p>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Hacé clic para auditar {operatorShifts.length} fichajes</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-zinc-600 text-[10px] font-black uppercase tracking-[0.1em]">
                            {r.operator_role}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-black text-zinc-950 font-mono">
                              {r.shifts_count}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-mono">
                            <span className="font-black text-zinc-950 text-sm">{dur.main}</span>
                            <span className="text-[10px] font-bold text-zinc-400 block mt-0.5">({dur.decimal})</span>
                          </td>
                          <td className="px-6 py-5 text-right font-mono text-zinc-600 text-xs">
                            {formatMoney(r.hourly_pay_rate ?? 0)} / hr
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="font-black text-[#0F4C5C] text-base font-mono">
                              {formatMoney(r.total_pay ?? 0)}
                            </span>
                          </td>
                        </tr>

                        {/* DESGLOSE EXPANDIBLE DE FICHAJES (NÓMINA) */}
                        {isExpanded && (
                          <tr className="bg-zinc-900 text-white">
                            <td colSpan={7} className="p-6">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Eye size={16} className="text-emerald-400" />
                                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                                      Auditoría de Turnos Fichados — {r.operator_name}
                                    </h4>
                                  </div>
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    {operatorShifts.length} registros individuales
                                  </span>
                                </div>

                                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="border-b border-zinc-800 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-900">
                                        <th className="px-4 py-3">Puesto / Objetivo</th>
                                        <th className="px-4 py-3">Entrada (Check-in)</th>
                                        <th className="px-4 py-3">Salida (Check-out)</th>
                                        <th className="px-4 py-3 text-right">Tiempo Exacto</th>
                                        <th className="px-4 py-3 text-right">Tarifa</th>
                                        <th className="px-4 py-3 text-right text-emerald-400">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                      {operatorShifts.map((shift) => {
                                        const sDur = formatHoursDuration(shift.total_hours)
                                        const checkin = new Date(shift.checkin_time)
                                        const checkout = shift.checkout_time ? new Date(shift.checkout_time) : null

                                        return (
                                          <tr key={shift.id} className="hover:bg-zinc-900/60">
                                            <td className="px-4 py-3 font-bold text-zinc-200">
                                              {shift.objective_name}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-zinc-300">
                                              {checkin.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} · {checkin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                                            </td>
                                            <td className="px-4 py-3 font-mono text-zinc-300">
                                              {checkout ? (
                                                `${checkout.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} · ${checkout.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs`
                                              ) : (
                                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[9px]">EN CURSO</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                              <span className="font-bold text-zinc-100">{sDur.main}</span>
                                              <span className="text-[9px] text-zinc-500 block">({sDur.decimal})</span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-zinc-400">
                                              {formatMoney(shift.hourly_pay_rate)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                                              {formatMoney(shift.pay_amount)}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )
              ) : filteredFacturacion.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    {searchQuery ? 'No se encontraron resultados para la búsqueda' : 'No hay registros en el período seleccionado'}
                  </td>
                </tr>
              ) : (
                filteredFacturacion.map((r) => {
                  const isExpanded = expandedRow === r.objective_id
                  const dur = formatHoursDuration(r.total_hours)
                  const objectiveShifts = (data?.shifts || []).filter((s) => s.objective_id === r.objective_id)

                  return (
                    <React.Fragment key={r.objective_id}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : r.objective_id)}
                        className={cn(
                          "cursor-pointer transition-colors border-b border-zinc-50",
                          isExpanded ? "bg-zinc-100/70" : "hover:bg-zinc-50/80"
                        )}
                      >
                        <td className="px-4 py-5 text-center">
                          <button className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-500 transition-colors">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0F4C5C]/10 flex items-center justify-center shrink-0">
                              <Building2 size={16} className="text-[#0F4C5C]" />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 tracking-tight">{r.objective_name}</p>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Hacé clic para auditar {objectiveShifts.length} coberturas</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-zinc-600 text-[10px] font-black uppercase tracking-[0.1em] max-w-[200px] truncate">
                          {r.operators.join(', ')}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-black text-zinc-950 font-mono">
                            {r.shifts_count}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right font-mono">
                          <span className="font-black text-zinc-950 text-sm">{dur.main}</span>
                          <span className="text-[10px] font-bold text-zinc-400 block mt-0.5">({dur.decimal})</span>
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-zinc-600 text-xs">
                          {formatMoney(r.hourly_billing_rate ?? 0)} / hr
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="font-black text-emerald-700 text-base font-mono">
                            {formatMoney(r.total_billing ?? 0)}
                          </span>
                        </td>
                      </tr>

                      {/* DESGLOSE EXPANDIBLE DE FICHAJES (FACTURACIÓN POR OBJETIVO) */}
                      {isExpanded && (
                        <tr className="bg-zinc-900 text-white">
                          <td colSpan={7} className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Eye size={16} className="text-emerald-400" />
                                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-200">
                                    Auditoría de Servicios Facturables — {r.objective_name}
                                  </h4>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                  {objectiveShifts.length} turnos de servicio
                                </span>
                              </div>

                              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-800 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-900">
                                      <th className="px-4 py-3">Operador / Vigilador</th>
                                      <th className="px-4 py-3">Entrada (Check-in)</th>
                                      <th className="px-4 py-3">Salida (Check-out)</th>
                                      <th className="px-4 py-3 text-right">Tiempo Servicio</th>
                                      <th className="px-4 py-3 text-right">Tarifa Facturación</th>
                                      <th className="px-4 py-3 text-right text-emerald-400">Total Facturable</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-900">
                                    {objectiveShifts.map((shift) => {
                                      const sDur = formatHoursDuration(shift.total_hours)
                                      const checkin = new Date(shift.checkin_time)
                                      const checkout = shift.checkout_time ? new Date(shift.checkout_time) : null

                                      return (
                                        <tr key={shift.id} className="hover:bg-zinc-900/60">
                                          <td className="px-4 py-3 font-bold text-zinc-200">
                                            {shift.operator_name} ({shift.operator_role})
                                          </td>
                                          <td className="px-4 py-3 font-mono text-zinc-300">
                                            {checkin.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} · {checkin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                                          </td>
                                          <td className="px-4 py-3 font-mono text-zinc-300">
                                            {checkout ? (
                                              `${checkout.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} · ${checkout.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs`
                                            ) : (
                                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[9px]">EN SERVICIO</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-right font-mono">
                                            <span className="font-bold text-zinc-100">{sDur.main}</span>
                                            <span className="text-[9px] text-zinc-500 block">({sDur.decimal})</span>
                                          </td>
                                          <td className="px-4 py-3 text-right font-mono text-zinc-400">
                                            {formatMoney(shift.hourly_billing_rate)}
                                          </td>
                                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                                            {formatMoney(shift.billing_amount)}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>

            {/* PIE DE TOTALES */}
            {!loading && data && (data.nomina.length > 0 || data.facturacion.length > 0) && (
              <tfoot>
                <tr className="bg-zinc-900 text-white border-t border-zinc-800">
                  <td colSpan={4} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-400">
                    TOTAL DEL PERÍODO AUDITADO
                  </td>
                  <td className="px-6 py-5 text-right font-mono">
                    <span className="font-black text-white text-base">{totalFormatted.main}</span>
                    <span className="text-[10px] text-zinc-400 block font-mono">({totalFormatted.decimal})</span>
                  </td>
                  <td className="px-6 py-5" />
                  <td className="px-6 py-5 text-right font-mono font-black text-[#0F4C5C] text-2xl">
                    {formatMoney(activeTab === 'nomina' ? (data.totals?.total_pay ?? 0) : (data.totals?.total_billing ?? 0))}
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
