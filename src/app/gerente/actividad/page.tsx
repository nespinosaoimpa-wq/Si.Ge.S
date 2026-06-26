import React from 'react';
import { supabase } from '@/lib/supabase';
import { RoundCard } from '@/components/gerente/RoundCard';
import { Activity, Clock, ShieldCheck, Search } from 'lucide-react';

export const revalidate = 0;

export default async function ActivityAuditorPage() {
  const { data: rounds } = await supabase
    .from('patrol_rounds')
    .select(`
      *,
      resource:resources(name, avatar_url, role),
      objective:objectives(name),
      traces:patrol_trace(latitude, longitude),
      incidents:guard_book_entries(id, entry_type, content, status, latitude, longitude, created_at)
    `)
    .not('end_at', 'is', null)
    .order('start_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen text-zinc-100 bg-zinc-950 pb-32">
      
      {/* TACTICAL HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-white/10">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-[#0F4C5C]/5 flex items-center justify-center border border-[#0F4C5C]/20 relative group">
            <div className="absolute inset-0 bg-[#0F4C5C]/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
            <Activity size={36} className="text-[#0F4C5C] relative z-10" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">Auditoría de Actividad</h1>
            <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
               <ShieldCheck size={14} className="text-[#0F4C5C]" /> Forensic Intelligence Unit
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#0F4C5C] transition-colors" size={16} />
             <input 
               type="text" 
               placeholder="FILTRAR POR OPERADOR O ID..." 
               className="h-14 pl-12 pr-6 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#0F4C5C]/50 w-full md:w-64 transition-all"
             />
          </div>
          <button className="h-14 px-6 bg-zinc-900 text-zinc-100 hover:bg-black border border-white/5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
            Exportar Logs
          </button>
        </div>
      </div>

      {/* ROUNDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {rounds?.map((round: any) => (
          <RoundCard key={round.id} round={round} />
        ))}
        
        {(!rounds || rounds.length === 0) && (
          <div className="col-span-full py-32 text-center bg-zinc-900/40 rounded-[3rem] border-2 border-dashed border-white/5">
            <Clock size={48} className="text-zinc-800 mx-auto mb-6" />
            <h3 className="text-xl font-black text-zinc-600 uppercase tracking-tighter">Sin actividad registrada</h3>
            <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em] mt-2">Los rondines finalizados aparecerán aquí para auditoría forense</p>
          </div>
        )}
      </div>
    </div>
  );
}
