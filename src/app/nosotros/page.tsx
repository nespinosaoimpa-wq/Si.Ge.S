'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Shield,
  Users,
  Target,
  Award,
  Layers,
  ArrowRight,
  ChevronRight,
  Activity,
  Heart,
  TrendingUp,
  X,
} from 'lucide-react';
import { SigesIcon } from '@/components/ui/SigesLogo';

export default function NosotrosPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const values = [
    {
      icon: Shield,
      title: 'Seguridad Absoluta',
      desc: 'Nuestra prioridad es la protección ininterrumpida de sus datos y operaciones, aplicando estándares de cifrado militar y copias de seguridad redundantes.',
      color: '#3ABEFF'
    },
    {
      icon: Users,
      title: 'Transparencia Operativa',
      desc: 'Creemos en la honestidad. Eliminamos la incertidumbre permitiendo auditorías instantáneas y reportes en tiempo real para gerentes y clientes.',
      color: '#10B981'
    },
    {
      icon: Target,
      title: 'Innovación Constante',
      desc: 'Desarrollamos soluciones avanzadas y dinámicas para modernizar la seguridad física, desde geofencing inteligente hasta bitácoras inmutables.',
      color: '#F59E0B'
    },
    {
      icon: Award,
      title: 'Compromiso Local',
      desc: 'Diseñado específicamente para el mercado corporativo y legal argentino, adaptándonos a las normativas y exigencias del contexto nacional.',
      color: '#8B5CF6'
    }
  ];

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
        <Link href="/" className="flex items-center gap-3">
          <SigesIcon className="w-8 h-8 text-[#3ABEFF]" />
          <div>
            <span className="font-black text-lg tracking-tight uppercase text-white block leading-none">SIGPAD</span>
            <span className="text-[7px] font-bold tracking-[0.1em] uppercase text-[#3ABEFF] block leading-none">Sistema Inteligente de Gestión y Seguridad Dinámica</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Módulos', href: '/#modulos' },
            { label: 'Detalle', href: '/modulos' },
            { label: 'Nosotros', href: '/nosotros' },
            { label: 'Precios', href: '/#precios' },
            { label: 'Contacto', href: '/#contacto' },
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
          <Link href="/#contacto" className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[#3ABEFF] text-[#071E22] font-black uppercase text-[9px] tracking-widest hover:bg-white transition-all shadow-lg shadow-[#3ABEFF]/20 hover:scale-105">
            Solicitar Demo
          </Link>
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

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-grow z-10">
        
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 px-6 lg:px-12 max-w-7xl mx-auto w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0F4C5C]/30 border border-[#237893]/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3ABEFF] animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#3ABEFF]">Sobre Nosotros</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-black uppercase tracking-tight text-white leading-tight">
              Tecnología e Inteligencia al servicio de la <span className="text-[#3ABEFF]">seguridad física</span>
            </h1>
            <p className="text-zinc-400 text-base lg:text-lg font-medium leading-relaxed">
              SIGPAD nace con el propósito de resolver los problemas de opacidad, ineficiencia y falta de control en el sector de la seguridad privada en Argentina, combinando software robusto, geolocalización satelital y automatización legal.
            </p>
          </motion.div>
        </section>

        {/* History / Mission */}
        <section className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full border-t border-[#237893]/10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-black uppercase tracking-tight text-white">
                Nuestra <span className="text-[#3ABEFF]">Misión</span>
              </h2>
              <p className="text-zinc-400 leading-relaxed font-medium">
                La seguridad privada tradicional suele depender de planillas escritas a mano, registros vulnerables y reportes tardíos que generan desconfianza e ineficiencia operativa. 
              </p>
              <p className="text-zinc-400 leading-relaxed font-medium">
                En SIGPAD, digitalizamos y blindamos cada aspecto de la operación. Desde el monitoreo táctico en vivo hasta la automatización de la nómina y planillas horarias, proveemos un sistema operativo unificado que garantiza la excelencia del servicio y blinda legalmente a las agencias prestadoras frente a reclamos laborales o civiles.
              </p>
              <div className="flex gap-4 pt-4">
                <Link href="/#contacto" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#3ABEFF] hover:text-white transition-colors">
                  Conocer más <ArrowRight size={12} />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative p-8 rounded-[2.5rem] bg-[#0F4C5C]/10 border border-[#237893]/15 overflow-hidden flex flex-col justify-between min-h-[350px]"
            >
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#3ABEFF]/5 blur-[60px] rounded-full" />
              <Shield className="w-16 h-16 text-[#3ABEFF] mb-6" />
              <div className="space-y-4">
                <h3 className="text-xl font-bold uppercase tracking-tight text-white">¿Por qué SIGPAD?</h3>
                <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                  Porque no solo somos una app de asistencia. Somos un ecosistema operativo integral (OS) de seguridad que unifica la gestión de personal, inventario, libro de guardia, mapas tácticos satelitales y blindaje judicial en un solo lugar.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-[#237893]/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">100% Cloud</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3ABEFF]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mapbox + Supabase</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Values Grid */}
        <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full border-t border-[#237893]/10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight text-white">
              Nuestros Valores <span className="text-[#3ABEFF]">Fundacionales</span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto font-medium text-sm">
              Principios que guían cada línea de código y cada actualización que integramos en la plataforma.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-8 rounded-[2rem] bg-[#071E22]/50 border border-[#237893]/10 hover:border-[#3ABEFF]/30 transition-all duration-300 group flex flex-col"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0F4C5C]/35 border border-[#237893]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <value.icon className="w-6 h-6" style={{ color: value.color }} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white mb-3">
                  {value.title}
                </h3>
                <p className="text-zinc-400 text-xs font-medium leading-relaxed">
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Call to action */}
        <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full text-center relative overflow-hidden border-t border-[#237893]/10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#3ABEFF]/5 blur-[120px] rounded-full pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto space-y-8 relative z-10"
          >
            <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              ¿Listo para modernizar su operación de seguridad?
            </h2>
            <p className="text-zinc-400 font-medium text-sm lg:text-base leading-relaxed">
              Únase a las agencias prestadoras de seguridad física que ya operan a máxima eficiencia con SIGPAD OS. Solicite su prueba o demo gratuita hoy mismo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/#contacto" className="flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-[#3ABEFF] text-[#071E22] font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-lg shadow-[#3ABEFF]/20 w-full sm:w-auto">
                Solicitar Demostración <ArrowRight size={14} />
              </Link>
              <Link href="/roles" className="flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-[#0F4C5C]/20 border border-[#237893]/20 text-white font-black uppercase text-[10px] tracking-widest hover:bg-[#0F4C5C]/40 transition-all w-full sm:w-auto">
                Ingresar a la Plataforma
              </Link>
            </div>
          </motion.div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#041215] border-t border-[#237893]/10 py-12 px-6 lg:px-12 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <SigesIcon className="w-6 h-6 text-[#3ABEFF]" />
            <span className="font-black text-sm tracking-widest uppercase text-white">SIGPAD OS</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} SIGPAD. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#3ABEFF] transition-colors">
              Inicio
            </Link>
            <Link href="/modulos" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#3ABEFF] transition-colors">
              Módulos
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
