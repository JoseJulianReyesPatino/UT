import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Ban, Upload, FileText, History, X, ArrowLeft, ChevronRight } from "lucide-react";
import { PdfPreview } from "../../components/PdfPreview";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { ScrollArea } from "../../components/ui/scroll-area";
import { DocumentHistoryCard } from "../../components/DocumentHistoryCard";
import { carrieras, Plan } from "../../data/curricula";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob, getDocumentDisplayFileName } from "../../lib/documents";
import { formatGroupCode } from "../../../lib/utils";

type DocumentoEstadia = "carta-presentacion" | "carta-aceptacion" | "carta-terminacion" | "acta-final-estadias";

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

export default function EstadiasPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<DocumentoEstadia | null>(null);
  const [formData, setFormData] = useState<EstadiaFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [groupsOptions, setGroupsOptions] = useState<Array<{ id: number; group_code: string; group_number: number }>>([]);
  const [history, setHistory] = useState<any[]>([]);

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
      formData.materia.trim() &&
      grupoValido &&
      formData.archivos.length > 0 &&
      user &&
      formData.docente.trim()
    );
  }, [formData, user, groupsOptions]);

  const handleSelectType = (type: DocumentoEstadia) => {
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

    setFormData((current) => ({ ...current, archivos: [...current.archivos, ...newFiles] }));
  };

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

  const uploadMultipleFiles = async (files: File[], basePayload: any) => {
    const uploadedIds = [];

    for (const file of files) {
      const cleanFileName = file.name.replace(/\.pdf$/i, '').substring(0, 50);
      const title = `${basePayload.titulo || selectedConfig?.titulo || "Documento"} - ${cleanFileName}`.trim();

      const fd = new FormData();
      fd.append('file', file);
      fd.append('form_id', String(basePayload.form_id));
      fd.append('title', title);
      if (basePayload.plan) fd.append('plan', String(basePayload.plan).replace(/-/g, '_'));
      if (basePayload.apartado_label) fd.append('apartado_label', basePayload.apartado_label);
      if (basePayload.carrera_label) fd.append('carrera_label', basePayload.carrera_label);
      if (basePayload.group_id) fd.append('group_id', String(basePayload.group_id));
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
        materia: formData.materia,
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Cartas y Acta</h1>
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
            <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
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
        <Card ref={formRef}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{selectedConfig.titulo}</CardTitle>
                <CardDescription>{selectedConfig.descripcion}</CardDescription>
                {editingDocumentId && (
                  <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    Estás editando el documento. Ajusta los campos y selecciona el nuevo archivo PDF para actualizar.
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => { setSelectedType(null); setEditingDocumentId(null); }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cambiar tipo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Plan *</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button 
                    variant={formData.plan === "nuevo-modelo" ? "success" : "outline"} 
                    onClick={() => setFormData((c) => ({ ...c, plan: "nuevo-modelo", carrera: "" }))}
                    className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left"
                  >
                    <span className="text-base font-semibold">Plan Nuevo Modelo</span>
                    <span className="text-xs text-muted-foreground">TSU e Ingeniería</span>
                  </Button>
                  <Button 
                    variant={formData.plan === "plan-normal" ? "success" : "outline"} 
                    onClick={() => setFormData((c) => ({ ...c, plan: "plan-normal", carrera: "" }))}
                    className="h-auto flex-col items-start justify-start rounded-2xl px-4 py-4 text-left"
                  >
                    <span className="text-base font-semibold">Plan Normal</span>
                    <span className="text-xs text-muted-foreground">Ingenierías</span>
                  </Button>
                </div>
                {getCuatrimestresTexto() && (
                  <p className="text-xs text-muted-foreground mt-2">{getCuatrimestresTexto()}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Carrera *</Label>
                <Select 
                  value={formData.carrera} 
                  onValueChange={(v) => setFormData((c) => ({ ...c, carrera: v, grupo: "" }))} 
                  disabled={!formData.plan}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Selecciona la carrera" />
                  </SelectTrigger>
                  <SelectContent>
                    {carrerasDisponibles.map((c) => (
                      <SelectItem key={c.codigo} value={c.codigo}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
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

              <div className="space-y-2 md:col-span-2">
                <Label>Materia *</Label>
                <Input
                  value={formData.materia}
                  onChange={(e) => setFormData((c) => ({ ...c, materia: e.target.value }))}
                  placeholder="Nombre de la materia"
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>{selectedConfig.etiquetaCarga} *</Label>
                <p className="text-sm text-muted-foreground">
                  Adjuntar el documento en formato PDF, con un límite de 5 MB por archivo. Hasta 3 archivos.
                </p>
                <div className="rounded-3xl border border-dashed border-border bg-background/60 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    id="estadia-pdf-upload"
                    onChange={handleFileChange}
                    disabled={formData.archivos.length >= 3}
                  />
                  <label htmlFor="estadia-pdf-upload" className="block cursor-pointer space-y-3">
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
                <Label>Nota para administrador (opcional)</Label>
                <Textarea
                  value={formData.nota}
                  onChange={(e) => setFormData((c) => ({ ...c, nota: e.target.value }))}
                  placeholder="Agrega una nota para revisión"
                  className="min-h-[9rem] rounded-2xl"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Nombre del docente *</Label>
                <div className="relative">
                  <Input
                    value={formData.docente}
                    readOnly
                    placeholder="Nombre del docente"
                    className="rounded-2xl bg-muted/50 cursor-default select-none pr-10"
                  />
                  <Ban className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Declaración de autorización</p>
                <p className="text-sm text-muted-foreground">
                  Por la presente, otorgo mi autorización para que estos datos sean utilizados con fines exclusivamente escolares 
                  y confirmo la veracidad de la información proporcionada.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row">
              <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="rounded-2xl sm:px-6">Limpiar</Button>
              <Button variant="success" onClick={handleSubmit} disabled={!isValid || isSubmitting} className="rounded-2xl sm:px-6">
                {isSubmitting ? "Enviando..." : editingDocumentId ? "Actualizar documento" : "Enviar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


