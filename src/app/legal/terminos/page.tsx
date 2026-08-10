'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, CreditCard, Scale, Globe, Building2, ShieldAlert } from 'lucide-react';

export default function TerminosSaaSPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pb-20 text-zinc-900">
      {/* Header Navigation */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-zinc-100 transition-colors">
            <ArrowLeft size={20} className="text-zinc-600" />
          </Link>
          <h1 className="font-extrabold text-zinc-950 text-lg uppercase tracking-wider">Términos de Servicio SaaS & Habilitación Legal</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        
        {/* Intro Hero Section */}
        <section className="text-center pb-8 border-b border-zinc-200">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <Scale size={32} />
          </div>
          <h2 className="text-3xl font-black text-zinc-950 uppercase tracking-tight">Condiciones Generales de Suscripción</h2>
          <p className="text-zinc-500 mt-2 font-semibold">Plataforma SaaS de Seguridad Inteligente Dinámica — SIGPAD</p>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Válido para Argentina, Latinoamérica e Internacional • Actualizado a Julio 2026</p>
        </section>

        {/* 1. SaaS Model & Membership */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2.5 text-zinc-950">
            <CreditCard size={22} className="text-primary" />
            1. Modelo de Membresía SaaS y Facturación
          </h3>
          <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4 text-zinc-600 leading-relaxed font-medium">
            <p>
              SIGPAD se distribuye bajo un modelo de **Software como Servicio (SaaS)** mediante suscripción mensual recurrente. El licenciamiento se calcula por empresa contratante bajo dos modalidades seleccionables:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Tarifa por Recurso Activo (Operador/Guardia):</strong> Se cobra una membresía base por cada cuenta de operador registrada en la base de datos que realice al menos un Fichaje (Check-In) en el mes calendario.
              </li>
              <li>
                <strong>Tarifa por Objetivo Monitoreado:</strong> Suscripción plana basada en la cantidad de puestos de control/físicos dados de alta con geocercas activas.
              </li>
            </ul>
            <p className="text-sm bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              <strong>Pasarelas y Moneda:</strong> Los pagos internacionales se procesan en USD vía Stripe o Paddle. Para el mercado de Argentina, las suscripciones se cotizan en pesos argentinos (ARS) ajustados al índice de inflación local, procesados vía dación de cobro o Mercado Pago.
            </p>
          </div>
        </section>

        {/* 2. Argentina Regulatory Adaptations */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2.5 text-zinc-950">
            <Building2 size={22} className="text-primary" />
            2. Adaptación Fiscal y Habilitaciones en Argentina
          </h3>
          <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4 text-zinc-600 leading-relaxed font-medium">
            <p>
              Para facturar y comercializar SIGPAD de forma legal a empresas en la República Argentina, el sistema cumple con las normativas vigentes:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                <h4 className="font-bold text-zinc-950 mb-1">Cumplimiento AFIP</h4>
                <p className="text-xs text-zinc-500">
                  Emisión automatizada de Facturas electrónicas tipo A y B según la condición frente al IVA de la empresa compradora. Las integraciones de pago locales retienen los porcentajes correspondientes de IIBB (Ingresos Brutos) y retención del IVA de forma automática.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                <h4 className="font-bold text-zinc-950 mb-1">Seguridad Privada</h4>
                <p className="text-xs text-zinc-500">
                  La plataforma está diseñada para cumplir con las leyes provinciales de seguridad privada (como la Ley 12.297 en Provincia de Buenos Aires o normativas análogas de la Ciudad Autónoma de Buenos Aires y Santa Fe) respecto al registro e identificación del personal técnico.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Privacy, Geolocation Consent & GDPR/Ley 25.326 */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2.5 text-zinc-950">
            <ShieldAlert size={22} className="text-red-500" />
            3. Geolocalización de Empleados y Consentimiento Legal
          </h3>
          <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4 text-zinc-600 leading-relaxed font-medium">
            <p>
              El monitoreo de ubicación en segundo plano es una actividad regulada. SIGPAD asume el rol de **Encargado del Tratamiento (Data Processor)** y la empresa cliente es el **Responsable del Tratamiento (Data Controller)**.
            </p>
            <div className="space-y-3 border-l-4 border-amber-500 pl-4 py-1 my-3 bg-amber-50/50 p-4 rounded-r-xl">
              <h4 className="text-zinc-900 font-bold text-xs uppercase tracking-wider">Obligaciones Críticas del Inquilino (Empresa Cliente):</h4>
              <ul className="list-disc pl-4 text-xs text-zinc-600 space-y-1.5">
                <li>
                  <strong>Consentimiento Informado por Escrito:</strong> El cliente debe hacer firmar a cada guardia/operador un documento de consentimiento expreso para el rastreo por GPS de su dispositivo durante su horario laboral (Conforme a la Ley 25.326 en Argentina, GDPR en Europa y leyes locales de trabajo).
                </li>
                <li>
                  <strong>Registro de Bases de Datos:</strong> Registrar las bases de datos de personal y trayectos geográficos ante la Agencia de Acceso a la Información Pública (AAIP) en Argentina, o el órgano de control correspondiente en cada país de operación.
                </li>
                <li>
                  <strong>Limitación de Monitoreo:</strong> El seguimiento GPS debe restringirse estrictamente al horario laboral definido por los Check-Ins del sistema.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Global SLA & International SaaS Compliance */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2.5 text-zinc-950">
            <Globe size={22} className="text-primary" />
            4. SLA Global e Infraestructura de Datos
          </h3>
          <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4 text-zinc-600 leading-relaxed font-medium">
            <p>
              Para garantizar un servicio de perfil internacional y profesional, SIGPAD ofrece un **SLA (Service Level Agreement)** estándar:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-600">
              <li>
                <strong>Disponibilidad de Servicio (Uptime):</strong> Compromiso de disponibilidad del 99.9% anual para servidores de bases de datos y APIs tácticas.
              </li>
              <li>
                <strong>Cifrado y Seguridad Forense:</strong> Los logs de eventos de rondines y geocercas se sellan con criptografía SHA-256 (función Judicial Panic) garantizando la inmutabilidad de los datos frente a auditorías legales en siniestros.
              </li>
              <li>
                <strong>Aislamiento de Inquilinos (Tenant Isolation):</strong> Las bases de datos operan con políticas RLS (Row Level Security) estrictas en Supabase para evitar accesos cruzados de datos de ubicación o alarmas entre diferentes empresas registradas.
              </li>
            </ul>
          </div>
        </section>

        {/* Legal Footer Info */}
        <div className="text-center pt-6 text-xs text-zinc-400 font-medium">
          <p>Al dar de alta tu empresa en la consola de SIGPAD, declaras aceptar estos términos de uso y tratamiento de datos.</p>
          <p className="mt-2">Contacto de legales corporativo: <span className="font-mono text-zinc-500">saas-support@sigpad.io</span></p>
        </div>

      </div>
    </div>
  );
}
