import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, LogOut, Building, Activity, FileText } from 'lucide-react';

export const metadata = {
  title: 'Portal de Clientes Corporativos — SIGPAD',
  description: 'Visualización ejecutiva de custodia en tiempo real y auditoría de puesto.',
};

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* EXECUTIVE NAVIGATION HEADER */}
      <header className="h-16 bg-gray-900/90 border-b border-gray-800/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <Image
              src="/logo_sigpad.png"
              alt="SIGPAD"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider uppercase text-white">SIGPAD</span>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-800/60">
                PORTAL CLIENTE
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Monitoreo y Auditoría Corporativa</p>
          </div>
        </div>

        {/* ACCOUNT INFO & LOGOUT */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-300 bg-gray-800/60 px-3 py-1.5 rounded-xl border border-gray-700/50">
            <Building size={14} className="text-indigo-400" />
            <span className="font-semibold">Barrio Privado / Consorcio</span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700/40 transition-colors"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Link>
        </div>
      </header>

      {/* MAIN PORTAL BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-900 bg-gray-950 py-4 px-8 text-center text-xs text-gray-600">
        SIGPAD Security Operating System — Plataforma de Gestión y Auditoría de Seguridad Privada 2026
      </footer>
    </div>
  );
}
