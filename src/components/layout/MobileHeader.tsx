'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { SigesIcon } from '@/components/ui/SigesLogo';

export const MobileHeader = () => {
  const pathname = usePathname();
  const isOperador = pathname?.startsWith('/operador');
  
  // Hide on login/home
  if (pathname === '/login' || pathname === '/') return null;

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 z-[80] flex items-center justify-between px-6 safe-top transition-all duration-500">
      <div className="flex items-center gap-3">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/30 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden p-2">
             <SigesIcon className="text-primary w-full h-full" />
          </div>
        </div>
        <div>
          <h2 className="text-[13px] font-black text-white uppercase tracking-widest leading-none">
            {isOperador ? "Si.Ge.S Operativo" : "Si.Ge.S Business"}
          </h2>
          <p className="text-[8px] text-zinc-500 font-mono tracking-tighter uppercase mt-1">
            {isOperador ? "Terminal de Campo" : "Gestión Global"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
          <Search size={18} />
        </button>
        <button className="relative w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-zinc-950 shadow-[0_0_8px_rgba(244,180,0,0.4)] transition-transform hover:scale-125" />
        </button>
      </div>
    </header>
  );
};
