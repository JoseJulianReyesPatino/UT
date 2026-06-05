import React, { useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { Textarea } from "../../components/ui/textarea";
import { PdfPreview } from "../../components/PdfPreview";
import { carrieras, cuatrimestresLabels, parciales, planNormal, planNuevoModelo, type Cuatrimestre, type Plan } from "../../data/curricula";
import { Upload, FileText, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { getCalendarFileUrl } from "../../lib/calendar";

interface InstrumentoFormPageProps {
  title: string;
  subtitle: string;
  formTitle: string;
  percentageLabel: string;
  planLabel: string;
  plan: Plan | "";
  fileInputId: string;
  successMessage: string;
  allowPlanSelection?: boolean;
}

interface InstrumentoFormData {
  plan: Plan | "";
  carrera: string;
  cuatrimestre: Cuatrimestre | "";
  materia: string;
  parcial: string;
  grupo: string;
  archivos: File[];
  docente: string;
  nota: string;
}

const buildInitialFormData = (plan: Plan | ""): InstrumentoFormData => ({
  plan,
  carrera: "",
  cuatrimestre: "",
  materia: "",
  parcial: "",
  grupo: "",
  archivos: [],
  docente: "",
  nota: "",
});

export function InstrumentoFormPage(props: Readonly<InstrumentoFormPageProps>) {
  const { title, subtitle, formTitle, percentageLabel, planLabel, plan, fileInputId, successMessage } = props;
  const allowPlanSelection = props.allowPlanSelection ?? false;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<InstrumentoFormData>(() => buildInitialFormData(plan));
  const [sheetOpen, setSheetOpen] = useState(false);
  const calendarioUrl = getCalendarFileUrl();

  const carrerasDisponibles = useMemo(() => {
    if (allowPlanSelection && !formData.plan) return [];

    if (formData.plan === "nuevo-modelo") {
      const tsu = carrieras["nuevo-modelo"].tsu.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
      const ing = carrieras["nuevo-modelo"].ingenieria.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
      return [...tsu, ...ing];
    }
    return carrieras["plan-normal"].ingenieria.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
  }, [formData.plan, allowPlanSelection]);

  const cuatrimestresDisponibles = useMemo(() => {
    if (!formData.carrera) return [];
    const selectedPlan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carrera = selectedPlan[formData.carrera];
    if (!carrera) return [];
    return Object.keys(carrera.cuatrimestres);
  }, [formData.carrera, formData.plan]);

  const materiasDisponibles = useMemo(() => {
    if (!formData.carrera || !formData.cuatrimestre) return [];
    const selectedPlan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carrera = selectedPlan[formData.carrera];
    if (!carrera) return [];
    return carrera.cuatrimestres[formData.cuatrimestre] || [];
  }, [formData.carrera, formData.cuatrimestre, formData.plan]);

  const isValid = useMemo(() => {
    const validarGrupo = /^[A-Z]{2,4}-\d{2}$/i.test(formData.grupo);
    return Boolean(
      (allowPlanSelection ? formData.plan : true) &&
      formData.carrera &&
        formData.cuatrimestre &&
        formData.materia &&
        formData.parcial &&
        validarGrupo &&
        formData.archivos.length > 0 &&
        formData.docente.trim(),
    );
  }, [formData, allowPlanSelection]);

  const resetForm = () => setFormData(buildInitialFormData(plan));

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = formData.archivos.length + newFiles.length;
    if (totalFiles > 3) {
      toast.error("Máximo 3 archivos permitidos");
      return;
    }

    for (const file of newFiles) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} excede el límite de 2 MB`);
        return;
      }
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} debe ser un archivo PDF`);
        return;
      }
    }

    setFormData((current) => ({ ...current, archivos: [...current.archivos, ...newFiles] }));
  };

  const removeFile = (index: number) => {
    setFormData((current) => ({
      ...current,
      archivos: current.archivos.filter((_, fileIndex) => fileIndex !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(successMessage);
    setIsSubmitting(false);
    resetForm();
  };

  const getCuatrimestreLabel = (value: string) => cuatrimestresLabels[value as keyof typeof cuatrimestresLabels];

  const getArchivosLabel = () => {
    if (formData.archivos.length === 0) return "Selecciona tus archivos PDF";
    const count = formData.archivos.length;
    return `${count} archivo${count > 1 ? "s" : ""} cargado${count > 1 ? "s" : ""}`;
  };

  const getEspaciosLabel = () => {
    const espacios = 3 - formData.archivos.length;
    if (espacios === 0) return "Máximo alcanzado";
    return `${espacios} espacio${espacios > 1 ? "s" : ""} disponible${espacios > 1 ? "s" : ""}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {percentageLabel && (
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {percentageLabel}
              </Badge>
            )}
          </div>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Historial de archivos</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {formData.archivos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay archivos cargados en esta sesión.</p>
              ) : (
                <ul className="space-y-2">
                  {formData.archivos.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="text-sm">
                      {file.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-emerald-300 dark:border-emerald-300 rounded-md">
        <p className="text-sm font-medium text-black dark:text-white">Recordatorio: Se sube 3 días después de la aplicación de cada parcial.</p>
        <Button variant="outline" size="sm" onClick={() => window.open(calendarioUrl, "_blank")}>Calendario</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
          <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Plan *</Label>
            {allowPlanSelection ? (
              <div className="flex gap-2">
                <Button
                  variant={formData.plan === "nuevo-modelo" ? "success" : "outline"}
                  onClick={() => setFormData((current) => ({ ...current, plan: "nuevo-modelo", carrera: "", cuatrimestre: "", materia: "" }))}
                >
                  Plan Nuevo Modelo
                </Button>
                <Button
                  variant={formData.plan === "plan-normal" ? "success" : "outline"}
                  onClick={() => setFormData((current) => ({ ...current, plan: "plan-normal", carrera: "", cuatrimestre: "", materia: "" }))}
                >
                  Plan Normal
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {planLabel} - el plan se fija desde esta ruta.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Carrera *</Label>
            <Select
              value={formData.carrera}
              onValueChange={(value) => setFormData((current) => ({ ...current, carrera: value, cuatrimestre: "", materia: "" }))}
              disabled={allowPlanSelection && !formData.plan}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la carrera" />
              </SelectTrigger>
              <SelectContent>
                {carrerasDisponibles.map((career) => (
                  <SelectItem key={career.codigo} value={career.codigo}>
                    {career.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cuatrimestre *</Label>
            <Select value={formData.cuatrimestre} onValueChange={(value) => setFormData((current) => ({ ...current, cuatrimestre: value as Cuatrimestre, materia: "" }))} disabled={!formData.carrera}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el cuatrimestre" />
              </SelectTrigger>
              <SelectContent>
                {cuatrimestresDisponibles.map((value) => (
                  <SelectItem key={value} value={value}>
                    {getCuatrimestreLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Materia *</Label>
            <Select value={formData.materia} onValueChange={(value) => setFormData((current) => ({ ...current, materia: value }))} disabled={!formData.cuatrimestre}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la materia" />
              </SelectTrigger>
              <SelectContent>
                {materiasDisponibles.map((matter) => (
                  <SelectItem key={matter.nombre} value={matter.nombre}>
                    {matter.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Parcial *</Label>
              <Select value={formData.parcial} onValueChange={(value) => setFormData((current) => ({ ...current, parcial: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el parcial" />
                </SelectTrigger>
                <SelectContent>
                  {parciales.map((parcial) => (
                    <SelectItem key={parcial} value={parcial}>
                      {parcial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grupo *</Label>
              <Input value={formData.grupo} onChange={(event) => setFormData((current) => ({ ...current, grupo: event.target.value.toUpperCase() }))} placeholder="Ej. JTH-01" maxLength={7} />
              <p className="text-xs text-muted-foreground">Formato: Ej. JTH-01</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instrumento en PDF *</Label>
            <p className="text-sm text-muted-foreground">Adjuntar el documento en formato PDF, con un límite de 2 MB por archivo. Se permite hasta tres archivos.</p>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input type="file" accept=".pdf" multiple className="hidden" id={fileInputId} onChange={handleFileChange} disabled={formData.archivos.length >= 3} />
              <label htmlFor={fileInputId} className="cursor-pointer block space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">{getArchivosLabel()}</p>
                <p className="text-xs text-muted-foreground">{getEspaciosLabel()}</p>
              </label>
            </div>

            {formData.archivos.length > 0 && (
              <div className="space-y-2">
                {formData.archivos.map((archivo, index) => (
                  <div key={`${archivo.name}-${archivo.size}-${index}`} className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm flex-1">
                      <FileText className="h-4 w-4 text-success" />
                      <span className="font-medium">{archivo.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-6 w-6 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formData.archivos.length > 0 && (
            <div className="space-y-2">
              {formData.archivos.map((archivo, index) => (
                <PdfPreview key={`preview-${archivo.name}-${archivo.size}-${index}`} file={archivo} title={`Vista previa - ${archivo.name}`} />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Nombre del docente *</Label>
            <Input value={formData.docente} onChange={(event) => setFormData((current) => ({ ...current, docente: event.target.value }))} placeholder="Primer nombre y apellidos completos" />
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">Declaración de autorización</p>
            <p>Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares y confirmo la veracidad de la información proporcionada.</p>
          </div>

          <div className="space-y-2">
            <Label>Nota para administración (opcional)</Label>
            <Textarea value={formData.nota} onChange={(event) => setFormData((current) => ({ ...current, nota: event.target.value }))} placeholder="Agrega información adicional" />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
              Limpiar
            </Button>
            <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar instrumento"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
