import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Upload, FileText, Menu, X } from "lucide-react";
// PdfPreview removed: not used in this form
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { planNuevoModelo, planNormal, carrieras, cuatrimestresLabels, Plan, Cuatrimestre } from "../../data/curricula";

interface TutoriasFormData {
  plan: Plan | "";
  carrera: string;
  cuatrimestre: Cuatrimestre | "";
  grupo: string;
  tipoTutoria: string;
  fechaTutoria: string;
  estudiantes: number | "";
  acuerdos: string;
  archivos: File[];
  docente: string;
  autorizacion: boolean;
}

const initialFormData: TutoriasFormData = {
  plan: "",
  carrera: "",
  cuatrimestre: "",
  grupo: "",
  tipoTutoria: "",
  fechaTutoria: "",
  estudiantes: "",
  acuerdos: "",
  archivos: [],
  docente: "",
  autorizacion: false,
};

const tipos = ["Académica", "Personal", "Grupal"];

export default function TutoriasPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TutoriasFormData>(initialFormData);
  const [sheetOpen, setSheetOpen] = useState(false);

  const carrerasDisponibles = useMemo(() => {
    if (!formData.plan) return [];
    if (formData.plan === "nuevo-modelo") {
      const tsu = carrieras["nuevo-modelo"].tsu.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
      const ing = carrieras["nuevo-modelo"].ingenieria.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
      return [...tsu, ...ing];
    }
    return carrieras["plan-normal"].ingenieria.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
  }, [formData.plan]);

  const cuatrimestresDisponibles = useMemo(() => {
    if (!formData.carrera || !formData.plan) return [];
    const plan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carrera = plan[formData.carrera];
    if (!carrera) return [];
    return Object.keys(carrera.cuatrimestres);
  }, [formData.carrera, formData.plan]);

  const isValid = useMemo(() => {
    const validarGrupo = /^[A-Z]{2,4}-\d{2}$/i.test(formData.grupo);
    return Boolean(
      formData.plan &&
        formData.carrera &&
        formData.cuatrimestre &&
        validarGrupo &&
        formData.tipoTutoria &&
        formData.fechaTutoria &&
        formData.estudiantes !== "" &&
        formData.docente.trim() &&
        formData.autorizacion
    );
  }, [formData]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    const totalFiles = formData.archivos.length + newFiles.length;
    if (totalFiles > 3) { toast.error("Máximo 3 archivos permitidos"); return; }
    for (let file of newFiles) {
      if (file.size > 2 * 1024 * 1024) { toast.error(`${file.name} excede el límite de 2 MB`); return; }
      if (file.type !== "application/pdf") { toast.error(`${file.name} debe ser un archivo PDF`); return; }
    }
    setFormData((c) => ({ ...c, archivos: [...c.archivos, ...newFiles] }));
  };

  const removeFile = (index: number) => setFormData((c) => ({ ...c, archivos: c.archivos.filter((_, i) => i !== index) }));

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

  const resetForm = () => setFormData(initialFormData);
  const handleSubmit = async () => {
    if (!isValid) { toast.error("Completa todos los campos obligatorios"); return; }
    setIsSubmitting(true); await new Promise((r) => setTimeout(r, 1000)); toast.success("Tutoría registrada correctamente"); setIsSubmitting(false); resetForm();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1"><h1 className="text-3xl font-bold">Tutorías</h1><p className="text-muted-foreground">Registra tus sesiones de tutoría.</p></div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetTrigger asChild><Button variant="outline" size="icon"><Menu className="h-5 w-5"/></Button></SheetTrigger><SheetContent side="right"><SheetHeader><SheetTitle>Seleccionar Plan</SheetTitle></SheetHeader><div className="space-y-3 mt-6"><Button variant={formData.plan === "nuevo-modelo" ? "default" : "outline"} className="w-full" onClick={() => { setFormData((c) => ({ ...c, plan: "nuevo-modelo", carrera: "", cuatrimestre: "" })); setSheetOpen(false); }}>Plan Nuevo Modelo</Button><Button variant={formData.plan === "plan-normal" ? "default" : "outline"} className="w-full" onClick={() => { setFormData((c) => ({ ...c, plan: "plan-normal", carrera: "", cuatrimestre: "" })); setSheetOpen(false); }}>Plan Normal</Button></div></SheetContent></Sheet>
      </div>

      <Card>
        <CardHeader><CardTitle>Formulario Tutorías</CardTitle><CardDescription>Los campos marcados con * son obligatorios.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          {formData.plan && (<div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm"><span className="font-medium">Plan actual:</span> {formData.plan === "nuevo-modelo" ? "Plan Nuevo Modelo" : "Plan Normal"}</p></div>)}

          <div className="space-y-2"><Label>Carrera *</Label><Select value={formData.carrera} onValueChange={(v)=>setFormData((c)=>({...c, carrera: v, cuatrimestre: ""}))} disabled={!formData.plan}><SelectTrigger><SelectValue placeholder="Selecciona la carrera"/></SelectTrigger><SelectContent>{carrerasDisponibles.map((c)=> (<SelectItem key={c.codigo} value={c.codigo}>{c.nombre}</SelectItem>))}</SelectContent></Select></div>

          <div className="space-y-2"><Label>Cuatrimestre *</Label><Select value={formData.cuatrimestre} onValueChange={(v)=>setFormData((c)=>({...c, cuatrimestre: v as Cuatrimestre}))} disabled={!formData.carrera}><SelectTrigger><SelectValue placeholder="Selecciona el cuatrimestre"/></SelectTrigger><SelectContent>{cuatrimestresDisponibles.map((q)=>(<SelectItem key={q} value={q}>{cuatrimestresLabels[q]}</SelectItem>))}</SelectContent></Select></div>

          <div className="space-y-2"><Label>Grupo *</Label><Input value={formData.grupo} onChange={(e)=>setFormData((c)=>({...c, grupo: e.target.value.toUpperCase()}))} placeholder="Ej. JTH-01" maxLength={7}/><p className="text-xs text-muted-foreground">Formato: Ej. JTH-01</p></div>

          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Tipo de Tutoría *</Label><Select value={formData.tipoTutoria} onValueChange={(v)=>setFormData((c)=>({...c, tipoTutoria: v}))}><SelectTrigger><SelectValue placeholder="Selecciona el tipo"/></SelectTrigger><SelectContent>{tipos.map((t)=> (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Fecha *</Label><Input type="date" value={formData.fechaTutoria} onChange={(e)=>setFormData((c)=>({...c, fechaTutoria: e.target.value}))}/></div></div>

          <div className="space-y-2"><Label>Estudiantes *</Label><Input type="number" min={1} value={formData.estudiantes} onChange={(e)=> setFormData((c)=>({...c, estudiantes: e.target.value === "" ? "" : Number(e.target.value)}))} placeholder="Número de estudiantes"/></div>

          <div className="space-y-2"><Label>Acuerdos y seguimiento</Label><Textarea value={formData.acuerdos} onChange={(e)=>setFormData((c)=>({...c, acuerdos: e.target.value}))} rows={4} placeholder="Anota acuerdos y fechas de seguimiento"/></div>

          <div className="space-y-2"><Label>Archivos (opcional, PDFs)</Label><p className="text-sm text-muted-foreground">Máximo 3 archivos PDF, 2 MB cada uno.</p><div className="border-2 border-dashed border-border rounded-lg p-6 text-center"><input type="file" accept=".pdf" multiple className="hidden" id="tutorias-pdf-upload" onChange={handleFileChange} disabled={formData.archivos.length>=3}/><label htmlFor="tutorias-pdf-upload" className="cursor-pointer block space-y-2"><Upload className="h-8 w-8 mx-auto text-muted-foreground"/><p className="text-sm font-medium">{getArchivosLabel()}</p><p className="text-xs text-muted-foreground">{getEspaciosLabel()}</p></label></div>{formData.archivos.length>0 && (<div className="space-y-2">{formData.archivos.map((archivo,index)=>(<div key={`${archivo.name}-${archivo.size}-${index}`} className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center justify-between"><div className="flex items-center gap-2 text-sm flex-1"><FileText className="h-4 w-4 text-success"/><span className="font-medium">{archivo.name}</span></div><Button variant="ghost" size="sm" onClick={()=>removeFile(index)} className="h-6 w-6 p-0"><X className="h-4 w-4"/></Button></div>))}</div>)}</div>

          <div className="space-y-2"><Label>Nombre del docente *</Label><Input value={formData.docente} onChange={(e)=>setFormData((c)=>({...c, docente: e.target.value}))} placeholder="Primer nombre y apellidos completos"/></div>

          <div className="space-y-2"><div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-3"><p className="font-medium">Declaración de autorización</p><p>Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares y confirmo la veracidad de la información proporcionada.</p><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.autorizacion} onChange={(e)=>setFormData((c)=>({...c, autorizacion: e.target.checked}))} className="h-4 w-4"/><span className="text-sm font-medium">Autorizo el uso de esta información</span></label></div></div>

          <div className="flex gap-3 pt-4 border-t"><Button variant="outline" onClick={resetForm} disabled={isSubmitting}>Limpiar</Button><Button variant="success" onClick={handleSubmit} disabled={!isValid||isSubmitting}>{isSubmitting?"Enviando...":"Registrar tutoría"}</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
