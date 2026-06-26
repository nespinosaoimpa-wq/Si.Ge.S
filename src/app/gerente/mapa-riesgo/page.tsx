'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Map as MapIcon, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  ChevronRight, 
  Layers,
  Info,
  Zap,
  Radio,
  BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

const riskZones = [
  { id: 'Z-01', name: 'Microcentro - Sector Bancario', riskLevel: 'high', incidentCount: 142, trend: 'up', color: '#ef4444' },
  { id: 'Z-02', name: 'Barrio Norte - Residencial', riskLevel: 'medium', incidentCount: 58, trend: 'stable', color: '#f59e0b' },
  { id: 'Z-03', name: 'Puerto Madero - Corporativo', riskLevel: 'low', incidentCount: 12, trend: 'down', color: '#10b981' },
];

export default function MapaRiesgo() {
  const [selectedZone, setSelectedZone] = useState<any>(null);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
      
      {/* Header HUD */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Mapa de Riesgo Estratégico</h1>
          <p className="text-xs text-primary uppercase font-display tracking-[0.3em] mt-2 italic">Inteligencia Delictiva y Análisis de Vulnerabilidad Urbana</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" className="h-10 text-[10px] tracking-[0.2em] border-white/10 uppercase">Descargar Informe Ejecutivo</Button>
           <Button variant="tactical" size="sm" className="h-10 text-[10px] tracking-[0.2em] uppercase">Simular Escenario</Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Left: Map View */}
        <div className="col-span-8 relative">
          <Card className="h-full border-primary/20 overflow-hidden bg-black/40">
             <div className="absolute inset-0 z-0">
                <TacticalLeaflet 
                  objectives={[]} // We can pass zones as special objectives
                  resources={[]}
                  className="w-full h-full"
                />
             </div>
             
             {/* Map Controls HUD */}
             <div className="absolute top-4 left-4 z-10 space-y-2">
                <div className="bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-sm flex flex-col gap-2">
                   <button className="p-2 bg-primary/20 text-primary rounded-xs"><Layers size={14} /></button>
                   <button className="p-2 text-gray-500 hover:text-white transition-colors"><MapIcon size={14} /></button>
                   <button className="p-2 text-gray-500 hover:text-white transition-colors"><BarChart3 size={14} /></button>
                </div>
             </div>

             <div className="absolute top-4 right-4 z-10">
                <div className="bg-red-500/10 border border-red-500/30 backdrop-blur-md px-3 py-1.5 rounded-sm flex items-center gap-2">
                   <Radio size={12} className="text-red-500 animate-pulse" />
                   <span className="text-[9px] font-black uppercase text-red-500 tracking-widest">Alerta: Zona Roja Detectada</span>
                </div>
             </div>

             {/* Map Overlay Stats */}
             <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
                <div className="flex justify-center">
                   <div className="bg-zinc-950/90 border border-primary/20 p-4 rounded-sm flex gap-8 pointer-events-auto shadow-2xl">
                      <div className="text-center">
                         <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Puntos de Vigilancia</p>
                         <p className="text-xl font-black text-white">24</p>
                      </div>
                      <div className="w-px h-10 bg-white/10" />
                      <div className="text-center">
                         <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Índice de Riesgo Prom.</p>
                         <p className="text-xl font-black text-amber-500">42%</p>
                      </div>
                      <div className="w-px h-10 bg-white/10" />
                      <div className="text-center">
                         <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Variación Mensual</p>
                         <p className="text-xl font-black text-red-500">+12%</p>
                      </div>
                   </div>
                </div>
             </div>
          </Card>
        </div>

        {/* Right: Analytics & recommendations */}
        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto">
          
          {/* Zone Intelligence */}
          <Card className="bg-black/40 border-primary/10 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-zinc-900/80 border-b border-white/5 flex items-center justify-between">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Inteligencia por Zonas</h4>
               <Button variant="ghost" size="icon" className="h-6 w-6"><Search size={14} className="text-gray-500" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto">
               {riskZones.map((zone) => (
                 <div 
                   key={zone.id} 
                   onClick={() => setSelectedZone(zone)}
                   className={cn(
                     "p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 group",
                     selectedZone?.id === zone.id ? "bg-primary/5 border-l-4 border-l-primary" : ""
                   )}
                 >
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-mono text-gray-600 tracking-tighter italic">ZONE_REF_{zone.id}</span>
                      <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest rounded-sm border",
                        zone.riskLevel === 'high' ? "border-red-500 text-red-500 bg-red-500/10" :
                        zone.riskLevel === 'medium' ? "border-amber-500 text-amber-500 bg-amber-500/10" :
                        "border-green-500 text-green-500 bg-green-500/10"
                      )}>
                        Riesgo {zone.riskLevel}
                      </span>
                   </div>
                   <h5 className="text-xs font-bold text-white uppercase group-hover:text-primary transition-colors">{zone.name}</h5>
                   <div className="flex justify-between items-center mt-3">
                      <div className="flex gap-4">
                         <div className="text-center">
                            <p className="text-[7px] text-gray-500 uppercase">Incidentes</p>
                            <p className="text-xs font-black text-gray-300">{zone.incidentCount}</p>
                         </div>
                         <div className="text-center">
                            <p className="text-[7px] text-gray-500 uppercase">Tendencia</p>
                            <TrendingUp size={10} className={zone.trend === 'up' ? "text-red-500" : "text-green-500"} />
                         </div>
                      </div>
                      <ChevronRight size={12} className="text-gray-700 group-hover:text-primary transition-all" />
                   </div>
                 </div>
               ))}
            </div>
          </Card>

          {/* Strategic Recommendations */}
          <Card className="bg-primary/5 border-primary/20 p-6">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/20 rounded-sm flex items-center justify-center border border-primary/40 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                   <Zap size={20} className="text-primary animate-pulse" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase text-white tracking-widest">Sugerencias Estratégicas</h4>
                  <p className="text-[9px] text-primary uppercase italic">Acciones Recomendadas para el CEO</p>
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="p-3 bg-black/40 border-l border-primary/30 rounded-r-sm">
                   <p className="text-[9px] font-bold text-white uppercase mb-1">Oportunidad de Venta (Zona Norte)</p>
                   <p className="text-[10px] text-gray-400 leading-snug">Incremento de hurtos vehiculares. Proponga refuerzo de 2 vigilantes adicionales para el cliente *Logística 24*.</p>
                </div>
                <div className="p-3 bg-black/40 border-l border-red-500/30 rounded-r-sm">
                   <p className="text-[9px] font-bold text-white uppercase mb-1">Alerta de Renovación</p>
                   <p className="text-[10px] text-gray-400 leading-snug">El contrato de *Torre Madero* vence en 15 días. Prepare reporte de efectividad del 99% para renegociación.</p>
                </div>
             </div>
             
             <Button variant="tactical" className="w-full h-10 text-[9px] tracking-[0.2em] mt-6">GENERAR REPORTE COMERCIAL</Button>
          </Card>

        </div>
      </div>

    </div>
  );
}
