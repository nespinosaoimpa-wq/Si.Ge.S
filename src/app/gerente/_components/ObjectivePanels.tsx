'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Building2, 
  Phone, 
  User, 
  Clock, 
  ChevronRight, 
  Trash2,
  Search,
  Target,
  MessageSquare,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { searchBoxRetrieve } from '@/lib/geocoding';

interface ObjectiveDetailPanelProps {
  selectedObjective: any;
  isAddingPoint: boolean;
  isMobile: boolean;
  activeGuards?: any[];
  activeShifts?: any[];
  onAssignOperator?: (objectiveId: string, operatorId: string) => Promise<void>;
  setSelectedObjective: (val: any) => void;
  handleDeleteObjective: (id: string, name: string) => void;
  isRelocating?: boolean;
  setIsRelocating?: (val: boolean) => void;
  onRelocateToOperator?: (objectiveId: string) => void;
}

export function ObjectiveDetailPanel({
  selectedObjective,
  isAddingPoint,
  isMobile,
  activeGuards = [],
  activeShifts = [],
  onAssignOperator,
  setSelectedObjective,
  handleDeleteObjective,
  isRelocating = false,
  setIsRelocating = () => {},
  onRelocateToOperator
}: ObjectiveDetailPanelProps) {
  return (
    <AnimatePresence>
      {selectedObjective && !isAddingPoint && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={cn(
            "z-[50] bg-white/98 backdrop-blur-2xl border-t border-zinc-200 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]",
            isMobile
              ? "fixed inset-x-0 bottom-0 rounded-t-[2.5rem] p-6 pb-24 max-h-[70vh] overflow-y-auto no-scrollbar"
              : "absolute bottom-6 left-6 right-6 rounded-[2rem] p-8 max-w-lg mx-auto border border-zinc-200 shadow-2xl"
          )}
        >
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-zinc-50 rounded-[1.25rem] flex items-center justify-center border border-zinc-200 shadow-sm">
                <MapPin size={24} className="text-[#0F4C5C]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter truncate leading-none">{selectedObjective.name}</h3>
                {selectedObjective.address && (
                  <p className="text-[10px] text-zinc-900 font-black tracking-[0.2em] uppercase mt-2 truncate">{selectedObjective.address}</p>
                )}
              </div>
            </div>
            <button onClick={() => setSelectedObjective(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <X size={20} className="text-zinc-600" />
            </button>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedObjective.client_name && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <Building2 size={12} className="text-zinc-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{selectedObjective.client_name}</span>
              </div>
            )}
            {selectedObjective.contact_phone && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <Phone size={12} className="text-zinc-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{selectedObjective.contact_phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-[#0F4C5C]/20 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0F4C5C]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0F4C5C]">{selectedObjective.status || 'Activo'}</span>
            </div>
          </div>

          {/* Guard on duty / Assignment */}
          <div className="p-4 bg-zinc-50 rounded-2xl mb-6 border border-zinc-200 shadow-sm">
            {(() => {
              // Priority 1: Guard with live pulse at this objective
              let assignedGuard = activeGuards.find(g => g.current_objective_id === selectedObjective.id);
              
              // Priority 2: Guard assigned via deep join (even if no live pulse yet)
              if (!assignedGuard && selectedObjective.assigned_personnel?.length > 0) {
                assignedGuard = selectedObjective.assigned_personnel[0];
              }
 
              const activeShift = activeShifts.find(s => s.objective_id === selectedObjective.id || (assignedGuard && s.operator_id === assignedGuard.id));
 
              if (assignedGuard) {
                return (
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden border transition-all shadow-sm", 
                      activeShift ? "border-[#0F4C5C] bg-white" : "bg-white border-zinc-200"
                    )}>
                      {assignedGuard.profiles?.avatar_url || assignedGuard.avatar_url ? (
                        <img src={assignedGuard.profiles?.avatar_url || assignedGuard.avatar_url} className="w-full h-full object-cover" alt={assignedGuard.name} />
                      ) : (
                        <User size={24} className="text-zinc-400" />
                      )}
                    </div>
 
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                         <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{assignedGuard.name}</p>
                         {activeShift && (
                           <div className="w-2 h-2 rounded-full bg-[#0F4C5C]" title="En servicio activo" />
                         )}
                      </div>
                      <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-1">
                        {activeShift ? 'Puesto Cubierto' : 'Asignación Pendiente'}
                      </p>
                    </div>
                    {onAssignOperator && (
                      <button 
                        className="text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-red-500 transition-colors" 
                        onClick={() => onAssignOperator(selectedObjective.id, '')}
                      >
                        Liberar
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-100 shadow-sm">
                      <User size={18} className="text-zinc-200" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">Sin personal activo</p>
                      <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mt-0.5">Asignar para iniciar monitoreo</p>
                    </div>
                  </div>
                  {onAssignOperator && (
                    <select 
                      className="w-full h-11 text-xs font-black uppercase tracking-widest border border-zinc-200 rounded-xl px-4 bg-white text-zinc-900 focus:ring-1 focus:ring-[#0F4C5C]/50 appearance-none shadow-sm"
                      onChange={(e) => {
                        if (e.target.value) onAssignOperator(selectedObjective.id, e.target.value);
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled className="bg-white">Seleccionar Operador Libre...</option>
                      {activeGuards.filter(g => !g.current_objective_id).map(g => (
                        <option key={g.id} value={g.id} className="bg-white">{g.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-auto">
            <div className="flex-1 flex gap-2">
              <Link href={`/gerente/objetivos/${selectedObjective.id}`} className="flex-1">
                <button className="w-full h-12 text-[11px] font-black uppercase tracking-[0.2em] bg-[#0F4C5C] text-black rounded-xl hover:bg-[#C4A030] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0F4C5C]/10">
                  AUDITAR SERVICIO
                  <ChevronRight size={16} />
                </button>
              </Link>
                <button 
                  onClick={() => {
                    const occupant = activeGuards.find(g => g.current_objective_id === selectedObjective.id);
                    if (occupant && onRelocateToOperator) {
                      onRelocateToOperator(selectedObjective.id);
                    } else {
                      setIsRelocating(!isRelocating);
                    }
                  }}
                  type="button"
                  className={cn(
                    "px-4 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center justify-center gap-2",
                    isRelocating 
                      ? "bg-black text-[#0F4C5C] border-black animate-pulse" 
                      : "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50"
                  )}
                >
                  <Target size={16} />
                  {isRelocating ? 'MOVIENDO...' : 'REUBICAR'}
                </button>
            </div>
            <button 
              type="button"
              className="h-12 w-12 shrink-0 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-xl transition-all flex items-center justify-center"
              onClick={() => handleDeleteObjective(selectedObjective.id, selectedObjective.name)}
            >
              <Trash2 size={20} />
            </button>
            
            {activeGuards.find(g => g.current_objective_id === selectedObjective.id) && (
              <button 
                type="button"
                className="h-12 w-12 shrink-0 border border-white/10 text-zinc-100 hover:bg-white/5 rounded-xl transition-all flex items-center justify-center"
                onClick={async () => {
                  const msg = prompt('Enviar mensaje al operador:');
                  if (!msg) return;
                  const guard = activeGuards.find(g => g.current_objective_id === selectedObjective.id);
                  const { error } = await supabase.from('system_notifications').insert({
                    sender_id: 'manager',
                    receiver_id: guard.id,
                    title: 'Mensaje de Gerencia',
                    message: msg,
                    type: 'command'
                  });
                  if (error) alert(error.message);
                  else alert('Mensaje enviado.');
                }}
              >
                <MessageSquare size={20} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface NewObjectiveFormProps {
  lastClickedCoords: any;
  isMobile: boolean;
  newObjective: any;
  setNewObjective: (val: any) => void;
  setLastClickedCoords: (val: any) => void;
  addressSuggestions: any[];
  setAddressSuggestions: (val: any[]) => void;
  isSearchingAddress: boolean;
  searchAddresses: (val: string) => Promise<any[]>;
  geocodeForward: (val: string) => Promise<any[]>;
  handleAddObjective: (e: React.FormEvent) => void;
}

export function NewObjectiveForm({
  lastClickedCoords,
  isMobile,
  newObjective,
  setNewObjective,
  setLastClickedCoords,
  addressSuggestions,
  setAddressSuggestions,
  isSearchingAddress,
  searchAddresses,
  geocodeForward,
  handleAddObjective
}: NewObjectiveFormProps) {
  return (
    <AnimatePresence>
      {lastClickedCoords && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={cn(
            "z-[50] bg-white border border-zinc-200 shadow-2xl",
            isMobile
              ? "fixed inset-x-0 bottom-0 rounded-t-[2.5rem] p-6 pb-24 max-h-[85vh] overflow-y-auto no-scrollbar"
              : "absolute bottom-6 left-1/2 -translate-x-1/2 w-[520px] rounded-[2rem] p-8"
          )}
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter truncate">Nuevo Objetivo</h3>
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mt-2">Registrar punto de vigilancia estratégica</p>
            </div>
            <button onClick={() => setLastClickedCoords(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <X size={20} className="text-zinc-300" />
            </button>
          </div>

          <form onSubmit={handleAddObjective} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Nombre Operativo</label>
                <Input required placeholder="Ej: Edificio Central" value={newObjective.name}
                  className="h-12 bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl placeholder:text-zinc-500"
                  onChange={e => setNewObjective({...newObjective, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest ml-1">Cliente Corporativo</label>
                <Input required placeholder="Ej: Banco Galicia" value={newObjective.client_name}
                  className="h-12 bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl placeholder:text-zinc-300"
                  onChange={e => setNewObjective({...newObjective, client_name: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest ml-1">Dirección de Despliegue</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input 
                    required 
                    placeholder="Ej: San Martín 1500" 
                    className={cn(
                      "h-12 bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl placeholder:text-zinc-300",
                      lastClickedCoords ? "border-[#0F4C5C]/30 bg-[#0F4C5C]/5" : ""
                    )}
                    value={newObjective.address}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setNewObjective({...newObjective, address: val});
                      if (val.length > 3) {
                        const results = await searchAddresses(val);
                        setAddressSuggestions(results);
                      } else {
                        setAddressSuggestions([]);
                      }
                    }} 
                  />
                  {addressSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[60] max-h-[250px] overflow-y-auto no-scrollbar">
                      {addressSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full text-left px-5 py-4 hover:bg-zinc-50 transition-colors border-b last:border-0 border-zinc-100"
                          onClick={async () => {
                            let lat = s.lat;
                            let lng = s.lng;
                            let displayName = s.displayName;
                            if (s.mapbox_id) {
                              const details = await searchBoxRetrieve(s.mapbox_id);
                              if (details) {
                                lat = details.lat;
                                lng = details.lng;
                                displayName = details.displayName;
                              }
                            }
                            setNewObjective((prev: any) => ({ ...prev, address: displayName }));
                            setLastClickedCoords({ lat, lng });
                            setAddressSuggestions([]);
                          }}
                        >
                          <p className="text-xs font-black text-zinc-900 line-clamp-1">{s.displayName}</p>
                          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-1">{s.type}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="shrink-0 h-12 px-4 border-zinc-200 bg-zinc-50 text-[#0F4C5C] hover:bg-zinc-100 shadow-sm"
                  disabled={isSearchingAddress}
                  onClick={async () => {
                    if (!newObjective.address) return;
                    try {
                      const results = await geocodeForward(newObjective.address);
                      if (results && results.length > 0) {
                        const first = results[0];
                        setLastClickedCoords({ lat: first.lat, lng: first.lng });
                        setNewObjective((prev: any) => ({ ...prev, address: first.displayName }));
                      } else {
                        alert("No se encontró la dirección exacta. Intenta ser más específico o marcarla en el mapa.");
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                   <Search size={18} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-12 px-4 border-[#0F4C5C]/20 bg-[#0F4C5C]/5 text-[#0F4C5C] hover:bg-[#0F4C5C]/10 shadow-sm"
                  title="Usar mi ubicación actual"
                  onClick={() => {
                    if (!navigator.geolocation) return alert("Geolocalización no soportada en este navegador.");
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        const { latitude, longitude } = pos.coords;
                        setLastClickedCoords({ lat: latitude, lng: longitude });
                        try {
                          const results = await searchAddresses(`${latitude}, ${longitude}`);
                          if (results && results.length > 0) {
                            setNewObjective((prev: any) => ({ ...prev, address: results[0].displayName }));
                          }
                        } catch (e) {
                          console.error("Reverse geocoding error:", e);
                        }
                      },
                      (err) => alert("Error obteniendo ubicación: " + err.message),
                      { enableHighAccuracy: true }
                    );
                  }}
                >
                  <MapPin size={18} />
                </Button>
              </div>
            </div>
            <div className="space-y-2 pb-2">
              <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest ml-1">Teléfono de Enlace</label>
              <Input placeholder="Ej: 342 555-0123" value={newObjective.contact_phone}
                onChange={e => setNewObjective({...newObjective, contact_phone: e.target.value})} 
                className="h-12 bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl placeholder:text-zinc-300 shadow-sm"
              />
            </div>

            {/* Coords indicator & Precision Control */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Localización Geográfica</label>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0F4C5C]/5 border border-[#0F4C5C]/20 rounded-full shadow-sm">
                  <div className="w-1 h-1 rounded-full bg-[#0F4C5C]" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#0F4C5C]">U-TRACK HD READY</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-200 uppercase ml-1 tracking-widest">LAT</span>
                  <Input 
                    type="text" 
                    placeholder="-31.6..."
                    value={lastClickedCoords?.lat !== undefined && lastClickedCoords?.lat !== null ? String(lastClickedCoords.lat) : ''}
                    onChange={(e) => {
                      const str = e.target.value;
                      const parsed = parseFloat(str.replace(',', '.'));
                      setLastClickedCoords((prev: any) => ({ ...(prev || {}), lat: isNaN(parsed) ? str : parsed }));
                    }}
                    className="h-12 bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl text-xs font-mono shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-zinc-200 uppercase ml-1 tracking-widest">LNG</span>
                  <Input 
                    type="text" 
                    placeholder="-60.7..."
                    value={lastClickedCoords?.lng !== undefined && lastClickedCoords?.lng !== null ? String(lastClickedCoords.lng) : ''}
                    onChange={(e) => {
                      const str = e.target.value;
                      const parsed = parseFloat(str.replace(',', '.'));
                      setLastClickedCoords((prev: any) => ({ ...(prev || {}), lng: isNaN(parsed) ? str : parsed }));
                    }}
                    className="h-12 bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl text-xs font-mono shadow-sm"
                  />
                </div>
              </div>
 
              {lastClickedCoords && (
                <div className="flex items-center gap-4 p-5 bg-zinc-50 rounded-[1.5rem] border border-zinc-200 shadow-sm">
                  <div className="w-12 h-12 bg-white text-[#0F4C5C] rounded-xl flex items-center justify-center shrink-0 border border-zinc-200 shadow-sm">
                    <Target size={24} className="animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-[#0F4C5C] uppercase tracking-[0.2em]">Punto Confirmado</p>
                    <p className="text-[10px] font-medium text-zinc-400 truncate mt-1">
                      {newObjective.address || 'Ubicación táctica seleccionada'}
                    </p>
                  </div>
                </div>
              )}
            </div>
 
            <button type="submit" className="w-full h-14 bg-[#0F4C5C] text-white text-xs font-black uppercase tracking-[0.3em] rounded-xl hover:bg-[#C4A030] transition-all shadow-lg shadow-[#0F4C5C]/20 active:scale-[0.98]">
              Guardar Objetivo
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
