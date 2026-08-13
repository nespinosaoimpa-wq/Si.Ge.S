'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  MapPin, Users, Clock, BookOpen, Activity, Globe, AlertTriangle,
  Layers, BarChart3, FileText, Lock, Camera, ChevronRight,
  CheckCircle2, ArrowLeft, X
} from 'lucide-react';
import { SIGPADIcon } from '@/components/ui/SIGPADLogo';

const modules = [
  {
    icon: MapPin,
    color: '#3ABEFF',
    title: 'Mapa Táctico en Tiempo Real',
    badge: 'GPS · Geofencing',
    short: 'Monitoreo satelital de guardias con geofencing y alertas automáticas.',
    description: 'El corazón de SIGPAD. Visualiza la posición de todos tus guardias en tiempo real sobre un mapa interactivo. Configura zonas de geofencing que emiten alertas automáticas cuando un guardia sale del perímetro asignado. Revisa el historial de trazados de patrullas y analiza cobertura operativa.',
    features: [
      'GPS en tiempo real de todos los guardias activos',
      'Zonas de geofencing configurables por objetivo',
      'Alertas automáticas de salida de perímetro',
      'Historial de trazados y rutas recorridas',
      'Vista satelital e híbrida del terreno',
      'Integración con rondines y checkpoints',
    ],
    benefit: 'Elimina los rondines sin verificación. Cada patrulla queda registrada con GPS, hora exacta y firma digital.',
  },
  {
    icon: Users,
    color: '#10B981',
    title: 'Gestión de Personal y Legajos',
    badge: 'RRHH · Documentación',
    short: 'CRUD completo de guardias con legajos digitales y gestión documental.',
    description: 'Centraliza toda la información de tu personal en legajos digitales completos. Gestiona datos personales, certificaciones, vencimientos de documentos, uniformes asignados y estado laboral. Recibe alertas automáticas antes del vencimiento de habilitaciones.',
    features: [
      'Legajos digitales con fotos y documentos',
      'Alertas de vencimiento de certificaciones',
      'Control de uniformes y equipamiento asignado',
      'Historial de objetivos y turnos',
      'Gestión de licencias y ausencias',
      'Exportación de legajos en PDF',
    ],
    benefit: 'Adiós a los legajos en papel. Toda la información de tu equipo, accesible desde cualquier dispositivo.',
  },
  {
    icon: Clock,
    color: '#F59E0B',
    title: 'Fichaje Geolocalizado',
    badge: 'Asistencia · Anti-fraude',
    short: 'Check-in/out con validación GPS de 300m. Sin posibilidad de fraude.',
    description: 'El sistema de fichaje más confiable del mercado. Los guardias solo pueden fichar entrada y salida cuando están dentro de un radio de 300 metros del objetivo asignado. El sistema registra la geolocalización exacta, timestamp y foto del guardia en cada fichaje.',
    features: [
      'Validación GPS con radio configurable (100m-1km)',
      'Foto automática en cada fichaje',
      'Timestamp inmutable del registro',
      'Alertas de tarde, ausente y hora extra',
      'Dashboard de asistencia en tiempo real',
      'Exportación para liquidación de haberes',
    ],
    benefit: 'Elimina el fraude de asistencia y los conflictos de horas trabajadas. Datos objetivos e inviolables.',
  },
  {
    icon: BookOpen,
    color: '#8B5CF6',
    title: 'Libro de Guardia Digital',
    badge: 'Novedades · Evidencia',
    short: 'Novedades digitales con fotos, urgencia y firma.',
    description: 'Reemplaza el libro de guardia en papel con una versión digital, siempre disponible y legalmente válida. Los guardias registran novedades con categoría de urgencia, adjuntan fotos, videos y firmas digitales. El gerente recibe notificaciones en tiempo real de novedades críticas.',
    features: [
      'Categorías de urgencia configurables',
      'Adjunto de fotos y evidencia multimedia',
      'Firma digital del guardia en cada entrada',
      'Notificaciones push al gerente en novedades críticas',
      'Búsqueda y filtrado por fecha, objetivo y tipo',
      'Exportación legal en PDF con timestamps',
    ],
    benefit: 'Cada novedad queda registrada con evidencia, firma y geolocalización. Válido para procesos legales y auditorías.',
  },
  {
    icon: Activity,
    color: '#EC4899',
    title: 'Control de Rondines y Patrullas',
    badge: 'Patrullas · Checkpoints',
    short: 'Tracking GPS de patrullas con checkpoints QR verificados.',
    description: 'Diseña rutas de patrullaje con checkpoints físicos y verifica en tiempo real que cada guardia los recorre. Los checkpoints se marcan en el mapa y se verifican mediante escaneo QR o NFC. El sistema calcula el porcentaje de cobertura y eficacia de cada rondín.',
    features: [
      'Diseño de rutas con checkpoints en mapa',
      'Verificación por QR o NFC en campo',
      'Tracking GPS del recorrido completo',
      'Cálculo de eficacia y cobertura (%)',
      'Alertas de checkpoints omitidos',
      'Historial y comparativa de rondines',
    ],
    benefit: 'Demuéstrale a tus clientes con datos objetivos que sus instalaciones están siendo patrulladas correctamente.',
  },
  {
    icon: Globe,
    color: '#3ABEFF',
    title: 'Portal de Clientes VIP',
    badge: 'Transparencia · Reportes',
    short: 'Acceso exclusivo para clientes a reportes y estado del servicio.',
    description: 'Diferénciate de la competencia ofreciendo a tus clientes corporativos un portal privado con acceso a toda la información de su servicio en tiempo real. Pueden ver guardias activos, patrullas, novedades e incidentes, y descargar reportes en cualquier momento.',
    features: [
      'Login exclusivo con código de acceso',
      'Dashboard personalizado por cliente',
      'Estado de guardias asignados en tiempo real',
      'Historial de patrullas y cobertura',
      'Registro de incidentes y novedades',
      'Gestión de tickets de requerimientos',
      'Descarga de reportes PDF',
    ],
    benefit: 'Un diferenciador enorme en la venta. Los clientes ven exactamente lo que están pagando, en tiempo real.',
  },
  {
    icon: AlertTriangle,
    color: '#EF4444',
    title: 'Sistema de Emergencias',
    badge: 'Pánico · Alertas 24/7',
    short: 'Botón de pánico con alertas instantáneas y protocolos de respuesta.',
    description: 'Sistema de emergencias crítico que puede salvar vidas. El guardia presiona el botón de pánico en la app y en segundos se activan alertas sonoras en el dashboard del gerente, se envían notificaciones push y se registra la geolocalización exacta del incidente.',
    features: [
      'Botón de pánico en pantalla principal del operador',
      'Alertas sonoras automáticas en dashboard gerente',
      'Notificaciones push a todos los supervisores',
      'Geolocalización automática del incidente',
      'Protocolos de respuesta configurables',
      'Registro inmutable del evento para legales',
    ],
    benefit: 'La seguridad de tu equipo no puede esperar. Respuesta inmediata ante cualquier incidente en campo.',
  },
  {
    icon: Layers,
    color: '#10B981',
    title: 'Inventario y Equipamiento',
    badge: 'Control · Handoff',
    short: 'Control de elementos con handoff entre turnos y trazabilidad.',
    description: 'Gestiona todo el equipamiento asignado a cada objetivo: radios, vehículos, equipo de seguridad y más. El sistema registra cada handoff entre turnos con firma digital de ambas partes, generando un historial completo de la cadena de custodia del equipamiento.',
    features: [
      'Registro de items por objetivo',
      'Handoff digital entre guardias con firma',
      'Estado y condición de cada item',
      'Alertas de items faltantes o dañados',
      'Historial de custodios',
      'Reportes de inventario para auditoría',
    ],
    benefit: 'Elimina los conflictos por equipamiento perdido. Cada item tiene su cadena de custodia documentada.',
  },
  {
    icon: BarChart3,
    color: '#F59E0B',
    title: 'Nómina y Planillas',
    badge: 'Haberes · Automatización',
    short: 'Cálculo automático de horas, extras y adicionales del CCT.',
    description: 'Calcula automáticamente la nómina de tu equipo en base a los registros de fichaje. Reconoce horas normales, adicionales nocturnas, francos trabajados, horas extra y adicionales del CCT de vigiladores privados. Genera planillas listas para liquidación.',
    features: [
      'Cálculo automático desde registros de fichaje',
      'Reconocimiento de adicionales del CCT',
      'Horas extra y nocturnas automáticas',
      'Descuentos por ausencias y llegadas tarde',
      'Planillas individuales y grupales',
      'Exportación a Excel y PDF',
    ],
    benefit: 'Lo que antes llevaba días de cálculo manual, ahora se genera en segundos con precisión total.',
  },
  {
    icon: FileText,
    color: '#8B5CF6',
    title: 'Reportes PDF Automatizados',
    badge: 'Informes · Auditoría',
    short: 'Generación automática de informes con firmas y timestamps.',
    description: 'Genera reportes profesionales en PDF con un solo click. Reportes de asistencia, cobertura de patrullas, incidentes, inventario y cumplimiento normativo. Todos los reportes incluyen firma digital, timestamps y son válidos para presentación ante clientes y organismos.',
    features: [
      'Reportes de asistencia mensual/semanal',
      'Informes de cobertura de patrullas',
      'Reportes de incidentes para clientes',
      'Auditorías de cumplimiento normativo',
      'Firma digital y timestamps inmutables',
      'Customización con logo de la empresa',
    ],
    benefit: 'Profesionaliza la presentación a tus clientes. Un reporte automatizado vale más que mil explicaciones.',
  },
];

