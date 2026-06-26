'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  MapPin,
  Users,
  BookOpen,
  Download,
  Smartphone,
  Building2,
  CheckCircle2,
  ArrowRight,
  Mail,
  Phone,
  Activity,
  ChevronRight,
  BarChart3,
  Clock,
  FileText,
  AlertTriangle,
  Lock,
  Camera,
  Zap,
  Globe,
  Star,
  MessageCircle,
  X,
  Check,
  TrendingUp,
  Layers,
  ChevronDown,
  PlayCircle,
  Send,
} from 'lucide-react';
import { SigesIcon } from '@/components/ui/SigesLogo';

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Section Heading ──────────────────────────────────────────────────────────
function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0F4C5C]/30 border border-[#237893]/20 rounded-full mb-4">
      <div className="w-1.5 h-1.5 rounded-full bg-[#3ABEFF] animate-pulse" />
      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#3ABEFF]">{children}</span>
    </div>
  );
}

// ─── Module Data ──────────────────────────────────────────────────────────────
const modules = [
  { icon: MapPin, title: 'Mapa Táctico en Tiempo Real', desc: 'GPS de guardias, geofencing con alertas automáticas y visualización satelital de rondines.', color: '#3ABEFF' },
  { icon: Users, title: 'Gestión de Personal y Legajos', desc: 'CRUD completo, documentos, uniformes, credenciales y estado médico de cada guardia.', color: '#10B981' },
  { icon: Clock, title: 'Fichaje Geolocalizado', desc: 'Check-in/out con validación GPS de 300m. Sin posibilidad de fraude de asistencia.', color: '#F59E0B' },
  { icon: BookOpen, title: 'Libro de Guardia Digital', desc: 'Novedades con fotos, urgencia, firma digital y timestamps inmutables.', color: '#8B5CF6' },
  { icon: Activity, title: 'Control de Rondines', desc: 'Tracking GPS de patrullas, checkpoints QR y análisis de cobertura perimetral.', color: '#EC4899' },
  { icon: Globe, title: 'Portal de Clientes VIP', desc: 'Acceso privado para clientes a reportes, transparencia operativa y gestión de tickets.', color: '#3ABEFF' },
  { icon: AlertTriangle, title: 'Sistema de Emergencias', desc: 'Botón de pánico con alertas sonoras, geolocalización automática y protocolos de respuesta.', color: '#EF4444' },
  { icon: Layers, title: 'Inventario y Equipamiento', desc: 'Control de elementos, handoff entre turnos y seguimiento de estado del equipamiento.', color: '#10B981' },
  { icon: BarChart3, title: 'Nómina y Planillas', desc: 'Cálculo automático de horas, extras, adicionales y reportes de asistencia.', color: '#F59E0B' },
  { icon: FileText, title: 'Reportes PDF Automatizados', desc: 'Generación automática de informes con firmas digitales para auditoría y presentación.', color: '#8B5CF6' },
  { icon: Lock, title: 'Asistente Judicial', desc: 'Templates legales argentinos, freeze de evidencia digital y gestión de incidentes para litigio.', color: '#EC4899' },
  { icon: Camera, title: 'Módulo de Cámaras', desc: 'Integración con sistemas CCTV, visualización remota y registro de eventos de video.', color: '#EF4444' },
];

// ─── Plans ────────────────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Starter',
    price: 'Consultar',
    desc: 'Ideal para empresas con hasta 10 guardias',
    features: ['Dashboard Gerente', 'App Vigilador (PWA)', 'Libro de Guardia Digital', 'Fichaje Geolocalizado', 'Soporte por Email'],
    cta: 'Solicitar Demo',
    highlighted: false,
  },
  {
    name: 'Profesional',
    price: 'Consultar',
    desc: 'Para empresas en crecimiento, hasta 50 guardias',
    features: ['Todo en Starter', 'Mapa Táctico GPS', 'Portal de Clientes VIP', 'Nómina y Planillas', 'Reportes PDF Auto.', 'Soporte prioritario'],
    cta: 'El más elegido',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'A medida',
    desc: 'Corporaciones con múltiples objetivos y sedes',
    features: ['Todo en Profesional', 'Asistente Judicial', 'Control de Cámaras', 'API personalizada', 'Personalización de marca', 'SLA dedicado'],
    cta: 'Hablar con Ventas',
    highlighted: false,
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  {
    name: 'Ing. Ricardo Montoya',
    role: 'Director Operativo — Seguridad Integral S.A.',
    text: 'Si.Ge.S transformó completamente nuestra operación. Eliminamos las planillas de papel y ahora tenemos visibilidad total de nuestros 45 guardias en tiempo real.',
    rating: 5,
  },
  {
    name: 'Lic. Carla Fernández',
    role: 'Gerente General — Custodia Empresarial',
    text: 'El módulo de portal de clientes fue un diferenciador enorme. Nuestros clientes corporativos valoran la transparencia que les damos con Si.Ge.S.',
    rating: 5,
  },
  {
    name: 'Crio. (R) Marcelo Torres',
    role: 'CEO — Torres Seguridad Privada',
    text: 'Implementamos Si.Ge.S en 2 días. La curva de aprendizaje es mínima y el soporte es excepcional. Nuestras auditorías de cumplimiento ahora tardan horas, no semanas.',
    rating: 5,
  },
];

