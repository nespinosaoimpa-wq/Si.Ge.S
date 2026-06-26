'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  FileLock2, 
  Hash, 
  Search, 
  Download, 
  Camera,
  MapPin,
  CheckCircle2,
  AlertOctagon,
  FileDigit,
  Fingerprint,
  FileText,
  User,
  Printer,
  ChevronRight,
  Plus,
  Trash2,
  Scale
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

// --- ACTA TEMPLATES (Formal Argentine Legal/Police Language) ---
const ACT_TEMPLATES = {
  detencion: {
    title: 'ACTA DE DETENCIÓN',
    content: `En la ciudad de __________, Provincia de Si.Ge.S, a los ___ días del mes de __________ del año 2026, siendo las ___:___ horas, el que suscribe, ____________________, con jerarquía de ____________________, legajo N° __________, cumpliendo funciones en ____________________, hace constar que en la fecha se procede a la DETENCIÓN de una persona de sexo __________, quien dice llamarse ____________________, de ___ años de edad, con domicilio en ____________________.

MOTIVO DE LA INTERVENCIÓN: __________________________________________________________________
_____________________________________________________________________________________________

LECTURA DE DERECHOS: Se le hace saber al encausado que le asisten los derechos previstos en la normativa vigente, especialmente el de designar abogado defensor y que no está obligado a declarar contra sí mismo...

No siendo para más, se da por finalizado el acto, previa lectura y ratificación, firmando los comparecientes al pie para constancia.`
  },
  allanamiento: {
    title: 'ACTA DE ALLANAMIENTO',
    content: `En la ciudad de __________, siendo las ___:___ horas del día ___ de __________ de 2026, personal policial de la dependencia ____________________, bajo la supervisión de ____________________, se constituye en el domicilio sito en calle ____________________, a los fines de dar cumplimiento a la Orden de Allanamiento n° __________, emanada por el Juzgado ____________________, en autos caratulados "____________________ s/ ____________________".

DESARROLLO DEL PROCEDIMIENTO: Una vez en el lugar, se procede a _____________________________________
_____________________________________________________________________________________________

TESTIGOS DE ACTUACIÓN:
1. ____________________, DNI __________, domicilio en ____________________.
2. ____________________, DNI __________, domicilio en ____________________.

RESULTADO: Se procede al secuestro de (detallar elementos si los hubiera): _________________________
_____________________________________________________________________________________________

Finalizada la diligencia, se labra la presente acta...`
  },
  secuestro: {
    title: 'ACTA DE SECUESTRO Y CADENA DE CUSTODIA',
    content: `En el marco de las actuaciones caratuladas "____________________", se procede al SECUESTRO de los elementos que a continuación se detallan:

ITEM 1: ______________________________________________________________________________________
ITEM 2: ______________________________________________________________________________________

OBSERVACIONES DE ESTADO: Los elementos se encuentran en (buen/regular/mal) estado, procediéndose a su lacrado con precinto n° __________ para asegurar la CADENA DE CUSTODIA.

INTERVINIENTE: ____________________
CARGO: ____________________
FECHA Y HORA: ___/___/2026 - ___:___ hs.`
  },
  oficio: {
    title: 'ACTA DE ACTUACIÓN DE OFICIO',
    content: `ACTUACIÓN DE OFICIO: Siendo las ___:___ horas, el personal preventor que se encuentra realizando tareas de ____________________ en la zona de ____________________, observa que _________________________
_____________________________________________________________________________________________
_____________________________________________________________________________________________

Ante tal circunstancia, se procede a ___________________________________________________________
dando inmediato aviso a la superioridad y a la fiscalía en turno a cargo del Dr. ____________________.

Se deja constancia de lo actuado para los fines legales que correspondan.`
  },
  informe: {
    title: 'INFORME OPERATIVO ELEVADO',
    content: `AL SEÑOR JEFE DE ____________________
S / D:

Me dirijo a Ud. a los fines de elevar el presente INFORME sobre las novedades ocurridas durante el servicio de seguridad adicional prestado en ____________________ el día ___/___/2026.

DETALLE DE LA NOVEDAD: _______________________________________________________________________
_____________________________________________________________________________________________
_____________________________________________________________________________________________

ACCIONES TOMADAS: ____________________________________________________________________________
_____________________________________________________________________________________________

Atentamente,
____________________
Legajo __________`
  }
};

const evidenceData = [
  { id: 'EV-8821', time: '23:40', type: 'Posición GPS', user: 'Op. Méndez', hash: '8e7f1...a2b3', status: 'Congelado' },
  { id: 'EV-8820', time: '23:38', type: 'Foto Evidencia', user: 'Op. Ruiz', hash: 'f4d2c...9e8d', status: 'Congelado' },
  { id: 'EV-8819', time: '23:35', type: 'Log de Voz', user: 'Radio M-02', hash: '2b0a3...c1d5', status: 'Congelado' },
];

