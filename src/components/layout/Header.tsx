'use client';

import React from 'react';
import { Bell, Search, Clock, ShieldCheck, Activity } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export function Header({ title }: { title: string }) {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-20 border-b border-primary/20 bg-background/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40 ml-64">
      <div className="flex items-center gap-6 flex-1">
        <h1 className="text-2xl font-bold text-primary tracking-tight whitespace-nowrap">
          {title}
        </h1>
        
        <div className="max-w-md w-full relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="BUSCAR RECURSOS, PERSONAL O OBJETIVOS..." 
            className="pl-12 bg-surface/30 border-primary/10 hover:border-primary/30 focus:border-primary uppercase text-[10px] tracking-widest"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 px-4 py-2 bg-black border border-primary/10 rounded-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-primary font-bold">
            {time.toLocaleTimeString('es-AR', { hour12: false })}
          </span>
          <span className="text-[10px] text-gray-500 font-display">UTC-3</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 border border-primary/20 bg-primary/5">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-[10px] text-primary font-display uppercase tracking-widest">RED SATELITAL OK</span>
        </div>

        <div className="relative cursor-pointer group">
          <Bell className="w-6 h-6 text-gray-500 group-hover:text-primary transition-colors" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[10px] flex items-center justify-center font-bold text-white border-2 border-background animate-pulse">
            3
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 border border-green-500/20 bg-green-500/5">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span className="text-[10px] text-green-500 font-display uppercase tracking-widest">Sistema Protegido</span>
        </div>
      </div>
    </header>
  );
}
