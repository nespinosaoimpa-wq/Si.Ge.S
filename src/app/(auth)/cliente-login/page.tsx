'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Mail, ChevronRight, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SIGPADIcon } from '@/components/ui/SIGPADLogo';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export default function ClienteLoginPage() {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/client-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          accessCode: accessCode.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error de ingreso');
      }

      if (result.success) {
        localStorage.setItem('SIGPAD_client', JSON.stringify(result.client));
        // Force cookie for middleware and routing
        document.cookie = `SIGPAD_client_session=${encodeURIComponent(JSON.stringify(result.client))}; path=/; max-age=86400`;
        router.push('/cliente');
      }
    } catch (err: any) {
      console.error('Client login error:', err);
      setError(err.message || 'Código de acceso incorrecto o correo inválido.');
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
            <SIGPADIcon className="w-full h-full text-primary" />
          </motion.div>
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-1.5 uppercase font-display leading-none">SIGPAD</h1>
        <p className="text-gray-400 text-[9px] tracking-[0.2em] font-bold uppercase max-w-[280px] leading-tight">
          Portal de Clientes VIP
        </p>
      </div>

      <Card className="border-gray-200 bg-white shadow-xl rounded-[2rem] overflow-hidden">
        <CardContent className="pt-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-center pb-2">
              <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest">Ingrese Credenciales de Monitoreo</h2>
              <p className="text-[10px] text-gray-400 mt-1">Acceso transparente y control en tiempo real</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-gray-400 font-bold ml-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    className="rounded-2xl h-14 pl-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-gray-400 font-bold ml-1">
                  Código de Objetivo / Acceso
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                  <Input
                    type="password"
                    placeholder="Ingrese su código provisto"
                    className="rounded-2xl h-14 pl-12"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 rounded-2xl text-base font-bold mt-6 shadow-xl shadow-primary/10 group bg-[#0F4C5C] hover:bg-[#0c3e4b]"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    ACCEDER AL PORTAL <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-[10px] text-center text-gray-400 font-bold uppercase tracking-[0.2em]">
        SIGPAD • Portal de Transparencia Operativa
      </p>
    </motion.div>
  );
}
