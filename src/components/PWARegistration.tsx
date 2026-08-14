'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWARegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Register service worker defensively
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SIGPAD SW registered');
          },
          (err) => {
            console.log('SIGPAD SW registration failed: ', err);
          }
        ).catch(console.warn);
      }
    } catch (e) {
      console.warn('PWA initialization error', e);
    }

    // Listen for install prompt (Android/Chrome only)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault(); // Prevent browser default prompt
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      setShowInstallBanner(true);
    };

    const handleTriggerInstall = () => {
      if (isIOSDevice) {
        alert("En iPhone:\n1. Toca el botón 'Compartir' (el cuadrado con la flecha arriba).\n2. Desliza hacia abajo y toca 'Agregar a Inicio'.");
        return;
      }
      const prompt = (window as any).deferredPrompt;
      if (prompt) {
        prompt.prompt();
        prompt.userChoice.then(({ outcome }: any) => {
          console.log('[PWA] Global Install outcome:', outcome);
          (window as any).deferredPrompt = null;
          setDeferredPrompt(null);
          setShowInstallBanner(false);
        });
      } else {
        alert("Para instalar esta aplicación:\n- En PC: Busca el icono de instalación (pantalla con flecha) en la barra de direcciones de tu navegador.\n- En Android: Abre el menú del navegador y selecciona 'Instalar aplicación'.\n- En iOS: Toca el botón de compartir y selecciona 'Agregar a Inicio'.");
      }
    };

    // For iOS, show the banner manually if not standalone
    if (isIOSDevice && !standalone) {
      const dismissed = localStorage.getItem('SIGPAD_pwa_dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 5 * 24 * 60 * 60 * 1000) {
        setShowInstallBanner(true);
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('trigger-pwa-install', handleTriggerInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('trigger-pwa-install', handleTriggerInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
       alert("En iPhone:\n1. Toca el botón 'Compartir' (el cuadrado con la flecha arriba).\n2. Desliza hacia abajo y toca 'Agregar a Inicio'.");
       handleDismiss();
       return;
    }
    const prompt = deferredPrompt || (window as any).deferredPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('SIGPAD_pwa_dismissed', Date.now().toString());
  };

  // Don't show anything if already installed
  if (isStandalone || !showInstallBanner) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[200] animate-slide-up lg:left-auto lg:right-6 lg:bottom-6 lg:w-96 overflow-hidden">
      <div className="bg-zinc-950/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-4 border border-amber-400/30 flex items-center gap-3 overflow-hidden">
        <div className="w-11 h-11 bg-amber-400 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
          <Download size={20} className="text-black" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-white text-xs font-black uppercase tracking-tight truncate">Instalar App SIGPAD</p>
          <p className="text-zinc-400 text-[10px] font-medium mt-0.5 truncate">
            {isIOS ? 'Toca Instalar y sigue los pasos' : 'Acceso rápido desde tu inicio'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={handleDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title="Cerrar banner"
          >
            <X size={15} />
          </button>
          <button 
            onClick={handleInstall}
            className="px-3 py-1.5 bg-amber-400 text-black rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-300 transition-all shadow-md shrink-0"
          >
            {isIOS ? 'Pasos' : 'Instalar'}
          </button>
        </div>
      </div>
    </div>
  );
}
