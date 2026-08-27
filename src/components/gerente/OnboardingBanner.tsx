'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Plus, Users, MapPin, CheckCircle2, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';

interface OnboardingBannerProps {
  companyName: string;
  tenantId: string;
  onSeedSuccess?: () => void;
}

export function OnboardingBanner({ companyName, tenantId, onSeedSuccess }: OnboardingBannerProps) {
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleLoadSeed = async () => {
    setLoadingSeed(true);
    try {
      const res = await fetch('/api/tenants/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar plantilla');

      setSeeded(true);
      if (onSeedSuccess) onSeedSuccess();
    } catch (e: any) {
      alert(`Error al cargar plantilla: ${e.message}`);
    } finally {
      setLoadingSeed(false);
    }
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-amber-500/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden"
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Shield size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  Puesta en Marcha Operativa
                </span>
                <span className="text-xs text-zinc-400 font-semibold">• {companyName}</span>
              </div>
              <h3 className="text-base font-black text-white mt-1">
                ¡Bienvenido a la consola táctica de SIGPAD!
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed max-w-xl">
                Esta empresa está lista para operar. Podés cargar inmediatamente tu primer puesto de guardia y personal, o presionar <strong className="text-amber-300">Cargar Datos de Prueba</strong> para probar el sistema en 1 segundo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {seeded ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 text-xs font-bold">
                <CheckCircle2 size={16} />
                ¡Datos de prueba cargados!
              </div>
            ) : (
              <button
                onClick={handleLoadSeed}
                disabled={loadingSeed}
                className="flex-1 md:flex-none h-11 px-4 bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Sparkles size={15} />
                {loadingSeed ? 'Cargando...' : 'Cargar Datos de Prueba (1 Clic)'}
              </button>
            )}

            <Link
              href="/gerente/objetivos"
              className="h-11 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-2xl transition-all border border-zinc-700 flex items-center justify-center gap-1.5"
            >
              <MapPin size={14} className="text-amber-400" />
              Nuevo Puesto
            </Link>

            <Link
              href="/gerente/personal"
              className="h-11 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-2xl transition-all border border-zinc-700 flex items-center justify-center gap-1.5"
            >
              <Users size={14} className="text-amber-400" />
              Nuevo Vigilador
            </Link>

            <button
              onClick={() => setDismissed(true)}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-colors"
              title="Ocultar asistente"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
