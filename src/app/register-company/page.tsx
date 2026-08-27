'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Mail, Key, User, Phone, FileText,
  Globe, ChevronRight, ArrowLeft, CheckCircle2,
  Shield, Zap, Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ──────────────── Plan Cards ────────────────────────────────
const PLANS = [
  {
    id: 'full',
    name: 'Plan Único Full',
    price: '$400.000 ARS',
    period: '/mes',
    description: 'Acceso total a todas las herramientas de SIGPAD',
    operators: 'Hasta 50 guardias',
    objectives: 'Hasta 20 objetivos',
    icon: Star,
    color: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500/40',
    featured: true,
  },
];

type Step = 'plan' | 'company' | 'admin' | 'success';

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('plan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('ar');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptGPS, setAcceptGPS] = useState(false);

  const [createdUser, setCreatedUser] = useState<any>(null);

  const handleSubmit = async () => {
    setError(null);
    if (adminPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!acceptTerms || !acceptGPS) {
      setError('Debés aceptar los Términos de Servicio y el consentimiento de GPS.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/tenants/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          adminEmail: adminEmail.toLowerCase().trim(),
          adminPassword,
          adminFullName,
          countryCode,
          taxId,
          phone,
          planTier: selectedPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar la empresa.');
      if (data.user) setCreatedUser(data.user);
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/login" className="flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-semibold transition-colors">
            <ArrowLeft size={14} />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-1.5">
            {(['plan', 'company', 'admin'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                  step === s || (step === 'success')
                    ? 'bg-violet-500 text-white'
                    : ['company', 'admin'].indexOf(step) > ['plan', 'company', 'admin'].indexOf(s)
                    ? 'bg-violet-900 text-violet-300'
                    : 'bg-zinc-800 text-zinc-500'
                )}>
                  {i + 1}
                </div>
                {i < 2 && <div className="w-8 h-px bg-zinc-800" />}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: Plan Selection ── */}
          {step === 'plan' && (
            <motion.div key="plan" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Elegí tu plan</h1>
                <p className="text-zinc-500 text-sm">14 días de prueba gratuita en todos los planes</p>
              </div>
              <div className="grid grid-cols-1 gap-4 mb-8">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      'relative w-full rounded-2xl border p-5 text-left transition-all duration-200',
                      'bg-gradient-to-br',
                      plan.color,
                      selectedPlan === plan.id
                        ? `${plan.border} shadow-lg shadow-violet-500/10`
                        : 'border-zinc-800/60 hover:border-zinc-700'
                    )}
                  >
                    {plan.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                        Más popular
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-xl bg-zinc-900/80')}>
                          <plan.icon size={18} className="text-violet-400" />
                        </div>
                        <div>
                          <div className="text-white font-bold text-base">{plan.name}</div>
                          <div className="text-zinc-500 text-xs">{plan.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-black text-xl">{plan.price}<span className="text-zinc-500 text-xs font-normal">{plan.period}</span></div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-4">
                      <div className="text-xs text-zinc-400">👮 {plan.operators}</div>
                      <div className="text-xs text-zinc-400">📍 {plan.objectives}</div>
                    </div>
                    {selectedPlan === plan.id && (
                      <div className="absolute top-4 right-4">
                        <CheckCircle2 size={18} className="text-violet-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep('company')}
                className="w-full h-14 bg-white hover:bg-zinc-100 text-zinc-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                Continuar <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: Company Info ── */}
          {step === 'company' && (
            <motion.div key="company" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Datos de tu empresa</h1>
                <p className="text-zinc-500 text-sm">Esta información aparecerá en los reportes y contratos</p>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4 mb-6">
                <Field icon={Building2} label="Nombre de la empresa de seguridad" placeholder="Ej: Seguridad Norte S.A." value={companyName} onChange={setCompanyName} required />
                <Field icon={FileText} label="CUIT / Número fiscal (opcional)" placeholder="30-12345678-9" value={taxId} onChange={setTaxId} />
                <Field icon={Phone} label="Teléfono de contacto" placeholder="+54 341 555-0000" value={phone} onChange={setPhone} />
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">País</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white text-sm px-4 focus:border-zinc-600 focus:outline-none"
                  >
                    <option value="ar">🇦🇷 Argentina</option>
                    <option value="mx">🇲🇽 México</option>
                    <option value="cl">🇨🇱 Chile</option>
                    <option value="co">🇨🇴 Colombia</option>
                    <option value="uy">🇺🇾 Uruguay</option>
                    <option value="br">🇧🇷 Brasil</option>
                    <option value="pe">🇵🇪 Perú</option>
                    <option value="us">🇺🇸 Estados Unidos</option>
                    <option value="es">🇪🇸 España</option>
                    <option value="other">🌐 Otro</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('plan')} className="h-14 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all">
                  <ArrowLeft size={18} />
                </button>
                <button
                  onClick={() => { if (!companyName) { setError('El nombre de la empresa es requerido.'); return; } setError(null); setStep('admin'); }}
                  className="flex-1 h-14 bg-white hover:bg-zinc-100 text-zinc-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  Continuar <ChevronRight size={18} />
                </button>
              </div>
              {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
            </motion.div>
          )}

          {/* ── STEP 3: Admin Account ── */}
          {step === 'admin' && (
            <motion.div key="admin" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Cuenta de administrador</h1>
                <p className="text-zinc-500 text-sm">Acceso total a la consola de gerencia de {companyName}</p>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4 mb-6">
                <Field icon={User} label="Nombre completo del administrador" placeholder="Juan Pérez" value={adminFullName} onChange={setAdminFullName} required />
                <Field icon={Mail} label="Correo electrónico" placeholder="juan@empresa.com" value={adminEmail} onChange={setAdminEmail} type="email" required />
                <Field icon={Key} label="Contraseña (mínimo 8 caracteres)" placeholder="••••••••" value={adminPassword} onChange={setAdminPassword} type="password" required />
                <Field icon={Key} label="Confirmar contraseña" placeholder="••••••••" value={confirmPassword} onChange={setConfirmPassword} type="password" required />

                {/* Legal consents */}
                <div className="pt-2 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-violet-500 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-400 leading-relaxed">
                      Acepto los{' '}
                      <a href="/legal/terminos" target="_blank" className="text-violet-400 underline hover:text-violet-300">Términos de Servicio</a>
                      {' '}y la{' '}
                      <a href="/legal/privacidad" target="_blank" className="text-violet-400 underline hover:text-violet-300">Política de Privacidad</a>
                      . Comprendo que actúo como Responsable del Tratamiento de los datos de mis empleados (Ley 25.326 / GDPR).
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptGPS}
                      onChange={(e) => setAcceptGPS(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-violet-500 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-400 leading-relaxed">
                      Confirmo que obtendré el consentimiento escrito de cada empleado antes de activar el rastreo GPS en segundo plano, en cumplimiento de la normativa laboral aplicable en mi país.
                    </span>
                  </label>
                </div>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('company')} className="h-14 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all">
                  <ArrowLeft size={18} />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 h-14 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creando cuenta...
                    </span>
                  ) : (
                    <>🚀 Activar SIGPAD para {companyName.split(' ')[0]}</>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-violet-500/30"
              >
                <CheckCircle2 size={48} className="text-violet-400" />
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-3">¡Empresa registrada!</h1>
              <p className="text-zinc-400 text-sm mb-2">
                <strong className="text-white">{companyName}</strong> ya está activa en SIGPAD.
              </p>
              <p className="text-zinc-500 text-xs mb-8">
                Tu período de prueba de 14 días comenzó. Podés iniciar sesión ahora con{' '}
                <span className="text-violet-400">{adminEmail}</span>
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (createdUser) {
                      localStorage.setItem('SIGPAD_user', JSON.stringify(createdUser));
                      document.cookie = `SIGPAD_user=${encodeURIComponent(JSON.stringify(createdUser))}; path=/; max-age=2592000`;
                      document.cookie = "SIGPAD_bypass_active=true; path=/; max-age=2592000";
                    }
                    router.push('/gerente');
                  }}
                  className="w-full h-14 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
                >
                  ⚡ Ingresar a {companyName} Ahora →
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-2xl transition-all text-xs"
                >
                  Ir al inicio de sesión tradicional
                </button>
                <p className="text-zinc-600 text-xs">
                  ¿Preguntas? Contactanos a{' '}
                  <a href="mailto:soporte@sigpad.com.ar" className="text-zinc-400 underline">soporte@sigpad.com.ar</a>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Reutilizable Field component ──────────────────────────────
function Field({
  icon: Icon, label, placeholder, value, onChange, type = 'text', required = false
}: {
  icon: any; label: string; placeholder: string;
  value: string; onChange: (v: string) => void;
  type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-zinc-400">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white text-sm pl-10 pr-4 focus:border-zinc-600 focus:outline-none placeholder:text-zinc-600 transition-colors"
        />
      </div>
    </div>
  );
}
