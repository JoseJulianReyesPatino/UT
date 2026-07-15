import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Ban, History, Upload, FolderOpen, Calendar, CalendarClock, ArrowLeft, ChevronRight } from "lucide-react";
import { PdfPreview } from "../../components/PdfPreview";
import { toast } from "sonner";
import { getCalendarFileUrl } from "../../lib/calendar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { ScrollArea } from "../../components/ui/scroll-area";
import { DocumentHistoryCard } from "../../components/DocumentHistoryCard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { carrieras, Plan } from "../../data/curricula";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob } from "../../lib/documents";
import { formatGroupCode } from "../../../lib/utils";
import { FormClosedState } from "../../components/FormClosedState";
import { preloadForms } from "../../components/FormAccessGuard";

type DocumentoEstadia = "carta-presentacion" | "carta-aceptacion" | "carta-terminacion" | "acta-final-estadias";

const ESTADIAS_FORM_ID_MAP: Record<DocumentoEstadia, string> = {
  "carta-presentacion": "carta-presentacion",
  "carta-aceptacion": "carta-aceptacion",
  "carta-terminacion": "carta-terminacion",
  "acta-final-estadias": "estadias",
};

interface DocumentoConfig {
  id: DocumentoEstadia;
  boton: string;
  titulo: string;
  descripcion: string;
  etiquetaCarga: string;
  formId: number;
  apartadoLabel: string;
}

interface EstadiaFormData {
  plan: Plan | "";
  carrera: string;
  materia: string;
  grupo: string;
  archivos: File[];
  nota: string;
  docente: string;
}

const documentTypes: DocumentoConfig[] = [
  { 
    id: "carta-presentacion", 
    boton: "Carta de Presentación", 
    titulo: "CARTA DE PRESENTACIÓN", 
    descripcion: "Sube la carta de presentación correspondiente.", 
    etiquetaCarga: "Subir Carta de Presentación",
    formId: 13,
    apartadoLabel: "carta-presentacion",
  },
  { 
    id: "carta-aceptacion", 
    boton: "Carta de Aceptación", 
    titulo: "CARTA DE ACEPTACIÓN", 
    descripcion: "Adjunta la carta de aceptación en PDF.", 
    etiquetaCarga: "Subir Carta de Aceptación",
    formId: 14,
    apartadoLabel: "carta-aceptacion",
  },
  { 
    id: "carta-terminacion", 
    boton: "Carta de Terminación", 
    titulo: "CARTA DE TERMINACIÓN", 
    descripcion: "Sube la carta de terminación.", 
    etiquetaCarga: "Subir Carta de Terminación",
    formId: 15,
    apartadoLabel: "carta-terminacion",
  },
  { 
    id: "acta-final-estadias", 
    boton: "Acta Final", 
    titulo: "ACTA FINAL", 
    descripcion: "Adjunta el acta final en PDF.", 
    etiquetaCarga: "Subir Acta Final",
    formId: 16,
    apartadoLabel: "estadias",
  },
];

const initialFormData: EstadiaFormData = { 
  plan: "", 
  carrera: "", 
  materia: "",
  grupo: "", 
  archivos: [], 
  nota: "",
  docente: "",
};

