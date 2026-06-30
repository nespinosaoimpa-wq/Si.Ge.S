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
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="relative mb-4">
          <motion.div
            animate={{ 
              boxShadow: ["0 0 10px rgba(15,76,92,0.1)", "0 0 20px rgba(15,76,92,0.2)", "0 0 10px rgba(15,76,92,0.1)"]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 bg-white border border-primary/20 flex items-center justify-center relative overflow-hidden rounded-3xl p-3.5 shadow-md"
          >
            <SigesIcon className="w-full h-full text-primary" />
          </motion.div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1.5 font-display leading-none">Si.Ge.S</h1>
        <p className="text-gray-500 text-xs font-normal max-w-[280px] leading-relaxed">
          Sistema integral de gestión para seguridad privada
        </p>
      </div>

      <Card className="border-gray-200 bg-white shadow-xl rounded-[2rem] overflow-hidden">
        <CardContent className="pt-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
              <Shield className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-3 font-bold transition-all active:scale-95"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
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
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-medium text-gray-400">o mediante correo</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-medium ml-1">
                  Identificación
                </label>
                <Input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="rounded-2xl h-14"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-medium ml-1">
                  Código de Acceso
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  className="rounded-2xl h-14"
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
                    "h-12 rounded-xl text-xs font-medium border transition-all",
                    role === 'operador' 
                      ? "bg-primary border-primary text-black shadow-lg shadow-primary/20" 
                      : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  Operativo
                </button>
                 <button
                  type="button"
                  onClick={() => setRole('gerente')}
                  className={cn(
                    "h-12 rounded-xl text-xs font-medium border transition-all",
                    role === 'gerente' 
                      ? "bg-primary border-primary text-black shadow-lg shadow-primary/20" 
                      : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  Gestión
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 rounded-2xl text-base font-bold mt-4 shadow-xl shadow-primary/10 group"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    INGRESAR <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t border-gray-100 mt-6">
              <span className="text-xs text-gray-400 font-normal">
                ¿Es tu primera vez aquí?{' '}
              </span>
              <Link href="/register" className="text-xs font-bold text-[#0F4C5C] hover:underline">
                Crear cuenta de personal
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-center text-gray-400 font-normal">
        Si.Ge.S · Gestión de Seguridad
      </p>
    </motion.div>
  );
}
