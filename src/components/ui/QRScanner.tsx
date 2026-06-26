'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { QrCode, X, ScanLine, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QRScannerProps {
  onScan: (qrData: string) => void;
  onCancel: () => void;
}

export function QRScanner({ onScan, onCancel }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Back camera for QR
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("No se pudo acceder a la cámara trasera.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const handleCancel = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    onCancel();
  };

  // For MVP: Simulate a successful scan when clicking a hidden button or after 3 seconds
  // Ideally, you'd use jsQR or html5-qrcode here
  const simulateScan = () => {
    setIsScanning(false);
    setTimeout(() => {
      onScan('QR_CHECKPOINT_MOCK_ID');
    }, 1000); // 1 second success state before closing
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm relative">
        <button onClick={handleCancel} className="absolute -top-12 right-0 text-white p-2">
          <X size={24} />
        </button>
        
        <h3 className="text-white font-display uppercase tracking-widest text-center mb-6 flex items-center justify-center gap-2">
          <QrCode size={18} /> Escáner de Punto
        </h3>

        {error ? (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded text-center text-sm">
            {error}
          </div>
        ) : (
           <div className="space-y-6">
             <div className="relative rounded-lg overflow-hidden border-2 border-primary/50 aspect-square bg-black">
               <video 
                 ref={videoRef} 
                 autoPlay 
                 playsInline 
                 className="w-full h-full object-cover opacity-80"
               />
               
               {/* Scanning Overlay */}
               {isScanning ? (
                 <>
                   <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-44 border-2 border-primary/70 rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                     <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                     <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                     <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                     <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                     
                     <div className="w-full h-0.5 bg-red-500 animate-scan shadow-[0_0_10px_red]" />
                   </div>
                   <div className="absolute bottom-4 left-0 right-0 text-center">
                     <p className="text-primary text-[10px] uppercase font-bold tracking-widest animate-pulse">Buscando Código QR...</p>
                   </div>
                 </>
               ) : (
                 <div className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center text-green-400">
                   <CheckCircle2 size={64} className="mb-4" />
                   <p className="font-bold uppercase tracking-widest text-sm text-green-500">Lectura Exitosa</p>
                 </div>
               )}
             </div>

             <Button 
               variant="outline" 
               className="w-full h-14 border-primary text-primary"
               onClick={simulateScan}
             >
               <ScanLine className="mr-2" /> SIMULAR ESCANEO (MVP)
             </Button>
           </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(170px); }
        }
        .animate-scan {
          animation: scan 2s linear infinite alternate;
        }
      `}} />
    </div>
  );
}
