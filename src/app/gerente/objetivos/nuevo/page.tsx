'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  FileText, 
  Camera, 
  Upload, 
  ArrowLeft,
  Search,
  CheckCircle2,
  X,
  Target,
  ArrowRight,
  Shield,
  Phone
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { searchAddresses, GeocodingResult, searchBoxRetrieve } from '@/lib/geocoding';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function NuevoObjetivo() {
  const router = useRouter();
  const [coords, setCoords] = useState<{lat: number, lng: number}>({ lat: -31.6107, lng: -60.6973 }); // Si.Ge.S default
  const [formData, setFormData] = useState({ name: '', address: '', client_name: '', contact_phone: '', geofence_radius: 200 });
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchAddresses(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        alert("No se encontraron resultados para esa dirección.");
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (result: any) => {
    // If it's a Search Box Suggestion, we need to retrieve details
    if (result.mapbox_id) {
      const details = await searchBoxRetrieve(result.mapbox_id);
      if (details) {
        setCoords({ lat: details.lat, lng: details.lng });
        setFormData(prev => ({ ...prev, address: details.displayName }));
        setSearchQuery(details.displayName);
      }
    } else {
      setCoords({ lat: result.lat, lng: result.lng });
      setFormData(prev => ({ ...prev, address: result.displayName }));
      setSearchQuery(result.displayName);
    }
    setSearchResults([]);
  };


  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.objectives.create({
        ...formData,
        id: `OBJ-${Math.floor(Math.random() * 9000) + 1000}`,
        latitude: coords.lat,
        longitude: coords.lng,
        geofence_radius: formData.geofence_radius,
        status: 'Activo'
      });
      setStep(4); // Success state
    } catch (err) {
      console.error(err);
      alert("Error al registrar: " + (err as any).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { n: 1, label: 'Ubicación' },
    { n: 2, label: 'Datos' },
    { n: 3, label: 'Documentos' }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8 pb-32">
      
      {/* 1. HEADER */}
      <div className="flex flex-col gap-4">
        <Link href="/gerente" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit">
          <ArrowLeft size={16} /> Volver al Mapa
        </Link>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Alta de <span className="text-primary">Nuevo Objetivo</span></h1>
            <p className="text-sm text-gray-500 mt-1">Registra un nuevo punto de custodia para la red operativa de Si.Ge.S.</p>
          </div>
          
          {/* Progress Stepper */}
          <div className="flex items-center gap-4 bg-white px-6 py-4 border border-gray-100 rounded-2xl shadow-sm">
            {steps.map((s, idx) => (
              <React.Fragment key={s.n}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                    step === s.n ? "bg-primary text-black" : step > s.n ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                  )}>
                    {step > s.n ? <CheckCircle2 size={18} /> : s.n}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider",
                    step === s.n ? "text-gray-900" : "text-gray-400"
                  )}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && <div className="w-6 h-px bg-gray-100" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* LEFT: MAP PICKER / FORM AREA (8 cols) */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="overflow-hidden bg-white shadow-xl shadow-gray-200/50 border border-gray-100 h-[600px] flex flex-col relative transition-all duration-500">
            
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1" 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Localización precisa del puesto</p>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Latitud</p>
                        <p className="text-xs font-mono font-bold text-gray-900">{coords.lat.toFixed(6)}</p>
                      </div>
                      <div className="text-right border-l border-gray-200 pl-4">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Longitud</p>
                        <p className="text-xs font-mono font-bold text-gray-900">{coords.lng.toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 relative">
                    <MapView 
                      center={[coords.lat, coords.lng]} 
                      zoom={15}
                      onMapClick={(newCoords) => setCoords(newCoords)}
                      isPickerMode={true}
                      draftCoords={coords}
                      onDraftDragEnd={(lat, lng) => setCoords({lat, lng})}
                      draft_geofence_radius={formData.geofence_radius}
                      className="w-full h-full"
                    />
                    
                    {/* Search Bar */}
                    <div className="absolute top-6 left-6 z-[1000] w-80">
                      <form onSubmit={handleSearch} className="relative shadow-2xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar dirección precisa..." 
                          className="pl-10 h-12 bg-white/95 border-none shadow-xl text-[11px] font-black uppercase rounded-2xl ring-2 ring-primary/20" 
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
                          </div>
                        )}
                      </form>

                      {searchResults.length > 0 && (
                        <Card className="mt-2 overflow-hidden border-none shadow-2xl rounded-2xl bg-white/90 backdrop-blur-lg divide-y divide-gray-50 border border-gray-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {searchResults.map((res, i) => (
                            <button
                              key={i}
                              onClick={() => handleSelectResult(res)}
                              className="w-full text-left p-4 hover:bg-primary/5 transition-colors flex items-start gap-3 group border-none bg-transparent"
                            >
                              <MapPin size={16} className="text-gray-400 mt-1 shrink-0 group-hover:text-primary transition-colors" />
                              <div>
                                <p className="text-[10px] font-black text-gray-900 uppercase leading-snug">{res.displayName}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{res.city}, {res.state}</p>
                              </div>
                            </button>
                          ))}
                        </Card>
                      )}
                    </div>
                    
                    {/* Daylight UI: Side Pre-Alta Panel */}
                    <AnimatePresence>
                      {formData.address && (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="absolute top-6 right-6 z-[1000] w-80 bg-white border border-zinc-200 shadow-2xl rounded-3xl p-5 flex flex-col gap-4"
                        >
                          <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
                            <div className="w-10 h-10 bg-[#0F4C5C]/10 rounded-xl flex items-center justify-center">
                              <MapPin size={20} className="text-[#0F4C5C]" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ubicación Detectada</p>
                              <p className="text-xs font-bold text-zinc-900 uppercase leading-tight mt-0.5">{formData.address.split(',')[0]}</p>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">
                                {formData.address.split(',').slice(1).join(',').trim() || 'Santa Fe, Argentina'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[10px] font-medium text-zinc-500 leading-relaxed">
                              Arrastrá el pin dorado en el mapa para ajustar la posición exacta sobre el acceso o la garita.
                            </p>
                          </div>

                          <Button 
                            onClick={() => setStep(2)} 
                            className="w-full h-12 bg-zinc-900 hover:bg-black text-[#0F4C5C] uppercase font-black text-[10px] tracking-widest shadow-xl shadow-zinc-200"
                          >
                            CONFIRMAR Y CREAR OBJETIVO
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Geofence Radius Control */}
                    <div className="absolute bottom-6 left-6 z-[1000] w-64 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-100/50">
                      <div className="flex justify-between mb-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Radio Geovalla</label>
                        <span className="text-xs font-black text-primary italic">{formData.geofence_radius}m</span>
                      </div>
                      <input 
                        type="range"
                        min="50"
                        max="1000"
                        step="50"
                        value={formData.geofence_radius}
                        onChange={(e) => setFormData({...formData, geofence_radius: parseInt(e.target.value)})}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between mt-1 text-[9px] font-bold text-gray-400 uppercase">
                        <span>50m</span>
                        <span>1km</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2" 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="flex-1 p-10 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-8"
                >
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Building2 size={32} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Datos del Objetivo</h2>
                    <p className="text-sm text-gray-500">Ingresa la información comercial y de contacto.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                        <Input 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="EJ: EDIFICIO CENTRAL" 
                          className="h-12 border-gray-100 bg-gray-50 text-xs font-bold uppercase" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cliente</label>
                        <Input 
                          value={formData.client_name}
                          onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                          placeholder="EJ: GRUPO ALPHA" 
                          className="h-12 border-gray-100 bg-gray-50 text-xs font-bold uppercase" 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección Registrada</label>
                      <Input 
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="AV. RIVADAVIA 1500..." 
                        className="h-12 border-gray-100 bg-gray-50 text-xs font-bold uppercase" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono de Enlace</label>
                      <Input 
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                        placeholder="+54 342 555-0001" 
                        className="h-12 border-gray-100 bg-gray-50 text-xs font-bold uppercase" 
                      />
                    </div>

                    <div className="pt-6 flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="h-12 flex-1 uppercase font-black text-xs">Atrás</Button>
                      <Button onClick={() => setStep(3)} className="h-12 flex-1 uppercase font-black text-xs">Continuar</Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3" 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="flex-1 p-10 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-8"
                >
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText size={32} className="text-primary" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Adjuntos Digitales</h2>
                    <p className="text-sm text-gray-500">Sube el plan de emergencia y fotos del sitio.</p>
                  </div>

                  <div className="space-y-4">
                    <UploadCard icon={FileText} label="Plan de Seguridad" sub="PDF (Max 10MB)" />
                    <UploadCard icon={Camera} label="Foto del Puesto" sub="JPG, PNG" />
                    
                    <div className="pt-10 flex gap-3">
                      <Button variant="outline" onClick={() => setStep(2)} className="h-12 flex-1 uppercase font-black text-xs">Atrás</Button>
                      <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="h-12 flex-1 uppercase font-black text-xs"
                      >
                        {isSubmitting ? 'Registrando...' : 'Finalizar Alta'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* RIGHT: INFO PANEL (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
           <Card className="p-8 bg-gray-900 text-white border-none shadow-2xl rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex flex-col h-full space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Protocolo de Alta</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Validación</p>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">Los datos ingresados serán verificados por el centro de operaciones antes de la activación definitiva.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Privacidad</p>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">Toda la documentación subida está encriptada y solo es accesible por personal autorizado.</p>
                  </div>
                </div>

                <div className="pt-12 mt-auto">
                   <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest text-center italic">Si.Ge.S Business Operational System</p>
                </div>
              </div>
           </Card>

           {/* Quick Summary Card */}
           {(formData.name || formData.address) && (
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
               <Card className="p-5 border-dashed border-gray-200 bg-gray-50/50">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Resumen de Registro</h4>
                  <div className="space-y-3">
                    {formData.name && <div className="flex justify-between"><span className="text-[10px] text-gray-400 font-bold uppercase">Nombre:</span> <span className="text-xs font-bold text-gray-700">{formData.name}</span></div>}
                    {formData.address && <div className="flex justify-between"><span className="text-[10px] text-gray-400 font-bold uppercase">Dirección:</span> <span className="text-xs font-bold text-gray-700 truncate ml-4">{formData.address}</span></div>}
                    <div className="flex justify-between"><span className="text-[10px] text-gray-400 font-bold uppercase">Estado:</span> <span className="text-xs font-bold text-amber-500 uppercase">Pendiente</span></div>
                  </div>
               </Card>
             </motion.div>
           )}
        </div>
      </div>

      {/* SUCCESS MODAL */}
      <AnimatePresence>
        {step === 4 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/90 backdrop-blur-xl p-6"
          >
             <div className="max-w-md w-full text-center space-y-8">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-green-100/50">
                   <CheckCircle2 size={48} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-3">Objetivo Creado</h2>
                  <p className="text-gray-500 text-sm font-medium">El nuevo puesto de vigilancia ha sido registrado correctamente y georeferenciado en la red Si.Ge.S.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button className="h-14 font-black uppercase text-xs" onClick={() => router.push('/gerente')}>Ver en el Mapa</Button>
                  <Button variant="outline" className="h-14 font-black uppercase text-xs" onClick={() => { setStep(1); setFormData({ name: '', address: '', client_name: '', contact_phone: '', geofence_radius: 200 }); }}>Cargar Otro</Button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadCard({ icon: Icon, label, sub }: { icon: any, label: string, sub: string }) {
  return (
    <div className="p-6 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 flex items-center justify-between group hover:border-primary/50 hover:bg-white cursor-pointer transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-sm">
          <Icon size={20} className="text-gray-400 group-hover:text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 uppercase">{label}</p>
          <p className="text-[10px] text-gray-500 font-medium uppercase">{sub}</p>
        </div>
      </div>
      <Upload size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
    </div>
  );
}
