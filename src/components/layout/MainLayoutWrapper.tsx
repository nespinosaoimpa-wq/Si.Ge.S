'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";

interface MainLayoutWrapperProps {
  children: React.ReactNode;
}

// Rutas públicas que no deben llevar Sidebar, AppHeader ni paddings del panel
const PUBLIC_ROUTES = [
  '/',
  '/roles',
  '/modulos',
  '/nosotros',
  '/login',
  '/register',
  '/cliente-login',
  '/presupuesto',
  '/legal'
];

export function MainLayoutWrapper({ children }: MainLayoutWrapperProps) {
  const pathname = usePathname();

  // Comprobar si la ruta actual es pública/comercial
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname?.startsWith('/legal/')
  );

  // Si es una ruta pública, renderizar limpio sin el Shell de la plataforma
  if (isPublicRoute) {
    return (
      <main className="min-h-screen bg-[#071E22]">
        {children}
      </main>
    );
  }

  // Si es una ruta del panel interno, aplicar Sidebar, AppHeader y paddings
  return (
    <>
      <Sidebar />
      <AppHeader />
      <main className="min-h-screen pt-16 lg:pl-[240px] pb-28 lg:pb-0 bg-zinc-50">
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </>
  );
}
