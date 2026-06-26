'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Users, 
  Download, 
  Upload, 
  Plus, 
  ChevronRight,
  PieChart,
  Briefcase,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AdminFinanzas() {
  const [activeTab, setActiveTab] = useState<'financial' | 'contracts' | 'documents'>('financial');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="space-y-12">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full -mr-64 -mt-64 pointer-events-none opacity-50" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full -ml-32 -mb-32 pointer-events-none opacity-30" />

      {/* 1. SPECTACULAR EXECUTIVE HEADER */}
      <div className="flex justify-between items-end relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="h-[2px] w-12 bg-primary/40" />
             <span className="text-[11px] text-primary uppercase font-black tracking-[0.4em] animate-pulse">Executive Financial Core</span>
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter shadow-sm">ADMIN <span className="text-primary italic">FINANZAS</span></h1>
          <p className="text-zinc-500 text-[10px] tracking-[0.3em] font-mono italic uppercase">Enterprise Resource Audit Platform V.4.0</p>
        </div>
        
        <div className="flex gap-4 p-1 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl">
          <Button variant="ghost" className="h-12 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
             <Download size={14} className="mr-2" /> Reporte Anual
          </Button>
          <Button 
            onClick={handleSync}
            variant="vanguard" 
            className="h-12 px-10 text-[10px] font-black uppercase tracking-[0.2em] relative overflow-hidden group shadow-[0_0_30px_rgba(255,215,0,0.1)]"
          >
            <div className={cn("absolute inset-0 bg-primary group-hover:bg-accent transition-all", isSyncing && "animate-pulse")} />
            <span className="relative flex items-center gap-2">
               {isSyncing ? 'Sincronizando...' : <><Plus size={16} /> Nueva Entrada</>}
            </span>
          </Button>
        </div>
      </div>

      {/* 2. CORPORATE PERFORMANCE HUD (High-Contrast Obsidian) */}
      <div className="grid grid-cols-4 gap-8 relative z-10">
        {[
          { label: 'Ingresos Mensuales', value: '$18.4M ARS', trend: '+12.4%', icon: DollarSign, color: 'text-green-500' },
          { label: 'Erogación Personal', value: '$9.2M ARS', trend: '-1.8%', icon: Users, color: 'text-primary' },
          { label: 'Growth Project', value: '31.2%', trend: '+4.5%', icon: TrendingUp, color: 'text-blue-500' },
          { label: 'Retention Rate', value: '98.4%', trend: 'Estable', icon: PieChart, color: 'text-zinc-400' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 liquid-glass rounded-[2.5rem] border border-white/5 group hover:bg-white/[0.03] transition-all relative overflow-hidden flex flex-col justify-between cursor-default shadow-2xl h-56"
          >
             <div className="space-y-6">
                <div className="flex justify-between items-start">
                   <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary group-hover:scale-110 transition-all">
                      <kpi.icon size={22} />
                   </div>
                   <div className={cn("text-[10px] font-black font-mono flex items-center gap-1", kpi.trend.startsWith('+') ? "text-green-500" : "text-zinc-500")}>
                      {kpi.trend} <ArrowUpRight size={12} />
                   </div>
                </div>
                <div>
                   <h3 className={cn("text-3xl font-black mb-1 tracking-tighter", kpi.color)}>{kpi.value}</h3>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{kpi.label}</p>
                </div>
             </div>
             <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: '100%' }} 
                  className={cn("h-full", kpi.color.replace('text', 'bg'))}
                  transition={{ duration: 2, delay: i * 0.5 }}
                />
             </div>
          </motion.div>
        ))}
      </div>

      {/* 3. BUSINESS MATRIX: CONTRACTS & FINANCIALS */}
      <div className="grid grid-cols-12 gap-10 relative z-10">
        
        {/* LEFT AREA: AUDIT LISTING */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
           
           <div className="flex gap-8 border-b border-white/10 px-4">
              {['Finanzas Globales', 'Contratos Si.Ge.S', 'Legales y Seguros'].map((tab, i) => {
                const id = ['financial', 'contracts', 'documents'][i] as any;
                const active = activeTab === id;
                return (
                  <button 
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "pb-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative",
                      active ? "text-primary" : "text-zinc-600 hover:text-white"
                    )}
                  >
                    {tab}
                    {active && <motion.div layoutId="tab-underline" className="absolute bottom-0 inset-x-0 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(255,215,0,0.5)]" />}
                  </button>
                )
              })}
           </div>

           <Card className="liquid-glass border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] border-b border-white/10">
                    <tr>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Entidad / Objetivo</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Valor Mensual</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Vencimiento</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Control</th>
                      <th className="p-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 1, title: 'Consorcio Portofino', amount: '$1.450.000', expiry: '15 MAY', status: 'Pagado' },
                      { id: 2, title: 'Barrio Torremolinos', amount: '$2.180.000', expiry: '12 JUN', status: 'Facturado' },
                      { id: 3, title: 'Planta Industrial Norte', amount: '$3.500.000', expiry: '05 MAY', status: 'Vencido' },
                      { id: 4, title: 'Edificio Las Marías', amount: '$1.050.000', expiry: '20 MAY', status: 'Pagado' },
                      { id: 5, title: 'Centro Comercial Si.Ge.S', amount: '$5.400.000', expiry: '01 JUN', status: 'Facturado' },
                    ].map((row, i) => (
                      <motion.tr 
                        key={row.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group"
                      >
                        <td className="p-8">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary haptic-light transition-all">
                                <Building2 size={18} />
                             </div>
                             <div>
                               <p className="text-sm font-black text-white uppercase group-hover:text-primary transition-all">{row.title}</p>
                               <p className="text-[9px] text-zinc-600 font-mono italic">SIGES_CONTRACT_E_920{row.id}</p>
                             </div>
                          </div>
                        </td>
                        <td className="p-8">
                          <span className="text-sm font-mono font-black text-white group-hover:text-primary transition-all">{row.amount}</span>
                        </td>
                        <td className="p-8">
                          <div className="flex items-center gap-2 text-zinc-500 group-hover:text-white transition-all">
                             <Calendar size={14} />
                             <span className="text-xs font-black">{row.expiry}</span>
                          </div>
                        </td>
                        <td className="p-8 text-right">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-lg",
                            row.status === 'Pagado' ? "border-green-500/20 text-green-500 bg-green-500/5" :
                            row.status === 'Facturado' ? "border-primary/20 text-primary bg-primary/5" :
                            "border-red-500/20 text-red-500 bg-red-500/5 animate-pulse"
                          )}>
                            {row.status}
                          </span>
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
           </Card>
        </div>

        {/* RIGHT AREA: BUSINESS ASSETS & UPLOAD */}
        <div className="col-span-12 lg:col-span-4 space-y-10 flex flex-col">
           
           <Card className="liquid-glass border-white/5 rounded-[3.5rem] p-10 space-y-8 flex flex-col flex-1 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group hover:opacity-[0.06] transition-opacity pointer-events-none">
                 <FileText size={180} />
              </div>
              
              <div className="space-y-2">
                 <h4 className="text-[14px] font-black text-white uppercase tracking-[0.4em]">ADMIN CLOUD</h4>
                 <p className="text-[10px] text-zinc-500 font-mono tracking-widest italic uppercase">Sync Intelligence Repository</p>
              </div>

              <div className="flex-1 space-y-8">
                 <div className="border-2 border-dashed border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-6 hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer group hptic-light relative overflow-hidden h-72">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                       <Upload size={32} />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black uppercase tracking-widest text-white group-hover:text-primary transition-all mb-1">Cargar Nuevo Documento</h5>
                      <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">PDF, XLS, JPG (Max 50MB)</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                       <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Archivos Recientes</span>
                       <Button variant="ghost" className="h-6 px-3 text-[8px] font-black text-primary uppercase">Limpiar</Button>
                    </div>
                    <div className="space-y-3">
                       {[
                         { name: 'Plan_Evacuacion_Oct_24.pdf', size: '2.4 MB', icon: FileText, color: 'text-zinc-500' },
                         { name: 'Contrato_SIGES_Portofino.pdf', size: '1.2 MB', icon: FileText, color: 'text-primary' },
                       ].map((doc, i) => (
                         <motion.div 
                           key={i} 
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: 0.5 + i * 0.1 }}
                           className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-2xl group hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer"
                         >
                            <div className="flex items-center gap-4">
                               <doc.icon size={20} className={doc.color} />
                               <div>
                                  <p className="text-[12px] font-black text-white group-hover:text-primary transition-all">{doc.name}</p>
                                  <p className="text-[9px] text-zinc-600 font-mono">{doc.size} • 12 MIN AGO</p>
                               </div>
                            </div>
                            <CheckCircle2 size={16} className="text-green-500" />
                         </motion.div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                 <Button variant="tactical" className="w-full h-16 bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06] rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] haptic-light">
                    Sincronizar Repositorio <ChevronRight size={16} className="ml-2" />
                 </Button>
              </div>
           </Card>

           {/* GROWTH RADAR */}
           <div className="p-10 liquid-glass border-white/5 rounded-[3.5rem] space-y-6 flex flex-col justify-center relative overflow-hidden group">
              <div className="flex justify-between items-center mb-2">
                 <div className="space-y-1">
                    <h5 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Carga Impositiva</h5>
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest italic">Vencimiento: 3 Días</p>
                 </div>
                 <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 animate-pulse">
                    <AlertCircle size={20} />
                 </div>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} transition={{ duration: 1.5 }} className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              </div>
              <p className="text-[8px] text-zinc-500 uppercase font-black text-center tracking-widest">Alerta AFIP: Auditoría Pendiente</p>
           </div>
        </div>

      </div>

    </div>
  );
}


