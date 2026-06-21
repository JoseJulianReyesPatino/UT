import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft, ChevronRight, FileText, Upload, X, History } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { PdfPreview } from "../../components/PdfPreview";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { ScrollArea } from "../../components/ui/scroll-area";
import { DocumentHistoryCard } from "../../components/DocumentHistoryCard";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob, getDocumentDisplayFileName } from "../../lib/documents";

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
  formId: number;
  apartadoLabel: string;
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
    formId: 8,
    apartadoLabel: "carga-academica",
  },
  {
    id: "reporte-bajas",
    boton: "Reporte de Bajas",
    titulo: "REPORTE DE BAJAS",
    descripcion: "Adjunta el reporte de bajas en formato PDF.",
    etiquetaCarga: "Subir Reporte De Bajas",
    formId: 9,
    apartadoLabel: "reporte-bajas",
  },
  {
    id: "concentrado-asesorias",
    boton: "Concentrado de Asesorías",
    titulo: "CONCENTRADO DE ASESORÍAS",
    descripcion: "Carga el concentrado de asesorías para su revisión.",
    etiquetaCarga: "Subir Concentrado De Asesorías",
    formId: 10,
    apartadoLabel: "concentrado-asesorias",
  },
  {
    id: "acta-asistencia-grupal",
    boton: "Acta de Asistencia Grupal",
    titulo: "ACTA DE ASISTENCIA GRUPAL",
    descripcion: "Selecciona el acta de asistencia grupal en PDF.",
    etiquetaCarga: "Subir Acta De Asistencia Grupal",
    formId: 11,
    apartadoLabel: "acta-asistencia-grupal",
  },
  {
    id: "ficha-tecnica",
    boton: "Ficha Técnica",
    titulo: "FICHA TÉCNICA",
    descripcion: "Sube la ficha técnica para continuar con el proceso.",
    etiquetaCarga: "Subir Ficha Técnica",
    formId: 12,
    apartadoLabel: "ficha-tecnica",
  },
];

const initialFormData: TutoriasFormData = {
  archivos: [],
  nota: "",
  docente: "",
};

