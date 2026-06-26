'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CameraCaptureProps {
  onCapture: (file: File | null, dataUrl: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } // Front camera for selfie
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("No se pudo acceder a la cámara. Verifique los permisos.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add timestamp overlay
        const timestamp = new Date().toLocaleString();
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = "white";
        ctx.font = "16px monospace";
        ctx.fillText(timestamp, 10, canvas.height - 10);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      // Simple conversion to File logic if needed, or just pass data URL
      onCapture(null, capturedImage); // passing data URL for MVP
    }
  };

  // Ensure stream is stopped on unmount or cancel
  const handleCancel = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm relative">
        <button onClick={handleCancel} className="absolute -top-12 right-0 text-white p-2">
          <X size={24} />
        </button>
        
        <h3 className="text-white font-display uppercase tracking-widest text-center mb-4">
          Foto de Presentación
        </h3>

        {error ? (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded text-center text-sm">
            {error}
          </div>
        ) : !capturedImage ? (
           <div className="space-y-4">
             <div className="relative rounded-lg overflow-hidden border-2 border-primary/50 aspect-[3/4] bg-black">
               <video 
                 ref={videoRef} 
                 autoPlay 
                 playsInline 
                 className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 border-[4px] border-transparent border-t-primary/50 border-b-primary/50 rounded-lg pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 20%, 0 20%, 0 80%, 100% 80%, 100% 100%, 0 100%)' }} />
             </div>
             <Button onClick={capturePhoto} className="w-full h-16 text-lg">
               <Camera className="mr-2" /> TOMAR FOTO
             </Button>
           </div>
        ) : (
           <div className="space-y-4">
             <div className="relative rounded-lg overflow-hidden border-2 border-green-500 aspect-[3/4]">
               <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
             </div>
             <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetake} className="flex-1 h-14">
                  REINTENTAR
                </Button>
                <Button onClick={handleConfirm} className="flex-1 h-14 bg-green-600 hover:bg-green-500 text-white">
                  <CheckCircle2 className="mr-2" /> CONFIRMAR
                </Button>
             </div>
           </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
