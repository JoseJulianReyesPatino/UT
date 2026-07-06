import React, { useMemo, useState, useEffect, useRef } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { Textarea } from "../../components/ui/textarea";
import { PdfPreview } from "../../components/PdfPreview";
import { carrieras, cuatrimestresLabels, parciales, planNormal, planNuevoModelo, type Cuatrimestre, type Plan } from "../../data/curricula";
import { Ban, Upload, FileText, History, X } from "lucide-react";
import { toast } from "sonner";
import { getCalendarFileUrl } from "../../lib/calendar";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { getDocumentDisplayFileName, fetchDocumentBlob } from "../../lib/documents";
import { ScrollArea } from "../../components/ui/scroll-area";
import { DocumentHistoryCard } from "../../components/DocumentHistoryCard";
import { formatGroupCode } from "../../../lib/utils";

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

const initialFormData: InstrumentoFormData = {
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

export default function RemedialPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const calendarioUrl = getCalendarFileUrl();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [groupsOptions, setGroupsOptions] = useState<Array<{ id: number; group_code: string; group_number: number }>>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [formData, setFormData] = useState<InstrumentoFormData>(initialFormData);

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
    if (editingDocumentId !== null) return;
    setFormData((current) => ({ ...current, grupo: "", parcial: "" }));
  }, [editingDocumentId, formData.carrera, formData.cuatrimestre]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!user) return;
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 20, per_page: 50 } });
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
    const selectedPlan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carrera = selectedPlan[formData.carrera];
    if (!carrera) return [];
    return Object.keys(carrera.cuatrimestres);
  }, [formData.carrera, formData.plan]);

  const materiasDisponibles = useMemo(() => {
    if (!formData.carrera || !formData.cuatrimestre || !formData.plan) return [];
    const selectedPlan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carrera = selectedPlan[formData.carrera];
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

  const resetForm = () => {
    setFormData({ ...initialFormData, docente: user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name || "" : "" });
    setEditingDocumentId(null);
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

    setFormData((current) => ({ ...current, archivos: [...current.archivos, ...newFiles] }));
  };

  const removeFile = (index: number) => {
    setFormData((current) => ({
      ...current,
      archivos: current.archivos.filter((_, fileIndex) => fileIndex !== index),
    }));
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

    const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

    const extractTitleParts = (title: unknown) => {
      const parts = asText(title)
        .trim()
        .split(" - ")
        .map((part) => part.trim())
        .filter(Boolean);

      return {
        materia: parts[0] ?? "",
        parcial: parts[1] ?? "",
      };
    };

    const extractCuatrimestreFromGroupCode = (groupCode: unknown, careerCode: string) => {
      const normalizedGroupCode = asText(groupCode).replaceAll("_", "-").toUpperCase();
      const normalizedCareerCode = asText(careerCode).replaceAll("_", "").toUpperCase();
      const suffix = normalizedCareerCode && normalizedGroupCode.startsWith(normalizedCareerCode)
        ? normalizedGroupCode.slice(normalizedCareerCode.length)
        : normalizedGroupCode;
      const match = /^(\d{1,2})/.exec(suffix);
      return match?.[1] ?? "";
    };

    const normalizeText = (value: unknown, fallback = "") => {
      const text = asText(value);
      if (!text || /^sin materia$/i.test(text) || text === "-") return fallback;
      return text;
    };

    const planKey = normalizePlanKey(document.plan ?? "");
    const careerCode = findCareerCodeByLabel(document.carrera_label ?? "", planKey as any);
    const allowedCuatrimestres = new Set(Object.keys(cuatrimestresLabels));
    const rawCuatrimestre = asText(document.cuatrimestre);
    const titleParts = extractTitleParts(document.title ?? document.file_path ?? "");
    const resolvedCuatrimestre = allowedCuatrimestres.has(rawCuatrimestre)
      ? rawCuatrimestre
      : extractCuatrimestreFromGroupCode(document.group_code ?? document.group ?? "", careerCode);

    const normalizeParcialForForm = (value: unknown, fallback = ""): string => {
      const raw = asText(value);
      const candidate = raw || fallback;
      if (!candidate) return "";
      const match = /\b([123])\b/.exec(candidate);
      return match ? `Parcial ${match[1]}` : candidate;
    };

    setEditingDocumentId(document.id);
    setFormData({
      plan: planKey,
      carrera: careerCode,
      cuatrimestre: (allowedCuatrimestres.has(rawCuatrimestre) ? rawCuatrimestre : resolvedCuatrimestre) as Cuatrimestre,
      materia: normalizeText(document.materia, titleParts.materia),
      parcial: normalizeParcialForForm(document.parcial, titleParts.parcial),
      grupo: formatGroupCode(document.group_code ?? document.group ?? ""),
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

  const uploadMultipleFiles = async (files: File[], basePayload: any) => {
    const uploadedIds = [];

    for (const file of files) {
      const title = file.name.toLowerCase().endsWith(".pdf") ? file.name : `${file.name}.pdf`;

      const fd = new FormData();
      fd.append('file', file);
      fd.append('form_id', String(basePayload.form_id));
      fd.append('title', title);
      if (basePayload.plan) fd.append('plan', String(basePayload.plan).replace(/-/g, '_'));
      if (basePayload.apartado_label) fd.append('apartado_label', basePayload.apartado_label);
      if (basePayload.carrera_label) fd.append('carrera_label', basePayload.carrera_label);
      if (basePayload.materia) fd.append('materia', basePayload.materia);
      if (basePayload.parcial) fd.append('parcial', basePayload.parcial);
      if (basePayload.group_id) fd.append('group_id', String(basePayload.group_id));
      if (basePayload.original_document_id) fd.append('original_document_id', String(basePayload.original_document_id));
      if (basePayload.nota) fd.append('nota', basePayload.nota);

      const result = await apiFetch("/documents", { method: "POST", body: fd });
      uploadedIds.push(result?.data?.id);
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
        form_id: 20,
        apartado_label: "remedial",
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

      toast.success(editingDocumentId ? "Remedial actualizado correctamente" : "Remedial enviado correctamente", {
        description: editingDocumentId ? "Tus documentos han sido actualizados." : "Tus documentos fueron enviados para revisión administrativa.",
      });

      setEditingDocumentId(null);
      resetForm();

      if (user) {
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 20, per_page: 50 } });
        setHistory(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (error: any) {
      toast.error(error?.message ?? "No fue posible subir el remedial");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-2 sm:p-4" ref={formRef}>
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-sm font-medium text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-slate-900/70 dark:text-emerald-300">
              <FileText className="h-4 w-4" />
              Envío de remedial
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Remedial</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Captura y envía el instrumento de evaluación para Remedial con el mismo estilo que Tutores.</p>
            </div>
          </div>

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
              <p className="text-sm text-slate-600 dark:text-slate-400">Se sube 3 días después de la aplicación de cada parcial.</p>
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
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Revisa cada campo, adjunta tus PDF y envía el remedial con confianza.</p>
        </div>
      </div>

      <Card className="overflow-hidden border border-slate-200/70 bg-white/90 shadow-[0_24px_90px_-35px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <CardHeader className="dark:border-slate-700">
          <CardTitle className="dark:text-white">Formulario Remedial</CardTitle>
          <CardDescription className="dark:text-slate-400">Los campos marcados con * son obligatorios.</CardDescription>
          {editingDocumentId && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              Estás editando el remedial existente. Ajusta los campos y selecciona el nuevo archivo PDF para actualizar.
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium dark:text-white">Plan *</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant={formData.plan === "nuevo-modelo" ? "success" : "outline"}
                  onClick={() => setFormData((current) => ({ ...current, plan: "nuevo-modelo", carrera: "", cuatrimestre: "", materia: "" }))}
                  className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left bg-white/80 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  <span className="text-base font-semibold">Plan Nuevo Modelo</span>
                  <span className="text-xs text-muted-foreground dark:text-slate-400">TSU e Ingeniería</span>
                </Button>
                <Button
                  variant={formData.plan === "plan-normal" ? "success" : "outline"}
                  onClick={() => setFormData((current) => ({ ...current, plan: "plan-normal", carrera: "", cuatrimestre: "", materia: "" }))}
                  className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left bg-white/80 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  <span className="text-base font-semibold">Plan Normal</span>
                  <span className="text-xs text-muted-foreground dark:text-slate-400">Ingenierías</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-white">Carrera *</Label>
              <Select
                value={formData.carrera}
                onValueChange={(value) => setFormData((current) => ({ ...current, carrera: value, cuatrimestre: "", materia: "" }))}
                disabled={!formData.plan}
              >
                <SelectTrigger className="rounded-2xl bg-white/80 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <SelectValue placeholder="Selecciona la carrera" />
                </SelectTrigger>
                <SelectContent className="dark:border-slate-700 dark:bg-slate-900">
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
                onValueChange={(value) => setFormData((current) => ({ ...current, cuatrimestre: value as Cuatrimestre, materia: "" }))} 
                disabled={!formData.carrera}
              >
                <SelectTrigger className="rounded-2xl bg-white/80 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
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
                onValueChange={(value) => setFormData((current) => ({ ...current, materia: value }))} 
                disabled={!formData.cuatrimestre}
              >
                <SelectTrigger className="rounded-2xl bg-white/80 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
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

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="dark:text-white">Parcial *</Label>
                <Select value={formData.parcial} onValueChange={(value) => setFormData((current) => ({ ...current, parcial: value }))}>
                  <SelectTrigger className="rounded-2xl bg-white/80 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
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
                {groupsOptions.length > 0 ? (
                  <Select value={formData.grupo} onValueChange={(value) => setFormData((c) => ({ ...c, grupo: value }))}>
                    <SelectTrigger className="rounded-2xl bg-white/80 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder="Selecciona el grupo" />
                    </SelectTrigger>
                    <SelectContent className="dark:border-slate-700 dark:bg-slate-900">
                      {groupsOptions.map((g) => (
                        <SelectItem key={g.id} value={formatGroupCode(g.group_code)} className="dark:text-white dark:hover:bg-slate-800">
                          {formatGroupCode(g.group_code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300">
                    No hay grupos disponibles.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="dark:text-white">Instrumento en PDF *</Label>
              <p className="text-sm text-muted-foreground dark:text-slate-400">Adjuntar el documento en formato PDF, con un límite de 5 MB por archivo. Se permite hasta tres archivos.</p>
              <div className="rounded-3xl border border-dashed border-border bg-white/70 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-emerald-500/40">
                <input 
                  type="file" 
                  accept=".pdf" 
                  multiple 
                  className="hidden" 
                  id="remedial-upload" 
                  onChange={handleFileChange} 
                  disabled={formData.archivos.length >= 3} 
                />
                <label htmlFor="remedial-upload" className="block cursor-pointer space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-emerald-500/10 dark:text-emerald-400">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium dark:text-white">{getArchivosLabel()}</p>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">{getEspaciosLabel()}</p>
                  </div>
                </label>
              </div>

              {formData.archivos.length > 0 && (
                <div className="space-y-2 pt-2">
                  {formData.archivos.map((archivo, index) => (
                    <PdfPreview key={`${archivo.name}-${archivo.size}-${index}`} file={archivo} title="Documento cargado" onRemove={() => removeFile(index)} />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="dark:text-white">Nombre del docente</Label>
              <div className="relative">
                <Input
                  value={formData.docente}
                  readOnly
                  placeholder="Nombre del docente"
                  className="rounded-2xl bg-white/70 cursor-default select-none pr-10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <Ban className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-500" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium dark:text-white">Declaración de autorización</p>
              <p className="text-sm text-muted-foreground dark:text-slate-400">
                Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares 
                y confirmo la veracidad de la información proporcionada.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="dark:text-white">Nota para administración (opcional)</Label>
              <Textarea 
                value={formData.nota} 
                onChange={(event) => setFormData((current) => ({ ...current, nota: event.target.value }))} 
                placeholder="Agrega información adicional" 
                className="min-h-[9rem] rounded-2xl bg-white/70 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row dark:border-slate-700">
            <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="rounded-2xl sm:px-6 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-white">
              Limpiar
            </Button>
            <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting} className="rounded-2xl sm:px-6 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">
              {isSubmitting ? "Enviando..." : editingDocumentId ? "Actualizar remedial" : "Enviar remedial"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}