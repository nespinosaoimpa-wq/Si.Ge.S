'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { generateEvidencePDF } from '@/lib/pdfGenerator';
import { cn } from '@/lib/utils';

export function DownloadEvidenceButton({ doc, operatorName }: { doc: any, operatorName: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateEvidencePDF({
        imageUrl: doc.image_url,
        operatorName,
        objectiveName: doc.objectives?.name || 'Móvil',
        latitude: doc.latitude,
        longitude: doc.longitude,
        timestamp: new Date(doc.created_at).toLocaleString('es-AR')
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={isGenerating}
      className={cn(
        "absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-black/70 transition-all z-10",
        isGenerating && "opacity-50 cursor-not-allowed"
      )}
      title="Generar PDF"
    >
      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
    </button>
  );
}
