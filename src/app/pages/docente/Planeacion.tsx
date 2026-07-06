import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Ban, History, Upload, FolderOpen, Calendar, CalendarClock } from "lucide-react";
import { PdfPreview } from "../../components/PdfPreview";
import { toast } from "sonner";
import { getCalendarFileUrl } from "../../lib/calendar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { ScrollArea } from "../../components/ui/scroll-area";
import { DocumentHistoryCard } from "../../components/DocumentHistoryCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { planNuevoModelo, planNormal, carrieras, cuatrimestres, cuatrimestresLabels, parciales, Plan, Cuatrimestre } from "../../data/curricula";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob, getDocumentDisplayFileName } from "../../lib/documents";
import { formatGroupCode } from "../../../lib/utils";

interface PlaneacionFormData {
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

const initialFormData: PlaneacionFormData = {
  plan: "",
  carrera: "",
  cuatrimestre: "",
  materia: "",
  parcial: "",
  grupo: "",
  archivos: [],
  docente: "",
  nota: "",
};

export default function PlaneacionPage({ deadlineInfo }: { deadlineInfo?: { formattedDeadline: string; isUrgent: boolean } | null }) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PlaneacionFormData>(initialFormData);
  const [sheetOpen, setSheetOpen] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [groupsOptions, setGroupsOptions] = useState<Array<{ id: number; group_code: string; group_number: number }>>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState<{ id: number; nombre: string } | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
    let cancelled = false;
    void (async () => {
      try {
        if (!user) return;
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 1, per_page: 50 } });
        if (cancelled) return;
        setHistory(Array.isArray(res?.data) ? res.data : []);
      } catch (error) {
        console.error("Could not load history", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

const cuatrimestresDisponibles = useMemo(() => {
  if (!formData.carrera || !formData.plan) return [];
  const plan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
  const carrera = plan[formData.carrera];
  if (!carrera) return [];
  return cuatrimestres.filter((c) => c in carrera.cuatrimestres);
}, [formData.carrera, formData.plan]);

  const materiasDisponibles = useMemo(() => {
    if (!formData.carrera || !formData.cuatrimestre || !formData.plan) return [];
    const plan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carrera = plan[formData.carrera];
    if (!carrera) return [];
    return carrera.cuatrimestres[formData.cuatrimestre] || [];
  }, [formData.carrera, formData.cuatrimestre, formData.plan]);

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
      formData.cuatrimestre &&
      formData.materia &&
      formData.parcial &&
      grupoValido &&
      formData.archivos.length > 0 &&
      user &&
      formData.docente.trim()
    );
  }, [formData, user, groupsOptions]);

  const processFiles = (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList);
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
   const allowedCuatrimestres = new Set(Object.keys(cuatrimestresLabels));
