'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, 
  Maximize2, 
  ShieldAlert, 
  Cpu, 
  Wifi, 
  Activity, 
  Clock,
  ChevronRight,
  Settings2,
  Lock,
  Eye,
  Camera,
  Layers,
  ThermometerSnowflake
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function CamarasWall() {
  const [selectedCam, setSelectedCam] = useState<number | null>(null);
  const [visionMode, setVisionMode] = useState<'standard' | 'thermal' | 'night'>('standard');

  const cameras = [
    { id: 1, name: 'Acceso Principal A-1', status: 'Online', target: 'Consorcio Portofino', fps: 30 },
    { id: 2, name: 'Perímetro Norte B-2', status: 'Online', target: 'Planta Industrial', fps: 24 },
    { id: 3, name: 'Cocheras Subsuelo', status: 'Online', target: 'Edificio Torremolinos', fps: 30 },
    { id: 4, name: 'Suministros Energía', status: 'Alerta', target: 'Zona Critica', fps: 15 },
    { id: 5, name: 'Pasillo de Emergencia', status: 'Online', target: 'Consorcio Portofino', fps: 30 },
    { id: 6, name: 'Estacionamiento Visitas', status: 'Offline', target: 'Barrio Cerrado', fps: 0 },
  ];

  return (
    <div className="space-y-12">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none opacity-40 shrink-0" />

      {/* 1. VANGUARD HEADER */}
      <div className="flex justify-between items-end relative z-10 shrink-0">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="h-[2px] w-12 bg-sky-500/40" />
             <span className="text-[11px] text-sky-400 uppercase font-black tracking-[0.4em] animate-pulse">Vision Intelligence Network</span>
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter">SIGPAD <span className="text-sky-500">VISION</span></h1>
          <p className="text-zinc-500 text-[10px] tracking-[0.3em] font-mono italic uppercase">Neural Video Streaming Platform V.2.1</p>
        </div>

        <div className="flex gap-4 p-1 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
            {(['standard', 'thermal', 'night'] as const).map((mode) => (
               <button 
                 key={mode}
                 onClick={() => setVisionMode(mode)}
                 className={cn(
                   "px-4 py-2 text-[8px] font-black uppercase tracking-widest transition-all rounded-lg",
                   visionMode === mode ? "bg-sky-500 text-black shadow-[0_0_15px_rgba(14,165,233,0.3)]" : "text-zinc-500 hover:text-white"
                 )}
               >
                 {mode}
               </button>
            ))}
          </div>
          <Button variant="vanguard" size="lg" className="h-12 px-8 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-sky-500 transition-colors">
            Configurar DVR
          </Button>
        </div>
      </div>

      {/* 2. CAMERA MATRIX */}
      <div className="grid grid-cols-12 gap-8 relative z-10">
        
        {/* MAIN VIEWER (75%) */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
           <Card className="aspect-video bg-black border-white/10 rounded-[3rem] overflow-hidden relative shadow-2xl group border-2">
              {/* Simulated Video Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 overflow-hidden">
                 <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                 <div className="absolute inset-0 tactical-scanline pointer-events-none opacity-20" />
                 
                 {/* Visual Mode Overlays */}
                 {visionMode === 'thermal' && <div className="absolute inset-0 bg-blue-900/30 mix-blend-color-burn transition-all" />}
                 {visionMode === 'night' && <div className="absolute inset-0 bg-green-950/20 mix-blend-hard-light transition-all" />}

                 <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full border border-sky-500/30 flex items-center justify-center animate-spin-slow">
                       <ShieldAlert size={32} className="text-sky-500" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-widest uppercase">CANAL_0{selectedCam || 1} :: ACTIVO</h3>
                       <p className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase italic">Buffer Sincrónico: 98% Sin Pérdida</p>
                    </div>
                 </div>
              </div>

              {/* VIDEO UI OVERLAYS */}
              <div className="absolute top-10 left-10 flex gap-4">
                 <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE REC</span>
                 </div>
                 <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
                    <Clock size={14} className="text-sky-500" />
                    <span className="text-[10px] font-mono text-white">13:27:04:12</span>
                 </div>
              </div>

              <div className="absolute bottom-10 right-10 flex gap-4">
                 <Button variant="ghost" className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 text-white hover:bg-sky-500 transition-all">
                    <Maximize2 size={24} />
                 </Button>
              </div>

              <div className="absolute bottom-10 left-10 flex flex-col gap-2">
                 <div className="p-4 bg-black/60 backdrop-blur-md rounded-3xl border border-white/10 space-y-4 w-64">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                       <span>FPS Stability</span>
                       <span className="text-sky-400">99.2%</span>
                    </div>
                    <div className="flex items-end gap-1 h-6">
                       {[...Array(15)].map((_, i) => (
                         <div key={i} className="flex-1 bg-sky-500/20 rounded-full h-[30%] hover:h-full transition-all group cursor-pointer">
                            <div className="h-full bg-sky-500 hover:bg-white transition-colors" style={{ height: `${40 + Math.random() * 60}%` }} />
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </Card>

           <div className="grid grid-cols-4 gap-6 shrink-0">
              {cameras.slice(0, 4).map((cam) => (
                <Card 
                  key={cam.id} 
                  onClick={() => setSelectedCam(cam.id)}
                  className={cn(
                    "aspect-video bg-black rounded-3xl overflow-hidden border transition-all cursor-pointer group relative",
                    selectedCam === cam.id ? "border-sky-500 shadow-[0_0_30px_rgba(14,165,233,0.3)]" : "border-white/5 hover:border-white/20"
                  )}
                >
                   <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-zinc-700" />
                   </div>
                   <div className="absolute bottom-4 left-4 z-10">
                      <p className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-lg">{cam.name}</p>
                   </div>
                   <div className="absolute top-4 right-4 z-10">
                      <div className={cn("w-1.5 h-1.5 rounded-full", cam.status === 'Online' ? "bg-green-500" : "bg-red-500")} />
                   </div>
                </Card>
              ))}
           </div>
        </div>

        {/* SIDEBAR STATUS (25%) */}
        <div className="col-span-12 lg:col-span-3 space-y-8 flex flex-col shrink-0">
           
           <Card className="liquid-glass border-white/5 rounded-[3rem] p-8 space-y-8 flex flex-col shadow-2xl flex-1 max-h-[750px]">
              <div className="space-y-1">
                 <h4 className="text-[12px] font-black text-white uppercase tracking-[0.4em]">LISTADO DVR</h4>
                 <p className="text-[9px] text-zinc-500 font-mono tracking-widest italic uppercase">Active Camera Feeds</p>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                 {cameras.map((cam) => (
                   <div 
                     key={cam.id} 
                     onClick={() => setSelectedCam(cam.id)}
                     className={cn(
                       "p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between",
                       selectedCam === cam.id ? "bg-sky-500/10 border-sky-500/40" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                     )}
                   >
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                           cam.status === 'Online' ? "bg-zinc-800 text-sky-500" : "bg-red-500/10 text-red-500"
                         )}>
                            {cam.status === 'Online' ? <Eye size={18} /> : <Lock size={18} />}
                         </div>
                         <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-widest group-hover:text-sky-500 transition-all">{cam.name}</p>
                            <p className="text-[8px] text-zinc-600 font-bold tracking-tighter uppercase">{cam.target}</p>
                         </div>
                      </div>
                      <ChevronRight size={14} className="text-zinc-800 group-hover:text-white" />
                   </div>
                 ))}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                 <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-zinc-600">
                    <span>Red Global</span>
                    <span className="text-green-500 flex items-center gap-2"><Wifi size={12} /> ESTABLE</span>
                 </div>
                 <Button variant="tactical" className="w-full h-14 bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06] rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em]">
                    Sincronizar Panel <Activity size={14} className="ml-2" />
                 </Button>
              </div>
           </Card>

           {/* SYSTEM HUD */}
           <div className="p-8 liquid-glass border-white/5 rounded-[3rem] space-y-6 flex flex-col relative overflow-hidden shrink-0">
              <div className="flex justify-between items-center">
                 <div className="space-y-1">
                    <h5 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Carga de Red</h5>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest italic">Ancho de Banda: 450Mbps</p>
                 </div>
                 <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-500">
                    <Cpu size={20} />
                 </div>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} transition={{ duration: 1.5 }} className="h-full bg-sky-500" />
              </div>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2 text-[8px] text-zinc-500 font-black uppercase">
                    <ThermometerSnowflake size={12} /> Temp Core: Normal
                 </div>
                 <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
           </div>
        </div>

      </div>

    </div>
  );
}