export default function ModulosPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#071E22] text-zinc-100 overflow-x-hidden">
      {/* Ambient */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[5%] right-[-15%] w-[600px] h-[600px] bg-[#0F4C5C]/15 blur-[150px] rounded-full" />
        <div className="absolute bottom-[5%] left-[-15%] w-[500px] h-[500px] bg-[#237893]/10 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-[#071E22]/90 backdrop-blur-2xl border-b border-[#237893]/10 h-16 flex items-center justify-between px-6 lg:px-12">
        <Link href="/" className="flex items-center gap-3">
          <SIGPADIcon className="w-8 h-8 text-[#3ABEFF]" />
          <div>
            <span className="font-black text-lg tracking-tight uppercase text-white block leading-none">SIGPAD</span>
            <span className="text-[7px] font-bold tracking-[0.1em] uppercase text-[#3ABEFF] block leading-none">Sistema Inteligente de Gestión y Seguridad Dinámica</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Módulos', href: '/#modulos', isRoute: true },
            { label: 'Detalle', href: '/modulos', isRoute: true },
            { label: 'Nosotros', href: '/nosotros', isRoute: true },
            { label: 'Contacto', href: '/#contacto', isRoute: true },
          ].map(link => (
            <Link key={link.href} href={link.href} className="text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/roles" className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#3ABEFF] hover:text-white transition-colors px-4 py-2 border border-[#3ABEFF]/25 rounded-xl bg-[#3ABEFF]/5 hover:bg-[#3ABEFF]/10">
            Ingresar
          </Link>
          <a href="/#contacto" className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[#3ABEFF] text-[#071E22] font-black uppercase text-[9px] tracking-widest hover:bg-white transition-all shadow-lg shadow-[#3ABEFF]/20 hover:scale-105">
            Solicitar Demo
          </a>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white">
            {mobileMenuOpen ? <X size={20} /> : <Layers size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 inset-x-0 z-40 bg-[#071E22]/98 backdrop-blur-xl border-b border-[#237893]/10 p-6 flex flex-col gap-4"
          >
            {[
              { label: 'Módulos', href: '/#modulos' },
              { label: 'Detalle', href: '/modulos' },
              { label: 'Nosotros', href: '/nosotros' },
              { label: 'Precios', href: '/#precios' },
              { label: 'Contacto', href: '/#contacto' },
            ].map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-black uppercase tracking-wider text-zinc-300 hover:text-white py-2 border-b border-[#237893]/10 block">
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-12 px-6 lg:px-12 max-w-7xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0F4C5C]/30 border border-[#237893]/20 rounded-full mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3ABEFF] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#3ABEFF]">10 Módulos Integrados</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-black uppercase text-white font-display leading-none mb-6">
            Todo lo que necesita <br />
            <span className="text-[#3ABEFF]">tu empresa de seguridad</span>
          </h1>
          <p className="text-zinc-400 text-base max-w-2xl mx-auto font-medium leading-relaxed">
            Cada módulo fue diseñado específicamente para las necesidades reales de las empresas de seguridad privada argentina.
          </p>
        </motion.div>
      </section>

      {/* Modules Grid */}
      <section className="relative z-10 pb-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod, i) => (
            <motion.button
              key={i}
              onClick={() => setSelected(i)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group text-left p-7 rounded-[2rem] bg-[#0B2A30]/60 border border-[#237893]/15 hover:border-[#237893]/40 hover:bg-[#0F4C5C]/20 transition-all hover:-translate-y-1 relative"
            >
              {mod.comingSoon && (
                <span className="absolute top-4 right-4 px-2.5 py-1 bg-zinc-800 text-zinc-400 text-[8px] font-black uppercase tracking-wider rounded-full border border-zinc-700">
                  Próximamente
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300"
                style={{ background: `${mod.color}15`, border: `1px solid ${mod.color}25` }}>
                <mod.icon size={22} style={{ color: mod.color }} />
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: mod.color }}>{mod.badge}</span>
              </div>
              <h3 className="text-base font-black uppercase text-white mb-2">{mod.title}</h3>
              <p className="text-zinc-400 text-[11px] font-medium leading-relaxed mb-4">{mod.short}</p>
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider" style={{ color: mod.color }}>
                Ver detalles <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 pb-24 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto p-10 rounded-[2.5rem] bg-gradient-to-br from-[#0F4C5C]/60 to-[#0B2A30]/80 border border-[#237893]/20 text-center">
          <h2 className="text-3xl font-black uppercase text-white mb-4">
            ¿Listo para transformar tu operación?
          </h2>
          <p className="text-zinc-400 text-sm font-medium mb-8 max-w-xl mx-auto">
            Solicita una demo personalizada y te mostramos cómo cada módulo puede adaptarse a las necesidades específicas de tu empresa.
          </p>
          <a href="/#contacto" className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-[#3ABEFF] text-[#071E22] font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-xl shadow-[#3ABEFF]/20 hover:scale-105">
            Solicitar Demo Gratuita <ArrowLeft size={16} className="rotate-180" />
          </a>
        </div>
      </section>

      {/* Module Detail Modal */}
      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#071E22] border border-[#237893]/20 rounded-[2.5rem] p-8 relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setSelected(null)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#0B2A30] border border-[#237893]/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={16} />
              </button>

              {modules[selected].comingSoon && (
                <div className="mb-4 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-full inline-flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">🚧 Próximamente disponible</span>
                </div>
              )}

              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: `${modules[selected].color}15`, border: `1px solid ${modules[selected].color}25` }}>
                {React.createElement(modules[selected].icon, { size: 26, style: { color: modules[selected].color } })}
              </div>

              <span className="text-[9px] font-black uppercase tracking-widest block mb-2" style={{ color: modules[selected].color }}>
                {modules[selected].badge}
              </span>
              <h2 className="text-2xl font-black uppercase text-white mb-4">{modules[selected].title}</h2>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed mb-6">{modules[selected].description}</p>

              <div className="mb-6">
                <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-3">Funcionalidades incluidas</p>
                <ul className="space-y-2.5">
                  {modules[selected].features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-[11px] text-zinc-300 font-medium">
                      <CheckCircle2 size={13} style={{ color: modules[selected].color }} className="shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-2xl border" style={{ background: `${modules[selected].color}08`, borderColor: `${modules[selected].color}20` }}>
                <p className="text-[9px] uppercase tracking-widest font-black mb-1" style={{ color: modules[selected].color }}>Beneficio clave</p>
                <p className="text-zinc-200 text-sm font-medium leading-relaxed">{modules[selected].benefit}</p>
              </div>

              <a href="/#contacto" className="mt-6 w-full h-12 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all text-[#071E22] hover:scale-[1.02]"
                style={{ background: modules[selected].color }}>
                Solicitar Demo de Este Módulo
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
