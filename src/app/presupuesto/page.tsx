'use client';

// Trigger build: 2026-05-07T14:06
import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Printer, Download, Shield, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function PresupuestoPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-8 print:max-w-full">
        
        {/* Header no imprimible */}
        <div className="flex justify-between items-center bg-black text-white p-6 rounded-[2rem] shadow-2xl print:hidden">
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Si.Ge.S <span className="text-primary">BUSINESS OS</span></h2>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Documento de Propuesta Comercial</p>
          </div>
          <Button onClick={handlePrint} className="bg-primary text-black font-black hover:bg-white transition-all haptic-light">
            <Printer size={18} className="mr-2" /> GENERAR PDF
          </Button>
        </div>

        {/* El Presupuesto (Contenedor Imprimible) */}
        <Card className="bg-white p-12 rounded-[3rem] shadow-sm border-gray-100 print:shadow-none print:border-none print:p-0 overflow-hidden relative">
          
          {/* Marca de Agua decorativa */}
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 print:hidden">
            <Shield size={400} />
          </div>

          <div className="relative z-10 space-y-12">
            
            {/* Cabecera Membretada */}
            <div className="flex justify-between items-start border-b-4 border-black pb-8">
              <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tighter text-black uppercase italic">Si.Ge.S <span className="text-primary">OS</span></h1>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-500">Comando de Seguridad Privada</p>
              </div>
              <div className="text-right text-[12px] font-medium text-gray-500 space-y-1">
                <p>Fecha: <span className="text-black font-bold">07 de Mayo, 2026</span></p>
                <p>Validez: <span className="text-black font-bold">15 d&iacute;as</span></p>
                <p>Referencia: <span className="text-black font-bold">SIGES-PR-2026-004</span></p>
              </div>
            </div>

            {/* Seccion Titulo */}
            <div className="space-y-6">
              <div className="inline-block bg-black text-white px-8 py-3 rounded-xl transform -skew-x-12">
                <h2 className="text-2xl font-black uppercase tracking-tight">Propuesta T&eacute;cnica y Comercial</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-8 bg-gray-50 p-8 rounded-3xl border border-gray-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Cliente</label>
                  <p className="text-sm font-bold text-gray-900">Si.Ge.S - Operaciones Argentina</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Proyecto</label>
                  <p className="text-sm font-bold text-gray-900">Ecosistema de Gesti&oacute;n T&aacute;ctica (SaaS)</p>
                </div>
              </div>
            </div>

            {/* Tabla de Items */}
            <div className="overflow-hidden border border-gray-100 rounded-3xl">
              <table className="w-full text-left">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest">M&oacute;dulo</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest">Tecnolog&iacute;a</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Inversi&oacute;n</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { name: 'N&uacute;cleo Operativo Backend', tech: 'Supabase Realtime', price: '2.000' },
                    { name: 'App Vigilador & GPS', tech: 'Next.js 15 + Mapbox', price: '3.500' },
                    { name: 'Panel Gerencia & BI', tech: 'Framer Motion + Tailwind', price: '2.500' },
                    { name: 'Asistente Judicial IA', tech: 'OpenAI Enterprise', price: '1.500' },
                  ].map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6">
                        <p className="font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: item.name }} />
                        <p className="text-[10px] text-gray-500 font-medium">Implementaci&oacute;n y despliegue</p>
                      </td>
                      <td className="p-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary uppercase border border-primary/20">
                          {item.tech}
                        </span>
                      </td>
                      <td className="p-6 text-right font-black text-gray-900">
                        U$S {item.price}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-black text-white">
                    <td colSpan={2} className="p-8 font-black uppercase text-sm tracking-widest italic">Inversi&oacute;n Total Estimada (MEP/BLUE)</td>
                    <td className="p-8 text-right text-2xl font-black text-primary italic">U$S 9.500</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Justificacion */}
            <div className="space-y-8">
               <h3 className="text-lg font-black uppercase tracking-tight border-l-4 border-primary pl-4">Justificaci&oacute;n del Valor</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                       <Shield size={20} />
                    </div>
                    <h4 className="font-black text-xs uppercase text-gray-900">Seguridad Certificada</h4>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                      Geolocalizaci&oacute;n de alta precisi&oacute;n con auditor&iacute;a de se&ntilde;al para validez legal.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                       <CheckCircle2 size={20} />
                    </div>
                    <h4 className="font-black text-xs uppercase text-gray-900">Eficiencia Operativa</h4>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                      Reducci&oacute;n del 60% en tiempos administrativos mediante automatizaci&oacute;n de actas.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                       <Download size={20} />
                    </div>
                    <h4 className="font-black text-xs uppercase text-gray-900">Arquitectura Moderna</h4>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                      Tecnolog&iacute;a serverless que minimiza costos de mantenimiento y escala ilimitadamente.
                    </p>
                  </div>
               </div>
            </div>

            {/* Footer Imprimible */}
            <div className="pt-12 border-t border-gray-100 text-center space-y-2">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Si.Ge.S Intelligence & Security Infrastructure</p>
               <p className="text-[9px] text-gray-400">Este documento es una estimaci&oacute;n basada en requerimientos actuales.</p>
            </div>

          </div>
        </Card>
        
        <div className="text-center print:hidden">
           <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest">Si.Ge.S OS | 2026</p>
        </div>

      </div>
    </div>
  );
}
