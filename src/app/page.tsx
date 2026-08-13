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
  Compass
} from 'lucide-react';
import { SIGPADIcon } from '@/components/ui/SIGPADLogo';

export default function RootLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activePerspective, setActivePerspective] = useState<'manager' | 'guard' | 'client'>('manager');
  const [contactTab, setContactTab] = useState<'demo' | 'consulta'>('demo');
  const [formData, setFormData] = useState({ nombre: '', empresa: '', email: '', telefono: '', localidad: '', mensaje: '' });
  const [formSent, setFormSent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
  };

  const scrollToContent = () => {
    const el = document.getElementById('sobre-nosotros');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-white/20 selection:text-white overflow-x-hidden relative font-sans">
      
      {/* ── 1. MARCA DE AGUA DEL LOGO SIGPAD FIJA AL FONDO (100% PANTALLA) ──── */}
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
            className="w-full h-full object-cover filter drop-shadow-[0_0_90px_rgba(255,255,255,0.22)] relative z-10 scale-105"
          />
        </motion.div>
      </div>

      {/* Ambient Radial Glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[20%] right-[-10%] w-[700px] h-[700px] bg-[#0F4C5C]/15 blur-[180px] rounded-full" />
        <div className="absolute top-[60%] left-[-10%] w-[600px] h-[600px] bg-zinc-900/40 blur-[180px] rounded-full" />
      </div>

      {/* ── STICKY HEADER NAVIGATION ─────────────────────────────────────── */}
      <header className="sticky top-0 w-full z-50 bg-black/90 backdrop-blur-2xl border-b border-zinc-900/90 h-20 flex items-center justify-between px-6 lg:px-16">
        <Link href="/" className="flex items-center h-10">
          <SIGPADIcon className="w-40 h-10" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-9">
          {[
            { label: 'NOSOTROS', href: '#sobre-nosotros' },
            { label: 'SERVICIOS', href: '#servicios' },
            { label: 'SISTEMA', href: '#sistema' },
            { label: 'DETALLE', href: '/modulos' },
            { label: 'CLIENTES', href: '#porque' },
          ].map(link => (
            <a key={link.href} href={link.href} className="text-[11px] font-black tracking-[0.2em] text-zinc-400 hover:text-white transition-colors uppercase">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/roles" className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-colors px-5 py-2.5 border border-zinc-800 rounded-xl bg-zinc-950 hover:bg-zinc-900">
            Ingreso Personal
          </Link>
          <a href="#contacto" className="flex items-center justify-center h-11 px-6 rounded-xl bg-[#0F4C5C] hover:bg-[#146074] text-white font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg hover:scale-105">
            CONTACTO
          </a>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white">
            {mobileMenuOpen ? <X size={22} /> : <Layers size={22} />}
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
            className="fixed top-20 inset-x-0 z-40 bg-black/98 backdrop-blur-xl border-b border-zinc-900 p-6 flex flex-col gap-4"
          >
            {[
              { label: 'NOSOTROS', href: '#sobre-nosotros' },
              { label: 'SERVICIOS', href: '#servicios' },
              { label: 'SISTEMA', href: '#sistema' },
              { label: 'DETALLE', href: '/modulos' },
              { label: 'CONTACTO', href: '#contacto' },
            ].map(link => (
              <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-black uppercase tracking-wider text-zinc-300 hover:text-white py-2 border-b border-zinc-900 block">
                {link.label}
              </a>
            ))}
            <Link href="/roles" onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-black uppercase tracking-wider text-white py-3 block text-center border border-zinc-800 rounded-xl bg-zinc-900">
              Ingresar a la Plataforma
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. PORTADA CUBIERTA INICIAL (LOGO 100% PANTALLA) ───────────────── */}
      <section className="relative h-[calc(100vh-5rem)] flex flex-col items-center justify-between px-6 lg:px-12 w-full z-10 pointer-events-none">
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

      {/* ── 3. SOBRE NOSOTROS (ESTILO NATIVO SEGURIDAD + CAPTURAS REALES) ──── */}
      <motion.section 
        id="sobre-nosotros"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-24 px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Text & Habilitación */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">SOBRE SIGPAD</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white font-display leading-[1.15]">
              Plataforma Táctica <br />
              <span className="text-white">de Seguridad Privada</span>
            </h2>

            <p className="text-zinc-400 text-sm sm:text-base font-medium leading-relaxed">
              Somos la solución digital integral diseñada específicamente para empresas de seguridad física y custodia de la provincia de Santa Fe y Argentina.
            </p>

            <p className="text-zinc-400 text-sm font-medium leading-relaxed italic border-l-2 border-[#0F4C5C] pl-4 py-1 text-zinc-300">
              "Transparencia operativa, control GPS en vivo y trazabilidad inalterable en una sola plataforma."
            </p>

            <p className="text-zinc-400 text-sm font-medium leading-relaxed">
              Eliminamos las planillas de papel y los libros físicos manuales. Brindamos visibilidad en tiempo real a gerentes, vigiladores en campo y clientes corporativos.
            </p>

            {/* Habilitación / Certificación Card (Estilo Nativo) */}
            <div className="p-5 rounded-2xl bg-zinc-950/90 border border-[#0F4C5C]/50 space-y-2 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#0F4C5C] shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Plataforma Certificada &amp; Habilitada</h4>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium leading-relaxed pl-7">
                Cumplimos con todas las normativas de seguridad de datos, geolocalización inmutable y estándares de encriptación W3C para bitácoras digitales de guardia.
              </p>
            </div>
          </div>

          {/* Right Column: Real Capture Showcase Card */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-[2.5rem] overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl group">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src="/hero-dashboard.png"
                  alt="Captura Real del Dashboard de SIGPAD"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              </div>

              {/* Stat Badges Overlay (Estilo Nativo) */}
              <div className="p-6 bg-zinc-950/90 border-t border-zinc-800/80 grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-lg font-black text-[#0F4C5C] font-mono">24/7</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">MONITOREO</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-lg font-black text-[#0F4C5C] font-mono">100%</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">DIGITAL</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-lg font-black text-[#0F4C5C] font-mono">GPS</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">EN VIVO</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </motion.section>

      {/* ── 4. NUESTROS SERVICIOS Y MÓDULOS (ESTILO NATIVO GRID) ───────────── */}
      <motion.section 
        id="servicios"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-24 px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="space-y-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">FUNCIONALIDADES OPERATIVAS</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white font-display">
              Nuestros Servicios &amp; Módulos
            </h2>
            <p className="text-zinc-400 text-sm font-medium max-w-2xl">
              Brindamos herramientas integrales de gestión para centrales de monitoreo, personal de vigilancia física y clientes finales.
            </p>
          </div>

          {/* Grid de Servicios (Estilo Nativo 3x2) */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                title: 'Control de Rondines QR',
                desc: 'Verificación física de puntos de patrulla con coordenadas, horario exacto y reporte de eficacia del puesto.'
              },
              {
                icon: Globe,
                title: 'Portal de Clientes VIP',
                desc: 'Acceso exclusivo para clientes corporativos para auditar la cobertura y descargar reportes oficiales.'
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
                transition={{ delay: i * 0.08 }}
                className="p-8 rounded-[1.8rem] bg-zinc-950/80 border border-zinc-800/90 hover:border-[#0F4C5C] hover:bg-zinc-950 transition-all duration-300 group space-y-4 shadow-xl backdrop-blur-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] group-hover:bg-[#0F4C5C] group-hover:text-white transition-all">
                  <service.icon size={22} />
                </div>
                <h3 className="text-lg font-black uppercase text-white tracking-wider">{service.title}</h3>
                <p className="text-zinc-400 text-xs font-medium leading-relaxed">{service.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="pt-4 text-center">
            <Link href="/modulos" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-[#0F4C5C] text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-zinc-800 transition-all">
              Ver los 10 Módulos en Detalle <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── 5. CAPTURAS DE PANTALLAS INTERACTIVAS (SISTEMA) ────────────────── */}
      <motion.section 
        id="sistema"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-24 px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="space-y-12">
          <div className="space-y-3 text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">ECOSISTEMA SIGPAD</span>
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white font-display">
              Capturas de la Plataforma
            </h2>
            <p className="text-zinc-400 text-sm font-medium">
              Conocé las tres interfaces diseñadas para cada perfil operativo de la empresa de seguridad.
            </p>
          </div>

          {/* Selector de Perspectiva */}
          <div className="flex flex-wrap items-center justify-center gap-3 bg-zinc-950 p-2 rounded-2xl border border-zinc-800 max-w-md mx-auto">
            {[
              { id: 'manager', label: 'Central Gerencial', icon: Building2 },
              { id: 'guard', label: 'App Vigilador', icon: Smartphone },
              { id: 'client', label: 'Portal Cliente', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePerspective(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activePerspective === tab.id
                    ? 'bg-[#0F4C5C] text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <tab.icon size={14} />
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
                  className="relative w-[300px] h-[550px] rounded-[2.5rem] overflow-hidden border-4 border-zinc-800 shadow-2xl bg-zinc-950"
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
      </motion.section>

      {/* ── 6. COMPARATIVA OPERATIVA ───────────────────────────────────────── */}
      <motion.section 
        id="porque"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-24 px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="space-y-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">POR QUÉ SIGPAD</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white font-display">
              El Antes y el Después
            </h2>
            <p className="text-zinc-400 text-sm font-medium max-w-2xl">
              Comparación directa de la gestión tradicional física frente a la plataforma digitalizada SIGPAD.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Gestión Tradicional */}
            <div className="p-8 rounded-[2rem] bg-red-950/20 border border-red-500/20 space-y-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <X size={20} className="text-red-500" />
                </div>
                <h3 className="text-lg font-black uppercase text-red-400 tracking-wider">Gestión Tradicional en Papel</h3>
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
            <div className="p-8 rounded-[2rem] bg-emerald-950/20 border border-emerald-500/20 space-y-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Check size={20} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-black uppercase text-emerald-400 tracking-wider">Con Plataforma SIGPAD</h3>
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
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="relative z-10 py-24 px-6 lg:px-16 max-w-7xl mx-auto w-full"
      >
        <div className="space-y-12">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#0F4C5C]">
              <span className="h-[2px] w-6 bg-[#0F4C5C]" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">CONTACTO</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase text-white font-display">
              Hablemos de Seguridad
            </h2>
            <p className="text-zinc-400 text-sm font-medium max-w-2xl">
              Contanos tu necesidad y te ofrecemos una solución a medida. También podés comunicarte para coordinar una demostración.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: 4 Cards de Datos (Estilo Nativo) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-4 shadow-lg backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Sede Central</h4>
                  <p className="text-zinc-400 text-xs font-medium mt-1">Provincia de Santa Fe, Argentina</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-4 shadow-lg backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] shrink-0">
                  <Phone size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Teléfonos de Atención</h4>
                  <p className="text-zinc-400 text-xs font-mono font-medium mt-1">+54 9 342 631-0996 · +54 9 342 516-2372</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-4 shadow-lg backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] shrink-0">
                  <Mail size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Email Corporativo</h4>
                  <p className="text-zinc-400 text-xs font-mono font-medium mt-1">contacto@sigpad.com.ar</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-4 shadow-lg backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#0F4C5C] shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Horario de Atención</h4>
                  <p className="text-zinc-400 text-xs font-medium mt-1">Lunes a Viernes: 8:00 — 18:00 hs · Monitoreo 24/7</p>
                </div>
              </div>
            </div>

            {/* Right Column: Formulario con Tabs (Estilo Nativo) */}
            <div className="lg:col-span-7 p-8 rounded-[2rem] bg-zinc-950/90 border border-zinc-800 shadow-2xl backdrop-blur-md">
              
              {/* Tab Selector inside Form */}
              <div className="flex gap-3 mb-8 pb-4 border-b border-zinc-800">
                <button
                  type="button"
                  onClick={() => setContactTab('demo')}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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

                  <button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-[#0F4C5C] hover:bg-[#146074] text-white font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.01]"
                  >
                    <Send size={14} />
                    Enviar Mensaje
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
                  { label: 'Términos de Servicio', href: '/legal/tos' },
                  { label: 'Política de Privacidad', href: '/legal/privacy' },
                ].map(l => (
                  <li key={l.label}><Link href={l.href} className="text-[11px] text-zinc-400 hover:text-white transition-colors font-medium">{l.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Contacto</p>
              <ul className="space-y-2 font-mono">
                <li><a href="mailto:contacto@sigpad.com.ar" className="text-[11px] text-zinc-400 hover:text-white transition-colors">contacto@sigpad.com.ar</a></li>
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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-110 transition-all"
        title="Contactar por WhatsApp"
      >
        <MessageCircle size={26} className="text-white" />
      </motion.a>
    </div>
  );
}
