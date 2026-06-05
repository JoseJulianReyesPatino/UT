import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { FileText, Search, Download, Eye, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import apiFetch from "../../lib/api";
import { getDocumentDownloadUrl, getDocumentFileUrl } from "../../lib/documents";

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

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const allDocuments: ApiDocument[] = [];
        let page = 1;
        const perPage = 100;

        while (true) {
          const response = (await apiFetch("/documents", {
            query: { page, per_page: perPage },
          })) as {
            data?: {
              data?: ApiDocument[];
              current_page?: number;
              last_page?: number;
            };
          };

          const pageData = response?.data?.data ?? [];
          allDocuments.push(...pageData);

          const currentPage = response?.data?.current_page ?? page;
          const lastPage = response?.data?.last_page ?? currentPage;

          if (currentPage >= lastPage) {
            break;
          }

          page += 1;
        }

        if (!isMounted) return;

        setDocuments(allDocuments);
      } catch {
        if (!isMounted) return;

        setLoadError("No fue posible cargar el historial de documentos");
        setDocuments([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.materia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const matchesTipo = filterTipo === "all" || doc.tipo === filterTipo;
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
          <div className="space-y-3">
            {isLoading && (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                Cargando documentos reales desde el backend...
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

            {!isLoading && !loadError && filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{doc.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.materia} • Parcial {doc.parcial} • Grupo {doc.grupo}
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
                    onClick={() => {
                      setPreviewUrl(doc.fileUrl ?? null);
                      setPreviewTitle(doc.nombre);
                      setOpenPreview(true);
                    }}
                    disabled={!doc.fileUrl}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (!doc.downloadUrl) return;
                      window.open(doc.downloadUrl, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!doc.downloadUrl}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openPreview} onOpenChange={(val) => setOpenPreview(val)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>Vista previa del documento</DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <iframe
              src={`${previewUrl}#toolbar=1&navpanes=0`}
              className="h-[70vh] w-full rounded-lg border border-border"
              title={previewTitle}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
