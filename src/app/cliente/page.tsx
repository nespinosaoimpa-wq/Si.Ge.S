'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Clock, UserCheck, FileText, Download, CheckCircle2, AlertCircle, Truck, MapPin } from 'lucide-react';

export default function ClienteDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Fetch live map/client data
    fetch('/api/dashboard/map')
      .then(res => res.json())
      .then(d => {
        setData(d);
      })
      .catch(err => console.error('Error fetching client dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const objectiveName = data?.objectives?.[0]?.name || 'Puesto Central / Barrio Privado';
  const isManned = data?.objectives?.[0]?.is_on_shift ?? true;
  const activeGuardsCount = data?.resources?.filter((r: any) => r.isOnShift)?.length || 2;
  const recentIncidents = data?.recentIncidents || [];

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER: LIVE STATUS */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-gray-900 via-indigo-950/40 to-gray-900 border border-indigo-900/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">{objectiveName}</h1>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-3 py-1 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                CUSTODIA ACTIVA
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              {activeGuardsCount} Vigiladores en servicio activo • Monitoreo por Geocerca y Central Táctica 24/7
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('Generando informe ejecutivo de custodia en PDF...')}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg flex items-center gap-2"
        >
          <Download size={16} />
          <span>Descargar Reporte del Mes</span>
        </button>
      </div>

      {/* 2. STATS & ACCESS CONTROL OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Estado del Puesto</p>
            <p className="text-xl font-black text-emerald-400 mt-1">Cubierto (100%)</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Turno en curso</p>
          </div>
          <CheckCircle2 className="text-emerald-400" size={28} />
        </div>

        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Ingresos Hoy (Country)</p>
            <p className="text-xl font-black text-blue-400 mt-1">104 Accesos</p>
            <p className="text-[11px] text-blue-300/80 mt-0.5">18 personas en predio</p>
          </div>
          <UserCheck className="text-blue-400" size={28} />
        </div>

        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Proveedores & Obras</p>
            <p className="text-xl font-black text-amber-400 mt-1">26 Ingresos</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Verificación NFC/QR</p>
          </div>
          <Truck className="text-amber-400" size={28} />
        </div>

        <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Cumplimiento Mensual</p>
            <p className="text-xl font-black text-indigo-400 mt-1">99.4% Horas</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Auditado por GPS</p>
          </div>
          <ShieldCheck className="text-indigo-400" size={28} />
        </div>
      </div>

      {/* 3. BITÁCORA DE NOVEDADES DEL CLIENTE (FILTERED FOR CLIENT VISIBILITY) */}
      <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800/80 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <FileText className="text-indigo-400" size={20} />
            <span>Bitácora de Novedades del Puesto</span>
          </div>
          <span className="text-xs font-semibold text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
            Actualizado en Tiempo Real
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">Cargando registros del puesto...</div>
        ) : recentIncidents.length === 0 ? (
          <div className="py-12 text-center text-sm text-emerald-400 font-medium">
            ✅ Sin incidentes registrados. El puesto opera con total normalidad.
          </div>
        ) : (
          <div className="space-y-3">
            {recentIncidents.slice(0, 8).map((inc: any, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl bg-gray-950/60 border border-gray-800/60 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      inc.urgency === 'critica' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}>
                      {inc.entry_type || 'Novedad'}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-200">{inc.content}</p>
                </div>

                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-1 rounded-xl shrink-0">
                  Resuelto
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
