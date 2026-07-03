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
  ArrowUpRight,
  Award
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
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full mb-4 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300">{children}</span>
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
    text: 'SIGPAD transformó completamente nuestra operación. Eliminamos las planillas de papel y ahora tenemos visibilidad total de nuestros 45 guardias en tiempo real.',
    rating: 5,
  },
  {
    name: 'Lic. Carla Fernández',
    role: 'Gerente General — Custodia Empresarial',
    text: 'El módulo de portal de clientes fue un diferenciador enorme. Nuestros clientes corporativos valoran la transparencia que les damos con SIGPAD.',
    rating: 5,
  },
  {
    name: 'Crio. (R) Marcelo Torres',
    role: 'CEO — Torres Seguridad Privada',
    text: 'Implementamos SIGPAD en 2 días. La curva de aprendizaje es mínima y el soporte es excepcional. Nuestras auditorías de cumplimiento ahora tardan horas, no semanas.',
    rating: 5,
  },
];

export default function RootLandingPage() {
  const [activeModule, setActiveModule] = useState(0);
  const [activePerspective, setActivePerspective] = useState<'manager' | 'guard' | 'client'>('manager');
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-white/20 selection:text-white overflow-x-hidden">
      
      {/* ── Ambient Backgrounds ─────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] right-[-15%] w-[600px] h-[600px] bg-zinc-900/10 blur-[150px] rounded-full" />
        <div className="absolute top-[50%] left-[-15%] w-[500px] h-[500px] bg-zinc-800/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] bg-zinc-900/5 blur-[120px] rounded-full" />
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-800/80 h-16 flex items-center justify-between px-6 lg:px-12">
        <Link href="/" className="flex items-center h-10">
          <SigesIcon className="w-36 h-10" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'El Sistema', href: '#sistema', isRoute: false },
            { label: 'Módulos', href: '#modulos', isRoute: false },
            { label: 'Detalle', href: '/modulos', isRoute: true },
            { label: 'Nosotros', href: '/nosotros', isRoute: true },
            { label: 'Soluciones', href: '#porque', isRoute: false },
            { label: 'Precios', href: '#precios', isRoute: false },
            { label: 'Contacto', href: '#contacto', isRoute: false },
          ].map(link => (
            link.isRoute ? (
              <Link key={link.href} href={link.href} className="text-[11px] font-black uppercase tracking-wider text-zinc-500 hover:text-white transition-colors">
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className="text-[11px] font-black uppercase tracking-wider text-zinc-500 hover:text-white transition-colors">
                {link.label}
              </a>
            )
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/roles" className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:text-zinc-300 transition-colors px-4 py-2 border border-zinc-800 rounded-xl bg-zinc-950 hover:bg-zinc-900">
            Ingreso de Personal
          </Link>
          <a href="#contacto" className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black uppercase text-[9px] tracking-widest transition-all shadow-lg shadow-white/5 hover:scale-105">
            Solicitar Demo
          </a>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-zinc-500 hover:text-white">
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
              { label: 'El Sistema', href: '#sistema', isRoute: false },
              { label: 'Módulos', href: '#modulos', isRoute: false },
              { label: 'Detalle', href: '/modulos', isRoute: true },
              { label: 'Nosotros', href: '/nosotros', isRoute: true },
              { label: 'Soluciones', href: '#porque', isRoute: false },
              { label: 'Precios', href: '#precios', isRoute: false },
              { label: 'Contacto', href: '#contacto', isRoute: false },
            ].map(link => (
              link.isRoute ? (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-black uppercase tracking-wider text-zinc-300 hover:text-white py-2 border-b border-[#237893]/10 block">
                  {link.label}
                </Link>
              ) : (
                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-black uppercase tracking-wider text-zinc-300 hover:text-white py-2 border-b border-[#237893]/10 block">
                  {link.label}
                </a>
              )
            ))}
            <Link href="/roles" onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-black uppercase tracking-wider text-[#3ABEFF] py-3 block text-center border border-[#3ABEFF]/30 rounded-xl bg-[#3ABEFF]/5">
              Ingresar a la Plataforma
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center px-6 lg:px-12 max-w-7xl mx-auto w-full z-10 pt-8 pb-20">
        
        {/* Marca de agua translúcida gigante del logotipo de SIGPAD */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
          <img 
            src="/logo_sigpad.png" 
            alt="" 
            className="w-[95%] max-w-5xl opacity-[0.035] filter grayscale contrast-125 scale-110 pointer-events-none select-none"
          />
        </div>

        <div className="max-w-4xl mx-auto text-center w-full z-10">
          {/* Centered Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-8 flex flex-col items-center justify-center"
          >
            <SectionTag>Tecnología de Seguridad de Vanguardia</SectionTag>

            <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] font-display max-w-3xl">
              La plataforma que{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">transforma</span>{' '}
              la gestión de seguridad privada
            </h1>

            <p className="text-zinc-400 text-sm lg:text-base max-w-2xl font-medium leading-relaxed mx-auto">
              Control GPS en tiempo real. Fichaje digital sin fraude. Portal de clientes con transparencia total.
              Todo en una sola app, diseñada para empresas de seguridad argentinas.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#contacto" className="group flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-black uppercase text-xs tracking-widest shadow-xl shadow-white/5 hover:scale-105 transition-all">
                Solicitar Demo Gratis
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <Link href="/roles" className="flex items-center justify-center gap-2 h-14 px-8 rounded-2xl border border-zinc-800 hover:bg-zinc-900 text-xs tracking-widest font-black uppercase text-zinc-300 transition-all">
                <PlayCircle size={16} />
                Ingresar a la Plataforma
              </Link>
            </div>

            {/* Mini trust bar */}
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 pt-6 border-t border-zinc-800/80 w-full max-w-xl mx-auto">
              {[
                { label: 'Guardias gestionados', val: '+200' },
                { label: 'Objetivos activos', val: '+30' },
                { label: 'Uptime garantizado', val: '99.9%' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                   <CheckCircle2 size={14} className="text-zinc-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-white font-black text-sm">{item.val}</p>
                    <p className="text-zinc-550 text-[9px] uppercase tracking-wider font-bold">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
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
            { icon: Building2, val: 30, suffix: '+', label: 'Empresas confían en SIGPAD' },
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

      {/* ── EL SISTEMA POR DENTRO (Showcase Interactivo con Capturas Reales) ── */}
      <section id="sistema" className="relative z-10 py-24 px-6 lg:px-12 border-b border-[#237893]/10 bg-[#041215]/40">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <SectionTag>El Sistema por Dentro</SectionTag>
            <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display leading-tight">
              Capturas Reales de <br />
              <span className="text-[#3ABEFF]">la plataforma operativa</span>
            </h2>
            <p className="text-zinc-400 text-sm font-medium">
              Explora las tres interfaces nativas que conforman el ecosistema SIGPAD y comprueba cómo organizamos cada rol de seguridad.
            </p>
          </div>

          {/* Perspective Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-4 bg-[#071E22]/60 p-2 rounded-[2rem] border border-[#237893]/15 max-w-lg mx-auto">
            {[
              { id: 'manager', label: 'Central Gerente', color: '#3ABEFF', icon: Building2 },
              { id: 'guard', label: 'App Vigilador', color: '#10B981', icon: Smartphone },
              { id: 'client', label: 'Portal Cliente', color: '#F59E0B', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePerspective(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                  activePerspective === tab.id
                    ? 'bg-[#0F4C5C]/60 text-white border border-[#237893]/35 shadow-lg'
                    : 'text-zinc-400 hover:text-white hover:bg-[#0F4C5C]/10'
                }`}
              >
                <tab.icon size={14} style={{ color: activePerspective === tab.id ? tab.color : '#888' }} />
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
                    <div className="inline-flex gap-2 items-center text-xs font-black uppercase text-[#3ABEFF] tracking-wider">
                      <Award size={16} /> Dashboard de Control del Gerente
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Supervisión e Inteligencia Central</h3>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                      La central operativa consolida toda la información de campo sobre mapas interactivos de Mapbox y capas satelitales de Google Maps.
                    </p>
                    <ul className="space-y-4">
                      {[
                        { title: 'Mapa Táctico WebGL', desc: 'Rastreo en tiempo real del personal operativo en toda la provincia.' },
                        { title: 'Gestión de Alertas y Pánico', desc: 'Alertas sonoras y visuales inmediatas ante emergencias.' },
                        { title: 'Geocercas de Seguridad', desc: 'Cruce de límites automático con disparo de advertencias.' }
                      ].map((item, idx) => (
                        <li key={idx} className="flex gap-3">
                          <CheckCircle2 size={18} className="text-[#3ABEFF] shrink-0 mt-0.5" />
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
                    <div className="inline-flex gap-2 items-center text-xs font-black uppercase text-[#10B981] tracking-wider">
                      <Smartphone size={16} /> Aplicación Móvil del Vigilador
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Herramienta de Campo Inviolable</h3>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                      Una PWA ligera que corre en cualquier celular, permitiendo a los guardias registrar su presencia y reportar novedades al instante.
                    </p>
                    <ul className="space-y-4">
                      {[
                        { title: 'Fichaje Geolocalizado (GPS)', desc: 'Validación en rango de 300 metros del objetivo asignado.' },
                        { title: 'Registro de Rondines QR', desc: 'Escaneo físico de checkpoints con fecha, hora y coordenadas GPS.' },
                        { title: 'Libro de Guardia y Multimedia', desc: 'Envío de fotos de incidentes con firma digital inmutable.' }
                      ].map((item, idx) => (
                        <li key={idx} className="flex gap-3">
                          <CheckCircle2 size={18} className="text-[#10B981] shrink-0 mt-0.5" />
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
                    <div className="inline-flex gap-2 items-center text-xs font-black uppercase text-[#F59E0B] tracking-wider">
                      <Globe size={16} /> Portal para Clientes Finales VIP
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Transparencia y Confianza Comercial</h3>
                    <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                      Tus clientes corporativos acceden a un panel privado para auditar la cobertura y descargar reportes oficiales sin intermediarios.
                    </p>
                    <ul className="space-y-4">
                      {[
                        { title: 'Auditoría en Tiempo Real', desc: 'Panel donde el cliente visualiza la cobertura de seguridad contratada.' },
                        { title: 'Descarga de Trazabilidad PDF', desc: 'Reportes de asistencia oficiales para verificar el servicio prestado.' },
                        { title: 'Tickets y Soporte VIP', desc: 'Canal directo para solicitar modificaciones de cobertura u objetivos.' }
                      ].map((item, idx) => (
                        <li key={idx} className="flex gap-3">
                          <CheckCircle2 size={18} className="text-[#F59E0B] shrink-0 mt-0.5" />
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

            {/* Right Column: Real Capture Render */}
            <div className="lg:col-span-7 relative flex justify-center">
              <AnimatePresence mode="wait">
                {activePerspective === 'manager' && (
                  <motion.div
                    key="manager-img"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full aspect-[16/10] rounded-[2.5rem] overflow-hidden border border-[#237893]/20 shadow-2xl shadow-black/80 bg-[#041215]"
                  >
                    <Image
                      src="/hero-dashboard.png"
                      alt="Mapa Táctico y Panel del Gerente real"
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                )}

                {activePerspective === 'guard' && (
                  <motion.div
                    key="guard-img"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-[300px] h-[550px] rounded-[3rem] overflow-hidden border-8 border-zinc-900 shadow-2xl shadow-black/90 bg-[#041215]"
                  >
                    <Image
                      src="/mobile-app.png"
                      alt="Aplicación Móvil del Vigilador real"
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                )}

                {activePerspective === 'client' && (
                  <motion.div
                    key="client-img"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full aspect-[16/10] rounded-[2.5rem] overflow-hidden border border-[#237893]/20 shadow-2xl shadow-black/80 bg-[#041215]"
                  >
                    <Image
                      src="/client-portal.png"
                      alt="Portal de Clientes VIP real"
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ── MÓDULOS SHOWCASE ──────────────────────────────────────────────── */}
      <section id="modulos" className="relative z-10 py-24 px-6 lg:px-12 bg-[#0B2A30]/30 border-b border-[#237893]/10">
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

      {/* ── POR QUÉ SI.GE.S — Comparativa y Soluciones (Enfoque Phoenix) ── */}
      <section id="porque" className="relative z-10 py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <SectionTag>¿Por qué SIGPAD?</SectionTag>
          <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display">
            El antes y <span className="text-[#3ABEFF]">el después</span>
          </h2>
          <p className="text-zinc-400 text-sm mt-4 max-w-xl mx-auto font-medium">
            Compara cómo cambia radicalmente la confiabilidad del servicio y el blindaje de la empresa de seguridad.
          </p>
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
              <h3 className="text-lg font-black uppercase text-red-400">Sin SIGPAD (Gestión Tradicional)</h3>
            </div>
            <ul className="space-y-3">
              {[
                'Planillas de papel escritas a mano que se pierden o se falsifican.',
                'Sin control real sobre la asistencia o retrasos de los guardias.',
                'Clientes a ciegas, sin saber si los puestos están cubiertos.',
                'Rondines sin control, fiándose solo de la firma del vigilante.',
                'Libro de novedades de papel, vulnerable a alteraciones físicas.',
                'Exposición legal total ante reclamos laborales o demandas por cobertura.',
                'Planillas horarias calculadas a mano con errores e ineficiencias.',
                'Monitoreo inactivo y reactivo que solo responde cuando ocurre el siniestro.'
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
              <h3 className="text-lg font-black uppercase text-emerald-400">Con SIGPAD (Gestión Digitalizada)</h3>
            </div>
            <ul className="space-y-3">
              {[
                'Fichaje GPS inviolable con límite de rango exacto de 300 metros.',
                'Registro en tiempo real con alertas y notificaciones instantáneas.',
                'Clientes integrados en un portal privado auditando el servicio.',
                'Rondines controlados vía checkpoints y trazas de recorrido en mapa.',
                'Libro de Guardia digital con firmas inalterables y fotos de respaldo.',
                'Bitácoras y reportes PDF listos para defensa judicial y legal.',
                'Cálculo de nómina preciso y automatizado basado en logs de asistencia.',
                'Monitoreo activo constante con alarmas de pánico en la central.'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[11px] text-emerald-300/90 font-medium">
                  <Check size={12} className="text-[#10B981] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── PLANES Y PRECIOS ────────────────────────────────────────────── */}
      <section id="precios" className="relative z-10 py-24 px-6 lg:px-12 bg-[#0B2A30]/30 border-y border-[#237893]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <SectionTag>Planes y Tarifas</SectionTag>
            <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display leading-none">
              Planes Adaptados a su <span className="text-[#3ABEFF]">Operación</span>
            </h2>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto font-medium">
              Escale el sistema a medida que crecen sus objetivos y su personal de seguridad.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-8 rounded-[2.5rem] border flex flex-col justify-between ${
                  plan.highlighted
                    ? 'bg-[#0F4C5C]/45 border-[#3ABEFF]/40 shadow-xl shadow-[#3ABEFF]/5'
                    : 'bg-[#071E22]/60 border-[#237893]/10'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#3ABEFF] text-[#071E22] font-black uppercase text-[8px] tracking-[0.25em] py-1 px-4 rounded-full shadow-lg">
                    Recomendado
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-black uppercase text-white tracking-wider mb-2">{plan.name}</h3>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest leading-none mb-6">{plan.desc}</p>
                  
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-3xl font-black text-white uppercase tracking-tighter">{plan.price}</span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feat, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-[11px] text-zinc-300 font-semibold uppercase tracking-wider">
                        <CheckCircle2 size={13} className="text-[#3ABEFF] shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="#contacto"
                  className={`flex items-center justify-center gap-2 h-12 w-full rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                    plan.highlighted
                      ? 'bg-[#3ABEFF] text-[#071E22] hover:bg-white shadow-lg shadow-[#3ABEFF]/10'
                      : 'bg-[#0B2A30] border border-[#237893]/20 hover:bg-[#0F4C5C]/20 text-zinc-300'
                  }`}
                >
                  {plan.cta}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full border-b border-[#237893]/10">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 space-y-6">
            <SectionTag>Opiniones</SectionTag>
            <h2 className="text-3xl lg:text-5xl font-black text-white uppercase font-display leading-tight">
              ¿Qué dicen los <br />
              <span className="text-[#3ABEFF]">líderes del sector?</span>
            </h2>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">
              Descubra por qué empresas prestadoras de seguridad física en toda la provincia eligen SIGPAD para digitalizar y blindar su operación.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="relative min-h-[220px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8 rounded-[2rem] bg-[#0B2A30]/40 border border-[#237893]/15 space-y-6 shadow-xl"
                >
                  <div className="flex gap-1">
                    {Array.from({ length: testimonials[activeTestimonial].rating }).map((_, idx) => (
                      <Star key={idx} size={14} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-zinc-300 text-sm font-medium leading-relaxed italic">
                    "{testimonials[activeTestimonial].text}"
                  </p>
                  <div>
                    <h4 className="text-white font-black uppercase text-xs tracking-wider">{testimonials[activeTestimonial].name}</h4>
                    <p className="text-[#3ABEFF] text-[9px] uppercase tracking-widest font-black mt-1">{testimonials[activeTestimonial].role}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Indicators */}
            <div className="flex gap-2.5 justify-end mt-4 px-4">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${activeTestimonial === idx ? 'bg-[#3ABEFF] w-6' : 'bg-[#237893]/30'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT & DEMO ──────────────────────────────────────────────── */}
      <section id="contacto" className="relative z-10 py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* Details */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-4">
              <SectionTag>Solicitar Demo</SectionTag>
              <h2 className="text-4xl lg:text-5xl font-black text-white uppercase font-display leading-tight">
                Modernice su <br />
                <span className="text-[#3ABEFF]">operación hoy</span>
              </h2>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                Agenda una demostración personalizada sin costo. Evaluaremos sus necesidades operativas, estimaremos el volumen de guardias y le propondremos un plan a medida.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/40 border border-[#237893]/20 flex items-center justify-center text-[#3ABEFF]">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Email de Contacto</p>
                  <p className="text-white font-bold text-sm font-mono">contacto@sigpad.com.ar</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C5C]/40 border border-[#237893]/20 flex items-center justify-center text-[#3ABEFF]">
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Líneas de Atención</p>
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
          <div className="lg:col-span-6 bg-[#071E22] border border-[#237893]/15 rounded-[2.5rem] p-8 shadow-2xl">
            {formSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-12 gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-black uppercase text-white">¡Solicitud Recibida!</h3>
                <p className="text-zinc-400 text-sm font-medium">Nos comunicaremos a la brevedad para agendar la llamada de presentación.</p>
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
                    placeholder="¿Qué soluciones busca y cuántos guardias gestiona?"
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
      <footer className="relative z-10 py-12 px-6 lg:px-12 border-t border-[#237893]/10 bg-[#041215]/80">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center">
                <SigesIcon className="w-36 h-10" />
              </div>
              <p className="text-zinc-500 text-[11px] font-medium leading-relaxed">
                La plataforma integral para empresas de seguridad privada argentina.
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black mb-4">Plataforma</p>
              <ul className="space-y-2">
                {['El Sistema', 'Módulos', 'Precios', 'Demo'].map(l => (
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
                <li><a href="mailto:contacto@sigpad.com.ar" className="text-[11px] text-zinc-400 hover:text-white transition-colors font-mono">contacto@sigpad.com.ar</a></li>
                <li><span className="text-[11px] text-zinc-400 font-mono">3426 310996</span></li>
                <li><span className="text-[11px] text-zinc-400 font-mono">3425 162372</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#237893]/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} SIGPAD. Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-zinc-600 font-medium">
              Tecnología de punta para empresas de seguridad privada argentina
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
        transition={{ delay: 2, type: 'spring' }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-110 transition-all"
        title="Contactar por WhatsApp"
      >
        <MessageCircle size={26} className="text-white" />
      </motion.a>
    </div>
  );
}
