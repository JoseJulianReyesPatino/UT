import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Upload, FileText, Menu, X } from "lucide-react";
import { PdfPreview } from "../../components/PdfPreview";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { carrieras, cuatrimestresLabels, Plan, Cuatrimestre } from "../../data/curricula";

interface EstadiasFormData {
  plan: Plan | "";
  carrera: string;
  cuatrimestre: Cuatrimestre | "";
  grupo: string;
  programa: string;
  periodo: string;
  empresa: string;
  archivos: File[];
  docente: string;
  autorizacion: boolean;
}

const initialFormData: EstadiasFormData = {
  plan: "",
  carrera: "",
  cuatrimestre: "",
  grupo: "",
  programa: "",
  periodo: "",
  empresa: "",
  archivos: [],
  docente: "",
  autorizacion: false,
};

export default function EstadiasPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<EstadiasFormData>(initialFormData);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Obtener carreras disponibles según el plan
  const carrerasDisponibles = useMemo(() => {
    if (!formData.plan) return [];
    
    if (formData.plan === "nuevo-modelo") {
      const tsu = carrieras["nuevo-modelo"].tsu.map(c => ({ codigo: c.codigo, nombre: c.nombre, tipo: "TSU" }));
      const ing = carrieras["nuevo-modelo"].ingenieria.map(c => ({ codigo: c.codigo, nombre: c.nombre, tipo: "Ingeniería" }));
      return [...tsu, ...ing];
    } else {
      return carrieras["plan-normal"].ingenieria.map(c => ({ codigo: c.codigo, nombre: c.nombre, tipo: "Plan Normal" }));
    }
  }, [formData.plan]);

  // Obtener cuatrimestres permitidos para estadías según el plan
  const cuatrimestresDisponibles = useMemo(() => {
    if (!formData.plan || !formData.carrera) return [];
    // Para estadías solo se manejan dos cuatrimestres según el plan
    if (formData.plan === "nuevo-modelo") {
      return ["6", "10"];
    }
    // plan-normal
    return ["6", "11"];
  }, [formData.plan, formData.carrera]);

  const isValid = useMemo(() => {
    const validarGrupo = /^[A-Z]{2,4}-\d{2}$/i.test(formData.grupo);
    return (
      formData.plan &&
      formData.carrera &&
      formData.cuatrimestre &&
      validarGrupo &&
      formData.programa.trim() &&
      formData.periodo.trim() &&
      formData.empresa.trim() &&
      formData.archivos.length > 0 &&
      formData.docente.trim() &&
      formData.autorizacion
    );
  }, [formData]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = formData.archivos.length + newFiles.length;

    if (totalFiles > 3) {
      toast.error("Máximo 3 archivos permitidos");
      return;
    }

    for (let file of newFiles) {
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
      archivos: current.archivos.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

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
    if (!isValid) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    toast.success("Estadías enviadas correctamente", {
      description: "Tu documento fue enviado para revision administrativa.",
    });
    setIsSubmitting(false);
    resetForm();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Estadías</h1>
          <p className="text-muted-foreground">Captura y envía la documentación de tus estadías profesionales.</p>
        </div>

        {/* Menú de hamburguesa para seleccionar Plan */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Seleccionar Plan</SheetTitle>
            </SheetHeader>
            <div className="space-y-3 mt-6">
              <Button
                variant={formData.plan === "nuevo-modelo" ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setFormData((current) => ({
                    ...current,
                    plan: "nuevo-modelo",
                    carrera: "",
                    cuatrimestre: "",
                  }));
                  setSheetOpen(false);
                }}
              >
                Plan Nuevo Modelo
              </Button>
              <Button
                variant={formData.plan === "plan-normal" ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setFormData((current) => ({
                    ...current,
                    plan: "plan-normal",
                    carrera: "",
                    cuatrimestre: "",
                  }));
                  setSheetOpen(false);
                }}
              >
                Plan Normal
              </Button>
            </div>
            {formData.plan && (
              <div className="mt-6 p-3 bg-blue-50 rounded-lg text-sm">
                <p className="font-medium">Plan seleccionado:</p>
                <p>{formData.plan === "nuevo-modelo" ? "Plan Nuevo Modelo" : "Plan Normal"}</p>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulario de Estadías</CardTitle>
          <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Plan actual */}
          {formData.plan && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Plan actual:</span>{" "}
                {formData.plan === "nuevo-modelo" ? "Plan Nuevo Modelo" : "Plan Normal"}
              </p>
            </div>
          )}

          {/* Carrera */}
          <div className="space-y-2">
            <Label>Carrera *</Label>
            <Select
              value={formData.carrera}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  carrera: value,
                  cuatrimestre: "",
                  materia: "",
                }))
              }
              disabled={!formData.plan}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la carrera" />
              </SelectTrigger>
              <SelectContent>
                {carrerasDisponibles.map((carrera) => (
                  <SelectItem key={carrera.codigo} value={carrera.codigo}>
                    {carrera.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cuatrimestre */}
          <div className="space-y-2">
            <Label>Cuatrimestre *</Label>
            <Select
              value={formData.cuatrimestre}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  cuatrimestre: value as Cuatrimestre,
                  materia: "",
                }))
              }
              disabled={!formData.carrera}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el cuatrimestre" />
              </SelectTrigger>
              <SelectContent>
                {cuatrimestresDisponibles.map((cuatri) => (
                  <SelectItem key={cuatri} value={cuatri}>
                    {cuatrimestresLabels[cuatri]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* No se requiere seleccionar materia para Estadías */}

          {/* Grupo */}
          <div className="space-y-2">
            <Label>Grupo *</Label>
            <Input
              value={formData.grupo}
              onChange={(e) => setFormData((current) => ({ ...current, grupo: e.target.value.toUpperCase() }))}
              placeholder="Ej. JTH-01"
              maxLength={7}
            />
            <p className="text-xs text-muted-foreground">Formato: Ej. JTH-01</p>
          </div>

          {/* Programa */}
          <div className="space-y-2">
            <Label>Programa *</Label>
            <Input
              value={formData.programa}
              onChange={(e) => setFormData((current) => ({ ...current, programa: e.target.value }))}
              placeholder="Nombre del programa de estadías"
            />
          </div>

          {/* Periodo */}
          <div className="space-y-2">
            <Label>Periodo *</Label>
            <Input
              value={formData.periodo}
              onChange={(e) => setFormData((current) => ({ ...current, periodo: e.target.value }))}
              placeholder="Ej. Enero - Junio 2026"
            />
          </div>

          {/* Empresa */}
          <div className="space-y-2">
            <Label>Empresa *</Label>
            <Input
              value={formData.empresa}
              onChange={(e) => setFormData((current) => ({ ...current, empresa: e.target.value }))}
              placeholder="Nombre de la empresa"
            />
          </div>

          {/* Archivos */}
          <div className="space-y-2">
            <Label>Evidencia de estadías (PDF) *</Label>
            <p className="text-sm text-muted-foreground">
              Adjuntar el documento en formato PDF, con un límite de 2 MB por archivo. En caso de ser necesario, se permite la carga simultánea de hasta tres archivos.
            </p>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-success/50 transition-colors">
              <input
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                id="estadias-pdf-upload"
                onChange={handleFileChange}
                disabled={formData.archivos.length >= 3}
              />
              <label htmlFor="estadias-pdf-upload" className="cursor-pointer block space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">
                  {getArchivosLabel()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getEspaciosLabel()}
                </p>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vista previa de archivos */}
          {formData.archivos.length > 0 && (
            <div className="space-y-2">
              {formData.archivos.map((archivo, index) => (
                <PdfPreview key={`preview-${archivo.name}-${archivo.size}-${index}`} file={archivo} title={`Vista previa - ${archivo.name}`} />
              ))}
            </div>
          )}

          {/* Nombre del docente */}
          <div className="space-y-2">
            <Label>Nombre del docente *</Label>
            <Input
              value={formData.docente}
              onChange={(e) => setFormData((current) => ({ ...current, docente: e.target.value }))}
              placeholder="Primer nombre y apellidos completos"
            />
          </div>

          {/* Autorización */}
          <div className="space-y-2">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-3">
              <p className="font-medium">Declaración de autorización</p>
              <p>
                Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares y confirmo la veracidad de la información proporcionada.
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autorizacion}
                  onChange={(e) => setFormData((current) => ({ ...current, autorizacion: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Autorizo el uso de esta información</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
              Limpiar
            </Button>
            <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar estadías"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}