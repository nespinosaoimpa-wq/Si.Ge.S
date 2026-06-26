'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Layers,
  Activity,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { SigesIcon } from '@/components/ui/SigesLogo';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function PresentacionPage() {
  const [activeTab, setActiveTab] = useState<'gerente' | 'operador' | 'cliente'>('gerente');

  return (
    <div className="min-h-screen bg-[#071E22] text-zinc-100 flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#0F4C5C]/15 to-transparent pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[#237893]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-[#0F4C5C]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-[#071E22]/80 backdrop-blur-xl border-b border-[#237893]/10 h-16 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <SigesIcon className="w-8 h-8 text-primary" />
          <span className="font-black text-lg tracking-tight uppercase font-display text-white">
            Si.Ge.S <span className="text-primary text-[10px] font-bold tracking-widest block leading-none">OS</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-xs tracking-wider uppercase font-bold text-zinc-400 hover:text-white">
              Ingresar
            </Button>
          </Link>
          <Link href="/login">
            <Button className="h-10 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest px-5 hover:shadow-lg hover:shadow-primary/25 transition-all">
              Probar Demo
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 z-10">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0F4C5C]/30 border border-[#237893]/20 rounded-full shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">Tecnología de Seguridad de Vanguardia</span>
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-white uppercase leading-none font-display">
            El sistema que potencia la gestión de toda empresa de <span className="text-primary">seguridad privada</span>
          </h1>
          
          <p className="text-zinc-400 text-base lg:text-lg max-w-xl font-medium leading-relaxed">
            Si.Ge.S es la solución integral en la nube y offline para agencias de seguridad modernas. Monitorea patrullajes en vivo, digitaliza novedades en campo y ofrece transparencia total a tus clientes finales.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-14 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-widest px-8 shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                Iniciar Demo <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
            <a href="#contacto" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-14 rounded-2xl border-[#237893]/30 hover:bg-[#0F4C5C]/15 text-xs tracking-widest font-black uppercase text-zinc-300">
                Contactar Ventas
              </Button>
            </a>
          </div>
        </div>

        {/* Hero Interactive UI Preview Mockup */}
        <div className="flex-1 w-full lg:max-w-xl relative">
          <div className="absolute inset-0 bg-[#0F4C5C]/20 blur-3xl rounded-full" />
          <Card className="border-[#237893]/20 bg-[#0B2A30]/90 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 border">
            {/* Window bar */}
            <div className="px-6 py-4 bg-[#071E22] border-b border-[#237893]/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-[#237893] uppercase font-bold">Si.Ge.S OS Live Preview</span>
            </div>

            {/* Simulated app tabs */}
            <div className="grid grid-cols-3 border-b border-[#237893]/10 bg-[#071E22]/50">
              <button 
                onClick={() => setActiveTab('gerente')}
                className={`py-3.5 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'gerente' ? 'border-primary text-primary bg-[#0B2A30]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                Gerente
              </button>
              <button 
                onClick={() => setActiveTab('operador')}
                className={`py-3.5 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'operador' ? 'border-primary text-primary bg-[#0B2A30]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                Vigilador
              </button>
              <button 
                onClick={() => setActiveTab('cliente')}
                className={`py-3.5 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'cliente' ? 'border-primary text-primary bg-[#0B2A30]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                Cliente Final
              </button>
            </div>

            {/* Simulated Content */}
            <div className="p-6 h-[340px] overflow-y-auto no-scrollbar bg-[#0B2A30]">
              <AnimatePresence mode="wait">
                {activeTab === 'gerente' && (
                  <motion.div
                    key="gerente"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center bg-[#071E22]/80 p-4 border border-[#237893]/10 rounded-2xl">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-[#237893] font-bold">RONDIN ACTIVO</span>
                        <h4 className="text-white font-bold text-sm mt-0.5">Objetivo: Refinería Delta</h4>
                      </div>
                      <span className="px-2 py-1 rounded bg-[#0F4C5C]/20 border border-primary/20 text-[8px] font-black uppercase text-primary animate-pulse">En Línea</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 bg-[#071E22]/50 border border-white/5 rounded-xl text-center">
                        <span className="text-[14px] font-mono font-black text-white">12</span>
                        <span className="text-[7px] text-zinc-500 uppercase tracking-wide block">Guardias</span>
                      </div>
                      <div className="p-3 bg-[#071E22]/50 border border-white/5 rounded-xl text-center">
                        <span className="text-[14px] font-mono font-black text-primary">98.4%</span>
                        <span className="text-[7px] text-zinc-500 uppercase tracking-wide block">Rondines</span>
                      </div>
                      <div className="p-3 bg-[#071E22]/50 border border-white/5 rounded-xl text-center">
                        <span className="text-[14px] font-mono font-black text-red-400">1</span>
                        <span className="text-[7px] text-zinc-500 uppercase tracking-wide block">Novedad</span>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-white/5 pt-4">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Últimos Eventos</p>
                      <div className="flex items-center gap-2.5 text-[10px] text-zinc-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-mono text-zinc-500 font-bold">12:15</span>
                        <p className="truncate">Check-in: Guardia Gómez en Refinería</p>
                      </div>
                      <div className="flex items-center gap-2.5 text-[10px] text-zinc-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="font-mono text-zinc-500 font-bold">11:58</span>
                        <p className="truncate">Novedad: Inspección perimetral Norte OK</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'operador' && (
                  <motion.div
                    key="operador"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="text-center py-2">
                      <Smartphone size={32} className="mx-auto text-primary" />
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mt-2">Aplicación del Vigilador (PWA)</p>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full h-11 border border-dashed border-[#237893]/30 bg-[#071E22]/30 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#0F4C5C]/10 transition-colors">
                        <CheckCircle2 size={16} className="text-primary animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Fichar Entrada / Salida</span>
                      </div>
                      
                      <div className="w-full h-11 border border-dashed border-[#237893]/30 bg-[#071E22]/30 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#0F4C5C]/10 transition-colors">
                        <BookOpen size={16} className="text-zinc-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Redactar Novedad de Guardia</span>
                      </div>

                      <div className="w-full h-11 border border-dashed border-[#237893]/30 bg-[#071E22]/30 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#0F4C5C]/10 transition-colors">
                        <Smartphone size={16} className="text-zinc-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Escanear QR de Checkpoint</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'cliente' && (
                  <motion.div
                    key="cliente"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-[#071E22] p-4 border border-[#237893]/10 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">CLIENTE VIP</span>
                        <h4 className="text-white font-bold text-sm mt-0.5">Consorcio Puerto Madero</h4>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#0F4C5C]/20 border border-primary/20 flex items-center justify-center text-primary text-xs font-black">98</div>
                    </div>

                    <div className="space-y-2.5">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Estado del Servicio</p>
                      <div className="p-3 bg-[#071E22]/40 rounded-xl border border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Activity size={14} className="text-emerald-400" />
                          <span className="text-[10px] text-zinc-300">Patrulla de Cobertura Activa</span>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-400 font-mono">100% OK</span>
                      </div>
                      <div className="p-3 bg-[#071E22]/40 rounded-xl border border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-primary" />
                          <span className="text-[10px] text-zinc-300">Último Control Perimetral</span>
                        </div>
                        <span className="text-[9px] font-bold text-primary font-mono">Hace 15m</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-xs font-black uppercase text-primary tracking-[0.4em]">Características Principales</h2>
          <h3 className="text-3xl lg:text-4xl font-black text-white uppercase font-display leading-none">
            Todo lo necesario para vender un servicio premium
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#0B2A30]/50 border-[#237893]/15 rounded-[2rem] p-6 space-y-6 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-[#0F4C5C]/40 border border-[#237893]/20 flex items-center justify-center text-primary">
              <MapPin size={24} />
            </div>
            <h4 className="text-lg font-black uppercase text-white leading-tight">GPS y Trazo Perimetral</h4>
            <p className="text-zinc-400 text-xs font-medium leading-relaxed">
              Monitoreo satelital por coordenadas de los rondines de los guardias, con cálculo de precisión GPS integrado.
            </p>
          </Card>

          <Card className="bg-[#0B2A30]/50 border-[#237893]/15 rounded-[2rem] p-6 space-y-6 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-[#0F4C5C]/40 border border-[#237893]/20 flex items-center justify-center text-primary">
              <BookOpen size={24} />
            </div>
            <h4 className="text-lg font-black uppercase text-white leading-tight">Libro de Guardia Digital</h4>
            <p className="text-zinc-400 text-xs font-medium leading-relaxed">
              Los vigiladores redactan novedades, capturan evidencia fotográfica y registran firmas en tiempo real desde el campo.
            </p>
          </Card>

          <Card className="bg-[#0B2A30]/50 border-[#237893]/15 rounded-[2rem] p-6 space-y-6 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-[#0F4C5C]/40 border border-[#237893]/20 flex items-center justify-center text-primary">
              <Building2 size={24} />
            </div>
            <h4 className="text-lg font-black uppercase text-white leading-tight">Portal de Clientes VIP</h4>
            <p className="text-zinc-400 text-xs font-medium leading-relaxed">
              Ofrece a tus clientes corporativos un acceso privado donde pueden ver auditorías, control perimetral y descargar reportes.
            </p>
          </Card>

          <Card className="bg-[#0B2A30]/50 border-[#237893]/15 rounded-[2rem] p-6 space-y-6 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-[#0F4C5C]/40 border border-[#237893]/20 flex items-center justify-center text-primary">
              <Download size={24} />
            </div>
            <h4 className="text-lg font-black uppercase text-white leading-tight">Reportes PDF Automatizados</h4>
            <p className="text-zinc-400 text-xs font-medium leading-relaxed">
              Genera auditorías de cumplimiento normativo y reportes perimetrales con firmas digitales listos para descargar y exportar.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA / Contact Section */}
      <section id="contacto" className="py-20 px-6 lg:px-12 max-w-5xl mx-auto z-10 relative">
        <Card className="bg-gradient-to-br from-[#0F4C5C]/40 to-[#0B2A30]/80 border-[#237893]/20 rounded-[3rem] p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-[300px] h-[300px] bg-primary/10 blur-[100px] rounded-full" />
          
          <div className="text-center max-w-2xl mx-auto space-y-8 relative z-10">
            <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tight text-white font-display">
              ¿Listo para comercializar <span className="text-primary">Si.Ge.S</span>?
            </h2>
            <p className="text-zinc-300 text-xs lg:text-sm font-medium leading-relaxed">
              Vende una versión personalizada de la plataforma a otras empresas de seguridad. Comunícate hoy para conocer los planes comerciales, personalización de logos adicionales y despliegue rápido en la nube.
            </p>
            
            <div className="h-px bg-white/10 my-8" />
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-sm">
              <a href="mailto:siges.info@gmail.com" className="flex items-center gap-3 text-zinc-300 hover:text-primary transition-all">
                <div className="w-10 h-10 rounded-full bg-[#071E22] flex items-center justify-center text-primary">
                  <Mail size={18} />
                </div>
                <div className="text-left">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold leading-none mb-1">Correo Electrónico</p>
                  <span className="font-mono font-bold">siges.info@gmail.com</span>
                </div>
              </a>
              
              <div className="flex items-center gap-3 text-zinc-300 hover:text-primary transition-all">
                <div className="w-10 h-10 rounded-full bg-[#071E22] flex items-center justify-center text-primary">
                  <Phone size={18} />
                </div>
                <div className="text-left">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold leading-none mb-1">Contacto Telefónico</p>
                  <span className="font-mono font-bold">3426310996 | 3425162372</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 lg:px-12 border-t border-[#237893]/10 text-center text-xs text-zinc-500 z-10 relative">
        <p className="font-black uppercase tracking-[0.2em]">
          Si.Ge.S • El sistema que potencia la gestión de toda empresa de seguridad privada
        </p>
        <p className="mt-2 font-mono">© 2026 Si.Ge.S OS. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
