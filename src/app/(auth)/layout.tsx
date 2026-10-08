import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#05070c] relative overflow-hidden text-zinc-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 blur-[220px] rounded-full pointer-events-none" />
      
      {/* Subtle background radial sheen */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(255,255,255,0))] pointer-events-none" />
      
      <main className="relative z-10 w-full flex items-center justify-center p-4 py-8 lg:py-12">
        {children}
      </main>
      
      {/* Footer Branding */}
      <div className="absolute bottom-4 left-0 w-full flex justify-center items-center gap-6 text-[11px] text-zinc-400 font-medium pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400 animate-pulse rounded-full shadow-[0_0_8px_#34d399]" />
          <span className="text-zinc-300">Servidor en línea</span>
        </div>
        <span className="text-zinc-700">•</span>
        <div>Cifrado Militar AES-256</div>
        <span className="text-zinc-700">•</span>
        <div>SIGPAD Cloud Enterprise</div>
      </div>
    </div>
  );
}
