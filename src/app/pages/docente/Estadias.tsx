import React, { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { PdfPreview } from "../../components/PdfPreview";
import { carrieras, Plan } from "../../data/curricula";

type DocumentoCarta = "carta-presentacion" | "carta-aceptacion" | "carta-terminacion" | "acta-final";

interface DocumentoConfig {
  id: DocumentoCarta;
  boton: string;
  titulo: string;
  descripcion: string;
  etiquetaCarga: string;
}

interface CartaFormData {
  plan: Plan | "";
  carrera: string;
  grupo: string;
  archivos: File[];
  nota: string;
  docente: string;
}

const documentTypes: DocumentoConfig[] = [
  { id: "carta-presentacion", boton: "Carta de Presentación", titulo: "CARTA DE PRESENTACIÓN", descripcion: "Sube la carta de presentación correspondiente.", etiquetaCarga: "Subir Carta de Presentación" },
  { id: "carta-aceptacion", boton: "Carta de Aceptación", titulo: "CARTA DE ACEPTACIÓN", descripcion: "Adjunta la carta de aceptación en PDF.", etiquetaCarga: "Subir Carta de Aceptación" },
  { id: "carta-terminacion", boton: "Carta de Terminación", titulo: "CARTA DE TERMINACIÓN", descripcion: "Sube la carta de terminación.", etiquetaCarga: "Subir Carta de Terminación" },
  { id: "acta-final", boton: "Acta final", titulo: "ACTA FINAL", descripcion: "Adjunta el acta final en PDF.", etiquetaCarga: "Subir Acta Final" },
];

const initialFormData: CartaFormData = { plan: "", carrera: "", grupo: "", archivos: [], nota: "", docente: "" };

export default function EstadiasPage() {
  const [selectedType, setSelectedType] = useState<DocumentoCarta | null>(null);
  const [formData, setFormData] = useState<CartaFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedConfig = useMemo(() => documentTypes.find((d) => d.id === selectedType) ?? null, [selectedType]);

  // Carreras según plan
  const carrerasDisponibles = useMemo(() => {
    if (!formData.plan) return [];
    if (formData.plan === "nuevo-modelo") {
      const tsu = carrieras["nuevo-modelo"].tsu.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
      const ing = carrieras["nuevo-modelo"].ingenieria.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
      return [...tsu, ...ing];
    }
    return carrieras["plan-normal"].ingenieria.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
  }, [formData.plan]);

  const isValid = useMemo(() => {
    const validarGrupo = /^[A-Z]{2,4}-\d{2}$/i.test(formData.grupo);
    return Boolean(formData.plan && formData.carrera && validarGrupo && formData.archivos.length > 0 && formData.docente.trim());
  }, [formData]);

  const handleSelectType = (t: DocumentoCarta) => {
    setFormData(initialFormData);
    setSelectedType(t);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    const total = formData.archivos.length + newFiles.length;
    if (total > 3) { toast.error("Máximo 3 archivos permitidos"); return; }
    for (const f of newFiles) {
      if (f.size > 2 * 1024 * 1024) { toast.error(`${f.name} excede el límite de 2 MB`); return; }
      if (f.type !== "application/pdf") { toast.error(`${f.name} debe ser un archivo PDF`); return; }
    }
    setFormData((c) => ({ ...c, archivos: [...c.archivos, ...newFiles] }));
  };

  const removeFile = (index: number) => setFormData((c) => ({ ...c, archivos: c.archivos.filter((_, i) => i !== index) }));

  const resetForm = () => setFormData(initialFormData);

  const getArchivosLabel = () => {
    if (formData.archivos.length === 0) return "Selecciona tus archivos PDF";
    const count = formData.archivos.length;
    const plural = count > 1 ? "s" : "";
    return `${count} archivo${plural} cargado${plural}`;
  };

  const getEspaciosLabel = () => {
    const espacios = 3 - formData.archivos.length;
    if (espacios === 0) return "Máximo alcanzado";
    const plural = espacios > 1 ? "s" : "";
    return `${espacios} espacio${plural} disponible${plural}`;
  };

  const handleSubmit = async () => {
    if (!isValid || !selectedConfig) { toast.error("Completa todos los campos obligatorios"); return; }
    setIsSubmitting(true); await new Promise((r) => setTimeout(r, 1000)); toast.success(`${selectedConfig.titulo} enviada correctamente`); setIsSubmitting(false); resetForm();
  };

  // Texto de cuatrimestres aplicables por plan
  let cuatrimestresTexto = "";
  if (formData.plan === "nuevo-modelo") cuatrimestresTexto = "Aplicable en cuatrimestres 6 y 10";
  else if (formData.plan === "plan-normal") cuatrimestresTexto = "Aplicable en cuatrimestre 6 y 11";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Cartas y Acta</h1>
        <p className="text-muted-foreground">Seleccione el tipo de archivo que desea subir.</p>
      </div>

      {selectedConfig === null ? (
        <Card>
          <CardHeader>
            <CardTitle>Tipos de archivo</CardTitle>
            <CardDescription>Elige una opción para abrir su formulario correspondiente.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {documentTypes.map((type) => (
                <Button key={type.id} variant="outline" onClick={() => handleSelectType(type.id)} className="h-auto min-h-24 justify-between rounded-2xl border-border bg-background px-4 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <span className="flex flex-col items-start gap-1 whitespace-normal pr-3"><span className="text-sm font-semibold leading-snug">{type.boton}</span><span className="text-xs text-muted-foreground">Abrir formulario</span></span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{selectedConfig.titulo}</CardTitle>
                <CardDescription>{selectedConfig.descripcion}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedType(null)}><ArrowLeft className="mr-2 h-4 w-4"/>Cambiar tipo</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Plan *</Label>
              <div className="flex gap-2">
                <Button variant={formData.plan === "nuevo-modelo" ? "success" : "outline"} onClick={() => setFormData((c)=>({...c, plan: "nuevo-modelo", carrera: ""}))}>Plan Nuevo Modelo</Button>
                <Button variant={formData.plan === "plan-normal" ? "success" : "outline"} onClick={() => setFormData((c)=>({...c, plan: "plan-normal", carrera: ""}))}>Plan Normal</Button>
              </div>
              {cuatrimestresTexto && <p className="text-xs text-muted-foreground mt-2">{cuatrimestresTexto}</p>}
            </div>

            <div className="space-y-2">
              <Label>Carrera *</Label>
              <Select value={formData.carrera} onValueChange={(v)=>setFormData((c)=>({...c, carrera: v}))} disabled={!formData.plan}>
                <SelectTrigger><SelectValue placeholder="Selecciona la carrera"/></SelectTrigger>
                <SelectContent>{carrerasDisponibles.map((c)=>(<SelectItem key={c.codigo} value={c.codigo}>{c.nombre}</SelectItem>))}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grupo *</Label>
              <Input value={formData.grupo} onChange={(e)=>setFormData((c)=>({...c, grupo: e.target.value.toUpperCase()}))} placeholder="Ej. JTH-01" maxLength={7} />
              <p className="text-xs text-muted-foreground">Ejemplo: JTH-01</p>
            </div>

            <div className="space-y-2">
              <Label>{selectedConfig.etiquetaCarga} *</Label>
              <p className="text-sm text-muted-foreground">Adjuntar el documento en formato PDF, con un límite de 2 MB por archivo. Hasta 3 archivos.</p>
              <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                <input type="file" accept=".pdf" multiple className="hidden" id="carta-pdf-upload" onChange={handleFileChange} disabled={formData.archivos.length>=3} />
                <label htmlFor="carta-pdf-upload" className="block cursor-pointer space-y-2"><Upload className="mx-auto h-8 w-8 text-muted-foreground"/><p className="text-sm font-medium">{getArchivosLabel()}</p><p className="text-xs text-muted-foreground">{getEspaciosLabel()}</p></label>
              </div>

              {formData.archivos.length>0 && (<div className="space-y-2">{formData.archivos.map((archivo,index)=>(<div key={`${archivo.name}-${archivo.size}-${index}`} className="flex items-center justify-between rounded-lg border border-success/20 bg-success/10 p-3"><div className="flex items-center gap-2 text-sm flex-1"><FileText className="h-4 w-4 text-success"/><span className="font-medium">{archivo.name}</span></div><Button variant="ghost" size="sm" onClick={()=>removeFile(index)} className="h-6 w-6 p-0"><X className="h-4 w-4"/></Button></div>))}</div>)}

              {formData.archivos.length>0 && (<div className="space-y-2 pt-2">{formData.archivos.map((archivo,index)=>(<PdfPreview key={`preview-${archivo.name}-${archivo.size}-${index}`} file={archivo} title={`Vista previa - ${archivo.name}`}/>))}</div>)}
            </div>

            <div className="space-y-2">
              <Label>Nota para administrador (Opcional)</Label>
              <Textarea value={formData.nota} onChange={(e)=>setFormData((c)=>({...c, nota: e.target.value}))} placeholder="Agrega una nota para revisión" />
            </div>

            <div className="space-y-2">
              <Label>Nombre del docente (Obligatorio)</Label>
              <Input value={formData.docente} onChange={(e)=>setFormData((c)=>({...c, docente: e.target.value}))} placeholder="Primer Nombre y Apellidos Completos" />
            </div>

            <div className="space-y-2 text-sm">
              <p>Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares y confirmo la veracidad de la información proporcionada.</p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>Limpiar</Button>
              <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting}>{isSubmitting?"Enviando...":"Enviar"}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
