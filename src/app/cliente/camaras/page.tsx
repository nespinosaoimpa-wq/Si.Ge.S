'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, 
  Map as MapIcon, 
  Search, 
  Settings, 
  Maximize2, 
  History, 
  ShieldCheck,
  LayoutGrid,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const cameras = [
  { id: 'CAM-01', name: 'Entrada Principal', status: 'Online', type: 'Privada', color: 'text-primary' },
  { id: 'CAM-02', name: 'Estacionamiento V.I.P.', status: 'Online', type: 'Privada', color: 'text-primary' },
  { id: 'PUB-05', name: 'Intersección Calle 4', status: 'Online', type: 'Comunitaria', color: 'text-blue-500' },
  { id: 'CAM-08', name: 'Perímetro Trasero', status: 'Offline', type: 'Privada', color: 'text-red-500' },
];

export default function CamarasPage() {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCam, setSelectedCam] = useState(cameras[0]);

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Active Camera Feed Preview */}
      <Card className="border-primary/40 bg-black overflow-hidden relative aspect-video flex items-center justify-center">
        {/* Tactical Overlay */}
        <div className="absolute inset-0 z-10 p-4 flex flex-col justify-between pointer-events-none">
          <div className="flex justify-between items-start">
            <div className="bg-black/60 px-2 py-1 border-l-2 border-primary">
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> LIVE // {selectedCam.id}
              </p>
              <p className="text-[8px] text-white/70 uppercase">{selectedCam.name}</p>
            </div>
            <div className="text-[8px] text-white/50 font-mono text-right">
              30 MAR 2026<br/>23:58:45
            </div>
          </div>
          <div className="flex justify-between items-end text-[8px] text-white/30 uppercase font-display tracking-widest">
            <span>BITRATE: 4.2 Mbps</span>
            <span>ENC: H.265 TACTICAL</span>
          </div>
        </div>

        {/* Video Placeholder */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557597774-9d2739f85a76?q=80&w=1000')] bg-cover bg-center opacity-40 grayscale" />
        <div className="relative z-0 group cursor-pointer">
           <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center border border-primary/40 group-hover:scale-110 transition-transform">
              <Video className="text-primary" size={32} />
           </div>
        </div>
        
        {/* Controls Overlay */}
        <div className="absolute bottom-4 right-4 z-20 flex gap-2">
           <Button size="icon" variant="tactical" className="w-8 h-8"><Maximize2 size={14} /></Button>
           <Button size="icon" variant="tactical" className="w-8 h-8"><History size={14} /></Button>
        </div>
      </Card>

      {/* Camera Selection Grid / List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-display text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <LayoutGrid size={14} /> Mis Cámaras de Seguridad
          </h3>
          <div className="flex bg-secondary p-1 border border-primary/10">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5", viewMode === 'grid' ? "bg-primary text-black" : "text-gray-500")}
            >
              <LayoutGrid size={12} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5", viewMode === 'list' ? "bg-primary text-black" : "text-gray-500")}
            >
              <Search size={12} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cameras.map((cam) => (
            <Card 
              key={cam.id} 
              className={cn(
                "p-4 cursor-pointer transition-all border-primary/5",
                selectedCam.id === cam.id ? "bg-primary/10 border-primary/40" : "bg-black/40 hover:bg-primary/5"
              )}
              onClick={() => setSelectedCam(cam)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={cn("p-1.5 bg-black/40 border border-primary/10", cam.color)}>
                  <Video size={14} />
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest",
                  cam.status === 'Offline' ? "text-red-500" : "text-green-500"
                )}>
                  {cam.status}
                </span>
              </div>
              <p className="text-[10px] font-bold text-white uppercase truncate">{cam.name}</p>
              <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">{cam.type}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Historical Request Section */}
      <Card className="border-primary/10 bg-secondary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 text-primary">
              <History size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase">Solicitar Grabaciones</h4>
              <p className="text-[10px] text-gray-500 uppercase">Acceso a archivo histórico (7 días)</p>
            </div>
          </div>
          <Button variant="outline" className="w-full text-[10px] h-11 tracking-[0.2em]">INICIAR SOLICITUD DE REVISIÓN</Button>
        </CardContent>
      </Card>

      {/* Coverage Map Miniature */}
      <Card className="border-primary/10 bg-black/40 h-40 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/auto/600x400?access_token=placeholder')] bg-cover opacity-30 grayscale group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapIcon size={24} className="text-primary mx-auto mb-2" />
            <p className="text-[10px] text-white uppercase font-black tracking-widest">Ver Mapa de Cobertura</p>
          </div>
        </div>
        <div className="absolute inset-0 border border-primary/20 m-2 pointer-events-none" />
      </Card>
    </div>
  );
}
