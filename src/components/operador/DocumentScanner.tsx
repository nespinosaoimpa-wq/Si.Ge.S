'use client';

import React, { useRef, useState } from 'react';
import { Camera, UploadCloud, X, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DocumentScannerProps {
  objectiveId: string;
  operatorId: string;
  location: { lat: number, lng: number } | null;
  onUploadSuccess: (url: string) => void;
  onClose: () => void;
}

export function DocumentScanner({ objectiveId, operatorId, location, onUploadSuccess, onClose }: DocumentScannerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress using Canvas
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Digital Watermark
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
          ctx.fillStyle = '#0F4C5C'; // Dorado SIGPAD
          ctx.font = '20px monospace';
          const timestamp = new Date().toLocaleString('es-AR');
          const gps = location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'GPS OFFLINE';
          ctx.fillText(`SIGPAD OS | ${timestamp} | ${gps}`, 10, canvas.height - 15);

          canvas.toBlob((blob) => {
            if (blob) {
              setFileToUpload(blob);
              setPreview(URL.createObjectURL(blob));
            }
          }, 'image/jpeg', 0.8);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const uploadEvidence = async () => {
    if (!fileToUpload) return;
    setIsUploading(true);

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${Date.now()}_${operatorId.substring(0,6)}.jpg`;
      const filePath = `${objectiveId}/${dateStr}/${filename}`;

      // 1. Direct Browser Upload to Supabase Storage (0 Vercel Origin Bytes)
      const { uploadMediaDirect } = await import('@/lib/storage-direct');
      const { url: imageUrl } = await uploadMediaDirect(fileToUpload, filename);

      // 2. Insert Metadata
      const { error: dbError } = await supabase.from('digital_evidence').insert({
        objective_id: objectiveId,
        operator_id: operatorId,
        image_url: imageUrl,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        description: 'Acta Digitalizada'
      });

      if (dbError) throw dbError;

      onUploadSuccess(imageUrl);
      onClose();
    } catch (e: any) {
      alert("Error subiendo evidencia: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-xl flex flex-col">
      <div className="p-4 flex justify-between items-center border-b border-white/10 bg-zinc-950">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-[#0F4C5C]">Evidencia Digital</h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Escáner de Actas</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        {!preview ? (
          <>
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-[#0F4C5C]/50 flex items-center justify-center bg-[#0F4C5C]/5">
              <FileText size={48} className="text-[#0F4C5C]" />
            </div>
            <p className="text-center text-sm font-bold text-zinc-400 uppercase tracking-widest max-w-xs">
              Capturá una foto clara del documento. Se le aplicará sello de agua con GPS y Fecha.
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 px-8 py-4 bg-[#0F4C5C] text-zinc-950 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-[#0F4C5C]/20"
            >
              <Camera size={20} /> Abrir Cámara
            </button>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef}
              onChange={handleCapture}
              className="hidden"
            />
          </>
        ) : (
          <>
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img src={preview} alt="Preview" className="w-full h-auto" />
            </div>
            <div className="flex gap-4 w-full max-w-sm">
              <button 
                onClick={() => setPreview(null)}
                disabled={isUploading}
                className="flex-1 py-4 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs text-zinc-400"
              >
                Reintentar
              </button>
              <button 
                onClick={uploadEvidence}
                disabled={isUploading}
                className="flex-1 py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                {isUploading ? 'Subiendo...' : <><UploadCloud size={16} /> Subir Evidencia</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
