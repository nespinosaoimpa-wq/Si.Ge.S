'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  MapPin,
  Users,
  BookOpen,
  Smartphone,
  Building2,
  CheckCircle2,
  ArrowRight,
  Mail,
  Phone,
  Activity,
  ChevronRight,
  Clock,
  FileText,
  AlertTriangle,
  Globe,
  MessageCircle,
  X,
  Check,
  Layers,
  ChevronDown,
  PlayCircle,
  Send,
  Award
} from 'lucide-react';
import { SIGPADIcon } from '@/components/ui/SIGPADLogo';

// ─── Section Tag Component ───────────────────────────────────────────────────
function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-full mb-4 shadow-lg backdrop-blur-md">
      <div className="w-1.5 h-1.5 rounded-full bg-[#0F4C5C] animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300">{children}</span>
    </div>
  );
}

// ─── Module Data ──────────────────────────────────────────────────────────────
const modules = [
  { icon: MapPin, title: 'Mapa Táctico en Tiempo Real', desc: 'GPS de guardias, geofencing con alertas automáticas y visualización de rondines sobre el terreno.', color: '#3ABEFF' },
  { icon: Users, title: 'Gestión de Personal y Legajos', desc: 'Legajos digitales completos, documentación, uniformes, credenciales y vencimientos.', color: '#10B981' },
  { icon: Clock, title: 'Fichaje Geolocalizado', desc: 'Check-in/out con validación GPS de 300m. Registro transparente sin fraude de asistencia.', color: '#F59E0B' },
  { icon: BookOpen, title: 'Libro de Guardia Digital', desc: 'Novedades con fotos, urgencia, firma digital y marcas temporales inmutables.', color: '#8B5CF6' },
  { icon: Activity, title: 'Control de Rondines', desc: 'Tracking GPS de patrullas, checkpoints QR y análisis de cobertura perimetral.', color: '#EC4899' },
  { icon: Globe, title: 'Portal de Clientes VIP', desc: 'Acceso privado para clientes corporativos a reportes, transparencia y seguimiento del servicio.', color: '#3ABEFF' },
  { icon: AlertTriangle, title: 'Sistema de Emergencias', desc: 'Botón de pánico con alertas sonoras inmediatas en la central y protocolos de respuesta.', color: '#EF4444' },
  { icon: Layers, title: 'Inventario y Equipamiento', desc: 'Control de elementos, handoff entre turnos con firma digital y cadena de custodia.', color: '#10B981' },
  { icon: FileText, title: 'Cómputo de Haberes y Planillas', desc: 'Cálculo automático de horas normales, extras, adicionales y exportación de nómina.', color: '#F59E0B' },
  { icon: FileText, title: 'Reportes PDF Automatizados', desc: 'Generación automática de informes con firmas digitales e historial de cumplimiento.', color: '#8B5CF6' },
];

