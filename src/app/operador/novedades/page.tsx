'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  DoorOpen, 
  Lightbulb, 
  UserX, 
  Package, 
  AlertTriangle,
  Camera,
  Mic,
  Send,
  CheckCircle2,
  ArrowLeft,
  X,
  Plus,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { cn } from '@/lib/utils';

const quickButtons = [
  { id: 'vehiculo', icon: Car, label: 'Vehículo Sospechoso', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', urgency: 'alta' },
  { id: 'intruso', icon: UserX, label: 'Persona Sospechosa', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', urgency: 'alta' },
  { id: 'puerta', icon: DoorOpen, label: 'Puerta Abierta', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', urgency: 'media' },
  { id: 'paquete', icon: Package, label: 'Objeto Extraño', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', urgency: 'media' },
  { id: 'falla_equipo', icon: Smartphone, label: 'Falla de Equipo', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', urgency: 'media' },
  { id: 'luces', icon: Lightbulb, label: 'Falla Eléctrica', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', urgency: 'baja' },
  { id: 'puesto', icon: Plus, label: 'Libro de Guardia', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', urgency: 'normal' },
  { id: 'emergencia', icon: AlertTriangle, label: 'Alerta Crítica', color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600/30', urgency: 'critica' },
];

export default function NovedadesPage() {
  const { isShiftActive, shiftData, theme } = useShift();
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<File | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);
  
  const [assignedItems, setAssignedItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const objectiveId = (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;

  React.useEffect(() => {
    if (objectiveId) {
      import('@/lib/supabase').then(({ supabase }) => {
        supabase.from('resource_inventory').select('*').eq('objective_id', objectiveId)
          .then(({ data }) => setAssignedItems(data || []));
      });
    }
  }, [objectiveId]);

  const handleSelect = (id: string) => {
    setSelectedIncident(id);
    setSuccess(false);
    setErrorMsg('');
  };

  const selectedData = quickButtons.find(b => b.id === selectedIncident);

  // Direct Browser-to-Supabase Storage Uploader (0 Vercel Origin Bytes)
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const { uploadMediaDirect } = await import('@/lib/storage-direct');
      const res = await uploadMediaDirect(file);
      return res.url;
    } catch {
      return null;
    }
  };

  const handleSend = async () => {
    if (!selectedData) return;
    setIsSending(true);
    setErrorMsg('');
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const objectiveId = (shiftData as any)?.objective_id || (shiftData as any)?.current_objective_id;
      const resourceId = (shiftData as any)?.operator_id || (shiftData as any)?.resource_id || (shiftData as any)?.id;

      if (!objectiveId && selectedData.id !== 'falla_equipo') {
        setErrorMsg('No se detectó el vínculo con tu legajo. Por favor, cerrá sesión y volvé a entrar o consultá con el gerente.');
        return;
      }

      // 🖼️ Upload multimedia to Supabase Storage directly from browser
      let image_url: string | null = null;
      let audio_url: string | null = null;
      if (attachedImage) image_url = await uploadFile(attachedImage);
      if (attachedAudio) audio_url = await uploadFile(attachedAudio);

      if (selectedData.id === 'falla_equipo' && selectedItemId) {
        // Special case: Inventory Damage
        const { error: damErr } = await supabase.from('incidents').insert({
          objective_id: objectiveId || null,
          operator_id: resourceId,
          entry_type: 'novedad',
          urgency: 'alta',
          content: `📦 FALLA DE EQUIPAMIENTO: ${comment || 'Falla de equipo reportada.'}`,
          status: 'abierto',
          created_at: new Date().toISOString()
        } as any);

        if (damErr) throw damErr;
      } else {
        // Normal case: Guard Book Entry
        const entryType = selectedData.id === 'puesto' ? 'libro_guardia' 
          : selectedData.id === 'emergencia' ? 'emergencia' 
          : 'incidente';

        const { error: gbErr } = await supabase.from('guard_book_entries').insert({
          objective_id: objectiveId,
          resource_id: resourceId,
          operator_id: resourceId,
          entry_type: entryType,
          content: `${selectedData.label.toUpperCase()}: ${comment || 'Sin detalles adicionales'}`,
          latitude: shiftData?.location?.lat || 0,
          longitude: shiftData?.location?.lng || 0,
          urgency: selectedData.urgency,
          image_url,
          audio_url,
          created_at: new Date().toISOString()
        } as any);

        if (gbErr) throw gbErr;
      }
      
      setSuccess(true);
      setTimeout(() => {
        setSelectedIncident(null);
        setSuccess(false);
        setComment('');
        setAttachedImage(null);
        setAttachedAudio(null);
        setSelectedItemId('');
      }, 3000);
    } catch (error: any) {
      console.error('Failed to submit entry', error);
      setErrorMsg(error.message || 'Error de red. Intentá de nuevo.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isShiftActive) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-8", theme === 'dark' ? "bg-black" : "bg-gray-50")}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center border border-primary/20 shadow-2xl"
        >
          <ShieldCheck className="w-12 h-12 text-primary" />
        </motion.div>
        <div className="space-y-3">
          <h2 className={cn("text-2xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>Acceso Restringido</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
            El protocolo de reporte requiere un <span className="text-primary font-bold">turno activo</span> iniciado por el operador.
          </p>
        </div>
        <Link href="/operador">
          <Button className="h-14 px-8 uppercase font-black text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20">
            Volver al Centro de Mando
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen p-5 pb-32 transition-colors duration-500",
      theme === 'dark' ? "bg-[#0a0a0a]" : "bg-gray-50"
    )}>
      {/* Premium Header */}
      <div className="max-w-md mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operador">
            <button className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90",
              theme === 'dark' ? "bg-zinc-900/80 border border-white/5 text-white" : "bg-white border border-gray-100 text-gray-900"
            )}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className={cn("text-xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
              Novedades
            </h1>
            <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">SIGPAD</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-1.5 px-3 py-1 bg-primary text-black rounded-full shadow-lg shadow-primary/20 scale-90 origin-right">
              <Smartphone size={10} className="font-black" />
              <span className="text-[11px] font-black uppercase">PWA Active</span>
           </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedIncident ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="max-w-md mx-auto grid grid-cols-2 gap-4"
          >
            {quickButtons.map((btn, i) => (
              <motion.button
                key={btn.id}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(btn.id)}
                className={cn(
                  "relative group p-6 rounded-[2.5rem] border-2 transition-all overflow-hidden flex flex-col items-center gap-5 text-center shadow-2xl",
                  theme === 'dark' 
                    ? "bg-zinc-900/60 border-white/5 hover:border-primary/20 backdrop-blur-md" 
                    : "bg-white border-transparent hover:border-primary/20",
                  btn.id === 'emergencia' && "col-span-2"
                )}
              >
                <div className={cn(
                   "absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 -translate-y-1/2 translate-x-1/2 group-hover:opacity-40 transition-opacity",
                   btn.bg.replace('/10', '')
                )} />
                
                <div className={cn(
                  "w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 relative z-10",
                  btn.bg, btn.color, btn.border, "border"
                )}>
                  <btn.icon size={btn.id === 'emergencia' ? 32 : 28} />
                </div>
                <span className={cn(
                  "text-[11px] font-black uppercase tracking-[0.15em] leading-tight relative z-10 italic",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}>
                  {btn.label}
                </span>
                <ChevronRight className="absolute bottom-4 right-6 text-gray-500 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" size={14} />
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 100 }}
            className="max-w-md mx-auto"
          >
            {success ? (
               <motion.div
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className={cn(
                   "p-12 h-96 rounded-[3rem] flex flex-col items-center justify-center text-center space-y-8 shadow-2xl border",
                   theme === 'dark' ? "bg-zinc-900 border-white/5" : "bg-white border-gray-100"
                 )}
               >
                 <div className="relative">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-green-500 blur-[40px] rounded-full"
                    />
                    <div className="w-28 h-28 bg-green-500 text-black rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-green-500/40 relative z-10">
                        <CheckCircle2 size={54} />
                    </div>
                 </div>
                 <div className="space-y-2">
                   <h2 className={cn("text-3xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
                     Reporte Enviado
                   </h2>
                   <p className="text-[11px] text-green-500 font-black uppercase tracking-[0.3em]">Protocolo Sincronizado con Gestión</p>
                 </div>
               </motion.div>
            ) : (
              <div className="space-y-6">
                <Card className={cn(
                  "p-8 border-none shadow-2xl overflow-hidden rounded-[3rem] relative",
                  theme === 'dark' ? "bg-zinc-900/60 backdrop-blur-xl border border-white/5" : "bg-white/90 backdrop-blur-md"
                )}>
                  <div className={cn("absolute top-0 left-0 w-full h-1.5", selectedData?.bg.replace('/10', ''))} />
                  
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xl", selectedData?.bg, selectedData?.color, selectedData?.border)}>
                        {selectedData && <selectedData.icon size={24} />}
                      </div>
                      <div>
                        <h3 className={cn("text-lg font-black uppercase italic tracking-tight", theme === 'dark' ? "text-white" : "text-gray-900")}>
                          {selectedData?.label}
                        </h3>
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Captura de Novedad</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedIncident(null)} className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 flex items-center justify-center transition-all">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => imageInputRef.current?.click()}
                        className={cn(
                        "flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 border-dashed transition-all active:scale-95 group relative overflow-hidden",
                        theme === 'dark' ? "border-white/10 bg-white/5 hover:border-primary/40" : "border-gray-100 bg-gray-50/50 hover:border-primary/40",
                        attachedImage && "border-green-500 bg-green-500/10"
                      )}>
                         {attachedImage ? (
                           <>
                             <CheckCircle2 size={24} className="text-green-500" />
                             <span className="text-[11px] font-black text-green-600 uppercase tracking-widest truncate max-w-full px-2">Capturado</span>
                           </>
                         ) : (
                           <>
                             <Camera size={24} className="text-gray-400 group-hover:text-primary transition-transform group-hover:scale-110" />
                             <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Cámara</span>
                           </>
                         )}
                      </button>
                      <button 
                        onClick={() => audioInputRef.current?.click()}
                        className={cn(
                        "flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 border-dashed transition-all active:scale-95 group relative overflow-hidden",
                        theme === 'dark' ? "border-white/10 bg-white/5 hover:border-primary/40" : "border-gray-100 bg-gray-50/50 hover:border-primary/40",
                        attachedAudio && "border-green-500 bg-green-500/10"
                      )}>
                         {attachedAudio ? (
                           <>
                             <CheckCircle2 size={24} className="text-green-500" />
                             <span className="text-[11px] font-black text-green-600 uppercase tracking-widest truncate max-w-full px-2">Grabado</span>
                           </>
                         ) : (
                           <>
                             <Mic size={24} className="text-gray-400 group-hover:text-primary transition-transform group-hover:scale-110" />
                             <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Audio</span>
                           </>
                         )}
                      </button>
                      
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setAttachedImage(e.target.files[0]);
                          }
                        }} 
                      />
                      <input 
                        type="file" 
                        ref={audioInputRef} 
                        className="hidden" 
                        accept="audio/*" 
                        capture="environment"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setAttachedAudio(e.target.files[0]);
                          }
                        }} 
                      />
                    </div>

                    {selectedIncident === 'falla_equipo' && (
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] px-2 italic">Equipo Afectado</label>
                        <select
                          className={cn(
                            "w-full rounded-2xl h-14 px-4 text-xs font-bold uppercase focus:outline-none focus:ring-4 transition-all",
                            theme === 'dark' ? "bg-black/40 border border-white/10 text-white focus:ring-primary/10" : "bg-gray-50 border border-gray-100 text-gray-900 focus:ring-primary/5"
                          )}
                          value={selectedItemId}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                        >
                          <option value="">[ SELECCIONAR EQUIPO ]</option>
                          {assignedItems.map(item => (
                            <option key={item.id} value={item.id}>{item.name} ({item.serial_number || 'S/N'})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={cn(
                      "p-5 rounded-3xl flex items-center gap-4 transition-colors",
                      theme === 'dark' ? "bg-black/40 border border-white/5" : "bg-green-50/50 border border-green-100"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform rotate-45",
                        theme === 'dark' ? "bg-primary text-black" : "bg-green-500 text-white"
                      )}>
                        <MapPin size={18} className="-rotate-45" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[11px] font-black uppercase tracking-tight italic", theme === 'dark' ? "text-primary" : "text-green-700")}>Certificado GPS Oficial</p>
                        <p className="text-[11px] text-gray-500 font-bold uppercase truncate mt-0.5">
                          {shiftData?.location?.lat?.toFixed(5)} • {shiftData?.location?.lng?.toFixed(5)}
                        </p>
                      </div>
                    </div>

                     <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] px-2 italic">Observación de Campo</label>
                      <textarea 
                        placeholder="Describa los hechos detectados..."
                        className={cn(
                          "w-full rounded-[2rem] p-6 text-sm focus:outline-none focus:ring-4 transition-all min-h-[160px] resize-none",
                          theme === 'dark' 
                            ? "bg-black/40 border border-white/10 text-white placeholder:text-gray-500 focus:ring-primary/10 focus:border-primary/30" 
                            : "bg-gray-50 border border-gray-100 text-gray-900 placeholder:text-gray-500 focus:ring-primary/5 focus:border-primary/30"
                        )}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </div>

                    {errorMsg && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-2xl">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    <Button 
                      className="w-full h-18 rounded-[2rem] uppercase font-black text-sm tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group overflow-hidden relative"
                      onClick={handleSend}
                      disabled={isSending}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {isSending ? (
                        <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin relative z-10" />
                      ) : (
                        <Send size={22} className="relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /> 
                      )}
                      <span className="relative z-10">{isSending ? 'Sincronizando...' : 'Transmitir Alerta'}</span>
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
