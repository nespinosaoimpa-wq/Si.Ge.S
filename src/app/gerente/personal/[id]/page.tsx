import React, { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { DownloadEvidenceButton } from '@/components/gerente/DownloadEvidenceButton';
import { ShieldCheck, Crosshair, Package, AlertTriangle, Clock, Camera, FileText, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { PayrollPanel } from './PayrollPanel';
import { DocumentPanel } from './DocumentPanel';

export const revalidate = 0;

async function getOperatorData(id: string) {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        assigned_objective:objectives(name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (e) {
    console.error("Error fetching operator:", e);
    return null;
  }
}

async function getShifts(id: string) {
  const { data } = await supabase
    .from('guard_shifts')
    .select('*, objectives(name)')
    .eq('operator_id', id)
    .order('checkin_time', { ascending: false })
    .limit(50); // Increased for PayrollPanel — dynamic fetch handles filtering
  return data || [];
}

async function getIncidents(id: string) {
  const { data } = await supabase
    .from('guard_book_entries')
    .select('id, entry_type, status')
    .eq('operator_id', id)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  return data || [];
}

async function getEvidence(id: string) {
  const { data } = await supabase
    .from('digital_evidence')
    .select('*, objectives(name)')
    .eq('operator_id', id)
    .order('created_at', { ascending: false })
    .limit(8);
  return data || [];
}

import { OperatorAvatarUploader } from '@/components/gerente/OperatorAvatarUploader';

export default async function OperatorProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  
  const operator = await getOperatorData(id);

  if (!operator) {
    return (
      <div className="p-20 text-center space-y-6 bg-zinc-50 min-h-screen">
        <div className="w-20 h-20 bg-white border border-zinc-200 shadow-sm rounded-3xl flex items-center justify-center mx-auto">
          <User size={40} className="text-zinc-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Legajo No Encontrado</h1>
          <p className="text-zinc-400 font-semibold text-sm mt-2">Verificá el número de legajo e intentá nuevamente</p>
        </div>
        <Link href="/gerente/personal">
          <button className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-zinc-800 transition-all">
            Volver al Personal
          </button>
        </Link>
      </div>
    );
  }

  const [shifts, incidents, evidence] = await Promise.all([
    getShifts(id),
    getIncidents(id),
    getEvidence(id)
  ]);

  const total_shifts = shifts.length;
  const abandon_count = incidents.filter(i => i.entry_type === 'abandono_zona').length;
  const critical_count = incidents.filter(i => i.status === 'crítica').length;
  const coverage = total_shifts > 0 ? 100 : 0; // Simplified for demo

  const expiryDate = operator.credential_expiry ? new Date(operator.credential_expiry) : null;
  const isExpiringSoon = expiryDate ? (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 30 : false;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 bg-zinc-50 min-h-screen text-zinc-900 pb-32">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 pb-10 border-b border-zinc-200">
        <div className="relative">
          <OperatorAvatarUploader
            operatorId={operator.id}
            currentAvatarUrl={operator.avatar_url}
            operatorName={operator.name}
          />
          {isExpiringSoon && (
            <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-zinc-50 shadow-md">
               <AlertTriangle size={14} className="text-black" />
            </div>
          )}
        </div>

        <div className="text-center md:text-left flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#0F4C5C]/10 text-[#0F4C5C] border border-[#0F4C5C]/20 rounded-full text-xs font-black uppercase tracking-widest">
              {operator.role || 'Guardia de Seguridad'}
            </span>
            <span className="px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-xs font-bold uppercase tracking-widest">
              Legajo SIGPAD-{String(operator.id).substring(0, 8).toUpperCase()}
            </span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">
            {operator.name}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-semibold text-zinc-500">
              {operator.assigned_objective?.name || 'Sin puesto asignado'}
            </p>
          </div>

          {/* INFORMACIÓN COMPLETA DEL LEGAJO */}
          <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5 grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 mt-6">
            {[
              { label: 'DNI / Documento', value: operator.dni || 'No registrado' },
              { label: 'Correo Electrónico', value: operator.email || 'N/A', href: operator.email ? `mailto:${operator.email}` : undefined },
              { label: 'Teléfono / WhatsApp', value: operator.phone || 'Sin teléfono', href: operator.phone ? `tel:${operator.phone}` : undefined },
              { label: 'Domicilio', value: operator.address || 'No registrado' },
              { label: 'Credencial Nº', value: operator.credential_number || 'Sin credencial' },
              { label: 'Vencimiento Credencial', value: operator.credential_expiry ? new Date(operator.credential_expiry).toLocaleDateString('es-AR') : 'Indefinido', alert: isExpiringSoon },
              { label: 'Talle Camisa', value: operator.shirt_size || '—' },
              { label: 'Talle Pantalón', value: operator.pants_size || '—' },
              { label: 'Talle Calzado', value: operator.boot_size ? `N° ${operator.boot_size}` : '—' },
            ].map((field, i) => (
              <div key={i} className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">{field.label}</p>
                {field.href ? (
                  <a href={field.href} className={cn('font-semibold text-sm hover:text-[#0F4C5C] transition-colors block truncate', field.alert ? 'text-amber-600 font-black' : 'text-zinc-800')}>
                    {field.value}
                  </a>
                ) : (
                  <p className={cn('font-semibold text-sm', field.alert ? 'text-amber-600 font-black' : 'text-zinc-800')}>
                    {field.value}
                  </p>
                )}
              </div>
            ))}
          </div>  {/* closes legajo grid */}
        </div>  {/* closes flex-1 text column */}

        <div className="flex flex-col gap-3 min-w-[180px]">
           <a 
             href={`https://wa.me/${operator.phone?.replace(/\D/g, '')}`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="h-11 px-6 bg-zinc-100 border border-zinc-200 rounded-xl font-black uppercase text-[10px] tracking-widest text-zinc-600 hover:text-zinc-900 transition-all flex items-center justify-center text-center"
           >
             Contactar
           </a>
           <button className="h-11 px-6 bg-[#0F4C5C] text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#c49b2e] transition-colors">
             Ver Desempeño
           </button>
        </div>
      </div>  {/* closes main header flex row */}


      {/* KPI TILES: Corporate Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 print:hidden">
        <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-[#0F4C5C]/20 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Crosshair size={80} className="text-[#0F4C5C]" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Eficiencia del Servicio</p>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-black tabular-nums text-zinc-900 tracking-tighter">{coverage}%</span>
            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Óptimo</span>
          </div>
          <div className="mt-8 w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${coverage}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-red-500/20 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle size={80} className="text-red-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Incidencias de Cobertura</p>
          <div className="flex items-baseline gap-3">
            <span className={cn("text-6xl font-black tabular-nums tracking-tighter", abandon_count > 0 ? "text-[#0F4C5C]" : "text-zinc-900")}>
              {abandon_count}
            </span>
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Últ. 7 días</span>
          </div>
          <p className="text-[10px] font-black text-zinc-400 uppercase mt-6 tracking-[0.2em]">Protocolo de cumplimiento estricto</p>
        </div>

        <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-amber-500/20 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck size={80} className="text-amber-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Incidentes Reportados</p>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-black tabular-nums text-zinc-900 tracking-tighter">{critical_count}</span>
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">En Auditoría</span>
          </div>
          <p className="text-[10px] font-black text-zinc-400 uppercase mt-6 tracking-[0.2em]">Monitoreo de seguridad integral</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 print:hidden">
        
        {/* OPERATIONAL LOG */}
        <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-10">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-[#0F4C5C] flex items-center gap-4">
              <Clock size={24} /> Historial de Turnos
            </h2>
          </div>
          <div className="space-y-4">
            {shifts.map((shift: any) => (
              <div key={shift.id} className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-[#0F4C5C]/30 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Puesto de Servicio</p>
                    <p className="text-lg font-black uppercase text-zinc-800 tracking-tight group-hover:text-[#0F4C5C] transition-colors">{shift.objectives?.name || 'Unidad Móvil'}</p>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 tabular-nums">
                    {new Date(shift.checkin_time).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase">Check-In:</span>
                    <span className="text-xs font-bold text-zinc-700 tabular-nums">{new Date(shift.checkin_time).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-200"></div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase">Check-Out:</span>
                    <span className="text-xs font-bold text-zinc-700 tabular-nums">{shift.checkout_time ? new Date(shift.checkout_time).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}) : 'ACTIVO'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INVENTORY / ASSETS */}
        <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-10 flex flex-col">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-10 text-[#0F4C5C] flex items-center gap-4">
            <Package size={24} /> Activos en Posesión
          </h2>
          <div className="flex-1 flex flex-col justify-center items-center text-center p-10 border-2 border-dashed border-zinc-100 rounded-[2.5rem] bg-zinc-50">
            <div className="w-20 h-20 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center mb-6">
              <Package size={40} className="text-zinc-300" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-500 px-3 py-1 rounded-full mb-4">Asignación Dinámica</p>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">
              Los activos son auditados mediante <br/>protocolo QR al inicio de cada servicio para asegurar trazabilidad total.
            </p>
          </div>
          <button className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-zinc-800 transition-all mt-8">
            Ver Registro de Inventario
          </button>
        </div>

      </div>

      {/* CÓMPUTO DE HABERES */}
      <PayrollPanel 
        operatorId={operator.id}
        operatorName={operator.name || 'Operador'}
        operatorRole={operator.role || 'Guardia'}
        initialRate={operator.hourly_pay_rate || operator.salary || 3500} 
        shifts={shifts} 
      />

      {/* DOCUMENTACIÓN DEL LEGAJO */}
      <DocumentPanel 
        operatorId={operator.id} 
        initialDocuments={operator.documents || []} 
      />

      {/* DIGITAL EVIDENCE GALLERY */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-10 print:hidden">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-[#0F4C5C] flex items-center gap-4">
            <Camera size={24} /> Archivo de Evidencia Digital
          </h2>
          <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white px-6 py-2 rounded-xl">
            {evidence.length} Registros Forenses
          </span>
        </div>
        
        {evidence.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {evidence.map((doc: any) => (
              <div key={doc.id} className="group relative rounded-[2.5rem] overflow-hidden border border-zinc-100 bg-zinc-50 aspect-[3/4] hover:border-[#0F4C5C]/50 transition-all shadow-md">
                <DownloadEvidenceButton doc={doc} operatorName={operator.name} />
                <img src={doc.image_url} alt="Evidencia" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-8 flex flex-col justify-end">
                  <p className="text-[10px] font-black text-[#0F4C5C] uppercase tracking-[0.2em] mb-2">{doc.objectives?.name}</p>
                  <div className="flex items-center gap-3 opacity-80">
                    <Clock size={12} className="text-white" />
                    <p className="text-[10px] font-bold text-white tabular-nums">{new Date(doc.created_at).toLocaleString('es-AR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-zinc-100 rounded-[3rem] bg-zinc-50">
            <FileText size={56} className="text-zinc-200 mx-auto mb-6" />
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">No se han registrado actas digitales para este operativo</p>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
