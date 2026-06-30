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
        <Link href="/login" className="self-start mb-6 text-primary flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-all">
          <ArrowLeft size={14} /> Volver al inicio de sesión
        </Link>
        <div className="w-14 h-14 bg-white border border-primary/20 flex items-center justify-center rounded-2xl mb-4 p-2 shadow-md">
          <SigesIcon className="w-full h-full text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Crear cuenta</h1>
        <p className="text-gray-400 text-xs font-normal mt-0.5">Gestión de seguridad privada</p>
      </div>

      <Card className="border-primary/20 bg-secondary/80 backdrop-blur-xl">
        <CardContent className="pt-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-xs font-bold">
              {error}
            </div>
          )}
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-primary">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  className="pl-10"
                  placeholder="JUAN PEREZ"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-primary">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  className="pl-10"
                  type="email"
                  placeholder="juan@siges-security.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-primary">Contraseña</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  className="pl-10"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-primary">Rol de usuario</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('operador')}
                  className={cn(
                    "h-11 rounded-xl border text-xs font-medium transition-all",
                    role === 'operador' 
                      ? "border-primary bg-primary text-black shadow-sm" 
                      : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                  )}
                >
                  Operador
                </button>
                <button
                  type="button"
                  onClick={() => setRole('gerente')}
                  className={cn(
                    "h-11 rounded-xl border text-xs font-medium transition-all",
                    role === 'gerente' 
                      ? "border-primary bg-primary text-black shadow-sm" 
                      : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                  )}
                >
                  Gerente
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-xs font-medium group mt-6"
              disabled={loading}
            >
              {loading ? "Procesando..." : (
                <>
                  Crear cuenta <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* MODO PRUEBA / SETUP RÁPIDO */}
          <div className="pt-6 border-t border-primary/10 mt-6">
            <p className="text-[8px] text-center text-gray-500 font-black uppercase tracking-[0.3em] mb-4">
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
                    body: JSON.stringify({ email, name: fullName || 'GERENTE SIGES' })
                  });
                  const data = await res.json();
                  if (data.error) throw new Error(data.error);
                  
                  setRole('gerente');
                  setPassword('gerente123'); // Sugerir una pass inicial, pero pueden cambiarla
                  alert(`¡${email} habilitado como Gerente! Ahora podés hacer clic en 'CREAR CUENTA'.\n\nIMPORTANTE: Si te pide confirmar el mail, recordá CONFIRMARLO o desactivar la confirmación en Supabase.`);
                } catch (err: any) {
                  alert("Error: " + err.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/20 transition-all group flex flex-col items-center justify-center gap-1"
            >
              <span className="text-[10px] font-black text-primary uppercase tracking-tighter">HABILITAR MI EMAIL COMO GERENTE</span>
              <span className="text-[8px] text-gray-500 font-medium">Usa el mail escrito arriba para darte de alta</span>
            </button>
            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <p className="text-[8px] text-amber-500 font-bold uppercase leading-relaxed text-center">
                ⚠️ SOLUCIÓN PARA LOGUEO: Si el sistema te pide confirmar email, recordá ir a Supabase {">"} Authentication {">"} Providers {">"} Email y desactivar "Confirm email" para habilitar el ingreso instantáneo.
              </p>
            </div>
          </div>


        </CardContent>
      </Card>
    </motion.div>
  );
}