export default function JudicialPage() {
  const [isFrozen, setIsFrozen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof ACT_TEMPLATES | null>(null);
  const [actaContent, setActaContent] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  const handlePanic = async () => {
    try {
      await api.judicial.freeze({
        frozen_by: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'Activación manual de pánico judicial',
        latitude: -31.62,
        longitude: -60.70,
      });
      setIsFrozen(true);
    } catch (error) {
      console.error('Error initiating judicial freeze:', error);
    }
  };

  const handleSelectTemplate = (key: keyof typeof ACT_TEMPLATES) => {
    setSelectedTemplate(key);
    setActaContent(ACT_TEMPLATES[key].content);
    setIsPreviewMode(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Rebranding */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
            <Scale className="text-primary" size={32} />
            Asistente Judicial
          </h1>
          <p className="text-[11px] text-amber-500 uppercase font-bold tracking-[0.2em] mt-1">
            Plataforma de Si.Ge.S — Auxiliar de Justicia
          </p>
        </div>
        <div className="hidden md:flex gap-3">
          <Button variant="outline" className="gap-2 border-white/10 text-gray-400 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest h-10">
            <Fingerprint size={16} /> Auditoría Digital
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Template Selection & Editor */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-white/5 bg-zinc-900/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-[2rem]">
            <CardHeader className="border-b border-white/5 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <FileText size={16} className="text-primary" /> Generador de Actas Profesionales
                  </CardTitle>
                  <CardDescription className="text-[11px] text-gray-500 uppercase mt-1 font-bold">
                    Seleccione un modelo para iniciar la redacción formal
                  </CardDescription>
                </div>
                {selectedTemplate && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSelectedTemplate(null); setActaContent(''); }}
                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-8"
                  >
                    <Trash2 size={14} className="mr-2" /> CANCELAR
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {!selectedTemplate ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.keys(ACT_TEMPLATES) as Array<keyof typeof ACT_TEMPLATES>).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSelectTemplate(key)}
                      className="group p-6 bg-black/40 border border-white/5 rounded-3xl text-left transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-95"
                    >
                      <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                        <FileText size={24} />
                      </div>
                      <h4 className="text-xs font-black text-white uppercase tracking-tight mb-1">{ACT_TEMPLATES[key].title}</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-bold group-hover:text-primary/70 transition-colors">Generar Documento</p>
                    </button>
                  ))}
                  <button className="p-6 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600 hover:border-white/20 hover:text-gray-400 transition-all">
                    <Plus size={32} className="mb-2" />
                    <span className="text-[10px] font-black uppercase">Nuevo Formato</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4 p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-primary uppercase">Modelo Activo</p>
                        <h3 className="text-sm font-black text-white uppercase italic">{ACT_TEMPLATES[selectedTemplate].title}</h3>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant={isPreviewMode ? "primary" : "outline"} 
                        size="sm"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className="h-10 rounded-xl text-[11px] font-black uppercase tracking-widest"
                      >
                        {isPreviewMode ? "VOLVER A EDITAR" : "VISTA PREVIA PDF"}
                      </Button>
                      {isPreviewMode && (
                        <Button 
                          onClick={handlePrint}
                          className="h-10 rounded-xl text-[11px] font-black uppercase tracking-widest gap-2"
                        >
                          <Printer size={14} /> IMPRIMIR ACTA
                        </Button>
                      )}
                    </div>
                  </div>

                  {isPreviewMode ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-12 shadow-2xl rounded-sm min-h-[600px] text-black font-serif print:p-0 print:shadow-none"
                      id="printable-acta"
                    >
                      <div className="max-w-2xl mx-auto space-y-8">
                        <div className="text-center border-b-2 border-black pb-8">
                          <h2 className="text-2xl font-bold uppercase tracking-[0.2em]">{ACT_TEMPLATES[selectedTemplate].title}</h2>
                          <p className="text-[12px] font-bold mt-2">DILIGENCIA POLICIAL / JUDICIAL</p>
                        </div>
                        
                        <div className="whitespace-pre-wrap leading-loose text-[14px] text-justify">
                          {actaContent}
                        </div>

                        <div className="mt-20 grid grid-cols-2 gap-20 pt-10">
                          <div className="border-t border-black text-center pt-2">
                            <p className="text-[11px] font-bold uppercase">FIRMA INTERVINIENTE</p>
                            <p className="text-[10px] uppercase text-gray-500 mt-1">Aclaración y Legajo</p>
                          </div>
                          <div className="border-t border-black text-center pt-2">
                            <p className="text-[11px] font-bold uppercase">FIRMA COMPARECIENTE</p>
                            <p className="text-[10px] uppercase text-gray-400 mt-1">DNI / Testigo / Imputado</p>
                          </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-end">
                           <div className="text-[9px] text-gray-400 font-mono">
                             ID: Si.Ge.S-{Math.random().toString(36).substring(7).toUpperCase()}-2026<br />
                             HASH: {Math.random().toString(16).substring(2, 20)}
                           </div>
                           <p className="text-[10px] font-bold uppercase text-gray-300 italic">Si.Ge.S — Gestión Digital</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest px-1">Cuerpo del Documento (Editable)</p>
                      <textarea
                        className="w-full min-h-[450px] bg-black/40 border border-white/10 rounded-3xl p-8 text-sm font-medium text-gray-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition-all leading-relaxed"
                        value={actaContent}
                        onChange={(e) => setActaContent(e.target.value)}
                        placeholder="Redacte el acta aquí..."
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence Table (Repurposed for context) */}
          <Card className="border-white/5 bg-zinc-900/20 backdrop-blur-md rounded-[2rem] overflow-hidden">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                <FileDigit size={14} className="text-primary" /> Historial de Registros Digitales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-black/40 border-b border-white/5">
                      <th className="p-6 text-[11px] text-gray-600 uppercase font-black tracking-widest">Hash ID</th>
                      <th className="p-6 text-[11px] text-gray-600 uppercase font-black tracking-widest">Tipo / Origen</th>
                      <th className="p-6 text-[11px] text-gray-600 uppercase font-black tracking-widest">Estado</th>
                      <th className="p-6 text-[11px] text-gray-600 uppercase font-black tracking-widest text-right">Firma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceData.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="p-6">
                          <span className="text-[11px] font-mono text-gray-400 group-hover:text-primary transition-colors">{row.id}</span>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-black text-white uppercase">{row.type}</span>
                            <span className="text-[11px] text-gray-500 font-bold uppercase">{row.time} hs</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-full border border-green-500/20">
                            {row.status}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-all">
                              <Download size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Controls & Context */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Panic Protocol (Kept but refined) */}
          <Card className="border-red-500/20 bg-red-500/5 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-red-500/10 p-6 border-b border-red-500/10">
              <CardTitle className="text-red-500 text-xs font-black uppercase flex items-center gap-2 tracking-widest">
                <AlertOctagon size={18} /> Resguardo Inmediato
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="text-center p-8 bg-black/40 rounded-3xl border border-red-500/20 shadow-2xl relative">
                {!isFrozen ? (
                  <>
                    <ShieldAlert size={48} className="text-red-600 mx-auto mb-4 animate-pulse" />
                    <p className="text-[11px] text-white uppercase font-black tracking-widest mb-6">Bloquear base para pericia</p>
                    <Button 
                      variant="destructive" 
                      className="w-full h-16 bg-red-600 rounded-2xl text-sm font-black shadow-lg shadow-red-600/40 active:scale-95 transition-all"
                      onClick={handlePanic}
                    >
                      PÁNICO JUDICIAL
                    </Button>
                  </>
                ) : (
                  <>
                    <FileLock2 size={48} className="text-green-500 mx-auto mb-4" />
                    <p className="text-[11px] text-green-500 uppercase font-black tracking-widest mb-2">ENTORNO ASEGURADO</p>
                    <div className="text-4xl font-mono text-white mb-2">01:59:59</div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Protección de Datos Activa</p>
                  </>
                )}
              </div>
              
              <div className="space-y-3">
                 <div className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-2xl">
                    <Fingerprint className="text-primary" size={24} />
                    <div>
                      <p className="text-[11px] font-black text-gray-500 uppercase">Firma de Integridad</p>
                      <p className="text-[11px] font-mono text-white truncate w-40">sha256_b48f921a...</p>
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Camera Locator (Refined) */}
          <Card className="border-white/5 bg-zinc-900/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="p-6 border-b border-white/5">
              <CardTitle className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Camera size={16} className="text-primary" /> Cercanía Forense
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex gap-2 mb-6">
                <Input placeholder="LAT, LNG" className="bg-black/20 border-white/10 text-[11px] h-12 rounded-xl font-mono tracking-widest" />
                <Button className="h-12 px-6 rounded-xl text-[11px] font-black uppercase">SCAN</Button>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'DOMO-04 Centro', dist: '145m', status: 'Verificado' },
                  { name: 'CAM-09 Acceso', dist: '290m', status: 'Verificado' },
                ].map((cam, i) => (
                  <div key={i} className="p-4 bg-black/20 border border-white/5 rounded-2xl flex justify-between items-center text-[11px] font-bold">
                    <div className="flex items-center gap-3 text-white uppercase italic">
                      <Camera size={14} className="text-primary" /> {cam.name}
                    </div>
                    <div className="flex gap-4 uppercase tracking-tighter text-gray-500">
                      <span>{cam.dist}</span>
                      <span className="text-green-500">{cam.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Profile Context */}
          <Card className="border-primary/20 bg-primary/5 rounded-[2rem] p-8 text-center border-dashed">
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={32} />
            </div>
            <h4 className="text-sm font-black text-white uppercase mb-1">Redactor Activo</h4>
            <p className="text-[11px] text-gray-500 uppercase font-bold tracking-widest mb-4">Complete los datos manualmente en el acta según su dependencia</p>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-2/3" />
            </div>
          </Card>

        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-acta, #printable-acta * {
            visibility: visible;
          }
          #printable-acta {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
