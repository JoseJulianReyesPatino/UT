import React, { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { PdfPreview } from "../../components/PdfPreview";

type DocumentoTutorias =
  | "carga-academica"
  | "reporte-bajas"
  | "concentrado-asesorias"
  | "acta-asistencia-grupal"
  | "ficha-tecnica";

interface DocumentoConfig {
  id: DocumentoTutorias;
  boton: string;
  titulo: string;
  descripcion: string;
  etiquetaCarga: string;
}

interface TutoriasFormData {
  archivos: File[];
  nota: string;
  docente: string;
}

interface TutoriasPageProps {
  initialType?: DocumentoTutorias | null;
  onNavigateHome?: () => void;
}

const documentTypes: DocumentoConfig[] = [
  {
    id: "carga-academica",
    boton: "Carga Académica",
    titulo: "CARGA ACADÉMICA",
    descripcion: "Sube el archivo correspondiente para el registro de carga académica.",
    etiquetaCarga: "Subir Carga Académica",
  },
  {
    id: "reporte-bajas",
    boton: "Reporte de Bajas",
    titulo: "REPORTE DE BAJAS",
    descripcion: "Adjunta el reporte de bajas en formato PDF.",
    etiquetaCarga: "Subir Reporte De Bajas",
  },
  {
    id: "concentrado-asesorias",
    boton: "Concentrado de Asesorías",
    titulo: "CONCENTRADO DE ASESORÍAS",
    descripcion: "Carga el concentrado de asesorías para su revisión.",
    etiquetaCarga: "Subir Concentrado De Asesorías",
  },
  {
    id: "acta-asistencia-grupal",
    boton: "Acta de Asistencia Grupal",
    titulo: "ACTA DE ASISTENCIA GRUPAL",
    descripcion: "Selecciona el acta de asistencia grupal en PDF.",
    etiquetaCarga: "Subir Acta De Asistencia Grupal",
  },
  {
    id: "ficha-tecnica",
    boton: "Ficha Técnica",
    titulo: "FICHA TÉCNICA",
    descripcion: "Sube la ficha técnica para continuar con el proceso.",
    etiquetaCarga: "Subir Ficha Técnica",
  },
];

const initialFormData: TutoriasFormData = {
  archivos: [],
  nota: "",
  docente: "",
};

export default function TutoriasPage(props: Readonly<TutoriasPageProps> = {}) {
  const { initialType = null, onNavigateHome } = props;
  const [selectedType, setSelectedType] = useState<DocumentoTutorias | null>(initialType);
  const [formData, setFormData] = useState<TutoriasFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setSelectedType(initialType);
    setFormData(initialFormData);
  }, [initialType]);

  const selectedConfig = useMemo(
    () => documentTypes.find((type) => type.id === selectedType) ?? null,
    [selectedType]
  );

  const isValid = useMemo(
    () => Boolean(selectedType && formData.archivos.length > 0 && formData.docente.trim()),
    [formData.archivos.length, formData.docente, selectedType]
  );

  const handleSelectType = (type: DocumentoTutorias) => {
    setFormData(initialFormData);
    setSelectedType(type);
  };

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

    setFormData((current) => ({
      ...current,
      archivos: [...current.archivos, ...newFiles],
    }));
  };

  const removeFile = (index: number) => {
    setFormData((current) => ({
      ...current,
      archivos: current.archivos.filter((_, currentIndex) => currentIndex !== index),
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
    if (!isValid || !selectedConfig) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(`${selectedConfig.titulo} enviada correctamente`);
    setIsSubmitting(false);
    resetForm();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Tutorías</h1>
        <p className="text-muted-foreground">Seleccione el tipo de archivo que desea subir.</p>
      </div>

      {selectedConfig === null ? (
        <Card>
          <CardHeader>
            <CardTitle>Tipos de archivo</CardTitle>
            <CardDescription>Elige una opción para abrir su formulario correspondiente.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {documentTypes.map((type) => (
                <Button
                  key={type.id}
                  variant="outline"
                  onClick={() => handleSelectType(type.id)}
                  className="h-auto min-h-24 justify-between rounded-2xl border-border bg-background px-4 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex flex-col items-start gap-1 whitespace-normal pr-3">
                    <span className="text-sm font-semibold leading-snug">{type.boton}</span>
                    <span className="text-xs text-muted-foreground">Abrir formulario</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl tracking-tight">{selectedConfig.titulo}</CardTitle>
                <CardDescription>{selectedConfig.descripcion}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedType(null)} className="sm:self-start">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cambiar tipo
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-medium">Subir archivo</p>
              <p className="text-muted-foreground">
                Adjuntar el documento en formato PDF, con un límite de 2 MB por archivo. En caso de ser necesario, se permite la carga simultánea de hasta tres archivos.
              </p>
              <div className="rounded-2xl border border-dashed border-border p-6 text-center transition-colors hover:border-primary/40">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="tutorias-pdf-upload"
                  onChange={handleFileChange}
                  disabled={formData.archivos.length >= 3}
                />
                <label htmlFor="tutorias-pdf-upload" className="block cursor-pointer space-y-2">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">{selectedConfig.etiquetaCarga}: (Obligatorio)</p>
                  <p className="text-xs text-muted-foreground">{getArchivosLabel()}</p>
                  <p className="text-xs text-muted-foreground">{getEspaciosLabel()}</p>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (onNavigateHome) {
                      onNavigateHome();
                      return;
                    }
                    setSelectedType(null);
                  }}
                  className="sm:self-start"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {onNavigateHome ? "Volver a Tutorías" : "Cambiar tipo"}
                </Button>
              </div>

              {formData.archivos.length > 0 && (
                <div className="space-y-2">
                  {formData.archivos.map((archivo, index) => (
                    <div
                      key={`${archivo.name}-${archivo.size}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-success/20 bg-success/10 p-3"
                    >
                      <div className="flex flex-1 items-center gap-2 text-sm">
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

              {formData.archivos.length > 0 && (
                <div className="space-y-2 pt-2">
                  {formData.archivos.map((archivo, index) => (
                    <PdfPreview
                      key={`preview-${archivo.name}-${archivo.size}-${index}`}
                      file={archivo}
                      title={`Vista previa - ${archivo.name}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nota para administrador: (Opcional)</Label>
              <Textarea
                value={formData.nota}
                onChange={(event) => setFormData((current) => ({ ...current, nota: event.target.value }))}
                placeholder="Agrega una nota para revisión"
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre del docente: (Obligatorio)</Label>
              <Input
                value={formData.docente}
                onChange={(event) => setFormData((current) => ({ ...current, docente: event.target.value }))}
                placeholder="Primer Nombre y Apellidos Completos"
              />
            </div>

            <div className="space-y-2 text-sm">
              <p>
                Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares y confirmo la veracidad de la información proporcionada.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
                Limpiar
              </Button>
              <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting} className="min-w-36">
                {isSubmitting ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
