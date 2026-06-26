import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Mail, Database, MapPin } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <h1 className="font-bold text-gray-900">Política de Privacidad</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        
        <section className="text-center pb-6 border-b border-gray-200">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Privacidad y Protección de Datos</h2>
          <p className="text-gray-500 mt-2 font-medium">Última actualización: Abril 2026</p>
          <p className="text-sm text-gray-400 mt-1">Conforme a la Ley N° 25.326 de la República Argentina</p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <Database size={24} className="text-gray-400" />
            1. Responsable del Tratamiento
          </h3>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-gray-600 leading-relaxed font-medium">
            <p><strong>Si.Ge.S Custodia / Si.Ge.S Business OS</strong></p>
            <p>CUIT: 30-XXXXXXXX-X</p>
            <p>Domicilio: Si.Ge.S, Argentina</p>
            <p>Email DPO: legales@Si.Ge.S-custodia.com.ar</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <MapPin size={24} className="text-gray-400" />
            2. Geolocalización (GPS)
          </h3>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-gray-600 leading-relaxed font-medium space-y-3">
            <p>
              Para garantizar la seguridad de nuestro personal y de nuestros clientes, Si.Ge.S recopila datos de ubicación (Latitud y Longitud) a través de la aplicación del Operador.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>El rastreo GPS se activa <strong>exclusivamente</strong> cuando el usuario inicia su jornada laboral (Check-In).</li>
              <li>El rastreo se suspende <strong>inmediatamente</strong> al finalizar el turno (Check-Out).</li>
              <li>Si.Ge.S no rastrea de manera pasiva a sus empleados en segundo plano fuera de su horario laboral.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">3. Finalidad de los Datos</h3>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-gray-600 leading-relaxed font-medium space-y-3">
            <p>Los datos son recopilados con las siguientes finalidades estrictamente laborales y tácticas:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Verificación de presentismo y cumplimiento de cobertura en Objetivos.</li>
              <li>Asignación de operativos cercanos a la guardia activa para reforzar seguridad.</li>
              <li>Protección y asistencia inmediata del personal en caso de incidentes o "Botón de Pánico".</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">4. Derechos ARCO</h3>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-gray-600 leading-relaxed font-medium space-y-3">
            <p>
              En cumplimiento del <strong>Art. 14, 16 y concordantes de la Ley 25.326</strong>, usted tiene el derecho a solicitar sin cargo el Acceso, la Rectificación, la Cancelación o la Oposición respecto a los datos personales suministrados.
            </p>
            <p className="flex items-center gap-2 mt-4 text-primary font-bold">
              <Mail size={16} /> solicitudes@Si.Ge.S-custodia.com.ar
            </p>
            <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-4">
              La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