export default function TutoriasPage(props: Readonly<TutoriasPageProps> = {}) {
  const { initialType = null, onNavigateHome } = props;
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<DocumentoTutorias | null>(initialType);
  const [formData, setFormData] = useState<TutoriasFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const selectedConfig = useMemo(
    () => documentTypes.find((type) => type.id === selectedType) ?? null,
    [selectedType]
  );

  // Setear docente automático al cargar el usuario
  useEffect(() => {
    if (user && !formData.docente) {
      const nombreCompleto = `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name || "";
      setFormData(prev => ({ ...prev, docente: nombreCompleto }));
    }
  }, [user]);

  // Cargar historial cuando se selecciona un tipo de documento
  useEffect(() => {
    if (!selectedConfig || !user) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch("/documents", {
          query: {
            uploaded_by: user.id,
            form_id: selectedConfig.formId,
            per_page: 50,
          },
        });
        if (cancelled) return;
        setHistory(Array.isArray(res?.data) ? res.data : []);
      } catch (error) {
        console.error("Could not load history", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedConfig, user]);

  const isValid = useMemo(
    () => Boolean(
      selectedType && 
      formData.archivos.length > 0 && 
      formData.docente.trim()
    ),
    [formData.archivos.length, formData.docente, selectedType]
  );

  const handleSelectType = (type: DocumentoTutorias) => {
    setFormData({ ...initialFormData, docente: user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name || "" : "" });
    setEditingDocumentId(null);
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
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede el límite de 5 MB`);
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
    setFormData({ ...initialFormData, docente: user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name || "" : "" });
    setEditingDocumentId(null);
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

  const getUploadedFileName = (doc: any) => {
    return getDocumentDisplayFileName(doc?.title, doc?.file_path);
  };

  const openDocument = async (id: number, action: "view" | "download") => {
    try {
      const blob = await fetchDocumentBlob(id, action === "download");
      const blobUrl = URL.createObjectURL(blob);

      if (action === "view") {
        window.open(blobUrl, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      toast.error("No fue posible abrir el documento");
    }
  };

  const populateFormForEdit = (document: any) => {
    setEditingDocumentId(document.id);
    setFormData({
      archivos: [],
      nota: document.nota ?? document.note ?? "",
      docente: document.docente ?? (user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() : ""),
    });
    setSheetOpen(false);
  };

  const uploadMultipleFiles = async (files: File[], basePayload: any) => {
    const uploadedIds = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const parts = result.split(",");
          resolve(parts[1] ?? "");
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(f);
      });

      const fileBase64 = await toBase64(file);
      
      const payload = {
        ...basePayload,
        file_base64: fileBase64,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        title: `${basePayload.title} - ${file.name}`,
      };
      
      const result = await apiFetch("/documents", { method: "POST", body: JSON.stringify(payload) });
      uploadedIds.push(result?.data?.id);
    }
    
    return uploadedIds;
  };

  const handleSubmit = async () => {
    if (!isValid || !selectedConfig) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    setIsSubmitting(true);
    try {
      const basePayload: any = {
        form_id: selectedConfig.formId,
        apartado_label: selectedConfig.apartadoLabel,
        title: selectedConfig.titulo,
      };

      if (formData.docente) basePayload.docente = formData.docente;
      if (formData.nota) basePayload.nota = formData.nota;
      if (editingDocumentId) basePayload.original_document_id = String(editingDocumentId);

      await uploadMultipleFiles(formData.archivos, basePayload);

      toast.success(editingDocumentId ? "Documento actualizado correctamente" : "Documento enviado correctamente", {
        description: editingDocumentId ? "Tus documentos han sido actualizados." : "Tus documentos fueron enviados para revisión administrativa.",
      });

      setEditingDocumentId(null);
      resetForm();

      if (user && selectedConfig) {
        const res = await apiFetch("/documents", {
          query: {
            uploaded_by: user.id,
            form_id: selectedConfig.formId,
            per_page: 50,
          },
        });
        setHistory(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (error: any) {
      toast.error(error?.message ?? "No fue posible subir el documento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const docenteNombre = user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name || "" : "";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Tutorías</h1>
          <p className="text-muted-foreground">Seleccione el tipo de archivo que desea subir.</p>
        </div>

        {selectedConfig && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-center rounded-2xl border-border bg-background px-4 py-5 text-foreground hover:bg-accent sm:w-auto">
                <History className="mr-2 h-4 w-4" />
                Historial
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Historial de archivos</SheetTitle>
                <SheetDescription>Selecciona un documento del historial para ver, descargar o editar.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {history.length > 0 ? (
                  <ScrollArea className="h-[min(78vh,44rem)] rounded-lg border border-border bg-background/40 pr-2 dark:bg-slate-900/30">
                    <div className="grid gap-3 p-1">
                      {history.map((h) => (
  <DocumentHistoryCard
    key={h.id}
    title={h.title ?? h.file_path}
    fileName={getUploadedFileName(h)}
    carrera={h.carrera_label}
    subject={h.materia}
    submittedAt={new Date(h.submitted_at).toLocaleString()}
    status={h.status}
    returnedComment={String(h.status ?? "").toLowerCase() === "devuelto" ? h.returned_comment : undefined}
    onView={() => openDocument(h.id, "view")}
    onEdit={() => populateFormForEdit(h)}
  />
))}
                    </div>
                  </ScrollArea>
                ) : formData.archivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay archivos cargados en esta sesión ni en el historial.</p>
                ) : (
                  <div>
                    <p className="mb-2 text-sm font-medium">Archivos en esta sesión</p>
                    <ul className="space-y-2">
                      {formData.archivos.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="text-sm">{f.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}
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
                {editingDocumentId && (
                  <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    Estás editando el documento. Ajusta los campos y selecciona el nuevo archivo PDF para actualizar.
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => { setSelectedType(null); setEditingDocumentId(null); }} className="sm:self-start">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cambiar tipo
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-medium">Subir archivo *</p>
              <p className="text-muted-foreground">
                Adjuntar el documento en formato PDF, con un límite de 5 MB por archivo. En caso de ser necesario, se permite la carga simultánea de hasta tres archivos.
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
                  <p className="text-sm font-medium">{selectedConfig.etiquetaCarga}</p>
                  <p className="text-xs text-muted-foreground">{getArchivosLabel()}</p>
                  <p className="text-xs text-muted-foreground">{getEspaciosLabel()}</p>
                </label>
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
              <Label>Nota para administrador (opcional)</Label>
              <Textarea
                value={formData.nota}
                onChange={(event) => setFormData((current) => ({ ...current, nota: event.target.value }))}
                placeholder="Agrega una nota para revisión"
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre del docente *</Label>
              <Input
                value={formData.docente}
                onChange={(e) => setFormData(prev => ({ ...prev, docente: e.target.value }))}
                placeholder="Nombre del docente"
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">Declaración de autorización</p>
              <p className="text-muted-foreground">
                Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares 
                y confirmo la veracidad de la información proporcionada.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
                Limpiar
              </Button>
              <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting} className="min-w-36">
                {isSubmitting ? "Enviando..." : editingDocumentId ? "Actualizar documento" : "Enviar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


