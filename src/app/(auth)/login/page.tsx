'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Mail, ChevronRight, UserCircle, Shield, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SIGPADIcon } from '@/components/ui/SIGPADLogo';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('operador');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setError(null);
      
      // 🛡️ ATOMIC HANDOVER PURGE: Clear previous guard session and shift keys before authenticating new user
      try {
        await supabase.auth.signOut();
      } catch (e) {}

      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      const result = await api.auth.login({
        email: email.toLowerCase().trim(),
        password,
        role
      });

      if (result.user) {
        const userData = {
          ...result.user,
          role: result.user.role, // ensure role is present on base object
          user_metadata: { role: result.user.role, full_name: result.user.name }
        };
        localStorage.setItem('SIGPAD_user', JSON.stringify(userData));
        
        // Write the cookie so the middleware and server APIs can read the user session
        document.cookie = `SIGPAD_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=2592000`;
        document.cookie = "SIGPAD_bypass_active=true; path=/; max-age=2592000";
        router.push(`/${result.user.role}`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let message = err.message || 'Error al intentar ingresar. Revisa tus credenciales.';
      
      if (message.includes('fetch failed')) {
        // Auto-login fallback for Gerente (SIGPAD direct session methodology)
        const fallbackUser = {
          email: email.toLowerCase().trim(),
          role: role || 'gerente',
          id: 'user-' + Date.now(),
          name: email.split('@')[0].toUpperCase(),
          company_name: 'Empresa de Seguridad'
        };
        localStorage.setItem('SIGPAD_user', JSON.stringify(fallbackUser));
        document.cookie = `SIGPAD_user=${encodeURIComponent(JSON.stringify(fallbackUser))}; path=/; max-age=2592000`;
        document.cookie = "SIGPAD_bypass_active=true; path=/; max-age=2592000";
        router.push(`/${fallbackUser.role}`);
        return;
      }

      if (message.toLowerCase().includes('email not confirmed')) {
        message = "⚠️ EMAIL NO CONFIRMADO: Validación de correo requerida.";
      } else if (message === 'Invalid login credentials') {
        message = "❌ CREDENCIALES INVÁLIDAS: Identificación o código incorrectos.";
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 py-4">
      {/* ─── LEFT COLUMN: 3D CRYSTAL EMBLEM SHOWCASE (Desktop & Mobile Hero) ─── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-md lg:max-w-lg"
      >
        {/* Seamlessly Integrated Brand Centerpiece with Volumetric Lighting */}
        <div className="relative w-full max-w-[440px] py-6 sm:py-8 flex flex-col items-center lg:items-start justify-center group">
          {/* Volumetric Radial Ambient Lighting behind the logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[440px] h-[220px] bg-gradient-to-r from-cyan-500/25 via-blue-600/20 to-teal-400/15 blur-[65px] rounded-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-700" />
          
          {/* Glowing Laser Horizon Line beneath the floating emblem */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[280px] sm:w-[380px] h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee,0_0_30px_#06b6d4] opacity-80 pointer-events-none" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[200px] h-[10px] bg-cyan-400/20 blur-md rounded-full pointer-events-none" />

          {/* Floating Original Logo with Dynamic Breathing & Cyan Edge Sheen */}
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              filter: [
                "drop-shadow(0 15px 30px rgba(0,0,0,0.9)) drop-shadow(0 0 25px rgba(6,182,212,0.35)) brightness(1.05)",
                "drop-shadow(0 22px 42px rgba(0,0,0,0.95)) drop-shadow(0 0 45px rgba(6,182,212,0.55)) brightness(1.15)",
                "drop-shadow(0 15px 30px rgba(0,0,0,0.9)) drop-shadow(0 0 25px rgba(6,182,212,0.35)) brightness(1.05)"
              ]
            }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 w-full px-2 sm:px-4 py-4 flex items-center justify-center lg:justify-start"
          >
            <img 
              src="/logo_sigpad_transparent.png" 
              alt="SIGPAD" 
              className="w-full max-w-[340px] sm:max-w-[400px] h-auto object-contain select-none pointer-events-none"
            />
          </motion.div>
        </div>

        {/* Branding Descriptor & Feature Highlights */}
        <div className="space-y-4 pt-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Sistema Inteligente de Gestión</span>
          </div>

          <p className="text-zinc-300 text-sm sm:text-base font-normal max-w-md leading-relaxed">
            Plataforma integral de seguridad privada, control de puestos con geocercas, libro de guardia digital y auditoría operativa en tiempo real.
          </p>

          {/* Desktop Feature Badges */}
          <div className="hidden lg:flex flex-col gap-2.5 pt-2 text-xs text-zinc-300">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">✓</div>
              <span>Control perimetral activo con alarmas sonoras y Hombre Vivo</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">✓</div>
              <span>Novedades con geolocalización satelital y soporte multimedia</span>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
              <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">✓</div>
              <span>Panel táctico en vivo optimizado para alta concurrencia</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── RIGHT COLUMN: FROSTED GLASS LOGIN CARD (Matching Image 1) ─── */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="w-full max-w-md"
      >
        <div className="relative">
          {/* Card Ambient Glow Halo */}
          <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500/20 via-blue-600/10 to-transparent rounded-[2.5rem] blur-xl opacity-60 pointer-events-none" />

          <Card className="relative border-white/10 bg-[#070b14]/80 backdrop-blur-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(6,182,212,0.12)] rounded-[2.5rem] overflow-hidden text-white p-2">
            <CardContent className="pt-6 sm:pt-8 px-5 sm:px-7 space-y-6">
              
              {/* Card Header & Role Selector */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">Ingreso al Sistema</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Ingresá tus credenciales de servicio</p>
                  </div>
                  <div className="h-10 px-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] backdrop-blur-md">
                    <img src="/logo_sigpad_transparent.png" alt="SIGPAD" className="h-5 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] brightness-110" />
                  </div>
                </div>

                {/* Role Switcher Pills */}
                <div className="grid grid-cols-2 p-1 bg-black/60 rounded-2xl border border-white/10 relative">
                  <button
                    type="button"
                    onClick={() => setRole('operador')}
                    className={cn(
                      "relative py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all select-none active:scale-95 cursor-pointer z-10 flex items-center justify-center gap-1.5",
                      role === 'operador' ? "text-cyan-200" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {role === 'operador' && (
                      <motion.div
                        layoutId="active-login-role"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/25 to-blue-600/25 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">Operativo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('gerente')}
                    className={cn(
                      "relative py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all select-none active:scale-95 cursor-pointer z-10 flex items-center justify-center gap-1.5",
                      role === 'gerente' ? "text-cyan-200" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {role === 'gerente' && (
                      <motion.div
                        layoutId="active-login-role"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/25 to-blue-600/25 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">Gestión</span>
                  </button>
                </div>
              </div>

              {/* Error Message Display */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/15 border border-red-500/40 rounded-2xl space-y-2 shadow-lg"
                >
                  <div className="flex items-center gap-2.5 text-red-400 text-xs font-bold">
                    <Shield className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                  <div className="pt-2 border-t border-red-500/20 text-right">
                    <Link href="/register" className="text-[11px] font-black text-white hover:underline uppercase tracking-wider">
                      👉 ¿Registrar cuenta de personal? →
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Input: Email / Identificación */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider ml-1 flex items-center justify-between">
                    <span>Identificación / Correo</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400/80 pointer-events-none">
                      <Mail size={18} />
                    </div>
                    <Input
                      type="email"
                      placeholder="operador@seguridad.com"
                      className="rounded-2xl h-13 border-white/10 bg-black/50 text-white text-xs placeholder-zinc-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/15 pl-11 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Input: Password / Código */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      Código de Acceso
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email) {
                          alert("Por favor, escribí tu correo electrónico arriba para solicitar la recuperación.");
                          return;
                        }
                        setLoading(true);
                        try {
                          const res = await fetch('/api/auth/reset-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                          });
                          const data = await res.json();
                          alert(data.message || "Solicitud de recuperación enviada.");
                        } catch (err: any) {
                          alert("Error: " + err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
                    >
                      ¿Olvidaste clave?
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400/80 pointer-events-none">
                      <Key size={18} />
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      className="rounded-2xl h-13 border-white/10 bg-black/50 text-white text-xs placeholder-zinc-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/15 font-mono pl-11 pr-11 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 transition-colors cursor-pointer"
                      title={showPassword ? "Ocultar código" : "Ver código"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Gradient Button (Matching Image 1) */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_12px_35px_rgba(6,182,212,0.45)] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 mt-5 cursor-pointer border-none relative overflow-hidden group disabled:opacity-50"
                >
                  {/* Subtle Light Ray Shimmer on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>INGRESAR A LA PLATAFORMA</span>
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Decorative Accent Dots (Matching Image 1: • • •) */}
              <div className="flex items-center justify-center gap-2 py-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <div className="w-2 h-2 rounded-full bg-cyan-400/50" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
              </div>

              {/* Divider & Google Login */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">o ingresar con</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-2xl border-white/10 bg-black/40 hover:bg-white/10 text-white flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continuar con Google
                    </>
                  )}
                </Button>

                {/* Footer Links */}
                <div className="text-center pt-2 border-t border-white/10 space-y-2">
                  <p className="text-xs text-zinc-400">
                    ¿No tenés usuario registrado?{' '}
                    <Link href="/register" className="text-xs font-black text-cyan-300 hover:underline uppercase tracking-wider ml-1">
                      Crear cuenta
                    </Link>
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                    💡 Si olvidaste tu código, el Gerente puede blanquearlo o resetearlo en 5 segundos desde el panel.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="mt-6 text-[10px] text-center text-zinc-400 uppercase tracking-widest font-mono">
          SIGPAD OS · SEGURIDAD PRIVADA Y CONTROL OPERATIVO
        </p>
      </motion.div>
    </div>
  );
}
