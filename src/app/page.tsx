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
  Award,
  Lock,
  Compass,
  Menu
} from 'lucide-react';
import { SIGPADIcon } from '@/components/ui/SIGPADLogo';

export default function RootLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activePerspective, setActivePerspective] = useState<'manager' | 'guard' | 'client'>('manager');
  const [contactTab, setContactTab] = useState<'demo' | 'consulta'>('demo');
  const [formData, setFormData] = useState({ nombre: '', empresa: '', email: '', telefono: '', localidad: '', mensaje: '' });
  const [formSent, setFormSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          mensaje: `${formData.empresa ? `[Empresa/Ciudad: ${formData.empresa}]\n` : ''}${formData.mensaje}`,
          tipo: contactTab
        })
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Error al enviar el mensaje');
      }

      setFormSent(true);
    } catch (err: any) {
      console.error('[Contact Form Error]:', err);
      setSubmitError(err.message || 'No se pudo enviar el mensaje. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToContent = () => {
    const el = document.getElementById('sobre-nosotros');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-white/20 selection:text-white overflow-x-hidden relative font-sans">
      
      {/* ── 1. MARCA DE AGUA DEL LOGO SIGPAD FIJA AL FONDO (100% PANTALLA COMPLETA EN DESKTOP) ──── */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden bg-black">
        <motion.div
          animate={{
            scale: scrolled ? 1.15 : 1,
            opacity: scrolled ? 0.06 : 0.95,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative w-screen h-screen flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-[#0F4C5C]/25 blur-[160px] rounded-full scale-150" />
          <img 
            src="/logo_sigpad.png" 
            alt="SIGPAD Logo Background" 
            className="w-full h-full md:object-cover object-contain filter drop-shadow-[0_0_90px_rgba(255,255,255,0.22)] relative z-10 scale-105 p-2 md:p-0"
          />
        </motion.div>
      </div>

      {/* Ambient Radial Glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[20%] right-[-10%] w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-[#0F4C5C]/15 blur-[140px] md:blur-[180px] rounded-full" />
        <div className="absolute top-[60%] left-[-10%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-zinc-900/40 blur-[140px] md:blur-[180px] rounded-full" />
      </div>

      {/* ── STICKY HEADER NAVIGATION ─────────────────────────────────────── */}
      <header className="sticky top-0 w-full z-50 bg-black/90 backdrop-blur-2xl border-b border-zinc-900/90 h-16 md:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-16">
        <Link href="/" className="flex items-center shrink-0">
          <SIGPADIcon className="w-28 sm:w-36 md:w-40 h-8 sm:h-10" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-9">
          {[
            { label: 'NOSOTROS', href: '#sobre-nosotros' },
            { label: 'SERVICIOS', href: '#servicios' },
            { label: 'SISTEMA', href: '#sistema' },
            { label: 'DETALLE', href: '/modulos' },
            { label: 'CLIENTES', href: '#porque' },
          ].map(link => (
            <a key={link.href} href={link.href} className="text-[10px] lg:text-[11px] font-black tracking-[0.2em] text-zinc-400 hover:text-white transition-colors uppercase">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/roles" className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-colors px-4 py-2 border border-zinc-800 rounded-xl bg-zinc-950 hover:bg-zinc-900">
            Ingreso Personal
          </Link>
          <a href="#contacto" className="flex items-center justify-center h-9 sm:h-11 px-3.5 sm:px-6 rounded-xl bg-[#0F4C5C] hover:bg-[#146074] text-white font-black uppercase text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] transition-all shadow-lg hover:scale-105">
            CONTACTO
          </a>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white shrink-0"
            aria-label="Abrir Menú"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-16 md:top-20 inset-x-0 z-40 bg-zinc-950/98 backdrop-blur-2xl border-b border-zinc-800 p-6 flex flex-col gap-3 shadow-2xl overflow-hidden"
          >
            {[
              { label: 'NOSOTROS', href: '#sobre-nosotros' },
              { label: 'SERVICIOS', href: '#servicios' },
              { label: 'SISTEMA', href: '#sistema' },
              { label: 'DETALLE', href: '/modulos' },
              { label: 'CLIENTES', href: '#porque' },
              { label: 'CONTACTO', href: '#contacto' },
            ].map(link => (
              <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300 hover:text-white py-3 border-b border-zinc-900/80 flex items-center justify-between">
                <span>{link.label}</span>
                <ChevronRight size={14} className="text-zinc-600" />
              </a>
            ))}
            <Link href="/roles" onClick={() => setMobileMenuOpen(false)}
              className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-white py-3.5 block text-center border border-[#0F4C5C]/50 rounded-xl bg-[#0F4C5C]/20 shadow-lg">
              🔑 Ingresar a la Plataforma
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. PORTADA CUBIERTA INICIAL ────────────────────────────────────── */}
      <section className="relative min-h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex flex-col items-center justify-between px-4 sm:px-6 lg:px-12 w-full z-10 pointer-events-none py-6">
        <div className="flex-1" />

        {/* Indicador animado de Scroll */}
        <motion.div
          animate={{ opacity: scrolled ? 0 : 1 }}
          transition={{ duration: 0.4 }}
          className="pb-6 sm:pb-10 flex flex-col items-center gap-2.5 cursor-pointer pointer-events-auto z-20 group"
          onClick={scrollToContent}
        >
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] font-black text-zinc-400 group-hover:text-white transition-colors text-center">
            Hacer scroll para explorar
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="w-8 sm:w-9 h-8 sm:h-9 rounded-full border border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center text-zinc-300 group-hover:border-zinc-500 group-hover:text-white transition-all shadow-xl"
          >
            <ChevronDown size={18} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── 3. SOBRE NOSOTROS (ESTILO NATIVO SEGURIDAD + CAPTURAS REALES) ──── */}
      <motion.section 
        id="sobre-nosotros"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-16 md:py-24 px-4 sm:px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Text & Habilitación */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            <div className="flex items-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">SOBRE SIGPAD</span>
            </div>

            <h2 className="text-2.5xl sm:text-4xl md:text-5xl font-black uppercase text-white font-display leading-[1.15]">
              Plataforma Táctica <br />
              <span className="text-white">de Seguridad Privada</span>
            </h2>

            <p className="text-zinc-400 text-xs sm:text-base font-medium leading-relaxed">
              Somos la solución digital integral diseñada específicamente para empresas de seguridad física y custodia de la provincia de Santa Fe y Argentina.
            </p>

            <p className="text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed italic border-l-2 border-[#0F4C5C] pl-4 py-1 text-zinc-300">
              "Transparencia operativa, control GPS en vivo y trazabilidad inalterable en una sola plataforma."
            </p>

            <p className="text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed">
              Eliminamos las planillas de papel y los libros físicos manuales. Brindamos visibilidad en tiempo real a gerentes, vigiladores en campo y clientes corporativos.
            </p>
          </div>

          {/* Right Column: Real Capture Showcase Card */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl group">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="/hero-dashboard.png"
                  alt="Captura Real del Dashboard de SIGPAD"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              </div>

              {/* Stat Badges Overlay */}
              <div className="p-4 sm:p-6 bg-zinc-950/90 border-t border-zinc-800/80 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="text-center p-2.5 sm:p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-base sm:text-lg font-black text-[#0F4C5C] font-mono">24/7</p>
                  <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">MONITOREO</p>
                </div>
                <div className="text-center p-2.5 sm:p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-base sm:text-lg font-black text-[#0F4C5C] font-mono">100%</p>
                  <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">DIGITAL</p>
                </div>
                <div className="text-center p-2.5 sm:p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-base sm:text-lg font-black text-[#0F4C5C] font-mono">GPS</p>
                  <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">EN VIVO</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </motion.section>

      {/* ── 4. NUESTROS SERVICIOS Y MÓDULOS (ESTILO NATIVO GRID) ───────────── */}
      <motion.section 
        id="servicios"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-16 md:py-24 px-4 sm:px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="space-y-10 sm:space-y-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">FUNCIONALIDADES OPERATIVAS</span>
            </div>
            <h2 className="text-2.5xl sm:text-4xl md:text-5xl font-black uppercase text-white font-display">
              Nuestros Servicios &amp; Módulos
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium max-w-2xl">
              Brindamos herramientas integrales de gestión para centrales de monitoreo, personal de vigilancia física y clientes finales.
            </p>
          </div>

          {/* Grid de Servicios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: MapPin,
                title: 'Mapa Táctico en Tiempo Real',
                desc: 'Visualización satelital de todo el personal de guardia con geocercas automáticas y alertas de perímetro.'
              },
              {
                icon: Clock,
                title: 'Fichaje Geolocalizado',
                desc: 'Check-in y check-out con validación estricta de GPS a 300 metros del puesto. Sin posibilidad de fraude.'
              },
              {
                icon: BookOpen,
                title: 'Libro de Guardia Digital',
                desc: 'Registro inmutable de novedades con adjunto de fotos, nivel de urgencia y firma digital del vigilador.'
              },
              {
                icon: Activity,
                title: 'Control de Rondines GPS',
                desc: 'Tracking GPS continuo en tiempo real estilo Uber que registra y dibuja el trazado del recorrido completo del vigilador.'
              },
              {
                icon: Globe,
                title: 'Portal de Clientes',
                badge: 'PRÓXIMAMENTE',
                desc: 'Próximamente: Acceso exclusivo para clientes corporativos para auditar la cobertura y descargar reportes oficiales.'
              },
              {
                icon: FileText,
                title: 'Cómputo de Nóminas & PDF',
                desc: 'Generación automática de planillas horarias, horas extra, adicionales CCT e informes listos para liquidación.'
              },
            ].map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="p-6 sm:p-8 rounded-[1.8rem] bg-zinc-950/80 border border-zinc-800/90 hover:border-[#0F4C5C] hover:bg-zinc-950 transition-all duration-300 group space-y-3 sm:space-y-4 shadow-xl backdrop-blur-sm relative overflow-hidden"
              >
                {service.badge && (
                  <span className="absolute top-4 right-4 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase tracking-wider rounded-full">
                    {service.badge}
                  </span>
                )}
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] group-hover:bg-[#0F4C5C] group-hover:text-white transition-all">
                  <service.icon size={20} />
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">{service.title}</h3>
                <p className="text-zinc-400 text-xs font-medium leading-relaxed">{service.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="pt-2 sm:pt-4 text-center">
            <Link href="/modulos" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-[#0F4C5C] text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-all">
              Ver los 10 Módulos en Detalle <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── 5. CAPTURAS DE PANTALLAS INTERACTIVAS (SISTEMA) ────────────────── */}
      <motion.section 
        id="sistema"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-16 md:py-24 px-4 sm:px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="space-y-10 sm:space-y-12">
          <div className="space-y-3 text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">ECOSISTEMA SIGPAD</span>
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
            </div>
            <h2 className="text-2.5xl sm:text-4xl md:text-5xl font-black uppercase text-white font-display">
              Capturas de la Plataforma
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium">
              Conocé las tres interfaces diseñadas para cada perfil operativo de la empresa de seguridad.
            </p>
          </div>

          {/* Selector de Perspectiva */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-zinc-950 p-2 rounded-2xl border border-zinc-800 max-w-md mx-auto">
            {[
              { id: 'manager', label: 'Central Gerencial', icon: Building2 },
              { id: 'guard', label: 'App Vigilador', icon: Smartphone },
              { id: 'client', label: 'Portal Cliente', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePerspective(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
                  activePerspective === tab.id
                    ? 'bg-[#0F4C5C] text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Render de la Captura Seleccionada */}
          <div className="relative flex justify-center max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              {activePerspective === 'manager' && (
                <motion.div
                  key="manager-img"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-[1.8rem] sm:rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950"
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
                  className="relative w-[260px] sm:w-[300px] h-[480px] sm:h-[550px] rounded-[2.2rem] sm:rounded-[2.5rem] overflow-hidden border-4 border-zinc-800 shadow-2xl bg-zinc-950"
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
                  className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-[1.8rem] sm:rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950"
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
      </motion.section>

      {/* ── 6. COMPARATIVA OPERATIVA ───────────────────────────────────────── */}
      <motion.section 
        id="porque"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-16 md:py-24 px-4 sm:px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="space-y-10 sm:space-y-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">POR QUÉ SIGPAD</span>
            </div>
            <h2 className="text-2.5xl sm:text-4xl md:text-5xl font-black uppercase text-white font-display">
              El Antes y el Después
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium max-w-2xl">
              Comparación directa de la gestión tradicional física frente a la plataforma digitalizada SIGPAD.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gestión Tradicional */}
            <div className="p-6 sm:p-8 rounded-[1.8rem] sm:rounded-[2rem] bg-red-950/20 border border-red-500/20 space-y-4 sm:space-y-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
                <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <X size={18} className="text-red-500" />
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase text-red-400 tracking-wider">Gestión Tradicional en Papel</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Planillas de papel propensas a extravío, falsificación o roturas.',
                  'Incertidumbre geográfica sobre la presencia del vigilador en puesto.',
                  'Reclamos de clientes por falta de información de la cobertura contratada.',
                  'Rondines sin comprobantes de ruta ni horarios verificados.',
                  'Libro de novedades físico vulnerable a alteraciones o pérdida.',
                  'Cálculo manual de planillas de horas al liquidar haberes.'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-red-300/80 font-medium">
                    <X size={14} className="text-red-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Con SIGPAD */}
            <div className="p-6 sm:p-8 rounded-[1.8rem] sm:rounded-[2rem] bg-emerald-950/20 border border-emerald-500/20 space-y-4 sm:space-y-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-4">
                <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Check size={18} className="text-emerald-400" />
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase text-emerald-400 tracking-wider">Con Plataforma SIGPAD</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Fichaje geolocalizado con GPS inviolable en rango de 300 metros.',
                  'Monitoreo central en vivo con alertas sonoras instantáneas.',
                  'Portal de clientes privado para transparente auditoría del servicio.',
                  'Control de patrullaje vía rondines QR y mapas de recorrido.',
                  'Libro de Guardia digital con fotos de respaldo y firmas inmutables.',
                  'Cómputo automático de adicionales y horas extra en PDF/Excel.'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-emerald-300/90 font-medium">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── 7. CONTACTO (ESTILO NATIVO CON DATOS Y FORMULARIO CON TABS) ────── */}
      <motion.section 
        id="contacto"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-16 md:py-24 px-4 sm:px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="space-y-10 sm:space-y-12">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">CONTACTO</span>
            </div>
            <h2 className="text-2.5xl sm:text-4xl md:text-5xl font-black uppercase text-white font-display">
              Hablemos de Seguridad
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium max-w-2xl">
              Contanos tu necesidad y te ofrecemos una solución a medida. También podés comunicarte para coordinar una demostración.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* Left Column: 4 Cards de Datos */}
            <div className="lg:col-span-5 space-y-3.5 sm:space-y-4">
              <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-4 shadow-lg backdrop-blur-sm">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Sede Central</h4>
                  <p className="text-zinc-400 text-xs font-medium mt-1">Provincia de Santa Fe, Argentina</p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-4 shadow-lg backdrop-blur-sm">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Teléfonos de Atención</h4>
                  <p className="text-zinc-400 text-xs font-mono font-medium mt-1">+54 9 342 631-0996 · +54 9 342 516-2372</p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-4 shadow-lg backdrop-blur-sm">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Email Corporativo</h4>
                  <p className="text-zinc-400 text-xs font-mono font-medium mt-1">sigpad.info@gmail.com</p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-4 shadow-lg backdrop-blur-sm">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Horario de Atención</h4>
                  <p className="text-zinc-400 text-xs font-medium mt-1">Lunes a Viernes: 8:00 — 18:00 hs · Monitoreo 24/7</p>
                </div>
              </div>
            </div>

            {/* Right Column: Formulario con Tabs */}
            <div className="lg:col-span-7 p-6 sm:p-8 rounded-[1.8rem] sm:rounded-[2rem] bg-zinc-950/90 border border-zinc-800 shadow-2xl backdrop-blur-md">
              
              {/* Tab Selector inside Form */}
              <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 pb-4 border-b border-zinc-800">
                <button
                  type="button"
                  onClick={() => setContactTab('demo')}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
                    contactTab === 'demo'
                      ? 'bg-[#0F4C5C] text-white shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  Solicitar Demo
                </button>
                <button
                  type="button"
                  onClick={() => setContactTab('consulta')}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
                    contactTab === 'consulta'
                      ? 'bg-[#0F4C5C] text-white shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  Consultas Generales
                </button>
              </div>

              {formSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 flex flex-col items-center justify-center text-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-xl font-black uppercase text-white tracking-wider">¡Mensaje Enviado con Éxito!</h3>
                  <p className="text-zinc-400 text-xs font-medium max-w-md">
                    Gracias por comunicarte. Nuestro equipo operativo evaluará tu mensaje y se pondrá en contacto a la brevedad.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                        NOMBRE COMPLETO *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#0F4C5C] transition-colors"
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                        EMAIL *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#0F4C5C] transition-colors"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                        TELÉFONO
                      </label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#0F4C5C] transition-colors"
                        placeholder="+54 342..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                        EMPRESA / LOCALIDAD
                      </label>
                      <input
                        type="text"
                        value={formData.empresa}
                        onChange={e => setFormData(p => ({ ...p, empresa: e.target.value }))}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#0F4C5C] transition-colors"
                        placeholder="Empresa o Ciudad"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1.5">
                      MENSAJE *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formData.mensaje}
                      onChange={e => setFormData(p => ({ ...p, mensaje: e.target.value }))}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#0F4C5C] transition-colors resize-none"
                      placeholder="Contanos tu consulta o requerimiento operativo..."
                    />
                  </div>

                  {submitError && (
                    <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                      ⚠️ {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-[#0F4C5C] hover:bg-[#146074] disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.01]"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={14} />
                        Enviar Mensaje
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </motion.section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-12 px-6 lg:px-16 border-t border-zinc-900 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center">
                <SIGPADIcon className="w-40 h-10" />
              </div>
              <p className="text-zinc-500 text-[11px] font-medium leading-relaxed">
                Plataforma táctica e integral para la digitalización de empresas de seguridad privada argentina.
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Navegación</p>
              <ul className="space-y-2">
                {['Sobre Nosotros', 'Servicios', 'Capturas del Sistema', 'Contacto'].map(l => (
                  <li key={l}><a href="#" className="text-[11px] text-zinc-400 hover:text-white transition-colors font-medium">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Legal &amp; Normativa</p>
              <ul className="space-y-2">
                {[
                  { label: 'Términos de Servicio', href: '/legal/terminos' },
                  { label: 'Política de Privacidad', href: '/legal/privacidad' },
                ].map(l => (
                  <li key={l.label}><Link href={l.href} className="text-[11px] text-zinc-400 hover:text-white transition-colors font-medium">{l.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Contacto</p>
              <ul className="space-y-2 font-mono">
                <li><a href="mailto:sigpad.info@gmail.com" className="text-[11px] text-zinc-400 hover:text-white transition-colors">sigpad.info@gmail.com</a></li>
                <li><span className="text-[11px] text-zinc-400">+54 9 342 631-0996</span></li>
                <li><span className="text-[11px] text-zinc-400">+54 9 342 516-2372</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} SIGPAD. Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-zinc-600 font-medium">
              Tecnología de vanguardia para seguridad privada
            </p>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp Button ─────────────────────────────────────────────── */}
      <motion.a
        href="https://wa.me/5493426310996?text=Hola!%20Quiero%20saber%20más%20sobre%20la%20plataforma%20SIGPAD"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring' }}
        className="fixed bottom-6 right-6 z-50 w-12 sm:w-14 h-12 sm:h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-110 transition-all"
        title="Contactar por WhatsApp"
      >
        <MessageCircle size={24} className="text-white" />
      </motion.a>
    </div>
  );
}