export default function RootLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const [activePerspective, setActivePerspective] = useState<'manager' | 'guard' | 'client'>('manager');
  const [formData, setFormData] = useState({ nombre: '', empresa: '', email: '', telefono: '', mensaje: '' });
  const [formSent, setFormSent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
  };

  const scrollToContent = () => {
    const el = document.getElementById('hero-content');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-white/20 selection:text-white overflow-x-hidden relative">
      
      {/* ── 1. FONDO CON LOGO GIGANTE 100% PANTALLA (EDGE TO EDGE) Y MARCA DE AGUA ── */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden bg-black">
        <motion.div
          animate={{
            scale: scrolled ? 1.1 : 1,
            opacity: scrolled ? 0.08 : 0.95,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative w-screen h-screen flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-[#0F4C5C]/30 blur-[150px] rounded-full scale-150" />
          <img 
            src="/logo_sigpad.png" 
            alt="SIGPAD Logo Gigante Pantalla Completa" 
            className="w-full h-full object-cover filter drop-shadow-[0_0_90px_rgba(255,255,255,0.25)] relative z-10 scale-105"
          />
        </motion.div>
      </div>

      {/* ── Ambient Glow Overlays ────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] right-[-10%] w-[700px] h-[700px] bg-zinc-900/10 blur-[170px] rounded-full" />
        <div className="absolute top-[45%] left-[-15%] w-[600px] h-[600px] bg-[#0F4C5C]/10 blur-[180px] rounded-full" />
      </div>

      {/* ── Sticky Header Navigation ─────────────────────────────────────── */}
      <header className="sticky top-0 w-full z-50 bg-black/90 backdrop-blur-2xl border-b border-zinc-900/90 h-16 flex items-center justify-between px-6 lg:px-12">
        <Link href="/" className="flex items-center h-10">
          <SIGPADIcon className="w-36 h-10" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'El Sistema', href: '#sistema', isRoute: false },
            { label: 'Módulos', href: '#modulos', isRoute: false },
            { label: 'Detalle Módulos', href: '/modulos', isRoute: true },
            { label: 'Nosotros', href: '/nosotros', isRoute: true },
            { label: 'Soluciones', href: '#porque', isRoute: false },
            { label: 'Contacto', href: '#contacto', isRoute: false },
          ].map(link => (
            link.isRoute ? (
              <Link key={link.href} href={link.href} className="text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className="text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
                {link.label}
              </a>
            )
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/roles" className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:text-zinc-300 transition-colors px-4 py-2 border border-zinc-800 rounded-xl bg-zinc-950 hover:bg-zinc-900">
            Ingreso a Plataforma
          </Link>
          <a href="#contacto" className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black uppercase text-[9px] tracking-widest transition-all shadow-lg hover:scale-105">
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
            className="fixed top-16 inset-x-0 z-40 bg-black/98 backdrop-blur-xl border-b border-zinc-900 p-6 flex flex-col gap-4"
          >
            {[
              { label: 'El Sistema', href: '#sistema', isRoute: false },
              { label: 'Módulos', href: '#modulos', isRoute: false },
              { label: 'Detalle Módulos', href: '/modulos', isRoute: true },
              { label: 'Nosotros', href: '/nosotros', isRoute: true },
              { label: 'Soluciones', href: '#porque', isRoute: false },
              { label: 'Contacto', href: '#contacto', isRoute: false },
            ].map(link => (
              link.isRoute ? (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-black uppercase tracking-wider text-zinc-300 hover:text-white py-2 border-b border-zinc-900 block">
                  {link.label}
                </Link>
              ) : (
                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-black uppercase tracking-wider text-zinc-300 hover:text-white py-2 border-b border-zinc-900 block">
                  {link.label}
                </a>
              )
            ))}
            <Link href="/roles" onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-black uppercase tracking-wider text-white py-3 block text-center border border-zinc-800 rounded-xl bg-zinc-900">
              Ingresar a la Plataforma
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. PORTADA HERO COMPLETA (LOGO GIGANTE + SCROLL PROMPT) ───────── */}
      <section className="relative h-[calc(100vh-4rem)] flex flex-col items-center justify-between px-6 lg:px-12 w-full z-10 pointer-events-none">
        <div className="flex-1" />

        {/* Indicador animado de Scroll */}
        <motion.div
          animate={{ opacity: scrolled ? 0 : 1 }}
          transition={{ duration: 0.4 }}
          className="pb-10 flex flex-col items-center gap-2.5 cursor-pointer pointer-events-auto z-20 group"
          onClick={scrollToContent}
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-400 group-hover:text-white transition-colors">
            Hacer scroll para explorar
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="w-9 h-9 rounded-full border border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center text-zinc-300 group-hover:border-zinc-500 group-hover:text-white transition-all shadow-xl"
          >
            <ChevronDown size={20} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── 3. SECCIÓN PRINCIPAL DE INFORMACIÓN (SCROLL OVER WATERMARK) ────── */}
      <motion.section 
        id="hero-content"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative py-28 px-6 lg:px-12 max-w-7xl mx-auto w-full z-10 border-t border-zinc-900/80 bg-black/85 backdrop-blur-md rounded-[2.5rem] my-8 shadow-2xl"
      >
        <div className="max-w-4xl mx-auto text-center w-full z-10 space-y-8 flex flex-col items-center justify-center">
          <SectionTag>Plataforma de Operaciones de Seguridad Privada</SectionTag>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] font-display max-w-4xl">
            La plataforma que{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              transforma
            </span>{' '}
            la gestión de seguridad privada
          </h1>

          <p className="text-zinc-400 text-base lg:text-xl max-w-2xl font-medium leading-relaxed mx-auto">
            Control GPS en tiempo real, fichaje digital geolocalizado, rondines auditables y portal transparente para clientes corporativos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <a href="#contacto" className="group flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-black uppercase text-xs tracking-widest shadow-xl shadow-white/5 hover:scale-105 transition-all">
              Solicitar Demostración
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <Link href="/roles" className="flex items-center justify-center gap-2 h-14 px-8 rounded-2xl border border-zinc-800 hover:bg-zinc-900 text-xs tracking-widest font-black uppercase text-zinc-300 transition-all">
              <PlayCircle size={16} />
              Ingresar a la Plataforma
            </Link>
          </div>

          {/* Badges tácticos */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-10 border-t border-zinc-800/80 w-full max-w-2xl mx-auto">
            {[
              { label: 'Monitoreo 24/7', icon: Clock },
              { label: 'Control GPS Inviolable', icon: MapPin },
              { label: 'Transparencia Comercial', icon: Shield },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#0F4C5C] shrink-0" />
                <span className="text-zinc-300 text-xs uppercase tracking-wider font-black">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── 4. EL SISTEMA POR DENTRO (Scroll Reveal) ─────────────────────── */}
      <motion.section 
        id="sistema" 
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-900 bg-black/90 backdrop-blur-md rounded-[2.5rem] my-8"
      >
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <SectionTag>Arquitectura Modular</SectionTag>
            <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display leading-tight">
              Interfaces Diseñadas para <br />
              <span className="text-zinc-400">Cada Rol Operativo</span>
            </h2>
            <p className="text-zinc-400 text-sm font-medium">
              Explora las tres pantallas principales que conectan la central de monitoreo, los vigiladores en campo y los clientes corporativos.
            </p>
          </div>

          {/* Perspective Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-3 bg-zinc-900/80 p-2 rounded-[2rem] border border-zinc-800 max-w-md mx-auto">
            {[
              { id: 'manager', label: 'Gerencia', icon: Building2 },
              { id: 'guard', label: 'Vigilador', icon: Smartphone },
              { id: 'client', label: 'Cliente VIP', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePerspective(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                  activePerspective === tab.id
                    ? 'bg-white text-zinc-950 shadow-md font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dynamic perspective display */}
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Detailed Features list */}
            <div className="lg:col-span-5 space-y-6">
              <AnimatePresence mode="wait">
                {activePerspective === 'manager' && (
                  <motion.div
                    key="manager-details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="inline-flex gap-2 items-center text-xs font-black uppercase text-white tracking-wider">
                      <Award size={16} className="text-[#0F4C5C]" /> Central de Monitoreo Gerencial
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Control Operativo Centralizado</h3>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                      La central consolida las posiciones GPS, novedades del libro de guardia y alertas de pánico en tiempo real.
                    </p>
                    <ul className="space-y-4">
                      {[
                        { title: 'Mapa Táctico GPS', desc: 'Supervisión en vivo de todo el personal asignado a los objetivos.' },
                        { title: 'Gestión de Alertas y Pánico', desc: 'Recepción instantánea de señales de emergencia con coordenadas.' },
                        { title: 'Geocercas Operativas', desc: 'Notificación automática si un guardia sale del radio asignado.' }
                      ].map((item, idx) => (
                        <li key={idx} className="flex gap-3">
                          <CheckCircle2 size={18} className="text-[#0F4C5C] shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase">{item.title}</h4>
                            <p className="text-zinc-500 text-[11px] font-medium mt-0.5">{item.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {activePerspective === 'guard' && (
                  <motion.div
                    key="guard-details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="inline-flex gap-2 items-center text-xs font-black uppercase text-emerald-400 tracking-wider">
                      <Smartphone size={16} /> App del Vigilador en Celulares
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Aplicación de Campo Ergonómica</h3>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                      Interface clara y simplificada para celulares, diseñada para fichaje rápido y registro de novedades en terreno.
                    </p>
                    <ul className="space-y-4">
                      {[
                        { title: 'Fichaje Geolocalizado (GPS)', desc: 'Validación en rango de 300m del puesto de servicio.' },
                        { title: 'Control de Rondines', desc: 'Registro de puntos de control con coordenadas y hora.' },
                        { title: 'Libro de Guardia Digital', desc: 'Envío de novedades con fotos y firmas digitales.' }
                      ].map((item, idx) => (
                        <li key={idx} className="flex gap-3">
                          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase">{item.title}</h4>
                            <p className="text-zinc-500 text-[11px] font-medium mt-0.5">{item.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {activePerspective === 'client' && (
                  <motion.div
                    key="client-details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="inline-flex gap-2 items-center text-xs font-black uppercase text-amber-400 tracking-wider">
                      <Globe size={16} /> Portal para Clientes Corporativos
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Transparencia y Auditoría</h3>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                      Tus clientes acceden a un panel privado para auditar el cumplimiento del servicio y descargar reportes oficiales.
                    </p>
                    <ul className="space-y-4">
                      {[
                        { title: 'Auditoría de Cobertura', desc: 'Verificación en tiempo real del personal asignado a sus instalaciones.' },
                        { title: 'Reportes en PDF', desc: 'Descarga de informes de asistencia y cumplimiento para auditoría.' },
                        { title: 'Canal Directo', desc: 'Gestión de requerimientos y tickets de soporte comercial.' }
                      ].map((item, idx) => (
                        <li key={idx} className="flex gap-3">
                          <CheckCircle2 size={18} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase">{item.title}</h4>
                            <p className="text-zinc-500 text-[11px] font-medium mt-0.5">{item.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Real Interface Preview */}
            <div className="lg:col-span-7 relative flex justify-center">
              <AnimatePresence mode="wait">
                {activePerspective === 'manager' && (
                  <motion.div
                    key="manager-img"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="relative w-full aspect-[16/10] rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950"
                  >
                    <Image
                      src="/hero-dashboard.png"
                      alt="Dashboard del Gerente en SIGPAD"
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                )}

                {activePerspective === 'guard' && (
                  <motion.div
                    key="guard-img"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="relative w-[280px] h-[520px] rounded-[2.5rem] overflow-hidden border-4 border-zinc-800 shadow-2xl bg-zinc-950"
                  >
                    <Image
                      src="/mobile-app.png"
                      alt="App del Vigilador en Celular"
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                )}

                {activePerspective === 'client' && (
                  <motion.div
                    key="client-img"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="relative w-full aspect-[16/10] rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950"
                  >
                    <Image
                      src="/client-portal.png"
                      alt="Portal de Clientes en SIGPAD"
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── 5. MÓDULOS DEL SISTEMA (Scroll Reveal) ───────────────────────── */}
      <motion.section 
        id="modulos" 
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-24 px-6 lg:px-12 bg-black/90 backdrop-blur-md rounded-[2.5rem] my-8 border-t border-zinc-900"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <SectionTag>Capacidades de la Plataforma</SectionTag>
            <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display leading-none">
              Módulos Integrados <br />
              <span className="text-zinc-400">para la Operación</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-4 max-w-xl mx-auto font-medium">
              Herramientas diseñadas para cubrir cada aspecto de la gestión operativa y de personal.
            </p>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {modules.map((mod, i) => (
              <button
                key={i}
                onClick={() => setActiveModule(i)}
                className={`group text-left p-5 rounded-[1.5rem] border transition-all duration-300 ${
                  activeModule === i
                    ? 'bg-zinc-800 border-zinc-600 shadow-lg'
                    : 'bg-black/80 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: `${mod.color}15`, border: `1px solid ${mod.color}25` }}>
                  <mod.icon size={18} style={{ color: mod.color }} />
                </div>
                <h4 className="text-[11px] font-black uppercase text-white leading-tight">{mod.title}</h4>
              </button>
            ))}
          </div>

          {/* Active Module Detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 p-8 rounded-[2rem] bg-black/95 border border-zinc-900 flex items-start gap-6"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${modules[activeModule].color}15`, border: `1px solid ${modules[activeModule].color}25` }}>
                {React.createElement(modules[activeModule].icon, { size: 28, style: { color: modules[activeModule].color } })}
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-white mb-2">{modules[activeModule].title}</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-2xl">{modules[activeModule].desc}</p>
                <Link href="/modulos" className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-black uppercase tracking-wider" style={{ color: modules[activeModule].color }}>
                  Ver detalle completo <ChevronRight size={12} />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>

      {/* ── 6. POR QUÉ SIGPAD — COMPARACIÓN OPERATIVA ───────────────────── */}
      <motion.section 
        id="porque" 
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full border-t border-zinc-900 bg-black/90 backdrop-blur-md rounded-[2.5rem] my-8"
      >
        <div className="text-center mb-16">
          <SectionTag>Transformación Digital</SectionTag>
          <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display">
            Comparación <span className="text-zinc-400">Operativa</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-4 max-w-xl mx-auto font-medium">
            Evite los riesgos del papel y profesionalice el control de su servicio de seguridad.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Gestión Tradicional */}
          <div className="p-8 rounded-[2rem] bg-red-950/20 border border-red-500/10 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <X size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black uppercase text-red-400">Gestión Tradicional en Papel</h3>
            </div>
            <ul className="space-y-3">
              {[
                'Planillas escritas a mano propensas a extravío o alteración.',
                'Falta de certeza geográfica sobre la presencia del guardia.',
                'Incertidumbre de los clientes sobre la cobertura del puesto.',
                'Rondines sin registro de ruta ni horas de control verificables.',
                'Libros de novedades físicos vulnerables a deterioro.',
                'Procesamiento manual de planillas de horas al liquidar.'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[11px] text-red-300/70 font-medium">
                  <X size={12} className="text-red-500/50 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Con SIGPAD */}
          <div className="p-8 rounded-[2rem] bg-emerald-950/20 border border-emerald-500/10 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Check size={20} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-black uppercase text-emerald-400">Con Plataforma SIGPAD</h3>
            </div>
            <ul className="space-y-3">
              {[
                'Fichaje geolocalizado en rango exacto de 300 metros.',
                'Monitoreo central en vivo con mapa GPS y alertas inmediatas.',
                'Portal de clientes privado para transparente auditoría del servicio.',
                'Tracking GPS de patrullas con checkpoints de recorrido.',
                'Libro de Guardia digital con evidencia fotográfica e historial.',
                'Cómputo automático de horas y nóminas para liquidación.'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[11px] text-emerald-300/90 font-medium">
                  <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>

      {/* ── 7. CONTACTO Y DEMO ───────────────────────────────────────────── */}
      <motion.section 
        id="contacto" 
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full border-t border-zinc-900 bg-black/90 backdrop-blur-md rounded-[2.5rem] my-8"
      >
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* Information */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-4">
              <SectionTag>Contacto Directo</SectionTag>
              <h2 className="text-4xl lg:text-5xl font-black text-white uppercase font-display leading-tight">
                Consulte por su <br />
                <span className="text-zinc-400">Implementación</span>
              </h2>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                Póngase en contacto con nuestro equipo para evaluar los requerimientos operativos de su empresa y coordinar una demostración.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Correo de Contacto</p>
                  <p className="text-white font-bold text-sm font-mono">contacto@sigpad.com.ar</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Líneas Telefónicas</p>
                  <p className="text-white font-bold text-sm font-mono">3426 310996 · 3425 162372</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-6 bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">
            {formSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-12 gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-black uppercase text-white">¡Mensaje Enviado!</h3>
                <p className="text-zinc-400 text-sm font-medium">Nos comunicaremos a la brevedad para coordinar la presentación.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-sm font-black uppercase text-white tracking-wider mb-6">Solicitar Demostración</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">Empresa *</label>
                    <input
                      type="text"
                      required
                      value={formData.empresa}
                      onChange={e => setFormData(p => ({ ...p, empresa: e.target.value }))}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                    placeholder="tu@empresa.com"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                    placeholder="+54 342..."
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">Mensaje</label>
                  <textarea
                    rows={3}
                    value={formData.mensaje}
                    onChange={e => setFormData(p => ({ ...p, mensaje: e.target.value }))}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                    placeholder="¿Cuáles son los requerimientos de su operación?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 py-3.5 rounded-xl bg-white text-zinc-950 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all shadow-lg hover:scale-[1.01]"
                >
                  <Send size={14} />
                  Enviar Solicitud
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-12 px-6 lg:px-12 border-t border-zinc-900 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center">
                <SIGPADIcon className="w-36 h-10" />
              </div>
              <p className="text-zinc-500 text-[11px] font-medium leading-relaxed">
                Plataforma integral de gestión y control para empresas de seguridad privada.
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Plataforma</p>
              <ul className="space-y-2">
                {['El Sistema', 'Módulos', 'Contacto'].map(l => (
                  <li key={l}><a href="#" className="text-[11px] text-zinc-400 hover:text-white transition-colors font-medium">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Legal</p>
              <ul className="space-y-2">
                {[
                  { label: 'Términos de Servicio', href: '/legal/tos' },
                  { label: 'Política de Privacidad', href: '/legal/privacy' },
                ].map(l => (
                  <li key={l.label}><Link href={l.href} className="text-[11px] text-zinc-400 hover:text-white transition-colors font-medium">{l.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Contacto</p>
              <ul className="space-y-2">
                <li><a href="mailto:contacto@sigpad.com.ar" className="text-[11px] text-zinc-400 hover:text-white transition-colors font-mono">contacto@sigpad.com.ar</a></li>
                <li><span className="text-[11px] text-zinc-400 font-mono">3426 310996</span></li>
                <li><span className="text-[11px] text-zinc-400 font-mono">3425 162372</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} SIGPAD. Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-zinc-600 font-medium">
              Gestión de seguridad privada
            </p>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp Button ─────────────────────────────────────────────── */}
      <motion.a
        href="https://wa.me/5493426310996?text=Hola!%20Quiero%20saber%20más%20sobre%20SIGPAD"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring' }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-110 transition-all"
        title="Contactar por WhatsApp"
      >
        <MessageCircle size={26} className="text-white" />
      </motion.a>
    </div>
  );
}
