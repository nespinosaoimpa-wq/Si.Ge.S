'use client';

import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Gerente Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
        Error en el Módulo
      </h2>
      <p className="text-gray-500 text-sm max-w-md mb-2">
        Hubo un problema al cargar esta sección. No te preocupes, tus datos están seguros.
      </p>
      {error?.message && (
        <div className="mb-8 p-3 bg-red-50/50 rounded-lg border border-red-100/50 max-w-md overflow-hidden">
          <p className="text-[10px] font-mono text-red-500 break-all leading-tight">
            DEBUG_INFO: {error.message}
          </p>
        </div>
      )}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.localStorage.clear();
              window.location.href = '/gerente';
            }
          }}
          className="rounded-xl text-[10px] font-black uppercase tracking-widest"
        >
          Limpiar y Volver
        </Button>
        <Button 
          onClick={() => reset()}
          className="rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <RefreshCcw size={14} />
          Reintentar
        </Button>
      </div>
    </div>
  );
}
