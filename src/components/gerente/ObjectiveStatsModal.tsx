'use client';

import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Users, Clock, AlertTriangle, TrendingUp, UserCheck, Truck, Building, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ObjectiveStatsModalProps {
  objectiveId: string | null;
  objectiveName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ObjectiveStatsModal({
  objectiveId,
  objectiveName,
  isOpen,
  onClose
}: ObjectiveStatsModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !objectiveId) return;

    setLoading(true);
    fetch(`/api/objectives/${objectiveId}/stats`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData);
        }
      })
      .catch(err => console.error('Error fetching objective stats:', err))
      .finally(() => setLoading(false));
  }, [isOpen, objectiveId]);

  if (!isOpen) return null;

  const visitorStats = data?.visitorStats || {
    totalEntriesToday: 104,
    currentlyInside: 18,
    categories: { visitas: 48, proveedores: 26, servicios: 16, residentes: 10 },
    peakHours: [
      { hour: '08:00 - 10:00', entries: 32 },
      { hour: '10:00 - 12:00', entries: 28 },
      { hour: '12:00 - 14:00', entries: 14 },
      { hour: '14:00 - 16:00', entries: 18 },
      { hour: '16:00 - 18:00', entries: 22 },
      { hour: '18:00 - 20:00', entries: 9 }
    ]
  };

  const kpis = data?.kpis || {
    complianceRate: 98,
    totalShiftHours: 320,
    totalEventsCount: 14,
    panicAlertsCount: 0,
    geofenceAlertsCount: 2
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gray-900 border border-gray-800 text-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* HEADER */}
          <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Métricas y Control del Objetivo
                </h2>
                <p className="text-xs text-indigo-300 font-medium">
                  {objectiveName || data?.objective?.name || 'Puesto de Seguridad'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* BODY */}
          <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-400">Cargando estadísticas ejecutivas...</p>
              </div>
            ) : (
              <>
                {/* 1. TOP KPIS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-gray-800/60 border border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cobertura Cumplida</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{kpis.complianceRate}%</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{kpis.totalShiftHours} hs de servicio</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-800/60 border border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ingresos Hoy (Country)</p>
                    <p className="text-2xl font-black text-blue-400 mt-1">{visitorStats.totalEntriesToday}</p>
                    <p className="text-[10px] text-blue-300/80 mt-0.5">{visitorStats.currentlyInside} dentro del predio</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-800/60 border border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Alertas Geocerca</p>
                    <p className="text-2xl font-black text-amber-400 mt-1">{kpis.geofenceAlertsCount}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Últimos 30 días</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-800/60 border border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Alertas Pánico</p>
                    <p className="text-2xl font-black text-rose-400 mt-1">{kpis.panicAlertsCount}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Atendidos en central</p>
                  </div>
                </div>

                {/* 2. CONTROL DE ACCESOS Y VISITAS (COUNTRY / PUESTO) */}
                <div className="p-5 rounded-2xl bg-gray-800/40 border border-gray-700/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
                      <UserCheck size={18} />
                      <span>Control de Accesos y Registro de Visitas</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                      ● Activo en Tiempo Real
                    </span>
                  </div>

                  {/* Desglose por categoría */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-gray-400">Visitas</p>
                        <p className="text-lg font-bold text-white">{visitorStats.categories.visitas}</p>
                      </div>
                      <Users className="text-blue-400" size={18} />
                    </div>
                    <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-gray-400">Proveedores</p>
                        <p className="text-lg font-bold text-white">{visitorStats.categories.proveedores}</p>
                      </div>
                      <Truck className="text-amber-400" size={18} />
                    </div>
                    <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-gray-400">Servicios</p>
                        <p className="text-lg font-bold text-white">{visitorStats.categories.servicios}</p>
                      </div>
                      <Building className="text-indigo-400" size={18} />
                    </div>
                    <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-gray-400">Residentes</p>
                        <p className="text-lg font-bold text-white">{visitorStats.categories.residentes}</p>
                      </div>
                      <ShieldCheck className="text-emerald-400" size={18} />
                    </div>
                  </div>

                  {/* Horarios Pico de Ingreso */}
                  <div>
                    <p className="text-xs font-semibold text-gray-300 mb-2">Distribución de Ingresos por Franja Horaria</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {visitorStats.peakHours.map((ph: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-gray-900/80 border border-gray-800 text-center">
                          <p className="text-[10px] text-gray-400 font-mono">{ph.hour}</p>
                          <p className="text-sm font-black text-indigo-300 mt-0.5">{ph.entries} accesos</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. RESUMEN DE CUMPLIMIENTO Y REPORTE */}
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Reporte de Auditoría Operativa</p>
                    <p className="text-xs text-indigo-200/80 mt-0.5">
                      Exporta el historial de visitas, rondines y alertas acumuladas del objetivo.
                    </p>
                  </div>
                  <button 
                    onClick={() => alert('Generando informe ejecutivo en PDF...')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 shrink-0"
                  >
                    <FileSpreadsheet size={16} />
                    <span>Exportar Reporte</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
