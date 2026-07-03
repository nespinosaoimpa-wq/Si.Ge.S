'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Check, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';

export default function GPSConsentModal({ resourceId = 'recurso_demo', onAccept }: { resourceId?: string, onAccept: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check if consent was already given in local storage
    try {
      const consent = localStorage.getItem('SIGPAD_gps_consent');
      if (!consent) {
        setIsOpen(true);
      } else {
        onAccept();
      }
    } catch (e) {
      console.warn("localStorage is restricted:", e);
      setIsOpen(true);
    }
  }, [onAccept]);

  const handleAccept = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('SIGPAD_gps_consent', 'true');
      
      // Save to Supabase
      await supabase.from('user_consents').insert({
        resource_id: resourceId,
        consent_type: 'gps_tracking',
        accepted: true,
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
      });

      setIsOpen(false);
      onAccept();
    } catch (e) {
      console.error("Error saving consent:", e);
      // Still proceed as we saved to localStorage at least
      setIsOpen(false);
      onAccept();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
      <Card className="w-full max-w-md bg-white overflow-hidden m-0 sm:m-4 max-h-[85vh] flex flex-col shadow-2xl">
        <div className="bg-primary/5 p-8 flex flex-col items-center justify-center text-center border-b border-gray-100">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 text-primary border border-primary/10">
            <Shield size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-tight">Monitoreo y Seguridad GPS</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-3">Ley N° 25.326 • Protección de Datos</p>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 text-sm text-gray-600 space-y-6">
          <p>
            Para garantizar tu seguridad y la de nuestros clientes, <strong>SIGPAD</strong> requiere acceso a tu ubicación en tiempo real.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Check size={16} className="text-green-500" /> ¿Qué recopilamos?
            </h4>
            <p className="text-xs">Tu geolocalización (latitud y longitud) con intervalos regulares.</p>
            
            <h4 className="font-bold text-gray-900 mb-2 mt-4 flex items-center gap-2">
              <Check size={16} className="text-green-500" /> ¿Cuándo?
            </h4>
            <p className="text-xs"><strong>EXCLUSIVAMENTE</strong> mientras mantengas un turno activo. Al hacer Check-Out, el rastreo se desactiva inmediatamente.</p>
            
            <h4 className="font-bold text-gray-900 mb-2 mt-4 flex items-center gap-2">
              <Check size={16} className="text-green-500" /> Tus Derechos
            </h4>
            <p className="text-xs">Puedes solicitar acceso, rectificación o eliminación de tus datos escribiendo a nuestro DPO. Toda la info en nuestras <Link href="/legal/privacidad" className="text-primary underline">Políticas de Privacidad</Link>.</p>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 flex flex-col gap-3 bg-gray-50/50">
          <Button onClick={handleAccept} disabled={isSaving} className="w-full h-14 uppercase font-black tracking-widest text-xs shadow-lg shadow-primary/20">
            {isSaving ? "Guardando..." : "Comprendo y Acepto"}
          </Button>
          <Button variant="outline" disabled={isSaving} className="w-full h-12 uppercase font-bold text-[10px] tracking-widest opacity-60 hover:opacity-100 transition-opacity" onClick={() => alert("Debes aceptar las condiciones para fichar un turno.")}>
            Rechazar
          </Button>
        </div>
      </Card>
    </div>
  );
}