export default function EstadiasPage({ deadlineInfo, onDirtyChange }: { deadlineInfo?: { formattedDeadline: string; isUrgent: boolean } | null; onDirtyChange?: (dirty: boolean) => void }) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<DocumentoEstadia | null>(null);
  const [formData, setFormData] = useState<EstadiaFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [groupsOptions, setGroupsOptions] = useState<Array<{ id: number; group_code: string; group_number: number }>>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState<{ id: number; nombre: string } | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typeAccessClosed, setTypeAccessClosed] = useState(false);
  const [typeDeadlineInfo, setTypeDeadlineInfo] = useState<{ formattedDeadline: string; isUrgent: boolean } | null>(null);

  // Pre-cargar caché de formularios al montar para que la verificación por tipo sea instantánea
  useEffect(() => { preloadForms().catch(() => {}); }, []);

  useEffect(() => {
    if (!selectedType || !user) {
      setTypeAccessClosed(false);
      setTypeDeadlineInfo(null);
      return;
    }
    const formIdStr = ESTADIAS_FORM_ID_MAP[selectedType];
    preloadForms().then((forms) => {
      const match = forms.find((f: any) => String(f.form_code).replace(/_/g, "-") === formIdStr);
      if (!match) { setTypeAccessClosed(false); setTypeDeadlineInfo(null); return; }
      const roles: string[] = match.access_roles ?? [];
      const dueAt: string | null = match.due_at ?? null;
      const roleOk = (roles.includes("docente") && (user.role === "docente" || user.roles?.includes("docente"))) ||
                     (roles.includes("tutor") && (user.role === "tutor" || user.roles?.includes("tutor")));
      const expired = Boolean(dueAt && new Date(dueAt).getTime() < Date.now());
      setTypeAccessClosed(!roleOk || expired);
      if (roleOk && !expired && dueAt) {
        const deadline = new Date(dueAt);
        const msLeft = deadline.getTime() - Date.now();
        setTypeDeadlineInfo({
          formattedDeadline: deadline.toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" }),
          isUrgent: msLeft / (1000 * 60 * 60) < 24,
        });
      } else {
        setTypeDeadlineInfo(null);
      }
    }).catch(() => { setTypeAccessClosed(false); setTypeDeadlineInfo(null); });
  }, [selectedType, user]);

  useEffect(() => {
    if (!onDirtyChange) return;
    const hasEditing = editingDocumentId !== null;
    const hasFormData = formData.plan !== "" || formData.carrera !== "" || formData.materia !== "" ||
      formData.grupo !== "" || formData.archivos.length > 0 || formData.nota !== "";
    onDirtyChange(hasEditing || hasFormData);
  }, [onDirtyChange, editingDocumentId, formData]);

  const selectedConfig = useMemo(() => documentTypes.find((d) => d.id === selectedType) ?? null, [selectedType]);

  useEffect(() => {
    if (user && !formData.docente) {
      const nombreCompleto = `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name || "";
      setFormData(prev => ({ ...prev, docente: nombreCompleto }));
    }
  }, [user]);

  const carrerasDisponibles = useMemo(() => {
    if (!formData.plan) return [];
    if (formData.plan === "nuevo-modelo") {
      const tsu = carrieras["nuevo-modelo"].tsu.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
      const ing = carrieras["nuevo-modelo"].ingenieria.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
      return [...tsu, ...ing];
    }
    return carrieras["plan-normal"].ingenieria.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
  }, [formData.plan]);

  useEffect(() => {
    const career = formData.carrera;
    if (!career) {
      setGroupsOptions([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch("/groups", { query: { career_code: career } });
        if (cancelled) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        setGroupsOptions(data.map((g: any) => ({ id: Number(g.id), group_code: g.group_code, group_number: Number(g.group_number) })));
      } catch (error) {
        console.error("Could not load groups", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.carrera]);

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

  const isValid = useMemo(() => {
    let grupoValido = false;
    
    if (groupsOptions.length > 0) {
      grupoValido = groupsOptions.some(g => formatGroupCode(g.group_code) === formData.grupo);
    } else {
      grupoValido = false;
    }

    return Boolean(
      formData.plan &&
      formData.carrera &&
      grupoValido &&
      formData.archivos.length > 0 &&
      user &&
      formData.docente.trim()
    );
  }, [formData, user, groupsOptions]);

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const doc of history) {
      const key = doc.batch_id ?? `single-${doc.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    }
    return Array.from(groups.values()).sort(
      (a, b) => new Date(b[0].submitted_at).getTime() - new Date(a[0].submitted_at).getTime()
    );
  }, [history]);

  const getBatchStatus = (group: any[]) => {
    if (group.some((d) => String(d.status ?? "").toLowerCase() === "devuelto")) return "devuelto";
    if (group.some((d) => String(d.status ?? "").toLowerCase() === "reenviado")) return "reenviado";
    if (group.every((d) => String(d.status ?? "").toLowerCase() === "revisado")) return "revisado";
    return "pendiente";
  };

  const handleDeleteDocuments = async (documentIds: number[]) => {
    setIsDeleting(true);
    try {
      await Promise.all(documentIds.map((id) => apiFetch(`/documents/${id}`, { method: "DELETE" })));
      setHistory((prev) => prev.filter((h) => !documentIds.includes(h.id)));
      toast.success(documentIds.length > 1 ? "Documentos eliminados correctamente" : "Documento eliminado correctamente");
    } catch {
      toast.error("No fue posible eliminar el documento");
    } finally {
      setIsDeleting(false);
    }
  };

  const processFiles = (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList);
    const totalFiles = formData.archivos.length + newFiles.length;

    if (totalFiles > 3) {
      toast.error("Máximo 3 archivos permitidos");
      return;
    }

    for (const file of newFiles) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} excede el límite de 15 MB`);
        return;
      }
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} debe ser un archivo PDF`);
        return;
      }
    }

    setFormData((current) => ({ ...current, archivos: [...current.archivos, ...newFiles] }));
  };

  const handleSelectType = (type: DocumentoEstadia) => {
    setFormData({ ...initialFormData, docente: user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name || "" : "" });
    setEditingDocumentId(null);
    setSelectedType(type);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    processFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (formData.archivos.length >= 3) return;
    if (event.dataTransfer.files?.length) processFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (formData.archivos.length < 3) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeFile = (index: number) => {
    setFormData((current) => ({
      ...current,
      archivos: current.archivos.filter((_, i) => i !== index),
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

  const findCareerCodeByLabel = (label: string, planType: Plan | "") => {
    if (!label || !planType) return "";
    const candidates = planType === "nuevo-modelo"
      ? [...carrieras["nuevo-modelo"].tsu, ...carrieras["nuevo-modelo"].ingenieria]
      : carrieras["plan-normal"].ingenieria;

    const searchLabel = label.toLowerCase();
    let found = candidates.find((c) => c.nombre.toLowerCase() === searchLabel);
    if (!found) {
      found = candidates.find((c) => c.nombre.toLowerCase().includes(searchLabel) || searchLabel.includes(c.nombre.toLowerCase()));
    }
    return found?.codigo ?? "";
  };

  const populateFormForEdit = (document: any) => {
    const normalizePlanKey = (p: any) => {
      if (!p) return "plan-normal";
      const s = String(p).toLowerCase();
      if (s.includes("nuevo")) return "nuevo-modelo";
      return "plan-normal";
    };

    const planKey = normalizePlanKey(document.plan ?? "");
    const careerCode = findCareerCodeByLabel(document.carrera_label ?? "", planKey as any);

    setEditingDocumentId(document.id);
    setFormData({
      plan: planKey as Plan,
      carrera: careerCode,
      materia: document.materia ?? "",
      grupo: document.group_code ? formatGroupCode(document.group_code) : "",
      archivos: [],
      nota: document.note ?? document.nota ?? "",
      docente: document.docente ?? (user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() : ""),
    });
    setSheetOpen(false);
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

  const openPreview = async (doc: any) => {
    const nombre = getUploadedFileName(doc);
    setPreviewItem({ id: doc.id, nombre });
    setPreviewBlobUrl(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const blob = await fetchDocumentBlob(doc.id);
      setPreviewBlobUrl(URL.createObjectURL(blob));
    } catch {
      setPreviewError("No fue posible cargar el documento.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewBlobUrl(null);
    setPreviewItem(null);
    setPreviewError(null);
  };

  const uploadMultipleFiles = async (files: File[], basePayload: any) => {
    const uploadedIds = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const cleanFileName = file.name.replace(/\.pdf$/i, '').substring(0, 50);
      const title = cleanFileName;

      const fd = new FormData();
      fd.append('file', file, file.name);
      fd.append('form_id', String(basePayload.form_id));
      fd.append('title', title);
      if (basePayload.plan) fd.append('plan', String(basePayload.plan).replace(/-/g, '_'));
      if (basePayload.apartado_label) fd.append('apartado_label', basePayload.apartado_label);
      if (basePayload.carrera_label) fd.append('carrera_label', basePayload.carrera_label);
      if (basePayload.group_id) fd.append('group_id', String(basePayload.group_id));
      if (basePayload.original_document_id) fd.append('original_document_id', String(basePayload.original_document_id));
      if (basePayload.nota) fd.append('nota', basePayload.nota);

      try {
        const result = await apiFetch("/documents", { method: "POST", body: fd });
        uploadedIds.push(result?.data?.id);
      } catch (err: any) {
        const label = files.length > 1 ? ` (archivo ${i + 1}: "${file.name}")` : "";
        const msg = err?.message ?? "No fue posible subir el archivo";
        throw new Error(`${msg}${label}`);
      }
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
      const carreraEntry = carrerasDisponibles.find((c) => c.codigo === formData.carrera);
      const carreraLabel = carreraEntry ? carreraEntry.nombre : formData.carrera;
      
      let selectedGroup = null;
      if (formData.grupo && groupsOptions.length > 0) {
        selectedGroup = groupsOptions.find(g => formatGroupCode(g.group_code) === formData.grupo);
      }

      const basePayload: any = {
        form_id: selectedConfig.formId,
        apartado_label: selectedConfig.apartadoLabel,
        carrera_label: carreraLabel,
        plan: formData.plan,
        docente: formData.docente,
        nota: formData.nota,
        titulo: selectedConfig.titulo,
      };

      if (selectedGroup) {
        basePayload.group_id = selectedGroup.id;
        basePayload.group_code = formatGroupCode(selectedGroup.group_code);
      }
      
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

  const getCuatrimestresTexto = () => {
    if (formData.plan === "nuevo-modelo") return "Aplicable en cuatrimestres 6 y 10";
    if (formData.plan === "plan-normal") return "Aplicable en cuatrimestre 6 y 11";
    return "";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-1" ref={formRef}>
      {/* Fila superior: fecha límite + acciones */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {typeDeadlineInfo && (
          <div className="mr-auto flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span>
              Cierra el <strong>{typeDeadlineInfo.formattedDeadline}</strong>
              {typeDeadlineInfo.isUrgent && " · Tiempo limitado"}
            </span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(getCalendarFileUrl(), "_blank")}
          className="shrink-0 rounded-full border-white/30 bg-white/15 text-white shadow-sm backdrop-blur-md hover:bg-white/25 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Calendario
        </Button>
        {selectedConfig && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 rounded-full border-white/30 bg-white/15 text-white shadow-sm backdrop-blur-md hover:bg-white/25 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100">
                <History className="mr-2 h-4 w-4" />
                Historial
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-xl overflow-y-auto dark:border-slate-800/70 dark:bg-slate-950/60 dark:backdrop-blur-md"
              overlayClassName="bg-black/30 dark:bg-black/20 backdrop-blur-[2px]"
            >
              <SheetHeader>
                <SheetTitle className="dark:text-white">Historial de archivos</SheetTitle>
                <SheetDescription className="dark:text-slate-400">Selecciona un documento del historial para ver, descargar o editar.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {groupedHistory.length > 0 ? (
                  <ScrollArea className="h-[min(78vh,44rem)] rounded-lg border border-border bg-background/40 pr-2 dark:border-slate-800/70 dark:bg-slate-900/30">
                    <div className="grid gap-3 p-1">
                      {groupedHistory.map((group) => {
                        const main = group[0];
                        return (
                          <DocumentHistoryCard
                            key={main.batch_id ?? main.id}
                            documents={group.map((d: any) => ({ id: d.id, fileName: getUploadedFileName(d), status: d.status, returnedComment: d.returned_comment ?? undefined }))}
                            carrera={main.carrera_label}
                            subject={main.materia}
                            grupo={main.group_code ? formatGroupCode(main.group_code) : undefined}
                            nota={main.nota}
                            submittedAt={new Date(main.submitted_at).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            status={getBatchStatus(group)}
                            returnedComment={getBatchStatus(group) === "devuelto" ? (group.find((d: any) => String(d.status ?? "").toLowerCase() === "devuelto")?.returned_comment ?? undefined) : undefined}
                            onViewDocument={(docId) => { const doc = group.find((d: any) => d.id === docId); if (doc) openPreview(doc); }}
                            onEdit={() => populateFormForEdit(main)}
                            onDelete={handleDeleteDocuments}
                            isDeleting={isDeleting}
                          />
                        );
                      })}
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
        )}
      </div>

      {/* Título y subtítulo */}
      <div className="space-y-1.5 pt-1">
        <h1 className="inline-block rounded-xl bg-emerald-600 px-4 py-1.5 text-2xl font-bold text-white shadow-sm dark:bg-emerald-700">
          {selectedConfig ? selectedConfig.titulo : "Cartas y Acta"}
        </h1>
        <p className="text-white/90 drop-shadow-sm dark:text-slate-400">
          {selectedConfig 
            ? selectedConfig.descripcion 
            : "Selecciona el tipo de archivo que deseas subir"}
        </p>
      </div>

      {selectedConfig === null ? (
        <Card className="overflow-hidden border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
          <CardContent className="relative space-y-6 p-6 pt-5 sm:p-8 sm:pt-6">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Selecciona una opción para continuar</p>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
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
      ) : typeAccessClosed ? (
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSelectedType(null); setEditingDocumentId(null); setTypeAccessClosed(false); }}
            className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cambiar tipo
          </Button>
          <FormClosedState
            title={selectedConfig.boton}
            message={`El formulario de ${selectedConfig.boton.toLowerCase()} está cerrado. Si necesitas acceso, solicita al administrador que actualice la fecha de vencimiento o los roles permitidos.`}
          />
        </div>
      ) : (
        <Card className="overflow-hidden border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
          <CardContent className="relative space-y-6 p-6 pt-5 sm:p-8 sm:pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Los campos marcados con * son obligatorios.</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setSelectedType(null); setEditingDocumentId(null); }} 
                className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cambiar tipo
              </Button>
            </div>

            {editingDocumentId && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                Estás editando el documento. Ajusta los campos y selecciona el nuevo archivo PDF para actualizar.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium dark:text-white">Plan *</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button 
                    variant={formData.plan === "nuevo-modelo" ? "success" : "outline"} 
                    onClick={() => setFormData((c) => ({ ...c, plan: "nuevo-modelo", carrera: "" }))}
                    className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left shadow-sm"
                  >
                    <span className="text-base font-semibold text-slate-900 dark:text-white">Plan Nuevo Modelo</span>
                    <span className="text-xs text-muted-foreground dark:text-slate-400">TSU e Ingeniería</span>
                  </Button>
                  <Button 
                    variant={formData.plan === "plan-normal" ? "success" : "outline"} 
                    onClick={() => setFormData((c) => ({ ...c, plan: "plan-normal", carrera: "" }))}
                    className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left shadow-sm"
                  >
                    <span className="text-base font-semibold text-slate-900 dark:text-white">Plan Normal</span>
                    <span className="text-xs text-muted-foreground dark:text-slate-400">Ingenierías</span>
                  </Button>
                </div>
                {getCuatrimestresTexto() && (
                  <p className="text-xs text-muted-foreground mt-2 dark:text-slate-400">{getCuatrimestresTexto()}</p>
                )}
              </div>

              {/* Información académica */}
              <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4 dark:border-slate-800/70 dark:bg-slate-900/30 md:col-span-2 md:p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="dark:text-white">Carrera *</Label>
                    <Select 
                      value={formData.carrera} 
                      onValueChange={(v) => setFormData((c) => ({ ...c, carrera: v, grupo: "" }))} 
                      disabled={!formData.plan}
                    >
                      <SelectTrigger className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <SelectValue placeholder="Selecciona la carrera" />
                      </SelectTrigger>
                      <SelectContent className="dark:border-slate-700 dark:bg-slate-900" position="popper" avoidCollisions={false}>
                        {carrerasDisponibles.map((c) => (
                          <SelectItem key={c.codigo} value={c.codigo} className="dark:text-white dark:hover:bg-slate-800">{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="dark:text-white">Grupo *</Label>
                    <Select 
                      value={formData.grupo} 
                      onValueChange={(value) => setFormData((c) => ({ ...c, grupo: value }))}
                      disabled={!formData.carrera}
                    >
                      <SelectTrigger className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <SelectValue placeholder="Selecciona el grupo" />
                      </SelectTrigger>
                      <SelectContent className="dark:border-slate-700 dark:bg-slate-900">
                        {groupsOptions.length > 0 ? (
                          groupsOptions.map((g) => (
                            <SelectItem key={g.id} value={formatGroupCode(g.group_code)} className="dark:text-white dark:hover:bg-slate-800">
                              {formatGroupCode(g.group_code)}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-sm text-amber-700 dark:text-amber-300">
                            No hay grupos disponibles.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Documentos */}
              <div className="space-y-2 md:col-span-2">
                <Label className="dark:text-white">{selectedConfig.etiquetaCarga} *</Label>
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  Adjuntar el documento en formato PDF, con un límite de 15 MB por archivo. Hasta 3 archivos.
                </p>

                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  id="estadia-pdf-upload"
                  onChange={handleFileChange}
                  disabled={formData.archivos.length >= 3}
                />

                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`rounded-3xl border-2 border-dashed transition-all ${
                    formData.archivos.length === 0 ? "p-6 text-center" : "p-4"
                  } ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30"
                      : "border-border bg-background/60 hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-emerald-500/40"
                  }`}
                >
                  {formData.archivos.length === 0 ? (
                    <label htmlFor="estadia-pdf-upload" className="block cursor-pointer space-y-3">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors dark:bg-emerald-500/10 dark:text-emerald-400">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-white">{getArchivosLabel()}</p>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">
                          {isDragging ? "Suelta aquí para cargar" : `${getEspaciosLabel()} · arrastra o haz clic`}
                        </p>
                      </div>
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <div className={`grid gap-3 ${formData.archivos.length > 1 ? "sm:grid-cols-2" : ""} ${formData.archivos.length > 2 ? "lg:grid-cols-3" : ""}`}>
                        {formData.archivos.map((archivo, index) => (
                          <PdfPreview
                            key={`${archivo.name}-${archivo.size}-${index}`}
                            file={archivo}
                            title="Documento cargado"
                            onRemove={() => removeFile(index)}
                          />
                        ))}
                      </div>

                      {formData.archivos.length < 3 && (
                        <label
                          htmlFor="estadia-pdf-upload"
                          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background/60 py-3 text-sm text-muted-foreground transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:hover:border-emerald-500/40"
                        >
                          <FolderOpen className="h-4 w-4" />
                          Agregar otro archivo · {getEspaciosLabel()}
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Docente */}
              <div className="space-y-2 md:col-span-2">
                <Label className="dark:text-white">Nombre del docente</Label>
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

              {/* Autorización */}
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium dark:text-white">Declaración de autorización</p>
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares 
                  y confirmo la veracidad de la información proporcionada.
                </p>
              </div>

              {/* Nota */}
              <div className="space-y-2 md:col-span-2">
                <Label className="dark:text-white">Nota para administración (opcional)</Label>
                <Textarea
                  value={formData.nota}
                  onChange={(e) => setFormData((c) => ({ ...c, nota: e.target.value }))}
                  placeholder="Agrega una nota para revisión"
                  className="min-h-[9rem] rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end dark:border-slate-700">
              {editingDocumentId !== null ? (
                <Button variant="outline" onClick={() => setCancelEditDialogOpen(true)} disabled={isSubmitting} className="rounded-2xl sm:px-6 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white">
                  Cancelar
                </Button>
              ) : (
                <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="rounded-2xl sm:px-6 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white">
                  Limpiar
                </Button>
              )}
              <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting} className="rounded-2xl sm:px-6 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">
                {isSubmitting ? "Enviando..." : editingDocumentId ? "Actualizar documento" : "Enviar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de vista previa */}
      <Dialog open={previewItem !== null} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewItem?.nombre ?? "Documento"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewLoading ? (
              <div className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
                <p>Cargando...</p>
              </div>
            ) : previewError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                {previewError}
              </div>
            ) : previewBlobUrl ? (
              <object data={previewBlobUrl} type="application/pdf" className="h-[82vh] w-full rounded-lg border border-border">
                <a href={previewBlobUrl} target="_blank" rel="noopener noreferrer" className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-primary underline">
                  Abrir documento en nueva pestaña
                </a>
              </object>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelEditDialogOpen} onOpenChange={setCancelEditDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md dark:border-slate-800/70 dark:bg-slate-950/90 dark:backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">¿Cancelar edición?</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Se perderán los cambios que hayas hecho en el formulario. El documento seguirá tal como estaba.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setCancelEditDialogOpen(false)}
              className="dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              Seguir editando
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setCancelEditDialogOpen(false); resetForm(); }}
            >
              Sí, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}