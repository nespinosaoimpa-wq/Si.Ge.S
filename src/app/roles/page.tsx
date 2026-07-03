'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Building2, 
  ChevronRight, 
  LayoutDashboard, 
  Fingerprint, 
  ClipboardList,
  BarChart3,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIGPADIcon } from '@/components/ui/SIGPADLogo';

const roles = [
  {
    id: 'gerente',
    title: 'Gerente Operativo',
    desc: 'Gestión de objetivos, personal e inteligencia de datos del servicio.',
    href: '/gerente',
    icon: Building2,
    color: 'bg-primary/10 text-primary',
    border: 'hover:border-primary/50',
    shadow: 'hover:shadow-primary/10'
  },
  {
    id: 'operador',
    title: 'Vigilador / Operador',
    desc: 'Registro de novedades, gestión de asistencia y libro de guardia digital.',
    href: '/operador',
    icon: ClipboardList,
    color: 'bg-zinc-900 text-primary',
    border: 'hover:border-zinc-700',
    shadow: 'hover:shadow-zinc-900/20'
  },
  {
    id: 'cliente',
    title: 'Portal de Clientes',
    desc: 'Visualización de reportes operativos y estado del servicio contratado.',
    href: '/cliente',
    icon: Users,
    color: 'bg-blue-50 text-blue-600',
    border: 'hover:border-blue-200',
    shadow: 'hover:shadow-blue-500/10'
  }
];

export default function RolesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-4xl relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-gray-100 rounded-full shadow-sm mb-6">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">SIGPAD - Plataforma v2.4</span>
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-48 h-16 bg-[#09090b] border border-zinc-800 rounded-2xl p-1.5 shadow-lg flex items-center justify-center">
              <SIGPADIcon className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4 uppercase">
            SIGPAD <span className="text-zinc-500">OS</span>
          </h1>
          <p className="text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
            Plataforma profesional de monitoreo y gestión integral de seguridad privada. <br />
            Ingrese con sus credenciales autorizadas para acceder al sistema.
          </p>
        </motion.div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
            >
              <Link href="/login" className="group">
                <div className={cn(
                  "h-full p-8 rounded-[2.5rem] bg-white border border-gray-100 transition-all duration-500 shadow-sm",
                  role.border,
                  role.shadow,
                  "group-hover:-translate-y-2 flex flex-col items-start"
                )}>
                  <div className={cn(
                    "w-16 h-16 rounded-3xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 duration-500",
                    role.color
                  )}>
                    <role.icon size={32} />
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
                    {role.title}
                  </h3>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">
                    {role.desc}
                  </p>
                  
                  <div className="mt-auto w-full flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-[11px] font-black uppercase tracking-widest text-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Iniciar Sesión <ChevronRight size={12} />
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <LayoutDashboard size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-20 flex flex-col items-center gap-4 py-8 pointer-events-none"
        >
          <div className="flex items-center gap-6 text-gray-300">
            <ClipboardList size={20} />
            <Fingerprint size={20} />
            <Building2 size={20} />
            <BarChart3 size={20} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.25em]">
            SIGPAD • Tecnología para Empresas de Seguridad Privada
          </p>
        </motion.div>
      </div>
    </div>
  );
}