const rawCuatrimestre = String(document.cuatrimestre ?? "").trim();
const normalizedCuatrimestre = rawCuatrimestre === "0" ? "propedeutico" : rawCuatrimestre;
const fallbackParcial = String(document.parcial ?? "").trim();
const resolvedCuatrimestre = allowedCuatrimestres.has(normalizedCuatrimestre)
  ? normalizedCuatrimestre
  : (allowedCuatrimestres.has(fallbackParcial) ? fallbackParcial : "");

    const normalizeParcialForForm = (value: unknown): string => {
      const raw = String(value ?? "").trim();
      const match = raw.match(/\b([123])\b/);
      return match ? `Parcial ${match[1]}` : "";
    };

    setEditingDocumentId(document.id);
    setFormData({
      plan: planKey as Plan,
      carrera: careerCode,
      cuatrimestre: resolvedCuatrimestre as Cuatrimestre,
      materia: document.materia ?? "",
      parcial: normalizeParcialForForm(document.parcial),
      grupo: document.group_code ? formatGroupCode(document.group_code) : "",
      archivos: [],
      docente: document.docente ?? (user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() : ""),
      nota: document.note ?? document.nota ?? "",
    });
    setSheetOpen(false);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
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
      const title = `${basePayload.materia || "Planeación"} - ${basePayload.parcial || ""} - ${cleanFileName}`.trim();

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
      
      const basePayload: any = {
        form_id: 1,
        apartado_label: "Planeacion",
        carrera_label: carreraLabel,
        plan: formData.plan,
        materia: formData.materia,
        parcial: formData.parcial,
        docente: formData.docente,
        nota: formData.nota,
      };

      if (selectedGroup) {
        basePayload.group_id = selectedGroup.id;
        basePayload.group_code = formatGroupCode(selectedGroup.group_code);
      }
      
      if (editingDocumentId) basePayload.original_document_id = String(editingDocumentId);

      await uploadMultipleFiles(formData.archivos, basePayload);

      toast.success(editingDocumentId ? "Planeación actualizada correctamente" : "Planeación enviada correctamente", {
        description: editingDocumentId ? "Tus documentos han sido actualizados." : "Tus documentos fueron enviados para revisión administrativa.",
      });
      
      setEditingDocumentId(null);
      resetForm();
      
      if (user) {
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 1, per_page: 50 } });
        setHistory(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (error: any) {
      toast.error(error?.message ?? "No fue posible subir la planeación");
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
          <SheetContent side="right" className="sm:max-w-xl overflow-y-auto dark:border-slate-700 dark:bg-slate-950">
            <SheetHeader>
              <SheetTitle className="dark:text-white">Historial de archivos</SheetTitle>
              <SheetDescription className="dark:text-slate-400">Selecciona un documento del historial para ver, descargar o editar.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              {history.length > 0 ? (
                <ScrollArea className="h-[min(78vh,44rem)] rounded-lg border border-border bg-background/40 pr-2 dark:border-slate-700 dark:bg-slate-900/30">
                  <div className="grid gap-3 p-1">
                    {history.map((h) => (
                      <DocumentHistoryCard
                        key={h.id}
                        title=""
                        fileName={getUploadedFileName(h)}
                        carrera={h.carrera_label}
                        subject={h.materia}
                        submittedAt={new Date(h.submitted_at).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        status={h.status}
                        returnedComment={String(h.status ?? "").toLowerCase() === "devuelto" ? h.returned_comment : undefined}
                        onView={() => openPreview(h)}
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

      {/* Título y subtítulo */}
      <div className="space-y-1 pt-1">
        <h1 className="text-3xl font-bold text-white drop-shadow-sm dark:text-white">Planeación</h1>
        <p className="text-white/90 drop-shadow-sm dark:text-slate-400">
          Recordatorio: se sube 3 días después de la aplicación de cada parcial.
        </p>
      </div>

      <Card className="overflow-hidden border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
        <CardContent className="relative space-y-6 p-6 pt-5 sm:p-8 sm:pt-6">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Los campos marcados con * son obligatorios.</p>
          {editingDocumentId && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              Estás editando la planeación existente. Ajusta los campos y selecciona el nuevo archivo PDF para actualizar.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Selector de Plan */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium dark:text-white">Plan *</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFormData((current) => ({ ...current, plan: "nuevo-modelo", carrera: "", cuatrimestre: "", materia: "", parcial: "", grupo: "" }))}
                  className={`group relative flex items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                    formData.plan === "nuevo-modelo"
                      ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40 dark:border-emerald-400 dark:bg-emerald-950/30"
                      : "border-border bg-background hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500/30 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex-1">
                    <span className="block text-base font-semibold dark:text-white">Plan Nuevo Modelo</span>
                    <span className="block text-xs text-muted-foreground dark:text-slate-400">TSU e Ingeniería</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((current) => ({ ...current, plan: "plan-normal", carrera: "", cuatrimestre: "", materia: "", parcial: "", grupo: "" }))}
                  className={`group relative flex items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                    formData.plan === "plan-normal"
                      ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40 dark:border-emerald-400 dark:bg-emerald-950/30"
                      : "border-border bg-background hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500/30 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex-1">
                    <span className="block text-base font-semibold dark:text-white">Plan Normal</span>
                    <span className="block text-xs text-muted-foreground dark:text-slate-400">Ingenierías</span>
                  </div>
                </button>
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
                    disabled={!formData.plan}
                  >
                    <SelectTrigger className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder="Selecciona la carrera" />
                    </SelectTrigger>
                   <SelectContent className="dark:border-slate-700 dark:bg-slate-900" position="popper" avoidCollisions={false}>
                      {carrerasDisponibles.map((carrera) => (
                        <SelectItem key={carrera.codigo} value={carrera.codigo} className="dark:text-white dark:hover:bg-slate-800">{carrera.nombre}</SelectItem>
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
                      {cuatrimestresDisponibles.map((cuatri) => (
                        <SelectItem key={cuatri} value={cuatri} className="dark:text-white dark:hover:bg-slate-800">{cuatrimestresLabels[cuatri as keyof typeof cuatrimestresLabels]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="dark:text-white">Materia *</Label>
                  <Select 
                    value={formData.materia} 
                    onValueChange={(value) => setFormData((current) => ({ ...current, materia: value }))} 
                    disabled={!formData.cuatrimestre}
                  >
                    <SelectTrigger className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder="Selecciona la materia" />
                    </SelectTrigger>
                    <SelectContent className="dark:border-slate-700 dark:bg-slate-900">
                      {materiasDisponibles.map((materia, index) => (
                        <SelectItem key={`${materia.nombre}-${index}`} value={materia.nombre} className="dark:text-white dark:hover:bg-slate-800">{materia.nombre}</SelectItem>
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
              <Label className="dark:text-white">Documentos (PDF) *</Label>
              <p className="text-sm text-muted-foreground dark:text-slate-400">Adjunta documentos PDF de hasta 5 MB por archivo. Puedes cargar hasta tres archivos en total.</p>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`rounded-3xl border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30"
                    : "border-border bg-background/60 hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-emerald-500/40"
                }`}
              >
                <input 
                  type="file" 
                  accept=".pdf" 
                  multiple 
                  className="hidden" 
                  id="planeacion-pdf-upload" 
                  onChange={handleFileChange} 
                  disabled={formData.archivos.length >= 3} 
                />
                <label htmlFor="planeacion-pdf-upload" className={formData.archivos.length >= 3 ? "block space-y-3" : "block cursor-pointer space-y-3"}>
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                    isDragging ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary dark:bg-emerald-500/10 dark:text-emerald-400"
                  }`}>
                    {formData.archivos.length > 0 ? <FolderOpen className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium dark:text-white">{getArchivosLabel()}</p>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      {isDragging ? "Suelta aquí para cargar" : `${getEspaciosLabel()} · arrastra o haz clic`}
                    </p>
                  </div>
                </label>
              </div>

              {formData.archivos.length > 0 && (
                <div className="space-y-2 pt-2">
                  {formData.archivos.map((archivo, index) => (
                    <PdfPreview 
                      key={`${archivo.name}-${archivo.size}-${index}`} 
                      file={archivo} 
                      title="Documento cargado" 
                      onRemove={() => removeFile(index)} 
                    />
                  ))}
                </div>
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
                onChange={(e) => setFormData((current) => ({ ...current, nota: e.target.value }))} 
                placeholder="Agrega una nota para revisión" 
                className="min-h-[9rem] rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500" 
              />
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end dark:border-slate-700">
            <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="rounded-2xl sm:px-6 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white">
              Limpiar
            </Button>
            <Button 
              variant="success" 
              onClick={handleSubmit} 
              disabled={!isValid || isSubmitting} 
              className="rounded-2xl sm:px-6 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white"
            >
              {isSubmitting ? "Enviando..." : editingDocumentId ? "Actualizar planeación" : "Enviar planeación"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}