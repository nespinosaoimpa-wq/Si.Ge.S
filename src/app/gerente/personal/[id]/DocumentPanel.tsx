'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { 
  FileText, Plus, Trash2, Download, 
  ShieldAlert, ScrollText, Shirt, FilePlus, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  date: string;
}

interface DocumentPanelProps {
  operatorId: string;
  initialDocuments: Document[];
}

const DOC_TYPES = [
  { id: 'sancion', label: 'Sanción', icon: ShieldAlert, color: 'text-red-500' },
  { id: 'contrato', label: 'Contrato', icon: ScrollText, color: 'text-blue-500' },
  { id: 'vestimenta', label: 'Vestimenta', icon: Shirt, color: 'text-[#0F4C5C]' },
  { id: 'otro', label: 'Otro', icon: FileText, color: 'text-zinc-500' },
];

export function DocumentPanel({ operatorId, initialDocuments }: DocumentPanelProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 5MB for base64 storage)
    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es muy pesado. Máximo 5MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const newDoc: Document = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'otro', // Default type
        url: base64,
        date: new Date().toISOString()
      };

      const updatedDocs = [...documents, newDoc];

      try {
        const { error } = await supabase
          .from('resources')
          .update({ documents: updatedDocs })
          .eq('id', operatorId);

        if (error) throw error;
        setDocuments(updatedDocs);
      } catch (err: any) {
        alert("Error al subir documento: " + err.message);
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("¿Eliminar este documento de forma permanente?")) return;

    const updatedDocs = documents.filter(d => d.id !== docId);
    try {
      const { error } = await supabase
        .from('resources')
        .update({ documents: updatedDocs })
        .eq('id', operatorId);

      if (error) throw error;
      setDocuments(updatedDocs);
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const handleUpdateType = async (docId: string, newType: string) => {
    const updatedDocs = documents.map(d => 
      d.id === docId ? { ...d, type: newType } : d
    );
    try {
      const { error } = await supabase
        .from('resources')
        .update({ documents: updatedDocs })
        .eq('id', operatorId);

      if (error) throw error;
      setDocuments(updatedDocs);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-10 mt-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-[#0F4C5C] flex items-center gap-4">
            <FileText size={24} /> Legajo Documental
          </h2>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Sanciones, Contratos y Actas de Equipamiento</p>
        </div>

        <label className="relative group cursor-pointer">
          <div className="h-12 px-8 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-zinc-900/20 active:scale-95">
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FilePlus size={18} className="text-[#0F4C5C]" />}
            Subir Documento (PDF/IMG)
          </div>
          <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,image/*" disabled={isUploading} />
        </label>
      </div>

      {documents.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[2.5rem] bg-zinc-50">
          <FileText size={56} className="text-zinc-200 mx-auto mb-6" />
          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] italic">No hay documentos registrados para este agente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const typeConfig = DOC_TYPES.find(t => t.id === doc.type) || DOC_TYPES[3];
            return (
              <div key={doc.id} className="group bg-zinc-50 border border-zinc-100 rounded-3xl p-6 hover:border-[#0F4C5C]/30 transition-all flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div className={cn("w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shadow-sm", typeConfig.color)}>
                    <typeConfig.icon size={24} />
                  </div>
                  <div className="flex gap-2">
                    <a href={doc.url} download={doc.name} className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-blue-500 transition-colors shadow-sm">
                      <Download size={16} />
                    </a>
                    <button onClick={() => handleDelete(doc.id)} className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors shadow-sm">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase truncate" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                    Subido: {new Date(doc.date).toLocaleDateString('es-AR')}
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-zinc-200/50">
                  {DOC_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleUpdateType(doc.id, t.id)}
                      className={cn(
                        "w-full h-8 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all border",
                        doc.type === t.id 
                          ? "bg-zinc-900 text-white border-zinc-900" 
                          : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-300"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
