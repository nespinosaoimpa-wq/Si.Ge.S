'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Mail, BadgeCheck, 
  MapPin, LogOut, ChevronRight, Settings,
  ArrowLeft, Building2, Phone, Download
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';

export default function PerfilPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const OPERATOR_ID = user?.id || 'recurso_demo';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (OPERATOR_ID !== 'recurso_demo' || user?.email) {
          const params = new URLSearchParams();
          if (OPERATOR_ID !== 'recurso_demo') params.append('id', OPERATOR_ID);
          if (user?.email) params.append('email', user.email || '');

          const response = await fetch(`/api/resources/profile?${params.toString()}`);
          const res = await response.json();
          
          if (res) {
            setOperator(res);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    // REAL-TIME: Subscribe to resources, guard_shifts, and shift_requirements for instant sync
    const channel = supabase
      .channel(`profile-sync-${OPERATOR_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
        fetchUser();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guard_shifts' }, () => {
        fetchUser();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_requirements' }, () => {
        fetchUser();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, OPERATOR_ID]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="h-32 bg-zinc-100 rounded-3xl animate-pulse" />
          <div className="h-12 bg-zinc-100 rounded-2xl animate-pulse" />
          <div className="h-12 bg-zinc-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-32 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 p-6 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <Link href="/operador">
            <button className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-200">
               <ArrowLeft size={20} className="text-zinc-600" />
            </button>
          </Link>
          <h1 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Mi Perfil</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        
        {operator?.isRecovering && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-700 animate-pulse">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs text-left">
              <span className="font-black uppercase tracking-wider block mb-0.5 text-amber-800">Estado de Vinculación</span>
              Su cuenta de operador está sincronizándose automáticamente con el legajo de Recursos Humanos.
            </div>
          </div>
        )}

        {/* Profile Card */}
        <Card className="p-6 text-center border border-zinc-200 shadow-sm bg-white relative overflow-hidden rounded-[2rem]">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#0F4C5C]/5 rounded-full translate-x-16 -translate-y-16" />
           
           <div className="relative z-10">
              <div className="w-24 h-24 bg-zinc-100 rounded-full mx-auto flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                {operator?.avatar_url ? (
                  <img src={operator.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-zinc-600" />
                )}
              </div>
              <h2 className="mt-4 text-xl font-black text-zinc-900 uppercase tracking-tight">
                {operator?.name || (user?.email ? user.email.split('@')[0] : 'Vigilador Demo')}
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <BadgeCheck size={14} className="text-blue-500" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{operator?.role || 'Personal Certificado'}</span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4 mt-8 border-t border-zinc-100 pt-6">
              <div className="text-center">
                 <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Legajo</p>
                 <p className="text-sm font-black text-zinc-900 tracking-tighter">
                   #{operator?.id ? String(operator.id).substring(0, 8).toUpperCase() : 'DEMO'}
                 </p>
              </div>
              <div className="text-center border-l border-zinc-100">
                 <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Rango</p>
                 <p className="text-sm font-black text-zinc-900 uppercase italic leading-none">{operator?.role || 'Vigilador'}</p>
              </div>
           </div>
        </Card>

        {/* Details Section */}
        <div className="space-y-3">
           <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Información de Servicio</p>
           
           <Card className="p-5 space-y-5 border border-zinc-200 bg-white shadow-sm rounded-2xl">
              <div className="flex items-center gap-4">
                 <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all shadow-sm",
                    operator?.objectives?.name ? "bg-[#0F4C5C]/10 border-[#0F4C5C]/30 text-[#0F4C5C]" : "bg-zinc-50 border-zinc-100 text-zinc-600"
                 )}>
                    <Building2 size={18} />
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">Objetivo Actual</p>
                    <p className={cn(
                      "text-sm font-black uppercase tracking-tight",
                      operator?.objectives?.name ? "text-zinc-950" : "text-zinc-600 italic"
                    )}>
                      {operator?.objectives?.name || 'Sin Asignación'}
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center gap-4 border-t border-zinc-50 pt-5">
                 <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-600 border border-zinc-100">
                    <MapPin size={18} />
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">Base Operativa</p>
                    <p className="text-sm font-black text-zinc-950 uppercase tracking-tight">Central Operativa - SIGPAD</p>
                 </div>
              </div>
           </Card>
        </div>

        {/* Menu Actions */}
        <div className="space-y-2">
           {[
             { label: 'Descargar / Instalar App', icon: Download, color: 'text-[#0F4C5C]', onClick: () => window.dispatchEvent(new CustomEvent('trigger-pwa-install')) },
             { label: 'Configuración de App', icon: Settings, color: 'text-zinc-600', onClick: undefined },
             { label: 'Centro de Soporte 24/7', icon: Shield, color: 'text-zinc-600', onClick: undefined },
             { label: 'Reporte de Fallas', icon: Phone, color: 'text-zinc-600', onClick: undefined },
           ].map((item, i) => (
             <button 
               key={i} 
               onClick={item.onClick}
               className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-200 hover:bg-zinc-50 transition-all group shadow-sm"
             >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-50 group-hover:bg-white transition-colors border border-zinc-100", item.color)}>
                   <item.icon size={18} />
                </div>
                <span className="flex-1 text-sm font-bold text-zinc-900 text-left">{item.label}</span>
                <ChevronRight size={16} className="text-zinc-500" />
             </button>
           ))}
        </div>

        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-black uppercase tracking-widest text-[10px] gap-3 transition-all"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Finalizar Sesión Operativa
        </Button>

        <p className="text-[9px] text-center text-zinc-600 font-black uppercase tracking-[0.3em] mt-12">
          SIGPAD OS • CORPORATE ELITE V2.1
        </p>

      </div>
    </div>
  );
}
