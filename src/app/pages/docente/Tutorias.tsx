import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Ban, ChevronRight, FileText, Upload, X, History } from "lucide-react";
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

  const getUploadedFileName = (doc: any): string => {
    const t = (doc?.title ?? '').toString().trim();
    if (t && !/^undefined\b/i.test(t)) {
      const parts = t.split(' - ');
      const last = (parts.length > 1 ? parts[parts.length - 1] : t).trim();
      return /\.pdf$/i.test(last) ? last : last + '.pdf';
    }
    const p = (doc?.file_path ?? doc?.fileUrl ?? '').toString();
    if (p) {
      const raw = decodeURIComponent(p.split('?')[0].split('/').pop() ?? '');
      const cleaned = raw.replace(/^doc_[^_]+_/, '');
      if (!cleaned) return 'Documento.pdf';
      return /\.pdf$/i.test(cleaned) ? cleaned : cleaned + '.pdf';
    }
    return 'Documento.pdf';
  };

  const openDocument = async (id: number, action: "view" | "download") => {
    try {
      const blob = await fetchDocumentBlob(id, action === "download");
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(pdfBlob);

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

    for (const file of files) {
      const title = `${basePayload.title} - ${file.name}`;

      const fd = new FormData();
      fd.append('file', file);
      fd.append('form_id', String(basePayload.form_id));
      fd.append('title', title);
      if (basePayload.apartado_label) fd.append('apartado_label', basePayload.apartado_label);
      if (basePayload.original_document_id) fd.append('original_document_id', String(basePayload.original_document_id));
      if (basePayload.nota) fd.append('nota', basePayload.nota);

      const result = await apiFetch("/documents", { method: "POST", body: fd });
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
    <div className="mx-auto max-w-6xl space-y-6 p-2 sm:p-4">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-sm font-medium text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-slate-900/70 dark:text-emerald-300">
              <FileText className="h-4 w-4" />
              Envío de tutorías
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Tutorías</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Seleccione el tipo de archivo que desea subir con el mismo diseño de Planeación.</p>
            </div>
          </div>

          {selectedConfig && (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full justify-center rounded-2xl border-slate-200 bg-white/80 px-4 py-5 text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800">
                    <History className="mr-2 h-4 w-4" />
                    Historial
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="sm:max-w-xl overflow-y-auto dark:border-slate-700 dark:bg-slate-950">
                  <SheetHeader>
                    <SheetTitle className="dark:text-white">Historial de archivos</SheetTitle>
                    <SheetDescription className="dark:text-slate-400">Selecciona un documento del historial para ver, descargar o editar.</SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    {history.length > 0 ? (
                      <ScrollArea className="h-[min(78vh,44rem)] rounded-2xl border border-border bg-background/40 pr-2 dark:border-slate-700 dark:bg-slate-900/30">
                        <div className="grid gap-3 p-2">
                          {history.map((h) => (
                            <DocumentHistoryCard
                              key={h.id}
                              title={h.title ?? h.file_path}
                              fileName={getUploadedFileName(h)}
                              carrera={h.carrera_label}
                              subject={h.materia}
                              submittedAt={new Date(h.submitted_at).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              status={h.status}
                              returnedComment={String(h.status ?? "").toLowerCase() === "devuelto" ? h.returned_comment : undefined}
                              onView={() => openDocument(h.id, "view")}
                              onEdit={() => populateFormForEdit(h)}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    ) : formData.archivos.length === 0 ? (
                      <p className="text-sm text-muted-foreground dark:text-slate-400">No hay archivos cargados en esta sesión ni en el historial.</p>
                    ) : (
                      <div>
                        <p className="mb-2 text-sm font-medium dark:text-white">Archivos en esta sesión</p>
                        <ul className="space-y-2">
                          {formData.archivos.map((f, i) => (
                            <li key={`${f.name}-${i}`} className="text-sm dark:text-slate-300">{f.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Recordatorio</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Adjunta los documentos PDF para continuar con la revisión.</p>
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <History className="h-4 w-4" />
            Envío en tiempo
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50 p-4 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 dark:text-white">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <FileText className="h-4 w-4" />
            </div>
            <p className="font-semibold">Tu envío queda listo</p>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Revisa cada campo, adjunta tus PDF y envía el documento con confianza.</p>
        </div>
      </div>

      {selectedConfig === null ? (
        <Card className="dark:border-slate-800/70 dark:bg-slate-950/60">
          <CardHeader className="dark:border-slate-700">
            <CardTitle className="dark:text-white">Tipos de archivo</CardTitle>
            <CardDescription className="dark:text-slate-400">Elige una opción para abrir su formulario correspondiente.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {documentTypes.map((type) => (
                <Button
                  key={type.id}
                  variant="outline"
                  onClick={() => handleSelectType(type.id)}
                  className="h-auto min-h-24 justify-between rounded-2xl border-border bg-background px-4 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500/40 dark:hover:bg-slate-800"
                >
                  <span className="flex flex-col items-start gap-1 whitespace-normal pr-3">
                    <span className="text-sm font-semibold leading-snug dark:text-white">{type.boton}</span>
                    <span className="text-xs text-muted-foreground dark:text-slate-400">Abrir formulario</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-slate-500" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden dark:border-slate-800/70 dark:bg-slate-950/60">
          <CardHeader className="border-b bg-muted/30 dark:border-slate-700">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl tracking-tight dark:text-white">{selectedConfig.titulo}</CardTitle>
                <CardDescription className="dark:text-slate-400">{selectedConfig.descripcion}</CardDescription>
                {editingDocumentId && (
                  <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    Estás editando el documento. Ajusta los campos y selecciona el nuevo archivo PDF para actualizar.
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => { setSelectedType(null); setEditingDocumentId(null); }} className="sm:self-start dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cambiar tipo
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-medium dark:text-white">Subir archivo *</p>
              <p className="text-muted-foreground dark:text-slate-400">
                Adjuntar el documento en formato PDF, con un límite de 5 MB por archivo. En caso de ser necesario, se permite la carga simultánea de hasta tres archivos.
              </p>
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center transition-colors hover:border-primary/40 dark:border-slate-700 dark:hover:border-emerald-500/40">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="tutorias-pdf-upload"
                  onChange={handleFileChange}
                  disabled={formData.archivos.length >= 3}
                />
                <label htmlFor="tutorias-pdf-upload" className="block cursor-pointer space-y-2">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground dark:text-slate-500" />
                  <p className="text-sm font-medium dark:text-white">{selectedConfig.etiquetaCarga}</p>
                  <p className="text-xs text-muted-foreground dark:text-slate-400">{getArchivosLabel()}</p>
                  <p className="text-xs text-muted-foreground dark:text-slate-400">{getEspaciosLabel()}</p>
                </label>
              </div>

              {formData.archivos.length > 0 && (
                <div className="space-y-2">
                  {formData.archivos.map((archivo, index) => (
                    <div
                      key={`${archivo.name}-${archivo.size}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-success/20 bg-success/10 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                    >
                      <div className="flex flex-1 items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-success dark:text-emerald-400" />
                        <span className="font-medium dark:text-white">{archivo.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400">
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
              <Label className="dark:text-white">Nota para administrador (opcional)</Label>
              <Textarea
                value={formData.nota}
                onChange={(event) => setFormData((current) => ({ ...current, nota: event.target.value }))}
                placeholder="Agrega una nota para revisión"
                className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-white">Nombre del docente *</Label>
              <div className="relative">
                <Input
                  value={formData.docente}
                  readOnly
                  placeholder="Nombre del docente"
                  className="rounded-2xl bg-muted/50 cursor-default select-none pr-10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <Ban className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-500" />
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium dark:text-white">Declaración de autorización</p>
              <p className="text-muted-foreground dark:text-slate-400">
                Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares 
                y confirmo la veracidad de la información proporcionada.
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t dark:border-slate-700">
              <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white">
                Limpiar
              </Button>
              <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting} className="min-w-36 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">
                {isSubmitting ? "Enviando..." : editingDocumentId ? "Actualizar documento" : "Enviar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}