import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { FileText, Search, Download, Eye, Filter, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import apiFetch from "../../lib/api";
import { fetchDocumentBlob, getDocumentDownloadUrl, getDocumentFileUrl, getDocumentDisplayFileName } from "../../lib/documents";
import { AUTH_TOKEN_STORAGE_KEY } from "../../lib/env";

type ApiDocument = {
  id: number | string;
  nombre: string;
  tipo: string;
  tipoLabel: string;
  materia: string;
  parcial: string;
  grupo: string;
  fecha: string | null;
  hora: string | null;
  status: "pendiente" | "revisado" | "devuelto";
  observaciones?: string | null;
  fileUrl?: string | null;
  downloadUrl?: string | null;
  form_id?: number;
  apartado_label?: string;
  isTutoria?: boolean;
};

// IDs de formularios de tutorías (según tu configuración)
const TUTORIA_FORM_IDS = [8, 9, 10, 11, 12];

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
  // Si tiene un guión, tomar la última parte
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
  
  const [openPreview, setOpenPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | undefined>(undefined);
  const [loadingPdfId, setLoadingPdfId] = useState<number | null>(null);

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "Todos los apartados" },
      { value: "planeacion", label: "Planeación" },
      { value: "instrumento-3040", label: "Instrumento 30/40" },
      { value: "instrumento-6070", label: "Instrumento 60/70" },
      { value: "lista-concentrada", label: "Lista Concentrada" },
      { value: "asesoria", label: "Asesoría" },
      { value: "portafolio-digital", label: "Portafolio Digital" },
      { value: "acta-final", label: "Acta Final" },
      { value: "remedial", label: "Remedial" },
      { value: "estadias", label: "Estadías" },
      { value: "tutorias", label: "Tutorías" },
      { value: "carga-academica", label: "Carga Académica" },
      { value: "reporte-bajas", label: "Reporte de Bajas" },
      { value: "concentrado-asesorias", label: "Concentrado de Asesorías y Bajas" },
      { value: "acta-asistencia-grupal", label: "Acta de Asistencia Grupal" },
      { value: "ficha-tecnica", label: "Ficha Técnica" },
      { value: "carta-presentacion", label: "Carta de Presentación" },
      { value: "carta-aceptacion", label: "Carta de Aceptación" },
      { value: "carta-terminacion", label: "Carta de Terminación" },
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

  const getDocumentTipoForFilter = (doc: ApiDocument): string => {
    if (isTutoriaDocument(doc)) {
      const apartado = (doc.apartado_label || "").toLowerCase();
      if (apartado.includes("carga")) return "carga-academica";
      if (apartado.includes("baja")) return "reporte-bajas";
      if (apartado.includes("concentrado") && apartado.includes("asesorias")) return "concentrado-asesorias";
      if (apartado.includes("acta") && apartado.includes("asistencia")) return "acta-asistencia-grupal";
      if (apartado.includes("ficha")) return "ficha-tecnica";
      return "tutorias";
    }

    if (doc.tipo && doc.tipo !== "documento") return doc.tipo;
    
    const nombre = doc.nombre.toLowerCase();
    if (nombre.includes("planeación")) return "planeacion";
    if (nombre.includes("instrumento")) return "instrumento-3040";
    if (nombre.includes("lista")) return "lista-concentrada";
    if (nombre.includes("asesoría")) return "asesoria";
    if (nombre.includes("portafolio")) return "portafolio-digital";
    if (nombre.includes("acta")) return "acta-final";
    if (nombre.includes("remedial")) return "remedial";
    if (nombre.includes("estadías")) return "estadias";
    return "planeacion";
  };

  const openDocumentWithAuth = async (documentId: number, title: string, action: "view" | "download") => {
    setLoadingPdfId(documentId);
    try {
      const blob = await fetchDocumentBlob(documentId, action === "download");
      const blobUrl = URL.createObjectURL(blob);

      if (action === "view") {
        setPreviewUrl(blobUrl);
        setPreviewTitle(title);
        setOpenPreview(true);
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
    } catch (error: any) {
      console.error("Error loading document:", error);
      alert(`No se pudo ${action === "view" ? "abrir" : "descargar"} el documento: ${error?.message ?? "documento"}`);
    } finally {
      setLoadingPdfId(null);
    }
  };

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
            tipo = doc.form_code;
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

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.materia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const docTipo = getDocumentTipoForFilter(doc);
    const matchesTipo = filterTipo === "all" || docTipo === filterTipo;
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
    <div className="space-y-6">
      <div>
        <h1>Historial de Documentos</h1>
        <p className="text-muted-foreground">
          Revisa todos los documentos que has enviado
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Mis Documentos</CardTitle>
              <CardDescription>
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
                  className="pl-9"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full min-w-[190px] sm:w-[190px] whitespace-nowrap">
                  <SelectValue placeholder="Tipo" className="whitespace-nowrap" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full min-w-[190px] sm:w-[190px] [&>svg:last-child]:hidden">
                  <span className="flex min-w-0 items-center gap-2">
                    <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Estado" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
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
            {isLoading && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Cargando...
              </div>
            )}

            {!isLoading && loadError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                {loadError}
              </div>
            )}

            {!isLoading && !loadError && filteredDocuments.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                No hay documentos que coincidan con los filtros actuales.
              </div>
            )}

            {!isLoading && !loadError && filteredDocuments.map((doc) => {
              const isTutoria = isTutoriaDocument(doc);
              
              // --- CORRECCIÓN: Construir información sin duplicar el título ---
              let infoLine = "";
              if (isTutoria) {
                infoLine = doc.materia && doc.materia !== "Sin materia" ? doc.materia : "Documento de tutoría";
              } else {
                const parts = [];
                // Materia
                if (doc.materia && doc.materia !== "Sin materia") {
                  parts.push(doc.materia);
                }
                // Parcial - CORREGIDO: ya no dice "Parcial Parcial"
                if (doc.parcial && doc.parcial !== "N/A" && doc.parcial !== "") {
                  // Si el parcial ya viene con la palabra "Parcial", no la agregamos de nuevo
                  const parcialStr = String(doc.parcial);
                  if (parcialStr.toLowerCase().startsWith("parcial ")) {
                    parts.push(parcialStr);
                  } else {
                    parts.push(`Parcial ${parcialStr}`);
                  }
                }
                // Grupo
                if (doc.grupo && doc.grupo !== "Grupo ?" && doc.grupo !== "?") {
                  parts.push(`Grupo ${doc.grupo}`);
                }
                infoLine = parts.length > 0 ? parts.join(" • ") : "Sin información";
              }

              return (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Solo el nombre del archivo, sin el título repetido */}
                      <p className="font-medium">{getFileNameOnly(doc.nombre)}</p>
                      <p className="text-sm text-muted-foreground">
                        {infoLine}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.fecha
                          ? `${new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(new Date(doc.fecha))}${doc.hora ? ` • ${doc.hora}` : ""}`
                          : "Sin fecha"}
                      </p>
                      {doc.observaciones && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted px-2 py-1 rounded inline-block">
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
                    >
                      {doc.status === "revisado"
                        ? "Revisado"
                        : doc.status === "pendiente"
                        ? "Pendiente"
                        : "Devuelto"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDocumentWithAuth(Number(doc.id), doc.nombre, "view")}
                      disabled={!doc.fileUrl || loadingPdfId === Number(doc.id)}
                    >
                      {loadingPdfId === Number(doc.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDocumentWithAuth(Number(doc.id), doc.nombre, "download")}
                      disabled={!doc.fileUrl || loadingPdfId === Number(doc.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openPreview} onOpenChange={(val) => {
        if (!val && previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setOpenPreview(val);
      }}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>Vista previa del documento</DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="h-[70vh] w-full rounded-lg border border-border"
              title={previewTitle}
            />
          ) : (
            <div className="h-[70vh] w-full flex items-center justify-center text-muted-foreground">
              Cargando documento...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}