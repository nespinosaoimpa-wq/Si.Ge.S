'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Mail, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SigesIcon } from '@/components/ui/SigesLogo';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'gerente' | 'operador'>('operador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Server-side registration via Admin API — no confirmation email, no rate limits
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          fullName,
          role
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al registrar la cuenta.');
      }

      alert("¡Registro exitoso! Tu cuenta ha sido creada y vinculada a tu legajo táctico. Ya podés iniciar sesión.");
      router.push('/login');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al intentar registrarse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md"
    >
      <div className="flex flex-col items-center mb-6 text-center">
        <Link href="/login" className="self-start mb-6 text-zinc-450 flex items-center gap-1.5 text-xs font-semibold hover:text-white transition-all">
          <ArrowLeft size={14} /> Volver al inicio de sesión
        </Link>
        <div className="w-60 h-20 bg-[#09090b]/95 border border-zinc-800 flex items-center justify-center rounded-2xl mb-4 p-1 shadow-xl">
          <SigesIcon className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-display">Crear cuenta</h1>
        <p className="text-zinc-500 text-xs font-normal mt-0.5">Gestión de seguridad privada</p>
      </div>

      <Card className="border-zinc-850 bg-zinc-900/40 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden text-white">
        <CardContent className="pt-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold">
              {error}
            </div>
          )}
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  className="pl-10 h-12 border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus:border-zinc-700"
                  placeholder="JUAN PEREZ"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  className="pl-10 h-12 border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus:border-zinc-700"
                  type="email"
                  placeholder="juan@sigpad-security.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Contraseña</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  className="pl-10 h-12 border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus:border-zinc-700"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Rol de usuario</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('operador')}
                  className={cn(
                    "h-11 rounded-xl border text-xs font-semibold transition-all",
                    role === 'operador' 
                      ? "border-white bg-white text-zinc-950 shadow-md" 
                      : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:bg-zinc-900"
                  )}
                >
                  Operador
                </button>
                <button
                  type="button"
                  onClick={() => setRole('gerente')}
                  className={cn(
                    "h-11 rounded-xl border text-xs font-semibold transition-all",
                    role === 'gerente' 
                      ? "border-white bg-white text-zinc-950 shadow-md" 
                      : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:bg-zinc-900"
                  )}
                >
                  Gerente
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-sm font-bold bg-white hover:bg-zinc-200 text-zinc-950 border-none group mt-6"
              disabled={loading}
            >
              {loading ? "Procesando..." : (
                <>
                  CREAR CUENTA <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* MODO PRUEBA / SETUP RÁPIDO */}
          <div className="pt-6 border-t border-zinc-850 mt-6">
            <p className="text-[8px] text-center text-zinc-500 font-black uppercase tracking-[0.3em] mb-4">
              — PROTOCOLO DE PRUEBA —
            </p>
            <button
              type="button"
              onClick={async () => {
                if (!email) {
                  alert("Por favor, ingresá primero el correo real que querés usar.");
                  return;
                }
                setLoading(true);
                try {
                  const res = await fetch('/api/auth/setup-manager', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, name: fullName || 'GERENTE SIGPAD' })
                  });
                  const data = await res.json();
                  if (data.error) throw new Error(data.error);
                  
                  setRole('gerente');
                  setPassword('gerente123'); // Sugerir una pass inicial, pero pueden cambiarla
                  alert(`¡${email} habilitado como Gerente! Ya podés hacer clic en 'CREAR CUENTA'.`);
                } catch (err: any) {
                  alert("Error: " + err.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-3 rounded-xl border border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900 transition-all group flex flex-col items-center justify-center gap-1 text-white"
            >
              <span className="text-[10px] font-black uppercase tracking-tighter text-white">HABILITAR MI EMAIL COMO GERENTE</span>
              <span className="text-[8px] text-zinc-500 font-medium">Usa el mail escrito arriba para darte de alta</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
