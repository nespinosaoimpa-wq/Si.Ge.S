'use client';

import React, { useState } from 'react';
import { ShieldCheck, BatteryCharging, Smartphone, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BatteryOptimizationGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');

  return (
    <>
      {/* Subtle trigger button in operator dashboard */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 hover:bg-amber-500/20 transition-all active:scale-[0.98] shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <BatteryCharging size={18} />
          </div>
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-tight text-amber-300">Optimización de Batería y GPS</p>
            <p className="text-[10px] text-amber-400/80 font-medium">Asegurá que el reloj de turno no se detenga al apagar la pantalla</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-amber-400/60 shrink-0" />
      </button>

      {/* Full Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl relative my-auto space-y-5"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">Configuración del Teléfono</h3>
                  <p className="text-xs text-zinc-400 font-medium">Evitá cortes de GPS en segundo plano</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'android' ? 'bg-amber-500 text-black shadow font-black' : 'text-zinc-400'
                  }`}
                >
                  Android (Xiaomi / Samsung)
                </button>
                <button
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'ios' ? 'bg-amber-500 text-black shadow font-black' : 'text-zinc-400'
                  }`}
                >
                  iPhone (iOS)
                </button>
              </div>

              {/* Android Instructions */}
              {activeTab === 'android' && (
                <div className="space-y-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">1</span>
                    <p className="text-zinc-300">Entrá a <b>Ajustes del Celular</b> &gt; <b>Aplicaciones</b> &gt; <b>SIGPAD</b>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">2</span>
                    <p className="text-zinc-300">En <b>Permisos de Ubicación</b>, elegí <b>"Permitir siempre"</b> o <b>"Permitir solo con la app en uso"</b>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">3</span>
                    <p className="text-zinc-300">En <b>Batería / Ahorro de Energía</b>, seleccioná <b>"Sin restricciones"</b>.</p>
                  </div>
                </div>
              )}

              {/* iOS Instructions */}
              {activeTab === 'ios' && (
                <div className="space-y-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">1</span>
                    <p className="text-zinc-300">Abrí <b>Configuración</b> en tu iPhone y buscá la sección <b>Privacidad y Seguridad</b> &gt; <b>Localización</b>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black flex items-center justify-center shrink-0 text-[10px] mt-0.5">2</span>
                    <p className="text-zinc-300">Buscá <b>Safari / SIGPAD</b> y elegí <b>"Al usarse la app"</b> activando <b>"Ubicación exacta"</b>.</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3 bg-amber-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle2 size={16} /> Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
