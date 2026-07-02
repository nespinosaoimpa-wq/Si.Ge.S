'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Mail, ChevronRight, UserCircle, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SigesIcon } from '@/components/ui/SigesLogo';
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
      
      const result = await api.auth.login({
        email: email.toLowerCase().trim(),
        password,
        role
      });

      if (result.user) {
        localStorage.setItem('siges_user', JSON.stringify({
          ...result.user,
          user_metadata: { role: result.user.role, full_name: result.user.name }
        }));
        
        document.cookie = "siges_bypass_active=true; path=/; max-age=3600";
        router.push(`/${result.user.role}`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let message = err.message || 'Error al intentar ingresar. Revisa tus credenciales.';
      
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="relative mb-6">
          <motion.div
            animate={{ 
              boxShadow: ["0 0 15px rgba(255,255,255,0.05)", "0 0 30px rgba(255,255,255,0.15)", "0 0 15px rgba(255,255,255,0.05)"]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-60 h-20 bg-[#09090b]/95 border border-zinc-800 flex items-center justify-center relative overflow-hidden rounded-2xl p-1 shadow-xl"
          >
            <SigesIcon className="w-full h-full object-contain" />
          </motion.div>
        </div>
        
        <p className="text-zinc-400 text-xs font-normal max-w-[280px] leading-relaxed">
          Sistema Inteligente de Gestión y Plataforma Avanzada de Seguridad Dinámica
        </p>
      </div>

      <Card className="border-zinc-850 bg-zinc-900/40 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden text-white">
        <CardContent className="pt-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold">
              <Shield className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900 text-white flex items-center justify-center gap-3 font-bold transition-all active:scale-95"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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

            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-xs font-medium text-zinc-500">o mediante correo</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1">
                  Identificación
                </label>
                <Input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="rounded-2xl h-14 border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus:border-zinc-700"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1">
                  Código de Acceso
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  className="rounded-2xl h-14 border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus:border-zinc-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                 <button
                  type="button"
                  onClick={() => setRole('operador')}
                  className={cn(
                    "h-12 rounded-xl text-xs font-semibold border transition-all",
                    role === 'operador' 
                      ? "bg-white border-white text-zinc-950 shadow-lg shadow-white/5" 
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                  )}
                >
                  Operativo
                </button>
                 <button
                  type="button"
                  onClick={() => setRole('gerente')}
                  className={cn(
                    "h-12 rounded-xl text-xs font-semibold border transition-all",
                    role === 'gerente' 
                      ? "bg-white border-white text-zinc-950 shadow-lg shadow-white/5" 
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                  )}
                >
                  Gestión
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 rounded-2xl text-base font-bold mt-4 shadow-xl bg-white hover:bg-zinc-200 text-zinc-950 border-none group"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-zinc-900/20 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <>
                    INGRESAR <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-zinc-800 mt-6">
              <span className="text-xs text-zinc-500 font-normal">
                ¿Es tu primera vez aquí?{' '}
              </span>
              <Link href="/register" className="text-xs font-bold text-white hover:underline">
                Crear cuenta de personal
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-center text-zinc-600 font-normal uppercase tracking-wider font-mono">
        SIGPAD OS · Sistema Inteligente de Gestión
      </p>
    </motion.div>
  );
}
