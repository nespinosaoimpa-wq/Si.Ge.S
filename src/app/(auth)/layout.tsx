import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/20" />
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <main className="relative z-10 w-full flex items-center justify-center p-4">
        {children}
      </main>
      
      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center items-center gap-8 text-[11px] uppercase tracking-[0.2em] text-gray-400 font-bold pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 animate-pulse rounded-full" />
          <span>Servidor: En Línea</span>
        </div>
        <div>Encriptación: AES-256</div>
        <div>ID: ASF-PROT-2026</div>
      </div>
    </div>
  );
}
