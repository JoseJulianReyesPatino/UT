import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { FileText, Search, Download, Eye, Filter, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
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
  status: "pendiente" | "revisado" | "devuelto";
  observaciones?: string | null;
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
    instrumento3040: "instrumento-3040",
    instrumento6070: "instrumento-6070",
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
    "instrumento-3040": "Instrumento 30/40",
    "instrumento-6070": "Instrumento 60/70",
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
  ];
  
  const [previewDocument, setPreviewDocument] = useState<ApiDocument | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPdfId, setLoadingPdfId] = useState<number | null>(null);

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "Todos los apartados" },
      { value: "planeacion", label: "Planeación" },
      { value: "instrumento-3040", label: "Instrumento 30/40%" },
      { value: "instrumento-6070", label: "Instrumento 60/70%" },
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

    if (normalizedTipo === "instrumento-30-normal" || normalizedTipo === "instrumento-40-nuevo") {
      return "instrumento-3040";
    }
    if (normalizedTipo === "instrumento-60-nuevo" || normalizedTipo === "instrumento-70-normal") {
      return "instrumento-6070";
    }

    if (normalizedTipo && normalizedTipo !== "documento" && normalizedTipo !== "undefined") {
      return normalizedTipo;
    }

    const nombre = doc.nombre.toLowerCase();
    if (nombre.includes("planeación") || nombre.includes("planeacion")) return "planeacion";
    if (nombre.includes("instrumento 30") || nombre.includes("instrumento 40")) return "instrumento-3040";
    if (nombre.includes("instrumento 60") || nombre.includes("instrumento 70")) return "instrumento-6070";
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
            observaciones: null,
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
                  {filteredDocuments.length} documentos encontrados
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
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-full min-w-[190px] sm:w-[190px] whitespace-nowrap rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                    <SelectValue placeholder="Tipo" className="whitespace-nowrap" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="dark:text-white dark:hover:bg-slate-800">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              {!isLoading && !loadError && filteredDocuments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground dark:border-slate-700 dark:text-slate-400">
                  No hay documentos que coincidan con los filtros actuales.
                </div>
              )}

              {!isLoading && !loadError && filteredDocuments.map((doc) => {
                const isTutoria = isTutoriaDocument(doc);
                const isEstadias = isEstadiasDocument(doc);
                const docTipo = getDocumentTipoForFilter(doc);
                const tipoDisplayLabel = getTipoLabel(docTipo);
                
                const fileNameUpper = getFileNameOnly(doc.nombre).toUpperCase().endsWith(".PDF")
                  ? getFileNameOnly(doc.nombre).toUpperCase()
                  : `${getFileNameOnly(doc.nombre).toUpperCase()}.PDF`;
                const hasMateria = doc.materia && doc.materia !== "Sin materia";
                const hasGrupo = doc.grupo && doc.grupo !== "Grupo ?" && doc.grupo !== "?";
                const hasCarrera = Boolean(doc.carrera && doc.carrera.trim());
                const planLabel = formatPlanLabel(doc.plan);
                const parcialLabel = formatParcialLabel(doc.parcial);

                return (
                  <div
                    key={doc.id}
                    className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 transition-colors hover:bg-accent/50 dark:border-slate-700 dark:hover:bg-slate-900/50"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 dark:bg-slate-800">
                        <FileText className="h-6 w-6 text-muted-foreground dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold uppercase tracking-wide text-foreground dark:text-white">
                          {fileNameUpper}
                        </p>

                        <Badge variant="secondary" className="mt-1 text-xs font-medium rounded-full dark:bg-slate-800 dark:text-slate-200">
                          {tipoDisplayLabel}
                        </Badge>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {hasCarrera && (
                            <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                              {doc.carrera}
                            </Badge>
                          )}
                          {planLabel && (
                            <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                              {planLabel}
                            </Badge>
                          )}
                          {!isTutoria && !isEstadias && hasMateria && (
                            <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                              {doc.materia}
                            </Badge>
                          )}
                          {hasGrupo && (
                            <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                              {`Grupo ${doc.grupo}`}
                            </Badge>
                          )}
                          {!isTutoria && !isEstadias && parcialLabel && (
                            <Badge variant="outline" className="text-xs font-medium rounded-full dark:border-slate-700 dark:text-slate-300">
                              {parcialLabel}
                            </Badge>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">
                          Enviado: {doc.fecha
                            ? `${new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(doc.fecha))}${doc.hora ? ` ${doc.hora}` : ""}`
                            : "Sin fecha"}
                        </p>

                        {doc.observaciones && (
                          <p className="text-xs text-muted-foreground mt-2 bg-muted px-2 py-1 rounded inline-block dark:bg-slate-800 dark:text-slate-300">
                            {doc.observaciones}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          doc.status === "revisado"
                            ? "success"
                            : doc.status === "pendiente"
                            ? "outline"
                            : "destructive"
                        }
                        className="rounded-full dark:border-slate-700"
                      >
                        {doc.status === "revisado"
                          ? "Revisado"
                          : doc.status === "pendiente"
                          ? "Pendiente"
                          : "Devuelto"}
                      </Badge>
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