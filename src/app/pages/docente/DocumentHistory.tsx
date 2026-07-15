import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { FileText, Search, Download, Eye, Filter, Loader2, ChevronDown, Check, CheckCircle2, Clock2, Undo2, RefreshCw, StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import apiFetch from "../../lib/api";
import { fetchDocumentBlob, getDocumentDownloadUrl, getDocumentFileUrl, getDocumentDisplayFileName } from "../../lib/documents";

type ApiDocument = {
  id: number | string;
  nombre: string;
  tipo: string;
  tipoLabel: string;
  materia: string;
  parcial: string;
  grupo: string;
  carrera: string;
  plan: string;
  fecha: string | null;
  hora: string | null;
  status: "pendiente" | "revisado" | "devuelto" | "reenviado";
  observaciones?: string | null;
  batch_id?: string | null;
  fileUrl?: string | null;
  downloadUrl?: string | null;
  has_file?: boolean;
  form_id?: number;
  apartado_label?: string;
  isTutoria?: boolean;
};

// IDs de formularios de tutorías (según tu configuración)
const TUTORIA_FORM_IDS = [8, 9, 10, 11, 12];

// IDs de formularios de estadías (ajusta estos IDs según tu configuración)
const ESTADIAS_FORM_IDS = [13, 14, 15];

// Normalizar el título del documento (evitar "undefined")
const resolveDocumentTitle = (doc: any): string => {
  const title = (doc?.title ?? "").toString().trim();
  if (title && !/^undefined\b/i.test(title)) {
    return title;
  }

  const fileName = getDocumentDisplayFileName(doc?.title, doc?.file_path);
  return fileName || "Documento";
};

// Obtener solo el nombre del archivo sin el título completo
const getFileNameOnly = (fullName: string): string => {
  const parts = fullName.split(' - ');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return fullName;
};

const normalizeStatusFilter = (value: string) => {
  if (value === "aprobado") return "revisado";
  if (value === "revision") return "pendiente";
  if (value === "rechazado") return "devuelto";
  if (value === "resubmitted" || value === "resent") return "reenviado";
  return value;
};

const formatPlanLabel = (value?: string | null): string => {
  const normalized = (value ?? "").toString().toLowerCase();
  if (normalized.includes("nuevo")) return "Nuevo Modelo";
  if (normalized.includes("normal")) return "Plan Normal";
  return "";
};

const formatParcialLabel = (value?: string | null): string => {
  const raw = (value ?? "").toString().trim();
  if (!raw || raw === "N/A" || raw === "-") return "";
  const match = raw.match(/\b([123])\b/);
  if (match) return `Parcial ${match[1]}`;
  if (raw.toLowerCase().startsWith("parcial")) return raw;
  return `Parcial ${raw}`;
};

const normalizeTipoFilter = (value: string) => {
  const legacyMap: Record<string, string> = {
    instrumento3040: "instrumento-30-normal",
    "instrumento-3040": "instrumento-30-normal",
    instrumento6070: "instrumento-60-nuevo",
    "instrumento-6070": "instrumento-60-nuevo",
    lista: "lista-concentrada",
    portafolio: "portafolio-digital",
    acta: "acta-final",
  };
  return legacyMap[value] ?? value;
};

// Mapeo de tipos para mostrar etiquetas legibles
const getTipoLabel = (tipo: string): string => {
  const tipoMap: Record<string, string> = {
    "planeacion": "Planeación",
    "instrumento-30-normal": "Instrumento 30%",
    "instrumento-40-nuevo": "Instrumento 40%",
    "instrumento-60-nuevo": "Instrumento 60%",
    "instrumento-70-normal": "Instrumento 70%",
    "lista-concentrada": "Lista Concentrada",
    "asesoria": "Asesoría",
    "portafolio-digital": "Portafolio Digital",
    "acta-final": "Acta Final",
    "remedial": "Remedial",
    "estadias": "Estadías",
    "tutorias": "Tutorías",
    "carga-academica": "Carga Académica",
    "reporte-bajas": "Reporte de Bajas",
    "concentrado-asesorias": "Concentrado de Asesorías y Bajas",
    "acta-asistencia-grupal": "Acta de Asistencia Grupal",
    "ficha-tecnica": "Ficha Técnica",
    "carta-presentacion": "Carta de Presentación",
    "carta-aceptacion": "Carta de Aceptación",
    "carta-terminacion": "Carta de Terminación",
  };
  return tipoMap[tipo] || tipo;
};

function DocumentHistorySkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando documentos">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 dark:border-slate-700">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-12 w-12 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-2/3 rounded-full bg-muted" />
              <div className="h-5 w-24 rounded-full bg-muted" />
              <div className="flex flex-wrap gap-2 mt-1">
                <div className="h-5 w-44 rounded-full bg-muted" />
                <div className="h-5 w-24 rounded-full bg-muted" />
                <div className="h-5 w-32 rounded-full bg-muted" />
                <div className="h-5 w-20 rounded-full bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
              <div className="h-3 w-40 rounded-full bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="h-8 w-8 rounded-xl bg-muted" />
            <div className="h-8 w-8 rounded-xl bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [filterStatus, setFilterStatus] = useState(() => {
    try {
      return normalizeStatusFilter(localStorage.getItem("docs-filter-status") || "all");
    } catch {
      return "all";
    }
  });
  const [filterTipo, setFilterTipo] = useState(() => {
    try {
      return normalizeTipoFilter(localStorage.getItem("docs-filter-tipo") || "all");
    } catch {
      return "all";
    }
  });
  
  const statusOptions = [
    { value: "all", label: "Todos los estados" },
    { value: "revisado", label: "Revisados" },
    { value: "pendiente", label: "Pendientes" },
    { value: "devuelto", label: "Devueltos" },
    { value: "reenviado", label: "Reenviados" },
  ];
  
  const [filterTypeOpen, setFilterTypeOpen] = useState(false);
  const [filterTypeSearch, setFilterTypeSearch] = useState("");

  const [previewDocument, setPreviewDocument] = useState<ApiDocument | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPdfId, setLoadingPdfId] = useState<number | null>(null);
  const [motivoDialog, setMotivoDialog] = useState<{ nombre: string; obs: string } | null>(null);

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "Todos los apartados" },
      { value: "planeacion", label: "Planeación" },
      { value: "instrumento-30-normal", label: "Instrumento 30%" },
      { value: "instrumento-40-nuevo", label: "Instrumento 40%" },
      { value: "instrumento-60-nuevo", label: "Instrumento 60%" },
      { value: "instrumento-70-normal", label: "Instrumento 70%" },
      { value: "lista-concentrada", label: "Lista Concentrada" },
      { value: "asesoria", label: "Asesoría" },
      { value: "portafolio-digital", label: "Portafolio Digital" },
      { value: "acta-final", label: "Acta Final" },
      { value: "remedial", label: "Remedial" },
      { value: "estadias", label: "Estadías" },
      { value: "tutorias", label: "Tutorías" },
    ],
    []
  );

  const isTutoriaDocument = (doc: ApiDocument): boolean => {
    if (doc.form_id && TUTORIA_FORM_IDS.includes(doc.form_id)) {
      return true;
    }
    const apartado = (doc.apartado_label || "").toLowerCase();
    const tutoriasApartados = [
      "carga-academica",
      "reporte-bajas",
      "concentrado-asesorias",
      "acta-asistencia",
      "acta-asistencia-grupal",
      "ficha-tecnica"
    ];
    return tutoriasApartados.some(a => apartado.includes(a));
  };

  const isEstadiasDocument = (doc: ApiDocument): boolean => {
    if (doc.form_id && ESTADIAS_FORM_IDS.includes(doc.form_id)) {
      return true;
    }
    const nombre = doc.nombre.toLowerCase();
    const estadiasKeywords = [
      "carta presentación",
      "carta-presentacion",
      "carta aceptación",
      "carta-aceptacion",
      "carta terminación",
      "carta-terminacion",
      "estadía",
      "estadia"
    ];
    return estadiasKeywords.some(keyword => nombre.includes(keyword));
  };

  const getDocumentTipoForFilter = (doc: ApiDocument): string => {
    if (isEstadiasDocument(doc)) {
      return "estadias";
    }

    if (isTutoriaDocument(doc)) {
      const apartado = (doc.apartado_label || "").toLowerCase();
      if (apartado.includes("carga")) return "carga-academica";
      if (apartado.includes("baja")) return "reporte-bajas";
      if (apartado.includes("concentrado") && apartado.includes("asesorias")) return "concentrado-asesorias";
      if (apartado.includes("acta") && apartado.includes("asistencia")) return "acta-asistencia-grupal";
      if (apartado.includes("ficha")) return "ficha-tecnica";
      return "tutorias";
    }

    const normalizedTipo = (doc.tipo || "").toLowerCase();

    if (normalizedTipo === "instrumento-30-normal") return "instrumento-30-normal";
    if (normalizedTipo === "instrumento-40-nuevo") return "instrumento-40-nuevo";
    if (normalizedTipo === "instrumento-60-nuevo") return "instrumento-60-nuevo";
    if (normalizedTipo === "instrumento-70-normal") return "instrumento-70-normal";

    if (normalizedTipo && normalizedTipo !== "documento" && normalizedTipo !== "undefined") {
      return normalizedTipo;
    }

    const nombre = doc.nombre.toLowerCase();
    if (nombre.includes("planeación") || nombre.includes("planeacion")) return "planeacion";
    if (nombre.includes("instrumento 30")) return "instrumento-30-normal";
    if (nombre.includes("instrumento 40")) return "instrumento-40-nuevo";
    if (nombre.includes("instrumento 60")) return "instrumento-60-nuevo";
    if (nombre.includes("instrumento 70")) return "instrumento-70-normal";
    if (nombre.includes("lista")) return "lista-concentrada";
    if (nombre.includes("asesoría")) return "asesoria";
    if (nombre.includes("portafolio")) return "portafolio-digital";
    if (nombre.includes("acta")) return "acta-final";
    if (nombre.includes("remedial")) return "remedial";
    if (nombre.includes("estadía") || nombre.includes("estadia")) return "estadias";
    if (nombre.includes("carta presentación") || nombre.includes("carta-presentacion")) return "estadias";
    if (nombre.includes("carta aceptación") || nombre.includes("carta-aceptacion")) return "estadias";
    if (nombre.includes("carta terminación") || nombre.includes("carta-terminacion")) return "estadias";
    
    return "planeacion";
  };

  const openDocumentWithAuth = async (doc: ApiDocument, action: "view" | "download") => {
    if (action === "view") {
      setPreviewDocument(doc);
      return;
    }

    setLoadingPdfId(Number(doc.id));
    try {
      const blob = await fetchDocumentBlob(Number(doc.id), true);
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${doc.nombre}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error: any) {
      alert(`No se pudo descargar el documento: ${error?.message ?? "error"}`);
    } finally {
      setLoadingPdfId(null);
    }
  };

  useEffect(() => {
    if (!previewDocument) return;

    let isMounted = true;

    const loadPreview = async () => {
      if (previewDocument.has_file === false) {
        setPreviewError("El archivo de este documento no está disponible en el servidor.");
        setPreviewLoading(false);
        return;
      }
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewBlobUrl(null);
      try {
        const blob = await fetchDocumentBlob(Number(previewDocument.id));
        if (!isMounted) return;
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        setPreviewBlobUrl(URL.createObjectURL(pdfBlob));
      } catch (error) {
        if (!isMounted) return;
        setPreviewError(error instanceof Error ? error.message : "No fue posible abrir el PDF");
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    };

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [previewDocument]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await apiFetch("/documents", {
          query: {
            per_page: 100,
          },
        }) as any;

        if (!isMounted) return;

        const docsBackend = response?.data || [];

        const transformedDocs: ApiDocument[] = docsBackend.map((doc: any) => {
          let tipo = "planeacion";
          if (doc.form_code) {
            tipo = doc.form_code.toLowerCase().replace(/_/g, '-');
          } else if (doc.apartado_label) {
            tipo = doc.apartado_label.toLowerCase().replace(/\s+/g, '-');
          }
          
          const title = resolveDocumentTitle(doc);
          
          return {
            id: doc.id,
            nombre: title,
            tipo: tipo,
            tipoLabel: doc.form_title || doc.apartado_label || "Planeación",
            materia: doc.materia || "Sin materia",
            parcial: doc.parcial || "N/A",
            grupo: doc.group_code || `Grupo ${doc.group_id || "?"}`,
            carrera: doc.carrera_label || "",
            plan: doc.plan || "",
            fecha: doc.submitted_at,
            hora: doc.submitted_at ? new Date(doc.submitted_at).toLocaleTimeString() : null,
            status: doc.status,
            observaciones: doc.returned_comment || doc.observations || doc.observaciones || doc.notes || doc.feedback || null,
            batch_id: doc.batch_id || null,
            fileUrl: doc.file_path ? getDocumentFileUrl(doc.id) : null,
            downloadUrl: doc.file_path ? getDocumentDownloadUrl(doc.id) : null,
            form_id: doc.form_id,
            apartado_label: doc.apartado_label,
            isTutoria: TUTORIA_FORM_IDS.includes(doc.form_id),
          };
        });

        setDocuments(transformedDocs);
      } catch (err: any) {
        console.error("Error loading documents:", err);
        if (!isMounted) return;
        setLoadError(err.message || "No fue posible cargar el historial de documentos");
        setDocuments([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  const ESTADIAS_TIPOS = new Set([
    "estadias",
    "carta-presentacion",
    "carta-aceptacion",
    "carta-terminacion",
  ]);

  const TUTORIAS_TIPOS = new Set([
    "tutorias",
    "carga-academica",
    "reporte-bajas",
    "concentrado-asesorias",
    "acta-asistencia-grupal",
    "ficha-tecnica",
  ]);

  const matchesTipoFilter = (docTipo: string, filter: string): boolean => {
    if (filter === "all") return true;
    if (filter === "estadias") return ESTADIAS_TIPOS.has(docTipo);
    if (filter === "tutorias") return TUTORIAS_TIPOS.has(docTipo);
    return docTipo === filter;
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.materia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const docTipo = getDocumentTipoForFilter(doc);
    const matchesTipo = matchesTipoFilter(docTipo, filterTipo);
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const getGroupStatus = (docs: ApiDocument[]): ApiDocument["status"] => {
    const statuses = docs.map(d => d.status);
    if (statuses.includes("devuelto")) return "devuelto";
    if (statuses.includes("reenviado")) return "reenviado";
    if (statuses.every(s => s === "revisado")) return "revisado";
    return "pendiente";
  };

  const filteredGroups = useMemo(() => {
    const groups = new Map<string, ApiDocument[]>();
    for (const doc of filteredDocuments) {
      const key = doc.batch_id ? String(doc.batch_id) : `single-${doc.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    }
    return Array.from(groups.values()).sort((a, b) => {
      const dateA = a[0]?.fecha ? new Date(a[0].fecha).getTime() : 0;
      const dateB = b[0]?.fecha ? new Date(b[0].fecha).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredDocuments]);

  useEffect(() => {
    try {
      localStorage.setItem("docs-filter-status", filterStatus);
    } catch {
      // ignore
    }
  }, [filterStatus]);

  useEffect(() => {
    try {
      localStorage.setItem("docs-filter-tipo", filterTipo);
    } catch {
      // ignore
    }
  }, [filterTipo]);

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="relative space-y-6">
        <div>
          <h1 className="inline-block rounded-xl bg-emerald-600 px-4 py-1.5 text-2xl font-bold text-white shadow-sm dark:bg-emerald-700">
            Historial de Documentos
          </h1>
          <p className="mt-2 text-white/90 drop-shadow-sm dark:text-slate-400">
            Revisa todos los documentos que has enviado
          </p>
        </div>

        <Card className="overflow-hidden border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle className="dark:text-white">Mis Documentos</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? "s" : ""} en {filteredGroups.length} envío{filteredGroups.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="grid w-full gap-2 sm:w-auto sm:flex sm:flex-row sm:items-center sm:gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400"
                  />
                </div>
                <Popover open={filterTypeOpen} onOpenChange={(o) => { setFilterTypeOpen(o); if (!o) setFilterTypeSearch(""); }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full min-w-[190px] sm:w-[190px] rounded-2xl justify-between font-normal dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    >
                      <span className="truncate">{typeOptions.find(o => o.value === filterTipo)?.label ?? "Todos los apartados"}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-0 dark:bg-slate-900 dark:border-slate-700">
                    <div className="flex items-center border-b px-3 dark:border-slate-700">
                      <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        placeholder="Buscar apartado..."
                        value={filterTypeSearch}
                        onChange={(e) => setFilterTypeSearch(e.target.value)}
                        className="flex h-9 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground dark:text-white dark:placeholder:text-slate-400"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {typeOptions
                        .filter(o => o.label.toLowerCase().includes(filterTypeSearch.toLowerCase()))
                        .map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => { setFilterTipo(option.value); setFilterTypeOpen(false); setFilterTypeSearch(""); }}
                            className="relative flex w-full cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground dark:hover:bg-slate-800 dark:text-white"
                          >
                            <Check className={`h-4 w-4 shrink-0 ${filterTipo === option.value ? "opacity-100 text-emerald-500" : "opacity-0"}`} />
                            {option.label}
                          </button>
                        ))}
                      {typeOptions.filter(o => o.label.toLowerCase().includes(filterTypeSearch.toLowerCase())).length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground dark:text-slate-400">Sin resultados.</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full min-w-[190px] sm:w-[190px] [&>svg:last-child]:hidden rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                    <span className="flex min-w-0 items-center gap-2">
                      <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <SelectValue placeholder="Estado" />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value} className="dark:text-white dark:hover:bg-slate-800">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-2">
              {isLoading && <DocumentHistorySkeleton />}

              {!isLoading && loadError && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-400">
                  {loadError}
                </div>
              )}

              {!isLoading && !loadError && filteredGroups.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground dark:border-slate-700 dark:text-slate-400">
                  No hay documentos que coincidan con los filtros actuales.
                </div>
              )}

              {!isLoading && !loadError && filteredGroups.map((groupDocs) => {
                const rep = groupDocs[0];
                const isMulti = groupDocs.length > 1;
                const isTutoria = isTutoriaDocument(rep);
                const isEstadias = isEstadiasDocument(rep);
                const docTipo = getDocumentTipoForFilter(rep);
                const tipoDisplayLabel = getTipoLabel(docTipo);
                const hasMateria = rep.materia && rep.materia !== "Sin materia";
                const hasGrupo = rep.grupo && rep.grupo !== "Grupo ?" && rep.grupo !== "?";
                const hasCarrera = Boolean(rep.carrera && rep.carrera.trim());
                const planLabel = formatPlanLabel(rep.plan);
                const parcialLabel = formatParcialLabel(rep.parcial);
                const groupStatus = getGroupStatus(groupDocs);
                const groupObs = groupDocs.find(d => d.status === "devuelto" || d.status === "reenviado")?.observaciones || groupDocs[0]?.observaciones || null;
                const batchKey = rep.batch_id ? String(rep.batch_id) : `single-${rep.id}`;
                const dateStr = rep.fecha
                  ? `${new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(rep.fecha))}${rep.hora ? ` ${rep.hora}` : ""}`
                  : "Sin fecha";

                const statusBadge = (
                  <Badge
                    variant={
                      groupStatus === "revisado" ? "success"
                      : groupStatus === "devuelto" ? "destructive"
                      : groupStatus === "reenviado" ? "secondary"
                      : "warning"
                    }
                    className="rounded-full inline-flex items-center gap-1 px-2.5 py-1 shrink-0"
                  >
                    {groupStatus === "revisado" ? (
                      <><CheckCircle2 className="h-3 w-3" />Revisado</>
                    ) : groupStatus === "devuelto" ? (
                      <><Undo2 className="h-3 w-3" />Devuelto</>
                    ) : groupStatus === "reenviado" ? (
                      <><RefreshCw className="h-3 w-3" />Reenviado</>
                    ) : (
                      <><Clock2 className="h-3 w-3" />Pendiente</>
                    )}
                  </Badge>
                );

                const motivoBtn = groupObs && (groupStatus === "devuelto" || groupStatus === "reenviado") ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl dark:hover:bg-slate-800"
                        onClick={() => setMotivoDialog({ nombre: rep.nombre, obs: groupObs })}
                      >
                        <StickyNote className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver motivo de devolución</TooltipContent>
                  </Tooltip>
                ) : null;

                const metadataChips = (
                  <div className="flex flex-wrap gap-2">
                    {hasCarrera && (
                      <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                        {rep.carrera}
                      </Badge>
                    )}
                    {planLabel && (
                      <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                        {planLabel}
                      </Badge>
                    )}
                    {!isTutoria && !isEstadias && hasMateria && (
                      <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                        {rep.materia}
                      </Badge>
                    )}
                    {hasGrupo && (
                      <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                        {`Grupo ${rep.grupo}`}
                      </Badge>
                    )}
                    {!isTutoria && !isEstadias && parcialLabel && (
                      <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                        {parcialLabel}
                      </Badge>
                    )}
                  </div>
                );

                if (isMulti) {
                  return (
                    <div
                      key={batchKey}
                      className="rounded-2xl border border-border/70 p-4 transition-colors hover:bg-accent/50 dark:border-slate-700 dark:hover:bg-slate-900/50"
                    >
                      {/* Encabezado: ícono + info + status */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0 dark:bg-slate-800">
                            <FileText className="h-5 w-5 text-muted-foreground dark:text-slate-400" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-400">
                              {groupDocs.length} documentos enviados
                            </p>
                            <Badge variant="secondary" className="mt-1 text-xs font-medium rounded-full dark:bg-slate-800 dark:text-slate-200">
                              {tipoDisplayLabel}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Lista de archivos con status individual */}
                      <div className="space-y-1 mb-3">
                        {groupDocs.map((doc) => {
                          const _base = getFileNameOnly(doc.nombre);
                          const fileName = _base.toLowerCase().endsWith(".pdf") ? _base : `${_base}.pdf`;
                          const docObs = doc.observaciones;
                          const rowClass = doc.status === "devuelto"
                            ? "border-rose-200/60 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/10"
                            : doc.status === "revisado"
                            ? "border-emerald-200/50 bg-emerald-50/10 dark:border-emerald-900/30 dark:bg-emerald-950/10"
                            : doc.status === "reenviado"
                            ? "border-border/50 bg-muted/20 dark:border-slate-700/50 dark:bg-slate-800/20"
                            : "border-border/50 bg-muted/20 dark:border-slate-700/50 dark:bg-slate-800/20";
                          return (
                            <div key={doc.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${rowClass}`}>
                              <span className="text-xs font-medium truncate text-foreground dark:text-slate-200 min-w-0 flex-1">{fileName}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Badge
                                  variant={
                                    doc.status === "revisado" ? "success"
                                    : doc.status === "devuelto" ? "destructive"
                                    : doc.status === "reenviado" ? "secondary"
                                    : "warning"
                                  }
                                  className="rounded-full inline-flex items-center gap-1 px-2 py-0.5 text-[10px]"
                                >
                                  {doc.status === "revisado" ? (
                                    <><CheckCircle2 className="h-2.5 w-2.5" />Revisado</>
                                  ) : doc.status === "devuelto" ? (
                                    <><Undo2 className="h-2.5 w-2.5" />Devuelto</>
                                  ) : doc.status === "reenviado" ? (
                                    <><RefreshCw className="h-2.5 w-2.5" />Reenviado</>
                                  ) : (
                                    <><Clock2 className="h-2.5 w-2.5" />Pendiente</>
                                  )}
                                </Badge>
                                {docObs && (doc.status === "devuelto" || doc.status === "reenviado") && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-lg dark:hover:bg-slate-700"
                                        onClick={() => setMotivoDialog({ nombre: doc.nombre, obs: docObs })}
                                      >
                                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ver motivo de devolución</TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDocumentWithAuth(doc, "view")}
                                      disabled={doc.has_file === false || loadingPdfId === Number(doc.id)}
                                      className="h-7 w-7 rounded-lg dark:hover:bg-slate-700"
                                    >
                                      {loadingPdfId === Number(doc.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{doc.has_file === false ? "No disponible" : "Ver documento"}</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDocumentWithAuth(doc, "download")}
                                      disabled={doc.has_file === false || loadingPdfId === Number(doc.id)}
                                      className="h-7 w-7 rounded-lg dark:hover:bg-slate-700"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{doc.has_file === false ? "No disponible" : "Descargar"}</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Metadatos y fecha */}
                      {metadataChips}
                      <p className="mt-2 text-xs text-muted-foreground dark:text-slate-400">
                        Enviado: {dateStr}
                      </p>
                    </div>
                  );
                }

                // Documento individual
                const doc = rep;
                const _baseSingle = getFileNameOnly(doc.nombre);
                const fileNameUpper = _baseSingle.toLowerCase().endsWith(".pdf") ? _baseSingle : `${_baseSingle}.pdf`;

                return (
                  <div
                    key={batchKey}
                    className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 transition-colors hover:bg-accent/50 dark:border-slate-700 dark:hover:bg-slate-900/50"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 dark:bg-slate-800">
                        <FileText className="h-6 w-6 text-muted-foreground dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground dark:text-white">
                          {fileNameUpper}
                        </p>
                        <Badge variant="secondary" className="mt-1 text-xs font-medium rounded-full dark:bg-slate-800 dark:text-slate-200">
                          {tipoDisplayLabel}
                        </Badge>
                        <div className="mt-2">{metadataChips}</div>
                        <p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">
                          Enviado: {dateStr}
                        </p>
                        {doc.observaciones && groupStatus !== "devuelto" && groupStatus !== "reenviado" && (
                          <p className="text-xs text-muted-foreground mt-2 bg-muted px-2 py-1 rounded inline-block dark:bg-slate-800 dark:text-slate-300">
                            {doc.observaciones}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge}
                      {motivoBtn}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDocumentWithAuth(doc, "view")}
                            disabled={doc.has_file === false || loadingPdfId === Number(doc.id)}
                            className="rounded-xl dark:hover:bg-slate-800"
                          >
                            {loadingPdfId === Number(doc.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{doc.has_file === false ? "Archivo no disponible en el servidor" : "Ver documento"}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDocumentWithAuth(doc, "download")}
                            disabled={doc.has_file === false || loadingPdfId === Number(doc.id)}
                            className="rounded-xl dark:hover:bg-slate-800"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{doc.has_file === false ? "Archivo no disponible en el servidor" : "Descargar documento"}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={motivoDialog !== null} onOpenChange={(open) => { if (!open) setMotivoDialog(null); }}>
        <DialogContent className="max-w-md dark:border-slate-800/70 dark:bg-slate-950/90 dark:backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Motivo de devolución</DialogTitle>
            {motivoDialog && (
              <DialogDescription className="dark:text-slate-400 truncate">
                {motivoDialog.nombre}
              </DialogDescription>
            )}
          </DialogHeader>
          {motivoDialog && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
              <p className="text-sm text-foreground whitespace-pre-wrap break-words dark:text-slate-200">
                {motivoDialog.obs}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={previewDocument !== null} onOpenChange={(open) => { if (!open) setPreviewDocument(null); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col dark:bg-slate-950 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{previewDocument ? getFileNameOnly(previewDocument.nombre) : ""}</DialogTitle>
            {previewDocument && (
              <DialogDescription className="dark:text-slate-400">
                {previewDocument.materia ? `${previewDocument.materia} · ` : ""}{previewDocument.carrera}
              </DialogDescription>
            )}
          </DialogHeader>
          {previewDocument && (
            <div className="flex-1 min-h-0">
              {previewLoading ? (
                <div className="animate-pulse h-[82vh] rounded-lg border border-border bg-muted/40 dark:border-slate-700 dark:bg-slate-900/50" />
              ) : previewError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                  {previewError}
                </div>
              ) : previewBlobUrl ? (
                <object data={previewBlobUrl} type="application/pdf" className="h-[82vh] w-full rounded-lg border border-border dark:border-slate-700">
                  <a href={previewBlobUrl} target="_blank" rel="noopener noreferrer" className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-primary underline dark:border-slate-700 dark:text-emerald-400">
                    Abrir documento en nueva pestaña
                  </a>
                </object>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}