import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Ban, History, Upload, FolderOpen, Calendar, CalendarClock, Loader2, FileText, X, Eye } from "lucide-react";
import { PdfPreview } from "../../components/PdfPreview";
import { toast } from "sonner";
import { getCalendarFileUrl } from "../../lib/calendar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { ScrollArea } from "../../components/ui/scroll-area";
import { DocumentHistoryCard } from "../../components/DocumentHistoryCard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { carrieras, cuatrimestresLabels, parciales, planNuevoModelo, type Cuatrimestre } from "../../data/curricula";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { useFormAccess } from "../../hooks/useFormAccess";
import { fetchDocumentBlob } from "../../lib/documents";
import { formatGroupCode } from "../../../lib/utils";
import { HistorySheetSkeleton } from "./DocumentHistory";

interface InstrumentoFormData {
  carrera: string;
  cuatrimestre: Cuatrimestre | "";
  materia: string;
  parcial: string;
  grupo: string;
  archivos: File[];
  docente: string;
  nota: string;
}

const initialFormData: InstrumentoFormData = {
  carrera: "",
  cuatrimestre: "",
  materia: "",
  parcial: "",
  grupo: "",
  archivos: [],
  docente: "",
  nota: "",
};

export default function Instrumento60Page({ deadlineInfo, onDirtyChange }: { deadlineInfo?: { formattedDeadline: string; isUrgent: boolean } | null; onDirtyChange?: (dirty: boolean) => void }) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formAccess = useFormAccess(3);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [formData, setFormData] = useState<InstrumentoFormData>(initialFormData);
  const [sheetOpen, setSheetOpen] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [groupsOptions, setGroupsOptions] = useState<Array<{ id: number; group_code: string; group_number: number }>>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState<{ id: number; nombre: string } | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isMetadataOnlyEdit, setIsMetadataOnlyEdit] = useState(false);
  const [editingBatchDocIds, setEditingBatchDocIds] = useState<number[]>([]);
  const [editingBatchFileNames, setEditingBatchFileNames] = useState<string[]>([]);
  const [resubmitTarget, setResubmitTarget] = useState<{ docId: number; fileName: string; returnedComment?: string } | null>(null);
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [resubmitPreviewUrl, setResubmitPreviewUrl] = useState<string | null>(null);
  const [showResubmitPreview, setShowResubmitPreview] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    if (!onDirtyChange) return;
    const hasEditing = editingDocumentId !== null || editingBatchDocIds.length > 0;
    const hasFormData = formData.carrera !== "" || formData.cuatrimestre !== "" || formData.materia !== "" ||
      formData.parcial !== "" || formData.grupo !== "" || formData.archivos.length > 0 || formData.nota !== "";
    onDirtyChange(hasEditing || hasFormData);
  }, [onDirtyChange, editingDocumentId, editingBatchDocIds, formData]);

  useEffect(() => {
    if (user && !formData.docente) {
      const nombreCompleto = `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name || "";
      setFormData(prev => ({ ...prev, docente: nombreCompleto }));
    }
  }, [user]);

  const carrerasDisponibles = useMemo(() => {
    const tsu = carrieras["nuevo-modelo"].tsu.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
    const ing = carrieras["nuevo-modelo"].ingenieria.map((c) => ({ codigo: c.codigo, nombre: c.nombre }));
    return [...tsu, ...ing];
  }, []);

  useEffect(() => {
    const career = formData.carrera;
    const cuatri = formData.cuatrimestre;

    if (!career || !cuatri) {
      setGroupsOptions([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch("/groups", { query: { career_code: career, cuatrimestre: cuatri } });
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
  }, [formData.carrera, formData.cuatrimestre]);

  useEffect(() => {
    setIsLoadingHistory(true);
    let cancelled = false;
    void (async () => {
      try {
        if (!user) { setIsLoadingHistory(false); return; }
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 3, per_page: 50 } });
        if (cancelled) return;
        setHistory(Array.isArray(res?.data) ? res.data : []);
      } catch (error) {
        console.error("Could not load history", error);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const cuatrimestresDisponibles = useMemo(() => {
    if (!formData.carrera) return [];
    const carrera = planNuevoModelo[formData.carrera];
    if (!carrera) return [];
    return Object.keys(carrera.cuatrimestres);
  }, [formData.carrera]);

  const materiasDisponibles = useMemo(() => {
    if (!formData.carrera || !formData.cuatrimestre) return [];
    const carrera = planNuevoModelo[formData.carrera];
    if (!carrera) return [];
    return carrera.cuatrimestres[formData.cuatrimestre] || [];
  }, [formData.carrera, formData.cuatrimestre]);

  const isValid = useMemo(() => {
    let grupoValido = false;

    if (groupsOptions.length > 0) {
      grupoValido = groupsOptions.some(g => formatGroupCode(g.group_code) === formData.grupo);
    } else {
      grupoValido = false;
    }

    const baseValido = Boolean(
      formData.carrera &&
      formData.cuatrimestre &&
      formData.materia &&
      formData.parcial &&
      grupoValido &&
      user &&
      formData.docente.trim()
    );

    if (isMetadataOnlyEdit) return baseValido;
    return baseValido && formData.archivos.length > 0;
  }, [formData, user, groupsOptions, isMetadataOnlyEdit]);

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
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      for (const id of documentIds) {
        await apiFetch(`/documents/${id}`, { method: "DELETE" });
      }
      toast.success(documentIds.length > 1 ? `${documentIds.length} documentos eliminados correctamente` : "Documento eliminado correctamente");
      await new Promise(resolve => setTimeout(resolve, 300));
      if (user) {
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 3, per_page: 50 } });
        setHistory(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (error) {
      toast.error("No fue posible eliminar el documento");
      console.error("Error al eliminar documentos", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHideDocuments = async (documentIds: number[]) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      for (const id of documentIds) {
        await apiFetch(`/documents/${id}/hide`, { method: "PATCH" });
      }
      toast.success(documentIds.length > 1 ? `${documentIds.length} documentos ocultados del historial` : "Documento ocultado del historial");
      await new Promise(resolve => setTimeout(resolve, 300));
      if (user) {
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 3, per_page: 50 } });
        setHistory(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (error) {
      toast.error("No fue posible ocultar el documento");
      console.error("Error al ocultar documentos", error);
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
      archivos: current.archivos.filter((_, fileIndex) => fileIndex !== index),
    }));
  };

  const replaceFile = (index: number, newFile: File) => {
    if (newFile.size > 15 * 1024 * 1024) { toast.error(`${newFile.name} excede el límite de 15 MB`); return; }
    if (newFile.type !== "application/pdf") { toast.error(`${newFile.name} debe ser un archivo PDF`); return; }
    setFormData((current) => ({
      ...current,
      archivos: current.archivos.map((f, i) => (i === index ? newFile : f)),
    }));
  };

  const resetForm = () => {
    setFormData({ ...initialFormData, docente: user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name || "" : "" });
    setEditingDocumentId(null);
    setIsLoadingPdf(false);
    setIsMetadataOnlyEdit(false);
    setEditingBatchDocIds([]);
    setEditingBatchFileNames([]);
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

  const findCareerCodeByLabel = (label: string) => {
    if (!label) return "";
    const candidates = [...carrieras["nuevo-modelo"].tsu, ...carrieras["nuevo-modelo"].ingenieria];
    const searchLabel = label.toLowerCase();
    let found = candidates.find((c) => c.nombre.toLowerCase() === searchLabel);
    if (!found) {
      found = candidates.find((c) => c.nombre.toLowerCase().includes(searchLabel) || searchLabel.includes(c.nombre.toLowerCase()));
    }
    return found?.codigo ?? "";
  };

  const populateFormForEditBatch = async (documents: any[]) => {
    const main = documents[0];

    const careerCode = findCareerCodeByLabel(main.carrera_label ?? "");
    const allowedCuatrimestres = new Set(Object.keys(cuatrimestresLabels));
    const rawCuatrimestre = String(main.cuatrimestre ?? "").trim();
    const resolvedCuatrimestre = allowedCuatrimestres.has(rawCuatrimestre) ? rawCuatrimestre : "";

    const normalizeParcialForForm = (value: unknown): string => {
      const raw = String(value ?? "").trim();
      const match = raw.match(/\b([123])\b/);
      return match ? `Parcial ${match[1]}` : "";
    };

    const anyProcessed = documents.some((d) => {
      const s = String(d.status ?? "").trim().toLowerCase();
      return s && s !== "pendiente";
    });

    setIsMetadataOnlyEdit(anyProcessed);
    setEditingBatchDocIds(documents.map((d) => d.id));
    setEditingBatchFileNames(documents.map((d) => getUploadedFileName(d)));
    setEditingDocumentId(main.id);

    setFormData({
      carrera: careerCode,
      cuatrimestre: resolvedCuatrimestre as Cuatrimestre,
      materia: main.materia ?? "",
      parcial: normalizeParcialForForm(main.parcial),
      grupo: main.group_code ? formatGroupCode(main.group_code) : "",
      archivos: [],
      docente: main.docente ?? (user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() : ""),
      nota: main.note ?? main.nota ?? "",
    });
    setSheetOpen(false);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    if (anyProcessed) return;

    setIsLoadingPdf(true);
    try {
      const files = await Promise.all(
        documents.slice(0, 3).map(async (doc) => {
          const blob = await fetchDocumentBlob(doc.id);
          return new File([blob], getUploadedFileName(doc), { type: "application/pdf" });
        })
      );
      setFormData((current) => ({ ...current, archivos: files }));
      toast.success(`${files.length} documentos cargados correctamente`, { duration: 2000 });
    } catch (error) {
      console.error("No se pudieron cargar todos los PDFs del lote", error);
      toast.error("Algunos PDFs no se pudieron cargar. Verifica los archivos manualmente.");
    } finally {
      setIsLoadingPdf(false);
    }
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
      const cleanFileName = file.name.replace(/\.pdf$/i, "").substring(0, 50);
      const title = cleanFileName;

      const fd = new FormData();
      fd.append('file', file, file.name);
      fd.append('form_id', String(basePayload.form_id));
      fd.append('title', title);
      if (basePayload.apartado_label) fd.append('apartado_label', basePayload.apartado_label);
      if (basePayload.carrera_label) fd.append('carrera_label', basePayload.carrera_label);
      if (basePayload.plan) fd.append('plan', String(basePayload.plan).replace(/-/g, '_'));
      if (basePayload.materia) fd.append('materia', basePayload.materia);
      if (basePayload.parcial) fd.append('parcial', basePayload.parcial);
      if (basePayload.group_id) fd.append('group_id', String(basePayload.group_id));
      if (basePayload.original_document_id) fd.append('original_document_id', String(basePayload.original_document_id));
      if (basePayload.nota) fd.append('nota', basePayload.nota);
      if (basePayload.batch_id) fd.append('batch_id', basePayload.batch_id);

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

  const handleResubmit = async () => {
    if (!resubmitTarget || !resubmitFile) return;
    setIsResubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", resubmitFile, resubmitFile.name);
      await apiFetch(`/documents/${resubmitTarget.docId}/resubmit`, { method: "POST", body: fd });
      toast.success("Documento reenviado correctamente");
      setResubmitTarget(null);
      setResubmitFile(null);
      if (user) {
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 3, per_page: 50 } });
        setHistory(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (error: any) {
      toast.error(error?.message ?? "No fue posible reenviar el documento");
    } finally {
      setIsResubmitting(false);
    }
  };

  useEffect(() => {
    if (!resubmitFile) {
      setResubmitPreviewUrl(null);
      setShowResubmitPreview(false);
      return;
    }
    const url = URL.createObjectURL(resubmitFile);
    setResubmitPreviewUrl(url);
    setShowResubmitPreview(false);
    return () => URL.revokeObjectURL(url);
  }, [resubmitFile]);

  const handleSubmit = async () => {
    if (!isValid) {
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

      // Modo solo metadatos: PATCH a cada documento del lote sin tocar los archivos
      if (isMetadataOnlyEdit && editingBatchDocIds.length > 0) {
        const metadataPayload: Record<string, unknown> = {
          carrera_label: carreraLabel,
          materia: formData.materia,
          parcial: formData.parcial,
          nota: formData.nota,
        };
        if (selectedGroup) metadataPayload.group_id = selectedGroup.id;

        for (const docId of editingBatchDocIds) {
          await apiFetch(`/documents/${docId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metadataPayload),
          });
        }
        toast.success("Datos actualizados correctamente");
        resetForm();
        if (user) {
          const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 3, per_page: 50 } });
          setHistory(Array.isArray(res?.data) ? res.data : []);
        }
        return;
      }

      // Modo normal: crear nuevos registros con los archivos
      const batchId = crypto.randomUUID();
      const basePayload: any = {
        form_id: 3,
        apartado_label: "instrumento-60-nuevo",
        carrera_label: carreraLabel,
        plan: "nuevo-modelo",
        materia: formData.materia,
        parcial: formData.parcial,
        docente: formData.docente,
        nota: formData.nota,
        batch_id: batchId,
      };

      if (selectedGroup) {
        basePayload.group_id = selectedGroup.id;
        basePayload.group_code = formatGroupCode(selectedGroup.group_code);
      }

      if (editingDocumentId) basePayload.original_document_id = String(editingDocumentId);

      await uploadMultipleFiles(formData.archivos, basePayload);

      // Eliminar documentos pendientes anteriores del lote (re-edición)
      if (editingBatchDocIds.length > 0) {
        await Promise.allSettled(
          editingBatchDocIds.map((id) => apiFetch(`/documents/${id}`, { method: "DELETE" }))
        );
      }

      toast.success(editingDocumentId ? "Instrumento 60% actualizado correctamente" : "Instrumento 60% enviado correctamente", {
        description: editingDocumentId ? "Tus documentos han sido actualizados." : "Tus documentos fueron enviados para revisión administrativa.",
      });

      setEditingDocumentId(null);
      resetForm();

      if (user) {
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 3, per_page: 50 } });
        setHistory(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (error: any) {
      toast.error(error?.message ?? "No fue posible subir el instrumento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-1" ref={formRef}>
      {/* Fila superior: fecha límite + acciones */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {deadlineInfo && (
          <div className="mr-auto flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span>
              Cierra el <strong>{deadlineInfo.formattedDeadline}</strong>
              {deadlineInfo.isUrgent && " · Tiempo limitado"}
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
              {isLoadingHistory ? (
                <HistorySheetSkeleton />
              ) : groupedHistory.length > 0 ? (
                <ScrollArea className="h-[min(78vh,44rem)] rounded-lg border border-border bg-background/40 pr-2 dark:border-slate-800/70 dark:bg-slate-900/30">
                  <div className="grid gap-3 p-1">
                    {groupedHistory.map((group) => {
                      const main = group[0];
                      return (
                        <DocumentHistoryCard
                          key={main.batch_id ?? main.id}
                          documents={group.map((d: any) => ({ id: d.id, fileName: getUploadedFileName(d), status: d.status, returnedComment: d.returned_comment ?? undefined }))}
                          plan="Plan Nuevo Modelo"
                          carrera={main.carrera_label}
                          cuatrimestre={main.cuatrimestre ? cuatrimestresLabels[String(main.cuatrimestre) as keyof typeof cuatrimestresLabels] : undefined}
                          subject={main.materia}
                          parcial={main.parcial}
                          grupo={main.group_code ? formatGroupCode(main.group_code) : undefined}
                          nota={main.nota}
                          submittedAt={new Date(main.submitted_at).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          status={getBatchStatus(group)}
                          returnedComment={getBatchStatus(group) === "devuelto" ? (group.find((d: any) => String(d.status ?? "").toLowerCase() === "devuelto")?.returned_comment ?? undefined) : undefined}
                          onViewDocument={(docId) => { const doc = group.find((d: any) => d.id === docId); if (doc) openPreview(doc); }}
                          onEdit={() => void populateFormForEditBatch(group)}
                          onDelete={handleDeleteDocuments}
                          onHide={handleHideDocuments}
                          onResubmit={(docId, fileName, returnedComment) => {
                            setResubmitTarget({ docId, fileName, returnedComment });
                            setResubmitFile(null);
                          }}
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
      </div>

      {/* Título y subtítulo */}
      <div className="space-y-1.5 pt-1">
        <h1 className="inline-block rounded-xl bg-emerald-600 px-4 py-1.5 text-2xl font-bold text-white shadow-sm dark:bg-emerald-700">
          Instrumento 60%
        </h1>
        <p className="text-white/90 drop-shadow-sm dark:text-slate-400">
          Recordatorio: se sube 3 días después de la aplicación de cada parcial.
        </p>
      </div>

      <Card className="overflow-hidden border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
        <CardContent className="relative space-y-6 p-6 pt-5 sm:p-8 sm:pt-6">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Los campos marcados con * son obligatorios.</p>
          {editingDocumentId && !isMetadataOnlyEdit && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              Estás editando el instrumento existente. Ajusta los campos y selecciona el nuevo archivo PDF para actualizar.
              {isLoadingPdf && (
                <span className="ml-2 inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando documentos...
                </span>
              )}
            </div>
          )}
          {isMetadataOnlyEdit && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
              <p className="font-medium">Modo edición de datos</p>
              <p className="mt-0.5 text-xs">Este envío ya fue procesado por el administrador. Solo puedes actualizar los datos del formulario — los archivos no se pueden cambiar aquí. Para documentos devueltos usa el botón <strong>Reenviar</strong> en el historial.</p>
            </div>
          )}

            <div className="space-y-2">
  <Label className="text-sm font-medium dark:text-white">Plan *</Label>
  <div className="grid gap-3 sm:grid-cols-2">
    <div className="flex items-start gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-4 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40 dark:border-emerald-400 dark:bg-emerald-950/30">
      <div className="flex-1">
        <span className="block text-base font-semibold dark:text-white">Plan Nuevo Modelo</span>
        <span className="block text-xs text-muted-foreground dark:text-slate-400">TSU e Ingenierías</span>
      </div>
    </div>
  </div>
</div>

          {/* Información académica */}
          <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4 dark:border-slate-800/70 dark:bg-slate-900/30 md:col-span-2 md:p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="dark:text-white">Carrera *</Label>
                <Select
                  value={formData.carrera}
                  onValueChange={(value) => setFormData((current) => ({ ...current, carrera: value, cuatrimestre: "", materia: "", parcial: "", grupo: "" }))}
                >
                  <SelectTrigger className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <SelectValue placeholder="Selecciona la carrera" />
                  </SelectTrigger>
                  <SelectContent className="dark:border-slate-700 dark:bg-slate-900" position="popper" avoidCollisions={false}>
                    {carrerasDisponibles.map((career) => (
                      <SelectItem key={career.codigo} value={career.codigo} className="dark:text-white dark:hover:bg-slate-800">
                        {career.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-white">Cuatrimestre *</Label>
                <Select
                  value={formData.cuatrimestre}
                  onValueChange={(value) => setFormData((current) => ({ ...current, cuatrimestre: value as Cuatrimestre, materia: "", parcial: "", grupo: "" }))}
                  disabled={!formData.carrera}
                >
                  <SelectTrigger className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <SelectValue placeholder="Selecciona el cuatrimestre" />
                  </SelectTrigger>
                  <SelectContent className="dark:border-slate-700 dark:bg-slate-900">
                    {cuatrimestresDisponibles.map((value) => (
                      <SelectItem key={value} value={value} className="dark:text-white dark:hover:bg-slate-800">
                        {getCuatrimestreLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="dark:text-white">Materia *</Label>
                <Select
                  value={formData.materia}
                  onValueChange={(value) => setFormData((current) => ({ ...current, materia: value, parcial: "", grupo: "" }))}
                  disabled={!formData.cuatrimestre}
                >
                  <SelectTrigger className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <SelectValue placeholder="Selecciona la materia" />
                  </SelectTrigger>
                  <SelectContent className="dark:border-slate-700 dark:bg-slate-900">
                    {materiasDisponibles.map((matter) => (
                      <SelectItem key={matter.nombre} value={matter.nombre} className="dark:text-white dark:hover:bg-slate-800">
                        {matter.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-white">Parcial *</Label>
                <Select
                  value={formData.parcial}
                  onValueChange={(value) => setFormData((current) => ({ ...current, parcial: value }))}
                  disabled={!formData.materia}
                >
                  <SelectTrigger className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <SelectValue placeholder="Selecciona el parcial" />
                  </SelectTrigger>
                  <SelectContent className="dark:border-slate-700 dark:bg-slate-900">
                    {parciales.map((parcial) => (
                      <SelectItem key={parcial} value={parcial} className="dark:text-white dark:hover:bg-slate-800">{parcial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-white">Grupo *</Label>
                <Select
                  value={formData.grupo}
                  onValueChange={(value) => setFormData((c) => ({ ...c, grupo: value }))}
                  disabled={!formData.parcial}
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
            <Label className="dark:text-white">Instrumento en PDF {!isMetadataOnlyEdit && "*"}</Label>
            {isMetadataOnlyEdit ? (
              <p className="text-sm text-muted-foreground dark:text-slate-400">Los archivos de este envío no se pueden cambiar desde aquí.</p>
            ) : (
              <p className="text-sm text-muted-foreground dark:text-slate-400">Adjuntar el documento en formato PDF, con un límite de 15 MB por archivo. Se permite hasta tres archivos.</p>
            )}

            {isMetadataOnlyEdit ? (
              <div className="space-y-1.5 rounded-2xl border border-border/50 bg-muted/20 p-3 dark:border-slate-800/50 dark:bg-slate-900/20">
                {editingBatchFileNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-2 dark:border-slate-800/40 dark:bg-slate-900/40">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-500" />
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground dark:text-slate-400">{name}</span>
                    <Ban className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 dark:text-slate-600" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  id="instrumento-60-upload"
                  onChange={handleFileChange}
                  disabled={formData.archivos.length >= 3 || isLoadingPdf}
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
                  } ${isLoadingPdf ? "opacity-60 pointer-events-none" : ""}`}
                >
                  {isLoadingPdf ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        <p className="text-sm text-muted-foreground dark:text-slate-400">Cargando documento...</p>
                      </div>
                    </div>
                  ) : formData.archivos.length === 0 ? (
                    <label htmlFor="instrumento-60-upload" className="block cursor-pointer space-y-3">
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
                            onReplace={(newFile) => replaceFile(index, newFile)}
                          />
                        ))}
                      </div>

                      {formData.archivos.length < 3 && (
                        <label
                          htmlFor="instrumento-60-upload"
                          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background/60 py-3 text-sm text-muted-foreground transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:hover:border-emerald-500/40"
                        >
                          <FolderOpen className="h-4 w-4" />
                          Agregar otro archivo · {getEspaciosLabel()}
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
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
              onChange={(event) => setFormData((current) => ({ ...current, nota: event.target.value }))}
              placeholder="Agrega información adicional"
              className="min-h-[9rem] rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* Footer con acciones */}
          {formAccess.isExpired && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 mb-2 text-sm font-medium text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              <span>Formulario cerrado &mdash; el plazo de env&iacute;o ha vencido. Solo puedes consultar tu historial.</span>
            </div>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end dark:border-slate-700">
            {(editingDocumentId !== null || editingBatchDocIds.length > 0) ? (
              <Button
                variant="outline"
                onClick={() => setCancelEditDialogOpen(true)}
                disabled={isSubmitting || isLoadingPdf}
                className="rounded-2xl sm:px-6 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white"
              >
                Cancelar
              </Button>
            ) : (
              <Button variant="outline" onClick={resetForm} disabled={isSubmitting || isLoadingPdf} className="rounded-2xl sm:px-6 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white">
                Limpiar
              </Button>
            )}
            <Button
              variant="success"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting || !formAccess.canSubmit || isLoadingPdf}
              className="rounded-2xl sm:px-6 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white"
            >
              {isSubmitting ? "Enviando..." : editingDocumentId ? "Actualizar instrumento" : "Enviar instrumento"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de reenvío de documento devuelto */}
      <Dialog open={resubmitTarget !== null} onOpenChange={(open) => { if (!open) { setResubmitTarget(null); setResubmitFile(null); } }}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] ${resubmitFile ? "sm:max-w-2xl" : "sm:max-w-md"} dark:border-slate-800/70 dark:bg-slate-950/90 dark:backdrop-blur-md`}>
          <DialogHeader>
            <DialogTitle className="dark:text-white">Reenviar documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-slate-500">Archivo</p>
              <p className="break-all text-sm font-semibold dark:text-white">{resubmitTarget?.fileName}</p>
            </div>
            {resubmitTarget?.returnedComment && (
              <div className="rounded-lg border border-red-200/60 bg-red-50/40 px-3 py-2 dark:border-red-900/40 dark:bg-red-950/20">
                <p className="text-[10px] font-medium uppercase tracking-wide text-red-600 dark:text-red-400">Motivo de devolución</p>
                <p className="text-sm whitespace-pre-wrap break-words text-red-900 dark:text-red-100">{resubmitTarget.returnedComment}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="dark:text-white">Nuevo archivo PDF *</Label>
              <input
                type="file"
                accept=".pdf"
                id="resubmit-pdf-upload"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 15 * 1024 * 1024) { toast.error("El archivo excede el límite de 15 MB"); return; }
                  if (f.type !== "application/pdf") { toast.error("Selecciona un archivo PDF válido"); return; }
                  setResubmitFile(f);
                  e.target.value = "";
                }}
              />
              {resubmitFile ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/30 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="min-w-0 flex-1 break-all text-sm leading-snug dark:text-white">{resubmitFile.name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowResubmitPreview((v) => !v)}
                          title={showResubmitPreview ? "Ocultar vista previa" : "Ver documento"}
                          className="rounded p-1 text-muted-foreground transition hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setResubmitFile(null)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive dark:text-slate-400 dark:hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {showResubmitPreview && resubmitPreviewUrl && (
                    <div className="overflow-hidden rounded-lg border border-border dark:border-slate-700">
                      <object
                        data={resubmitPreviewUrl}
                        type="application/pdf"
                        className="h-[50vh] w-full"
                      >
                        <a
                          href={resubmitPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-32 items-center justify-center text-sm text-primary underline dark:text-emerald-400"
                        >
                          Abrir documento en nueva pestaña
                        </a>
                      </object>
                    </div>
                  )}
                </div>
              ) : (
                <label htmlFor="resubmit-pdf-upload" className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-slate-700 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-950/10">
                  <Upload className="h-6 w-6 text-muted-foreground dark:text-slate-400" />
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Selecciona el nuevo PDF a reenviar</p>
                </label>
              )}
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setResubmitTarget(null); setResubmitFile(null); }} disabled={isResubmitting} className="dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">
              Cancelar
            </Button>
            <Button variant="success" onClick={() => void handleResubmit()} disabled={!resubmitFile || isResubmitting} className="dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">
              {isResubmitting ? "Reenviando..." : "Reenviar documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para cancelar edición */}
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

      {/* Diálogo de vista previa */}
      <Dialog open={previewItem !== null} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewItem?.nombre ?? "Documento"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewLoading ? (
              <div className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="ml-2">Cargando...</p>
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
    </div>
  );
}