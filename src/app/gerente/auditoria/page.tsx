'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  Target, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ChevronRight,
  Search,
  DollarSign,
  Activity,
  Filter,
  ArrowUpRight,
  Zap,
  MoreHorizontal,
  Building2,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const StatsChart = dynamic(() => import('@/components/gerente/StatsChart').then(mod => mod.StatsChart), {
  ssr: false
});

const mockCommercialData = [
  { id: 'OBJ-101', name: 'Plaza de Mayo (Custodia)', contracted: 720, worked: 685, status: 'warning', revenue: 1450000, personnel: 12 },
  { id: 'OBJ-102', name: 'Puerto Madero - Torre 1', contracted: 2400, worked: 2412, status: 'ok', revenue: 4800000, personnel: 24 },
  { id: 'OBJ-103', name: 'Almacén Central Norte', contracted: 1440, worked: 1210, status: 'critical', revenue: 2900000, personnel: 18 },
  { id: 'OBJ-104', name: 'Barrio Cerrado San Jorge', contracted: 4320, worked: 4320, status: 'ok', revenue: 8640000, personnel: 32 },
];

const mockTrends = [
  { month: 'Ene', hours: 12400 },
  { month: 'Feb', hours: 11800 },
  { month: 'Mar', hours: 13500 },
  { month: 'Abr', hours: 14200 },
  { month: 'May', hours: 13900 },
];

