'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart, 
  Target, 
  Zap, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Map as MapIcon,
  Activity,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const StatsChart = dynamic(() => import('@/components/gerente/StatsChart').then(mod => mod.StatsChart), {
  ssr: false
});

// Dashboard metrics for vanguard feel
const stats = [
  { label: 'Eficacia Global', value: '94.2%', change: '+2.1%', up: true, icon: ShieldCheck, color: '#FFD700' },
  { label: 'Latencia Respuesta', value: '4m 12s', change: '-18s', up: true, icon: Zap, color: '#3b82f6' },
  { label: 'Alertas Críticas', value: '12', change: '-4', up: true, icon: AlertCircle, color: '#ef4444' },
  { label: 'Puntos Auditados', value: '1,245', change: '+128', up: true, icon: Target, color: '#10b981' },
];

const mockHistoricalData = [
  { time: 'OCT', value: 45, alert: 12 },
  { time: 'NOV', value: 52, alert: 8 },
  { time: 'DIC', value: 38, alert: 15 },
  { time: 'ENE', value: 65, alert: 22 },
  { time: 'FEB', value: 48, alert: 10 },
  { time: 'MAR', value: 59, alert: 18 },
  { time: 'ABR', value: 72, alert: 5 },
];

const riskZones = [
  { name: 'Depósito 02', status: 'CRITICO', risk: 85, trend: 'up' },
  { name: 'Perímetro SUR', status: 'ALERTA', risk: 62, trend: 'down' },
  { name: 'Acceso VIP', status: 'NORMAL', risk: 12, trend: 'stable' },
];

export default function AnalisisPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-end border-b border-primary/10 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-primary animate-pulse" size={16} />
            <span className="text-[10px] text-primary font-black uppercase tracking-[0.4em]">Intelligence Report</span>
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Análisis de Demanda</h1>
          <p className="text-xs text-gray-500 uppercase font-display tracking-widest mt-2 flex items-center gap-2">
            <Calendar size={12} /> VENTANA TEMPORAL: Q1 2026 - TIEMPO REAL
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="bg-black/40 border-primary/20 hover:bg-primary/10 text-[10px] font-black uppercase tracking-widest h-10 px-6">
            EXPORT DATA.RAW
          </Button>
          <Button variant="tactical" size="sm" className="h-10 px-8 text-[10px]">
            CONFIGURAR ALERTAS
          </Button>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-secondary/20 hover:bg-secondary/30 border-white/5 transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-black/40 border border-white/5 group-hover:border-primary/40 transition-colors">
                    <s.icon className="group-hover:scale-110 transition-transform" size={20} style={{ color: s.color }} />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 bg-black/40 border border-white/5",
                    s.up ? "text-green-500" : "text-red-500"
                  )}>
                    {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {s.change}
                  </div>
                </div>
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-1 font-bold">{s.label}</p>
                <div className="flex items-baseline gap-2">
                   <h3 className="text-3xl font-black text-white font-display uppercase tracking-tighter">{s.value}</h3>
                   <div className="w-1 h-3 bg-primary/20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Trend Chart */}
        <Card className="lg:col-span-8 border-white/5 bg-black/40 backdrop-blur-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2 tracking-widest text-white">
                <BarChart size={14} className="text-primary" />
                Tendencia Operativa y Anomalías
              </CardTitle>
              <p className="text-[9px] text-gray-600 uppercase mt-1">Comparativa de eficacia vs reportes de incidentes</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/5 text-[8px] font-mono text-primary uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" /> EFICACIA
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 h-[400px]">
            <StatsChart 
              data={mockHistoricalData} 
              xDataKey="time" 
              yDataKey="value" 
              type="area" 
              color="#FFD700"
              valueFormatter={(v) => `${v}%`}
            />
          </CardContent>
        </Card>

        {/* Hazard/Risk Heatmap Simulation */}
        <Card className="lg:col-span-4 border-red-500/10 bg-red-950/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-600/[0.02] group-hover:bg-red-600/[0.05] transition-colors" />
          <CardHeader className="border-b border-red-500/10 relative z-10">
            <CardTitle className="text-xs text-red-500 font-black uppercase flex items-center gap-3 tracking-widest">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" /> 
              Vulnerability Heatmap
            </CardTitle>
            <CardDescription className="text-[9px] uppercase tracking-wider text-red-400/60">Zonas de riesgo por omisión de rondín</CardDescription>
          </CardHeader>
          <CardContent className="p-0 relative z-10 flex flex-col h-[calc(400px+1.5rem)]">
            <div className="flex-1 bg-black/60 relative overflow-hidden m-4 border border-red-500/10">
               {/* Raster scan simulation */}
               <div className="absolute inset-0 bg-[#080808]">
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#ff0000 1px, transparent 1px), linear-gradient(90deg, #ff0000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                 {/* Heat blobs */}
                 <div className="absolute top-[30%] left-[40%] w-24 h-24 bg-red-600/40 blur-3xl rounded-full animate-pulse" />
                 <div className="absolute top-[65%] left-[60%] w-16 h-16 bg-red-600/20 blur-2xl rounded-full" />
                 
                 <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <div className="bg-red-950/80 border border-red-500/30 backdrop-blur-md p-3">
                      <p className="text-[10px] text-red-500 font-black uppercase mb-1 tracking-[0.2em]">SISTEMA ALPHA_DETECT</p>
                      <p className="text-[9px] text-white opacity-60 uppercase font-mono tracking-tighter">Cluster de anomalías detectado en SECTOR: PERÍMETRO_EXTERNO</p>
                    </div>
                 </div>
               </div>
               
               {/* Scanning line */}
               <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-scan z-20" />
            </div>

            <div className="px-4 pb-4 space-y-2">
              {riskZones.map((zone, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-black/40 border border-white/5">
                  <div>
                    <p className="text-[9px] font-black text-white uppercase">{zone.name}</p>
                    <p className="text-[8px] text-gray-500 uppercase mt-0.5">{zone.status}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xs font-black", zone.risk > 70 ? "text-red-500" : "text-primary")}>{zone.risk}%</p>
                    <p className="text-[7px] text-gray-600 uppercase font-mono">ÍNDICE_VAR</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Correlative Data Table - Vanguard Style */}
      <Card className="border-white/5 bg-secondary/10 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-white/5 font-display uppercase tracking-widest text-[9px]">
           {[
             { label: 'Factor Climático', icon: Activity, val: 'LLUVIA INTENSA', extra: '+15% ALFA', impact: 'high' },
             { label: 'Ventana Crítica', icon: Clock, val: '03:00 - 05:00', extra: 'ALERTA MAXIMA', impact: 'critical' },
             { label: 'Ratio Cobertura', icon: ShieldCheck, val: '100% PERSONAL', extra: 'OPERACION OPTIMA', impact: 'safe' },
           ].map((item, i) => (
             <div key={i} className="p-8 group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[2px] h-0 group-hover:h-full bg-primary transition-all duration-300" />
                <p className="text-gray-500 mb-4 flex items-center gap-2">
                   <item.icon size={12} className="text-primary/60" /> {item.label}
                </p>
                <div className="space-y-1">
                   <h4 className="text-2xl font-black text-white tracking-tighter">{item.val}</h4>
                   <p className={cn(
                     "font-bold",
                     item.impact === 'critical' ? "text-red-500" : 
                     item.impact === 'high' ? "text-amber-500" : "text-green-500"
                   )}>{item.extra}</p>
                </div>
             </div>
           ))}
        </div>
      </Card>

    </div>
  );
}

