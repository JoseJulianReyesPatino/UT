import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { CalendarDays, History, Sparkles, Upload } from "lucide-react";
import { PdfPreview } from "../../components/PdfPreview";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetDescription, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { ScrollArea } from "../../components/ui/scroll-area";
import { planNuevoModelo, planNormal, carrieras, cuatrimestresLabels, Plan, Cuatrimestre } from "../../data/curricula";
import { getCalendarFileUrl } from "../../lib/calendar";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from "../../lib/env";
import { formatGroupCode } from "../../../lib/utils";

interface PlaneacionFormData {
  plan: Plan | "";
  carrera: string;
  cuatrimestre: Cuatrimestre | "";
  materia: string;
  grupo: string;
  archivos: File[];
  docente: string;
  autorizacion: boolean;
  nota: string;
}

const initialFormData: PlaneacionFormData = {
  plan: "",
  carrera: "",
  cuatrimestre: "",
  materia: "",
  grupo: "",
  archivos: [],
  docente: "",
  autorizacion: false,
  nota: "",
};

export default function PlaneacionPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isReplacing = false;
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PlaneacionFormData>(initialFormData);
  const [sheetOpen, setSheetOpen] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [groupsOptions, setGroupsOptions] = useState<Array<{ id: number; group_code: string; group_number: number }>>([]);
  const [history, setHistory] = useState<any[]>([]);
  const calendarioUrl = getCalendarFileUrl();

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
    setFormData((current) => ({ ...current, grupo: "" }));
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

    return Object.keys(carrera.cuatrimestres);
  }, [formData.carrera, formData.plan]);

  const materiasDisponibles = useMemo(() => {
    if (!formData.carrera || !formData.cuatrimestre || !formData.plan) return [];

    const plan = formData.plan === "nuevo-modelo" ? planNuevoModelo : planNormal;
    const carrera = plan[formData.carrera];
    if (!carrera) return [];

    return carrera.cuatrimestres[formData.cuatrimestre] || [];
  }, [formData.carrera, formData.cuatrimestre, formData.plan]);

  const isValid = useMemo(() => {
    const validarGrupoPattern = /^[A-Z]{2,4}-\d{2}$/i.test(formData.grupo);
    const validarGrupo = groupsOptions.length > 0 ? formData.grupo !== "" : validarGrupoPattern;

    return Boolean(
      formData.plan &&
      formData.carrera &&
      formData.cuatrimestre &&
      formData.materia &&
      validarGrupo &&
      formData.archivos.length > 0 &&
      user &&
      formData.autorizacion
    );
  }, [formData, user, groupsOptions.length]);

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

  const selectedPlanLabel = formData.plan === "nuevo-modelo"
    ? "Nuevo Modelo"
    : formData.plan === "plan-normal"
      ? "Plan Normal"
      : "Sin plan";

  const selectedCareerLabel = carrerasDisponibles.find((c) => c.codigo === formData.carrera)?.nombre ?? "Sin carrera";
  const selectedCuatrimestreLabel = formData.cuatrimestre ? cuatrimestresLabels[formData.cuatrimestre as keyof typeof cuatrimestresLabels] : "Sin cuatrimestre";
  const selectedMateriaLabel = formData.materia || "Sin materia";
  const canOpenHistory = history.length > 0 || formData.archivos.length > 0;

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
      cuatrimestre: String(document.parcial || "") as Cuatrimestre,
      materia: document.materia ?? "",
      grupo: document.group_code ? formatGroupCode(document.group_code) : String(document.group_id ?? ""),
      archivos: [],
      docente: user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() : "",
      autorizacion: true,
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

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    setIsSubmitting(true);
    try {
      if (formData.archivos.length === 0) {
        throw new Error("No hay archivos para subir");
      }

      const carreraEntry = carrerasDisponibles.find((c) => c.codigo === formData.carrera);
      const carreraLabel = carreraEntry ? carreraEntry.nombre : formData.carrera;
      const file = formData.archivos[0];
      if (!file) throw new Error("Selecciona un archivo PDF");

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

      const payload: any = {
        form_id: 1,
        title: `${formData.materia} - Planeación`,
        apartado_label: "Planeacion",
        carrera_label: carreraLabel,
        file_base64: fileBase64,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      };

      if (formData.plan) payload.plan = formData.plan;
      if (formData.materia) payload.materia = formData.materia;
      if (formData.cuatrimestre) payload.parcial = String(formData.cuatrimestre);
      if (formData.grupo) {
        const sel = groupsOptions.find((g) => formatGroupCode(g.group_code) === formData.grupo || String(g.id) === formData.grupo);
        if (sel) {
          payload.group_id = Number(sel.id);
          payload.group_code = formatGroupCode(sel.group_code);
        } else {
          const numeric = Number(formData.grupo);
          payload.group_id = Number.isFinite(numeric) && numeric > 0 ? numeric : null;
          payload.group_code = formatGroupCode(formData.grupo);
        }
      }
      if (editingDocumentId) payload.original_document_id = String(editingDocumentId);

      await apiFetch("/documents", { method: "POST", body: JSON.stringify(payload) });

      toast.success(editingDocumentId ? "Planeación actualizada correctamente" : "Planeacion enviada correctamente", {
        description: editingDocumentId ? "Tu documento ha sido actualizado." : "Tu documento fue enviado para revision administrativa.",
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
    <div className="relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.06),transparent_32%)]" />
      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Planeación docente
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Planeación</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Captura tu planeación en una interfaz limpia, con contexto lateral y un flujo de trabajo más claro.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-2xl border-slate-200 bg-white px-4 py-5 text-slate-700 hover:bg-slate-100" onClick={() => window.open(calendarioUrl, "_blank") }>
              <CalendarDays className="mr-2 h-4 w-4" />
              Calendario
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="rounded-2xl border-slate-200 bg-white px-4 py-5 text-slate-700 hover:bg-slate-100">
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
                  {history && history.length > 0 ? (
                    <div className="space-y-3">
                      <p className="mb-2 text-sm font-medium">Historial de planeaciones</p>
                      <div className="relative">
                        <ScrollArea className="h-[min(78vh,44rem)] rounded-lg border border-slate-200/70 bg-white/40 pr-2 dark:border-slate-700 dark:bg-slate-900/30">
                          <div className="grid gap-3 p-1">
                            {history.map((h) => (
                              <div key={h.id} className="rounded-lg border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold">{h.title ?? h.file_path}</p>
                                    <p className="break-all text-xs text-muted-foreground">PDF: {getUploadedFileName(h)}</p>
                                    <p className="text-xs text-muted-foreground">{h.materia ?? "Planeación"}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{new Date(h.submitted_at).toLocaleString()}</p>
                                </div>

                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openDocument(h.id, "view")}>Ver</Button>
                                    <Button size="sm" variant="secondary" onClick={() => populateFormForEdit(h)} disabled={isReplacing}>Editar documento</Button>
                                  </div>
                                  <span className="text-xs text-muted-foreground">Estatus: {h.status ?? "Pendiente"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
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
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div ref={formRef}>
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-200/80 bg-white pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Formulario de Planeación</CardTitle>
                    <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    {formData.archivos.length}/3 archivos
                  </div>
                </div>
                {editingDocumentId ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Estás editando la planeación existente #{editingDocumentId}. Ajusta los campos y selecciona el nuevo archivo PDF para actualizar.
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">Plan *</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button variant={formData.plan === "nuevo-modelo" ? "success" : "outline"} onClick={() => setFormData((current) => ({ ...current, plan: "nuevo-modelo", carrera: "", cuatrimestre: "", materia: "" }))} className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left">
                        <span className="text-base font-semibold">Plan Nuevo Modelo</span>
                        <span className="text-xs text-muted-foreground">TSU e Ingeniería</span>
                      </Button>
                      <Button variant={formData.plan === "plan-normal" ? "success" : "outline"} onClick={() => setFormData((current) => ({ ...current, plan: "plan-normal", carrera: "", cuatrimestre: "", materia: "" }))} className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left">
                        <span className="text-base font-semibold">Plan Normal</span>
                        <span className="text-xs text-muted-foreground">Ingenierías</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Carrera *</Label>
                    <Select value={formData.carrera} onValueChange={(value) => setFormData((current) => ({ ...current, carrera: value, cuatrimestre: "", materia: "" }))} disabled={!formData.plan}>
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Selecciona la carrera" />
                      </SelectTrigger>
                      <SelectContent>
                        {carrerasDisponibles.map((carrera) => (
                          <SelectItem key={carrera.codigo} value={carrera.codigo}>{carrera.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cuatrimestre *</Label>
                    <Select value={formData.cuatrimestre} onValueChange={(value) => setFormData((current) => ({ ...current, cuatrimestre: value as Cuatrimestre, materia: "" }))} disabled={!formData.carrera}>
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Selecciona el cuatrimestre" />
                      </SelectTrigger>
                      <SelectContent>
                        {cuatrimestresDisponibles.map((cuatri) => (
                          <SelectItem key={cuatri} value={cuatri}>{cuatrimestresLabels[cuatri as keyof typeof cuatrimestresLabels]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Materia *</Label>
                    <Select value={formData.materia} onValueChange={(value) => setFormData((current) => ({ ...current, materia: value }))} disabled={!formData.cuatrimestre}>
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Selecciona la materia" />
                      </SelectTrigger>
                      <SelectContent>
                        {materiasDisponibles.map((materia, index) => (
                          <SelectItem key={`${materia.nombre}-${index}`} value={materia.nombre}>{materia.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Grupo *</Label>
                    {groupsOptions.length > 0 ? (
                      <Select value={formData.grupo} onValueChange={(v) => setFormData((c) => ({ ...c, grupo: v }))}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Selecciona el grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          {groupsOptions.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>{formatGroupCode(g.group_code)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={formData.grupo} onChange={(e) => setFormData((current) => ({ ...current, grupo: e.target.value.toUpperCase() }))} placeholder="Ej. JTH-01" maxLength={7} className="rounded-2xl" />
                    )}
                    <p className="text-xs text-muted-foreground">Formato: Ej. JTH-01 o selección automática</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Documentos (PDF) *</Label>
                    <p className="text-sm text-muted-foreground">Adjunta documentos PDF de hasta 5 MB por archivo. Puedes cargar hasta tres archivos en total.</p>
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-emerald-700/70 dark:hover:bg-slate-900">
                      <input type="file" accept=".pdf" multiple className="hidden" id="planeacion-pdf-upload" onChange={handleFileChange} disabled={formData.archivos.length >= 3} />
                      <label htmlFor="planeacion-pdf-upload" className="block cursor-pointer space-y-3">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
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
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      {user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() || user.name : "Inicia sesión para continuar"}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 md:col-span-2">
                    <Checkbox checked={formData.autorizacion} onCheckedChange={(value) => setFormData((current) => ({ ...current, autorizacion: Boolean(value) }))} id="autorizacion" />
                    <div className="space-y-2 text-sm">
                      <Label htmlFor="autorizacion" className="font-medium">Declaración de autorización</Label>
                      <p className="text-muted-foreground">Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares y confirmo la veracidad de la información proporcionada.</p>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Nota para administración (opcional)</Label>
                    <Textarea value={formData.nota} onChange={(e) => setFormData((current) => ({ ...current, nota: e.target.value }))} placeholder="Agrega una nota para revisión" className="min-h-[9rem] rounded-2xl" />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row dark:border-slate-800">
                  <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="rounded-2xl sm:px-6">Limpiar</Button>
                  <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting} className="rounded-2xl sm:px-6">{isSubmitting ? "Enviando..." : editingDocumentId ? "Actualizar planeación" : "Enviar planeación"}</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-200/80 bg-white">
                <CardTitle className="text-base">Resumen</CardTitle>
                <CardDescription>Estado actual del formulario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                {[
                  { label: "Plan", value: selectedPlanLabel },
                  { label: "Carrera", value: selectedCareerLabel },
                  { label: "Cuatrimestre", value: selectedCuatrimestreLabel },
                  { label: "Materia", value: selectedMateriaLabel },
                  { label: "Grupo", value: formData.grupo || "Sin grupo" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="max-w-[55%] truncate font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-200/80 bg-white">
                <CardTitle className="text-base">Acciones rápidas</CardTitle>
                <CardDescription>Herramientas auxiliares</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                <Button variant="outline" className="w-full justify-between rounded-2xl" onClick={() => window.open(calendarioUrl, "_blank") }>
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />Calendario académico</span>
                  <span className="text-xs text-muted-foreground">Abrir</span>
                </Button>
                <Button variant="outline" className="w-full justify-between rounded-2xl" onClick={() => setSheetOpen(true)} disabled={!canOpenHistory && history.length === 0 && formData.archivos.length === 0}>
                  <span className="flex items-center gap-2"><History className="h-4 w-4" />Historial de planeaciones</span>
                  <span className="text-xs text-muted-foreground">{history.length}</span>
                </Button>
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900/60">
                  Recomendación: redacta con títulos breves, estructura clara y documentos PDF en orden para acelerar la revisión.
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