export default function AuditoriaComercial() {
  const [period, setPeriod] = useState('Marzo 2026');
  const [isExporting, setIsExporting] = useState(false);

  const totals = useMemo(() => {
    const contracted = mockCommercialData.reduce((acc, curr) => acc + curr.contracted, 0);
    const worked = mockCommercialData.reduce((acc, curr) => acc + curr.worked, 0);
    const revenue = mockCommercialData.reduce((acc, curr) => acc + curr.revenue, 0);
    return { contracted, worked, revenue, efficiency: (worked / contracted) * 100 };
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <div className="space-y-12">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none opacity-30 shrink-0" />

      {/* 1. SPECTACULAR AUDIT HEADER */}
      <div className="flex justify-between items-end relative z-10 shrink-0">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="h-[2px] w-12 bg-primary/40" />
             <span className="text-[11px] text-primary uppercase font-black tracking-[0.4em] animate-pulse">Audit & Compliance Network</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter shadow-sm">INFORMES <span className="text-primary italic">& MÉTRICAS</span></h1>
          <p className="text-zinc-500 text-[10px] tracking-[0.3em] font-mono italic uppercase">Audit Compliance V.Si.Ge.S</p>
        </div>
        
        <div className="flex gap-4 p-1 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
             <Button variant="ghost" size="sm" className="text-[9px] h-10 px-6 tracking-widest uppercase text-zinc-500 hover:text-white">MARZO</Button>
             <Button variant="vanguard" size="sm" className="text-[9px] h-10 px-6 tracking-widest uppercase bg-primary text-black">ABRIL</Button>
          </div>
          <Button 
            onClick={handleExport}
            variant="outline" 
            className="h-12 px-8 text-[10px] font-black uppercase tracking-widest border-primary/20 text-zinc-400 hover:text-white flex gap-2"
          >
            {isExporting ? <Zap size={14} className="animate-spin" /> : <Download size={14} />} 
            {isExporting ? 'EXPORTANDO...' : 'EXPORTAR LIQUIDACIÓN'}
          </Button>
        </div>
      </div>

      {/* 2. ANALYTICAL KPI HUD (High-Contrast) */}
      <div className="grid grid-cols-4 gap-8 relative z-10 shrink-0">
        {[
          { label: 'Facturación Prevista', value: `$${(totals.revenue / 1000000).toFixed(1)}M`, trend: '+5.2%', icon: DollarSign, color: 'text-green-500' },
          { label: 'Cumplimiento de Horas', value: `${totals.efficiency.toFixed(1)}%`, trend: '98%', icon: Clock, color: 'text-primary' },
          { label: 'Unidades Desplegadas', value: '86', trend: 'Estable', icon: Users, color: 'text-blue-500' },
          { label: 'Incidentes Críticos', value: '04', trend: '-2', icon: AlertCircle, color: 'text-red-500' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 liquid-glass rounded-[2.5rem] border border-white/5 group hover:bg-white/[0.03] transition-all relative overflow-hidden flex flex-col justify-between cursor-default shadow-2xl h-52"
          >
             <div className="space-y-6">
                <div className="flex justify-between items-start">
                   <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-all">
                      <stat.icon size={22} />
                   </div>
                   <div className={cn("text-[10px] font-black font-mono flex items-center gap-1", i === 3 ? "text-red-500" : "text-green-500")}>
                      {stat.trend} <ArrowUpRight size={12} />
                   </div>
                </div>
                <div>
                   <h3 className={cn("text-3xl font-black mb-1 tracking-tighter", stat.color)}>{stat.value}</h3>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                </div>
             </div>
          </motion.div>
        ))}
      </div>

      {/* 3. AUDIT MATRIX & VISUALIZATION */}
      <div className="grid grid-cols-12 gap-10 relative z-10">
        
        {/* TRENDS ANALYZER (Left 40%) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8 shrink-0">
           <Card className="liquid-glass border-white/5 rounded-[3.5rem] p-10 flex flex-col gap-8 shadow-2xl min-h-[500px]">
              <div className="space-y-2">
                 <h4 className="text-[14px] font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                    <Activity size={20} className="text-primary" /> CARGA OPERATIVA
                 </h4>
                 <p className="text-[10px] text-zinc-500 font-mono tracking-widest italic uppercase">Historical Data Consumption</p>
              </div>
              
              <div className="flex-1 min-h-[300px] relative">
                 <StatsChart 
                    data={mockTrends} 
                    xDataKey="month" 
                    yDataKey="hours" 
                    type="area" 
                    color="#FFD700" 
                 />
              </div>

              <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                       <Zap size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-white uppercase tracking-widest">Optimización de Nómina</p>
                       <p className="text-[9px] text-zinc-600 font-bold uppercase italic mt-1">Sugerencia: Reubicar 5 activos</p>
                    </div>
                 </div>
              </div>
           </Card>

           <div className="p-10 liquid-glass border-white/5 rounded-[3.5rem] space-y-6 flex flex-col justify-center relative overflow-hidden group h-40">
              <div className="flex justify-between items-center mb-2">
                 <div className="space-y-1">
                    <h5 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Eficiencia Global</h5>
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest italic">Ratio Objetivo: 98.4%</p>
                 </div>
                 <span className="text-xl font-black text-primary">94%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} transition={{ duration: 1.5 }} className="h-full bg-primary shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
              </div>
           </div>
        </div>

        {/* COMPLIANCE TABLE (Right 80%) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
           <div className="flex justify-between items-center px-6">
              <h4 className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.4em]">MATRIZ DE CUMPLIMIENTO POR CLIENTE</h4>
              <div className="flex gap-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input placeholder="FILTRAR OBJETIVO..." className="pl-10 h-10 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white uppercase tracking-widest w-64 focus:border-primary/50 outline-none" />
                 </div>
                 <Button variant="ghost" className="h-10 w-10 p-0 border border-white/10 rounded-xl hover:bg-white/5"><Filter size={16} className="text-zinc-600" /></Button>
              </div>
           </div>

           <Card className="liquid-glass border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] border-b border-white/10">
                    <tr>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Objetivo / ID</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Planificado</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Ejecutado</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-center">Desvío</th>
                      <th className="p-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockCommercialData.map((obj, i) => (
                      <motion.tr 
                        key={obj.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group"
                      >
                        <td className="p-8">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-all">
                                <Building2 size={18} />
                             </div>
                             <div>
                               <p className="text-sm font-black text-white uppercase group-hover:text-primary transition-all">{obj.name}</p>
                               <p className="text-[9px] text-zinc-600 font-mono italic">{obj.id}</p>
                             </div>
                          </div>
                        </td>
                        <td className="p-8">
                          <span className="text-sm font-mono font-black text-zinc-500">{obj.contracted}h</span>
                        </td>
                        <td className="p-8">
                          <span className={cn(
                            "text-sm font-mono font-black",
                            obj.worked < obj.contracted ? "text-amber-500" : "text-green-500"
                          )}>{obj.worked}h</span>
                        </td>
                        <td className="p-8">
                          <div className="flex flex-col items-center gap-2">
                             <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(obj.worked / obj.contracted) * 100}%` }} 
                                  className={cn(
                                    "h-full", 
                                    obj.status === 'ok' ? "bg-green-500" : obj.status === 'warning' ? "bg-amber-500" : "bg-red-500"
                                  )}
                                />
                             </div>
                             <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">
                                {((obj.worked / obj.contracted) * 100).toFixed(0)}% Cumplimiento
                             </span>
                          </div>
                        </td>
                        <td className="p-8 text-right">
                          <Button variant="ghost" size="icon" className="text-zinc-700 hover:text-white transition-all">
                             <MoreHorizontal size={18} />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-8 bg-black/40 text-center border-t border-white/5 group transition-colors hover:bg-black/60">
                 <button className="text-[10px] text-zinc-500 uppercase font-black group-hover:text-primary transition-all tracking-[0.3em]">
                    Ver Reporte de Nómina Consolidado <ChevronRight size={14} className="ml-2 inline-block" />
                 </button>
              </div>
           </Card>
        </div>

      </div>

    </div>
  );
}
