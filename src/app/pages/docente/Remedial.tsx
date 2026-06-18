import React, { useMemo, useState, useEffect, useRef } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { Textarea } from "../../components/ui/textarea";
import { PdfPreview } from "../../components/PdfPreview";
import { carrieras, cuatrimestresLabels, parciales, planNormal, planNuevoModelo, type Cuatrimestre, type Plan } from "../../data/curricula";
import { Upload, FileText, History, X } from "lucide-react";
import { toast } from "sonner";
import { getCalendarFileUrl } from "../../lib/calendar";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from "../../lib/env";
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
    setFormData((current) => ({ ...current, grupo: "", parcial: "" }));
  }, [formData.carrera, formData.cuatrimestre]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!user) return;
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 17, per_page: 50 } });
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

    const planKey = normalizePlanKey(document.plan ?? "");
    const careerCode = findCareerCodeByLabel(document.carrera_label ?? "", planKey as any);
    const allowedCuatrimestres = new Set(Object.keys(cuatrimestresLabels));
    const rawCuatrimestre = String(document.cuatrimestre ?? "").trim();
    const fallbackParcial = String(document.parcial ?? "").trim();
    const resolvedCuatrimestre = allowedCuatrimestres.has(rawCuatrimestre)
      ? rawCuatrimestre
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

  const documentFileUrl = (id: number) => `${API_BASE_URL.replace(/\/+$/, "")}/documents/${id}/file`;

  const getUploadedFileName = (doc: any) => {
    const path = String(doc?.file_path ?? "");
    if (!path) return "Documento sin nombre";
    const base = path.split("/").pop() ?? path;
    return base.replace(/^doc_[^_]+_/, "");
  };

  const openDocument = async (id: number, action: "view" | "download") => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      headers["ngrok-skip-browser-warning"] = "true";
      headers["Accept"] = "application/pdf";

      const res = await fetch(documentFileUrl(id), { method: "GET", headers });
      if (!res.ok) throw new Error(res.statusText || "Error al abrir documento");
      const blob = await res.blob();
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
      
      const cleanFileName = file.name.replace(/\.pdf$/i, "").substring(0, 50);
      const payload = {
        form_id: basePayload.form_id,
        apartado_label: basePayload.apartado_label,
        carrera_label: basePayload.carrera_label,
        plan: basePayload.plan,
        materia: basePayload.materia,
        parcial: basePayload.parcial,
        docente: basePayload.docente,
        nota: basePayload.nota,
        group_id: basePayload.group_id,
        group_code: basePayload.group_code,
        file_base64: fileBase64,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        title: `${basePayload.materia || "Remedial"} - ${basePayload.parcial || ""} - ${cleanFileName}`.trim(),
      };
      
      if (basePayload.original_document_id) {
        payload.original_document_id = basePayload.original_document_id;
      }
      
      const result = await apiFetch("/documents", { method: "POST", body: JSON.stringify(payload) });
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
        form_id: 17,
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
        const res = await apiFetch("/documents", { query: { uploaded_by: user.id, form_id: 17, per_page: 50 } });
        setHistory(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (error: any) {
      toast.error(error?.message ?? "No fue posible subir el remedial");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" ref={formRef}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Remedial</h1>
          <p className="text-muted-foreground">Captura y envía el instrumento de evaluación para Remedial.</p>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="rounded-2xl border-border bg-background px-4 py-5 text-foreground hover:bg-accent">
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
      </div>

      <div className="flex items-center justify-between rounded-md border-l-4 border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-300 dark:bg-emerald-900/10">
        <p className="text-sm font-medium text-black dark:text-white">Recordatorio: Se sube 3 días después de la aplicación de cada parcial.</p>
        <Button variant="outline" size="sm" onClick={() => window.open(calendarioUrl, "_blank")}>Calendario</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulario Remedial</CardTitle>
          <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
          {editingDocumentId && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              Estás editando el remedial existente. Ajusta los campos y selecciona el nuevo archivo PDF para actualizar.
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">Plan *</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant={formData.plan === "nuevo-modelo" ? "success" : "outline"}
                  onClick={() => setFormData((current) => ({ ...current, plan: "nuevo-modelo", carrera: "", cuatrimestre: "", materia: "" }))}
                  className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left"
                >
                  <span className="text-base font-semibold">Plan Nuevo Modelo</span>
                  <span className="text-xs text-muted-foreground">TSU e Ingeniería</span>
                </Button>
                <Button
                  variant={formData.plan === "plan-normal" ? "success" : "outline"}
                  onClick={() => setFormData((current) => ({ ...current, plan: "plan-normal", carrera: "", cuatrimestre: "", materia: "" }))}
                  className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left"
                >
                  <span className="text-base font-semibold">Plan Normal</span>
                  <span className="text-xs text-muted-foreground">Ingenierías</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Carrera *</Label>
              <Select
                value={formData.carrera}
                onValueChange={(value) => setFormData((current) => ({ ...current, carrera: value, cuatrimestre: "", materia: "" }))}
                disabled={!formData.plan}
              >
                <SelectTrigger className="rounded-2xl">
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
              <Select 
                value={formData.cuatrimestre} 
                onValueChange={(value) => setFormData((current) => ({ ...current, cuatrimestre: value as Cuatrimestre, materia: "" }))} 
                disabled={!formData.carrera}
              >
                <SelectTrigger className="rounded-2xl">
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

            <div className="space-y-2 md:col-span-2">
              <Label>Materia *</Label>
              <Select 
                value={formData.materia} 
                onValueChange={(value) => setFormData((current) => ({ ...current, materia: value }))} 
                disabled={!formData.cuatrimestre}
              >
                <SelectTrigger className="rounded-2xl">
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

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Parcial *</Label>
                <Select value={formData.parcial} onValueChange={(value) => setFormData((current) => ({ ...current, parcial: value }))}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Selecciona el parcial" />
                  </SelectTrigger>
                  <SelectContent>
                    {parciales.map((parcial) => (
                      <SelectItem key={parcial} value={parcial}>{parcial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Grupo *</Label>
                {groupsOptions.length > 0 ? (
                  <Select value={formData.grupo} onValueChange={(value) => setFormData((c) => ({ ...c, grupo: value }))}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Selecciona el grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupsOptions.map((g) => (
                        <SelectItem key={g.id} value={formatGroupCode(g.group_code)}>
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
              <Label>Instrumento en PDF *</Label>
              <p className="text-sm text-muted-foreground">Adjuntar el documento en formato PDF, con un límite de 5 MB por archivo. Se permite hasta tres archivos.</p>
              <div className="rounded-3xl border border-dashed border-border bg-background/60 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
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
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{getArchivosLabel()}</p>
                    <p className="text-xs text-muted-foreground">{getEspaciosLabel()}</p>
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
              <Label>Nombre del docente</Label>
              <Input
                value={formData.docente}
                onChange={(e) => setFormData(prev => ({ ...prev, docente: e.target.value }))}
                placeholder="Nombre del docente"
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Declaración de autorización</p>
              <p className="text-sm text-muted-foreground">
                Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares 
                y confirmo la veracidad de la información proporcionada.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Nota para administración (opcional)</Label>
              <Textarea 
                value={formData.nota} 
                onChange={(event) => setFormData((current) => ({ ...current, nota: event.target.value }))} 
                placeholder="Agrega información adicional" 
                className="min-h-[9rem] rounded-2xl"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row">
            <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="rounded-2xl sm:px-6">
              Limpiar
            </Button>
            <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting} className="rounded-2xl sm:px-6">
              {isSubmitting ? "Enviando..." : editingDocumentId ? "Actualizar remedial" : "Enviar remedial"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