export default function PresentacionPage() {
  const [activeModule, setActiveModule] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [formData, setFormData] = useState({ nombre: '', empresa: '', email: '', telefono: '', mensaje: '' });
  const [formSent, setFormSent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
  };

  return (
    <div className="min-h-screen bg-[#071E22] text-zinc-100 flex flex-col selection:bg-[#3ABEFF]/20 selection:text-[#3ABEFF] overflow-x-hidden">
      
      {/* ── Ambient Backgrounds ─────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] right-[-15%] w-[600px] h-[600px] bg-[#0F4C5C]/15 blur-[150px] rounded-full" />
        <div className="absolute top-[50%] left-[-15%] w-[500px] h-[500px] bg-[#237893]/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] bg-[#0F4C5C]/10 blur-[120px] rounded-full" />
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 w-full z-50 bg-[#071E22]/90 backdrop-blur-2xl border-b border-[#237893]/10 h-16 flex items-center justify-between px-6 lg:px-12">
        <Link href="/presentacion" className="flex items-center gap-3">
          <SigesIcon className="w-8 h-8 text-[#3ABEFF]" />
          <div>
            <span className="font-black text-lg tracking-tight uppercase text-white block leading-none">Si.Ge.S</span>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-[#3ABEFF] block leading-none">Sistema de Gestión de Seguridad</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Módulos', href: '#modulos' },
            { label: 'Detalle', href: '/modulos' },
            { label: '¿Por qué Si.Ge.S?', href: '#porque' },
            { label: 'Precios', href: '#precios' },
            { label: 'Contacto', href: '#contacto' },
          ].map(link => (
            <a key={link.href} href={link.href} className="text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors px-4 py-2">
            Ingresar
          </Link>
          <a href="#contacto" className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[#3ABEFF] text-[#071E22] font-black uppercase text-[9px] tracking-widest hover:bg-white transition-all shadow-lg shadow-[#3ABEFF]/20 hover:scale-105">
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
              { label: 'Módulos', href: '#modulos' },
              { label: '¿Por qué Si.Ge.S?', href: '#porque' },
              { label: 'Precios', href: '#precios' },
              { label: 'Contacto', href: '#contacto' },
            ].map(link => (
              <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-black uppercase tracking-wider text-zinc-300 hover:text-white py-2 border-b border-[#237893]/10">
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center px-6 lg:px-12 max-w-7xl mx-auto w-full z-10 pt-8 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-8"
          >
            <SectionTag>Tecnología de Seguridad de Vanguardia</SectionTag>

            <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-white uppercase leading-[0.95] font-display">
              La plataforma que{' '}
              <span className="text-[#3ABEFF]">transforma</span>{' '}
              la gestión de seguridad privada
            </h1>

            <p className="text-zinc-400 text-base lg:text-lg max-w-xl font-medium leading-relaxed">
              Control GPS en tiempo real. Fichaje digital sin fraude. Portal de clientes con transparencia total.
              Todo en una sola app, diseñada para empresas de seguridad argentinas.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#contacto" className="group flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-[#3ABEFF] text-[#071E22] font-black uppercase text-xs tracking-widest shadow-xl shadow-[#3ABEFF]/25 hover:scale-105 transition-all">
                Solicitar Demo Gratis
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <Link href="/login" className="flex items-center justify-center gap-2 h-14 px-8 rounded-2xl border border-[#237893]/30 hover:bg-[#0F4C5C]/20 text-xs tracking-widest font-black uppercase text-zinc-300 transition-all">
                <PlayCircle size={16} />
                Ver Demo en Vivo
              </Link>
            </div>

            {/* Mini trust bar */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 pt-4 border-t border-[#237893]/10">
              {[
                { label: 'Guardias gestionados', val: '+200' },
                { label: 'Objetivos activos', val: '+30' },
                { label: 'Uptime garantizado', val: '99.9%' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#3ABEFF] shrink-0" />
                  <div>
                    <p className="text-white font-black text-sm">{item.val}</p>
                    <p className="text-zinc-500 text-[9px] uppercase tracking-wider font-bold">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-[#0F4C5C]/30 blur-3xl rounded-full scale-75" />
            <div className="relative z-10 rounded-[2.5rem] overflow-hidden border border-[#237893]/20 shadow-2xl shadow-black/50">
              <div className="bg-[#071E22] px-6 py-4 border-b border-[#237893]/10 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                </div>
                <span className="text-[9px] font-mono tracking-widest text-[#237893] uppercase font-bold">Si.Ge.S — Dashboard Gerente</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <Image
                src="/hero-dashboard.png"
                alt="Dashboard Si.Ge.S en tiempo real"
                width={700}
                height={440}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -bottom-4 -left-8 bg-emerald-950/90 backdrop-blur-xl border border-emerald-500/20 rounded-2xl px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">12 guardias en línea</span>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
              className="absolute -top-4 -right-4 bg-[#0B2A30]/90 backdrop-blur-xl border border-[#237893]/20 rounded-2xl px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={12} className="text-[#3ABEFF]" />
                <span className="text-[9px] font-black uppercase tracking-wider text-[#3ABEFF]">98.4% eficacia operativa</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-zinc-600"
        >
          <span className="text-[8px] uppercase tracking-widest font-bold">Explorar</span>
          <ChevronDown size={16} />
        </motion.div>
      </section>

      {/* ── TRUST MARKERS ───────────────────────────────────────────────── */}
      <section className="relative z-10 py-12 border-y border-[#237893]/10 bg-[#0B2A30]/30">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Building2, val: 30, suffix: '+', label: 'Empresas confían en Si.Ge.S' },
            { icon: Users, val: 200, suffix: '+', label: 'Guardias gestionados' },
            { icon: Clock, val: 24, suffix: '/7', label: 'Monitoreo en tiempo real' },
            { icon: Smartphone, val: 99, suffix: '.9%', label: 'Disponibilidad de la plataforma' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#0F4C5C]/40 border border-[#237893]/20 flex items-center justify-center text-[#3ABEFF]">
                <item.icon size={22} />
              </div>
              <div>
                <p className="text-3xl font-black text-white font-mono">
                  <AnimatedCounter target={item.val} suffix={item.suffix} />
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-1">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PARA QUIÉN ES ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <SectionTag>¿Para quién es Si.Ge.S?</SectionTag>
          <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display leading-none">
            Una plataforma, <span className="text-[#3ABEFF]">tres perspectivas</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Building2,
              title: 'Para la Empresa de Seguridad',
              color: '#3ABEFF',
              items: [
                'Dashboard ejecutivo con KPIs en tiempo real',
                'Gestión completa de personal y legajos',
                'Nómina y planillas automatizadas',
                'Reportes PDF para auditorías',
                'Control total de operaciones desde cualquier lugar',
              ],
              img: '/hero-dashboard.png',
            },
            {
              icon: Smartphone,
              title: 'Para el Vigilador',
              color: '#10B981',
              items: [
                'App PWA en el celular, sin instalar nada',
                'Fichaje digital con validación GPS',
                'Libro de guardia con fotos y notas',
                'Patrullaje con checkpoints QR',
                'Botón de pánico de emergencia',
              ],
              img: '/mobile-app.png',
            },
            {
              icon: Users,
              title: 'Para el Cliente Final',
              color: '#F59E0B',
              items: [
                'Portal exclusivo de acceso privado',
                'Reportes de cobertura en tiempo real',
                'Historial de incidentes y novedades',
                'Descarga de informes PDF',
                'Gestión de tickets de requerimientos',
              ],
              img: '/client-portal.png',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group bg-[#0B2A30]/50 border border-[#237893]/15 rounded-[2rem] overflow-hidden hover:border-[#237893]/40 transition-all hover:-translate-y-1"
            >
              <div className="h-48 overflow-hidden relative">
                <Image src={card.img} alt={card.title} fill className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A30] to-transparent" />
                <div className="absolute bottom-4 left-6 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${card.color}20`, border: `1px solid ${card.color}30` }}>
                    <card.icon size={16} style={{ color: card.color }} />
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-black uppercase text-white">{card.title}</h3>
                <ul className="space-y-2.5">
                  {card.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-[11px] text-zinc-400 font-medium">
                      <CheckCircle2 size={12} className="mt-0.5 shrink-0" style={{ color: card.color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── MÓDULOS SHOWCASE ──────────────────────────────────────────────── */}
      <section id="modulos" className="relative z-10 py-24 px-6 lg:px-12 bg-[#0B2A30]/30 border-y border-[#237893]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <SectionTag>Módulos del Sistema</SectionTag>
            <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display leading-none">
              Todo lo que necesita <br />
              <span className="text-[#3ABEFF]">una empresa moderna</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-4 max-w-xl mx-auto font-medium">
              12 módulos integrados que cubren cada aspecto de la operación de seguridad privada.
            </p>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {modules.map((mod, i) => (
              <motion.button
                key={i}
                onClick={() => setActiveModule(i)}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className={`group text-left p-5 rounded-[1.5rem] border transition-all duration-300 ${
                  activeModule === i
                    ? 'bg-[#0F4C5C]/60 border-[#3ABEFF]/30 shadow-lg shadow-[#3ABEFF]/5'
                    : 'bg-[#071E22]/60 border-[#237893]/10 hover:border-[#237893]/30 hover:bg-[#0F4C5C]/20'
                }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: `${mod.color}15`, border: `1px solid ${mod.color}25` }}>
                  <mod.icon size={18} style={{ color: mod.color }} />
                </div>
                <h4 className="text-[11px] font-black uppercase text-white leading-tight">{mod.title}</h4>
              </motion.button>
            ))}
          </div>

          {/* Active Module Detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 p-8 rounded-[2rem] bg-[#071E22]/80 border border-[#237893]/15 flex items-start gap-6"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${modules[activeModule].color}15`, border: `1px solid ${modules[activeModule].color}25` }}>
                {React.createElement(modules[activeModule].icon, { size: 28, style: { color: modules[activeModule].color } })}
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-white mb-2">{modules[activeModule].title}</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-2xl">{modules[activeModule].desc}</p>
                <a href="#contacto" className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-black uppercase tracking-wider" style={{ color: modules[activeModule].color }}>
                  Ver más detalles <ChevronRight size={12} />
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── POR QUÉ SI.GE.S — Comparativa ────────────────────────────────── */}
      <section id="porque" className="relative z-10 py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <SectionTag>¿Por qué Si.Ge.S?</SectionTag>
          <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display">
            El antes y <span className="text-[#3ABEFF]">el después</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sin Si.Ge.S */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-[2rem] bg-red-950/20 border border-red-500/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <X size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black uppercase text-red-400">Sin Si.Ge.S</h3>
            </div>
            <ul className="space-y-3">
              {[
                'Planillas de papel que se pierden o falsifican',
                'Sin control real de asistencia de guardias',
                'Clientes sin visibilidad del servicio',
                'Rondines sin verificación ni seguimiento GPS',
                'Novedades por WhatsApp, sin registro oficial',
                'Nómina calculada a mano con errores frecuentes',
                'Sin reportes para auditorías o litigios',
                'Comunicación reactiva, no preventiva',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[11px] text-red-300/70 font-medium">
                  <X size={12} className="text-red-500/50 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Con Si.Ge.S */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-[2rem] bg-emerald-950/20 border border-emerald-500/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Check size={20} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-black uppercase text-emerald-400">Con Si.Ge.S</h3>
            </div>
            <ul className="space-y-3">
              {[
                'Fichaje GPS digital, inmutable e inviolable',
                'Control de asistencia en tiempo real con alertas',
                'Portal de cliente con transparencia total del servicio',
                'Rondines trazados por GPS con checkpoints QR',
                'Libro de guardia digital con fotos y firmas',
                'Nómina calculada automáticamente en segundos',
                'Reportes PDF legales y auditables en 1 click',
                'Alertas predictivas y sistema de emergencias 24/7',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[11px] text-emerald-300/80 font-medium">
                  <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* What makes it special */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Zap,
              title: 'Implementación en 48h',
              desc: 'Onboarding guiado, datos importados y equipo capacitado en 2 días.',
              color: '#F59E0B',
            },
            {
              icon: Globe,
              title: 'Diseñado para Argentina',
              desc: 'Templates judiciales locales, CCT de vigiladores privados, normativa SIPNA.',
              color: '#3ABEFF',
            },
            {
              icon: Lock,
              title: 'Seguridad Bancaria',
              desc: 'Cifrado end-to-end, copias de seguridad automáticas, datos en servidores locales.',
              color: '#10B981',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-[1.5rem] bg-[#0B2A30]/50 border border-[#237893]/15 flex gap-4"
            >
              <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center" style={{ background: `${card.color}15`, border: `1px solid ${card.color}25` }}>
                <card.icon size={22} style={{ color: card.color }} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-white mb-1">{card.title}</h4>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIOS ───────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 lg:px-12 bg-[#0B2A30]/30 border-y border-[#237893]/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionTag>Testimonios</SectionTag>
            <h2 className="text-3xl lg:text-4xl font-black text-white uppercase font-display">
              Lo que dicen <span className="text-[#3ABEFF]">nuestros clientes</span>
            </h2>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-10 rounded-[2.5rem] bg-[#071E22] border border-[#237893]/15 text-center"
              >
                <div className="flex justify-center gap-1 mb-6">
                  {Array.from({ length: testimonials[activeTestimonial].rating }).map((_, i) => (
                    <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <blockquote className="text-zinc-200 text-lg font-medium leading-relaxed max-w-2xl mx-auto mb-8">
                  &ldquo;{testimonials[activeTestimonial].text}&rdquo;
                </blockquote>
                <div>
                  <p className="text-white font-black text-sm uppercase">{testimonials[activeTestimonial].name}</p>
                  <p className="text-zinc-500 text-[11px] mt-1 font-medium">{testimonials[activeTestimonial].role}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeTestimonial ? 'bg-[#3ABEFF] w-6' : 'bg-zinc-600'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRECIOS ───────────────────────────────────────────────────────── */}
      <section id="precios" className="relative z-10 py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <SectionTag>Planes y Precios</SectionTag>
          <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display">
            Un plan para <span className="text-[#3ABEFF]">cada empresa</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-4 font-medium">Todos los planes incluyen soporte inicial y capacitación del equipo.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-[2rem] border transition-all flex flex-col ${
                plan.highlighted
                  ? 'bg-[#0F4C5C]/60 border-[#3ABEFF]/30 shadow-xl shadow-[#3ABEFF]/5 scale-105'
                  : 'bg-[#0B2A30]/50 border-[#237893]/15'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#3ABEFF] text-[#071E22] text-[9px] font-black uppercase tracking-widest rounded-full">
                  Más Elegido
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-black uppercase text-white mb-1">{plan.name}</h3>
                <p className="text-[10px] text-zinc-400 font-medium">{plan.desc}</p>
                <div className="mt-4">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  {plan.price === 'Consultar' && <span className="text-zinc-500 text-xs ml-2 font-medium">/ mes</span>}
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-[11px] text-zinc-300 font-medium">
                    <CheckCircle2 size={13} className="text-[#3ABEFF] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#contacto"
                className={`w-full h-12 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all ${
                  plan.highlighted
                    ? 'bg-[#3ABEFF] text-[#071E22] hover:bg-white shadow-lg shadow-[#3ABEFF]/20'
                    : 'border border-[#237893]/30 text-zinc-300 hover:bg-[#0F4C5C]/20'
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CONTACTO ──────────────────────────────────────────────────────── */}
      <section id="contacto" className="relative z-10 py-24 px-6 lg:px-12 bg-[#0B2A30]/30 border-t border-[#237893]/10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <div className="space-y-8">
            <div>
              <SectionTag>Solicitar Demo</SectionTag>
              <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display leading-none">
                Hablemos de <span className="text-[#3ABEFF]">tu empresa</span>
              </h2>
              <p className="text-zinc-400 text-sm mt-4 font-medium leading-relaxed max-w-md">
                Contáctanos y te mostramos cómo Si.Ge.S puede transformar la operación de tu empresa de seguridad en menos de 48 horas.
              </p>
            </div>

            <div className="space-y-4">
              <a href="mailto:siges.info@gmail.com" className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-[#0F4C5C]/40 border border-[#237893]/20 flex items-center justify-center text-[#3ABEFF] group-hover:bg-[#0F4C5C]/60 transition-all">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Correo Electrónico</p>
                  <p className="text-white font-bold text-sm font-mono">siges.info@gmail.com</p>
                </div>
              </a>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#0F4C5C]/40 border border-[#237893]/20 flex items-center justify-center text-[#3ABEFF]">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Teléfono / WhatsApp</p>
                  <p className="text-white font-bold text-sm font-mono">3426 310996 · 3425 162372</p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="pt-6 border-t border-[#237893]/10 grid grid-cols-3 gap-4">
              {[
                { val: '48h', label: 'Implementación' },
                { val: '0$', label: 'Costo inicial' },
                { val: '∞', label: 'Escalabilidad' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-black text-[#3ABEFF] font-mono">{s.val}</p>
                  <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="bg-[#071E22] border border-[#237893]/15 rounded-[2rem] p-8">
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
                <p className="text-zinc-400 text-sm font-medium">Nos comunicaremos en las próximas horas para agendar tu demo personalizada.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-sm font-black uppercase text-white tracking-wider mb-6">Solicitar Demo Personalizada</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1.5">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                      className="w-full bg-[#0B2A30] border border-[#237893]/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#3ABEFF]/50 transition-colors"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1.5">Empresa *</label>
                    <input
                      type="text"
                      required
                      value={formData.empresa}
                      onChange={e => setFormData(p => ({ ...p, empresa: e.target.value }))}
                      className="w-full bg-[#0B2A30] border border-[#237893]/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#3ABEFF]/50 transition-colors"
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-[#0B2A30] border border-[#237893]/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#3ABEFF]/50 transition-colors"
                    placeholder="tu@empresa.com"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))}
                    className="w-full bg-[#0B2A30] border border-[#237893]/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#3ABEFF]/50 transition-colors"
                    placeholder="+54 342..."
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mb-1.5">Mensaje</label>
                  <textarea
                    rows={3}
                    value={formData.mensaje}
                    onChange={e => setFormData(p => ({ ...p, mensaje: e.target.value }))}
                    className="w-full bg-[#0B2A30] border border-[#237893]/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#3ABEFF]/50 transition-colors resize-none"
                    placeholder="¿Cuántos guardias gestiona? ¿Qué necesita resolver primero?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-13 py-3.5 rounded-xl bg-[#3ABEFF] text-[#071E22] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all shadow-lg shadow-[#3ABEFF]/20 hover:scale-[1.02]"
                >
                  <Send size={14} />
                  Solicitar Demo Gratuita
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-12 px-6 lg:px-12 border-t border-[#237893]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SigesIcon className="w-8 h-8 text-[#3ABEFF]" />
                <div>
                  <span className="font-black text-white block leading-none">Si.Ge.S</span>
                  <span className="text-[8px] text-[#3ABEFF] tracking-widest uppercase">Sistema de Gestión</span>
                </div>
              </div>
              <p className="text-zinc-500 text-[11px] font-medium leading-relaxed">
                La plataforma integral para empresas de seguridad privada argentina.
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Plataforma</p>
              <ul className="space-y-2">
                {['Módulos', '¿Por qué Si.Ge.S?', 'Precios', 'Demo en Vivo'].map(l => (
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
                  { label: 'Seguridad de Datos', href: '/legal' },
                ].map(l => (
                  <li key={l.label}><Link href={l.href} className="text-[11px] text-zinc-400 hover:text-white transition-colors font-medium">{l.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Contacto</p>
              <ul className="space-y-2">
                <li><a href="mailto:siges.info@gmail.com" className="text-[11px] text-zinc-400 hover:text-white transition-colors font-mono">siges.info@gmail.com</a></li>
                <li><span className="text-[11px] text-zinc-400 font-mono">3426 310996</span></li>
                <li><span className="text-[11px] text-zinc-400 font-mono">3425 162372</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#237893]/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
              © 2026 Si.Ge.S. Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-zinc-600 font-medium">
              Tecnología de punta para empresas de seguridad privada argentina
            </p>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp Button ─────────────────────────────────────────────── */}
      <motion.a
        href="https://wa.me/5493426310996?text=Hola!%20Quiero%20saber%20más%20sobre%20Si.Ge.S"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: 'spring' }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-110 transition-all"
        title="Contactar por WhatsApp"
      >
        <MessageCircle size={26} className="text-white" />
      </motion.a>
    </div>
  );
}
