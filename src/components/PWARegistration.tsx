'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWARegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBottomBanner, setShowBottomBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'pc'>('ios');

  useEffect(() => {
    // Global unhandledrejection listener for ChunkLoadError during Vercel deployment updates
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason || '');
      const isChunkError = msg.includes('Loading chunk') || 
                           msg.includes('ChunkLoadError') || 
                           event.reason?.name === 'ChunkLoadError';
      if (isChunkError) {
        event.preventDefault();
        const lastReload = sessionStorage.getItem('sigpad_chunk_reload');
        if (!lastReload || Date.now() - Number(lastReload) > 10000) {
          sessionStorage.setItem('sigpad_chunk_reload', String(Date.now()));
          window.location.reload();
        }
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    // 1. Check if already running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // 2. Detect iOS device
    const isIOSDevice = typeof navigator !== 'undefined' && 
      (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)))
      && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    if (isIOSDevice) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }

    // 3. Register Service Worker
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(
          (reg) => console.log('[PWA] SW registrado:', reg.scope),
          (err) => console.log('[PWA] Error registro SW:', err)
        ).catch(console.warn);
      }
    } catch (e) {
      console.warn('[PWA] Exception SW:', e);
    }

    // 4. Capture install prompt (Android / Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;

      const dismissed = localStorage.getItem('SIGPAD_pwa_dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 24 * 60 * 60 * 1000) {
        setShowBottomBanner(true);
      }
    };

    // 5. Global trigger event listener (Always Active!)
    const handleTriggerInstall = () => {
      const prompt = (window as any).deferredPrompt || deferredPrompt;
      const isIOSCurrent = typeof navigator !== 'undefined' && 
        (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)));

      if (isIOSCurrent) {
        setActiveTab('ios');
        setIsModalOpen(true);
      } else if (prompt) {
        try {
          prompt.prompt();
          prompt.userChoice.then(({ outcome }: any) => {
            console.log('[PWA] Resultado prompt:', outcome);
            if (outcome === 'accepted') {
              setDeferredPrompt(null);
              (window as any).deferredPrompt = null;
              setShowBottomBanner(false);
            } else {
              setIsModalOpen(true);
            }
          });
        } catch (e) {
          setIsModalOpen(true);
        }
      } else {
        setIsModalOpen(true);
      }
    };

    // Auto-show banner for iOS on first visit if not standalone
    if (isIOSDevice && !standalone) {
      const dismissed = localStorage.getItem('SIGPAD_pwa_dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 24 * 60 * 60 * 1000) {
        setShowBottomBanner(true);
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('trigger-pwa-install', handleTriggerInstall);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('trigger-pwa-install', handleTriggerInstall);
    };
  }, []);

  const handleInstallButtonClick = async () => {
    if (isIOS) {
      setIsModalOpen(true);
      setShowBottomBanner(false);
      return;
    }

    const prompt = (window as any).deferredPrompt || deferredPrompt;
    if (prompt) {
      try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          (window as any).deferredPrompt = null;
          setShowBottomBanner(false);
        } else {
          setIsModalOpen(true);
        }
      } catch {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
      setShowBottomBanner(false);
    }
  };

  const handleDismissBanner = () => {
    setShowBottomBanner(false);
    localStorage.setItem('SIGPAD_pwa_dismissed', Date.now().toString());
  };

  return (
    <>
      {/* FLOATING BOTTOM BANNER (Visible on mobile if not dismissed & not standalone) */}
      {!isStandalone && showBottomBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-[999] animate-slide-up lg:left-auto lg:right-6 lg:bottom-6 lg:w-96 overflow-hidden">
          <div className="bg-zinc-950/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 border border-[#0F4C5C]/50 flex items-center gap-3 overflow-hidden">
            <div className="w-11 h-11 bg-[#0F4C5C] rounded-xl flex items-center justify-center shrink-0 shadow-lg text-white">
              <Download size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-black uppercase tracking-tight truncate">Instalar App SIGPAD</p>
              <p className="text-zinc-400 text-[10px] font-semibold truncate mt-0.5">
                {isIOS ? 'En iPhone: Toca Pasos' : 'Acceso directo en tu celular'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={handleDismissBanner}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                title="Cerrar banner"
              >
                <X size={16} />
              </button>
              <button 
                onClick={handleInstallButtonClick}
                className="px-3.5 py-2 bg-[#0F4C5C] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#146074] transition-all shadow-md shrink-0"
              >
                {isIOS ? 'Pasos iPhone' : 'Instalar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL INSTRUCTIONAL MODAL (FOR IPHONE, ANDROID & PC) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 lg:p-8 max-w-md w-full text-white shadow-2xl relative my-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#0F4C5C]/20 border border-[#0F4C5C]/40 text-[#0F4C5C] flex items-center justify-center">
                  <Smartphone size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Instalar App SIGPAD</h3>
                  <p className="text-xs text-zinc-400 font-medium">Guía de instalación en tu dispositivo</p>
                </div>
              </div>

              {/* Selector Tabs */}
              <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800">
                <button
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'ios' ? 'bg-[#0F4C5C] text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  iPhone / iOS
                </button>
                <button
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'android' ? 'bg-[#0F4C5C] text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Android / Chrome
                </button>
              </div>

              {/* iOS STEPS */}
              {activeTab === 'ios' && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-4 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">1</div>
                      <p className="text-zinc-200 leading-relaxed">
                        En Safari, tocá el botón <span className="font-bold text-[#0F4C5C] inline-flex items-center gap-1 bg-[#0F4C5C]/20 px-2 py-0.5 rounded border border-[#0F4C5C]/30"><Share size={13} /> Compartir</span> en el menú inferior.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">2</div>
                      <p className="text-zinc-200 leading-relaxed">
                        Deslizá el menú hacia abajo y seleccioná <span className="font-bold text-[#0F4C5C] inline-flex items-center gap-1 bg-[#0F4C5C]/20 px-2 py-0.5 rounded border border-[#0F4C5C]/30"><PlusSquare size={13} /> Agregar al inicio</span>.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">3</div>
                      <p className="text-zinc-200 leading-relaxed">
                        Tocá <span className="font-bold text-white uppercase tracking-wider">"Agregar"</span> arriba a la derecha. ¡Listo! Tendrás el icono directo como una aplicación en tu iPhone.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ANDROID STEPS */}
              {activeTab === 'android' && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-4 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">1</div>
                      <p className="text-zinc-200 leading-relaxed">
                        En Chrome, tocá el menú de tres puntos <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded">⋮</span> arriba a la derecha.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">2</div>
                      <p className="text-zinc-200 leading-relaxed">
                        Seleccioná <span className="font-bold text-[#0F4C5C] bg-[#0F4C5C]/20 px-2 py-0.5 rounded border border-[#0F4C5C]/30">Instalar aplicación</span> o <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded">Agregar a la pantalla principal</span>.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#0F4C5C] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">3</div>
                      <p className="text-zinc-200 leading-relaxed">
                        Confirmá la instalación para ingresar a SIGPAD directamente desde la pantalla de inicio de tu celular.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full mt-6 py-3.5 bg-[#0F4C5C] text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-[#146074] transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle size={16} /> Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
