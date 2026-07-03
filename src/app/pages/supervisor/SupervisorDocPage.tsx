import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob } from "../../lib/documents";
import { Eye, FileText, Search, X, RefreshCw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

type DocRecord = {
  id: number;
  title: string;
  status: string;
  submitted_at?: string | null;
  created_at?: string | null;
  materia?: string | null;
  grupo?: string | null;
  group_code?: string | null;
  parcial?: string | null;
  uploaded_by_name?: string | null;
  form_title?: string | null;
  carrera_label?: string | null;
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  revisado:  { label: "Revisado",  className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  devuelto:  { label: "Devuelto",  className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
  reenviado: { label: "Reenviado", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
};

const getParcialNum = (parcial?: string | null): string => {
  if (!parcial) return "";
  const m = parcial.match(/\b([123])\b/);
  return m ? m[1] : "";
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateStr));
  } catch { return "—"; }
};


export interface FormCodeEntry {
  code: string;
  label: string;
}

interface SupervisorDocPageProps {
  title: string;
  description?: string;
  /** Sección simple: un solo form code */
  formCode?: string;
  /** Sección con sub-apartados: varios form codes (Tutorías, Estadías) */
  formCodes?: FormCodeEntry[];
  /** Columnas a ocultar de la tabla y sus filtros */
  hideColumns?: ('carrera' | 'grupo' | 'parcial' | 'materia')[];
}

export default function SupervisorDocPage({ title, description, formCode, formCodes, hideColumns = [] }: Readonly<SupervisorDocPageProps>) {
  const isMultiForm = (formCodes?.length ?? 0) > 0;

  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [parcialFilter, setParcialFilter] = useState("all");
  const [carreraFilter, setCarreraFilter] = useState("all");
  const [apartadoFilter, setApartadoFilter] = useState("all");
  const [previewDoc, setPreviewDoc] = useState<DocRecord | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const cardCls = "overflow-hidden border-emerald-200/60 bg-white/55 shadow-sm backdrop-blur dark:border-emerald-900/35 dark:bg-slate-950/55";
  const headerCls = "border-b border-emerald-200/30 p-4 sm:p-6 dark:border-emerald-900/25";

  const loadDocs = useCallback(async () => {
    setIsLoading(true);
    try {
      const query: Record<string, string | number | boolean> = { per_page: 500 };
      if (isMultiForm && formCodes) {
        query.form_codes = formCodes.map(f => f.code).join(",");
      } else if (formCode) {
        query.form_code = formCode;
      }
      const res = await apiFetch("/documents", { query }) as any;
      const list: DocRecord[] = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setDocs(list);
    } catch {
      toast.error(`No fue posible cargar los documentos de ${title.toLowerCase()}`);
      setDocs([]);
    } finally {
      setIsLoading(false);
    }
  }, [formCode, formCodes, isMultiForm, title]);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  useEffect(() => {
    return () => { if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl); };
  }, [previewBlobUrl]);

  useEffect(() => {
    if (!previewDoc) {
      setPreviewBlobUrl(null);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    let isMounted = true;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewBlobUrl(null);

    const load = async () => {
      try {
        const blob = await fetchDocumentBlob(previewDoc.id);
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

    void load();
    return () => { isMounted = false; };
  }, [previewDoc]);

  const carrerasUnicas = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => { if (d.carrera_label) set.add(d.carrera_label); });
    return Array.from(set).sort();
  }, [docs]);

  const apartadosUnicos = useMemo(() => {
    if (!isMultiForm) return [];
    const set = new Set<string>();
    docs.forEach((d) => { if (d.form_title) set.add(d.form_title); });
    return Array.from(set).sort();
  }, [docs, isMultiForm]);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchText =
          (d.uploaded_by_name ?? "").toLowerCase().includes(q) ||
          (d.materia ?? "").toLowerCase().includes(q) ||
          (d.grupo ?? d.group_code ?? "").toLowerCase().includes(q) ||
          (d.carrera_label ?? "").toLowerCase().includes(q) ||
          (d.form_title ?? "").toLowerCase().includes(q);
        if (!matchText) return false;
      }
      if (statusFilter !== "all" && (d.status ?? "").toLowerCase() !== statusFilter) return false;
      if (parcialFilter !== "all" && getParcialNum(d.parcial) !== parcialFilter) return false;
      if (carreraFilter !== "all" && (d.carrera_label ?? "") !== carreraFilter) return false;
      if (isMultiForm && apartadoFilter !== "all" && (d.form_title ?? "") !== apartadoFilter) return false;
      return true;
    });
  }, [docs, search, statusFilter, parcialFilter, carreraFilter, apartadoFilter, isMultiForm]);

  const hasActiveFilters =
    search.trim() ||
    statusFilter !== "all" ||
    parcialFilter !== "all" ||
    carreraFilter !== "all" ||
    (isMultiForm && apartadoFilter !== "all");

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setParcialFilter("all");
    setCarreraFilter("all");
    setApartadoFilter("all");
  };

  const statusInfo = (status: string) =>
    STATUS_LABELS[status.toLowerCase()] ?? { label: status, className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 bg-transparent text-slate-900 dark:text-slate-100">
      {/* Título */}
      <div className="shrink-0 rounded-2xl sm:rounded-3xl border border-emerald-200/30 p-4 sm:p-6 dark:border-emerald-900/25">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {description ?? `Documentos de ${title.toLowerCase()} enviados por todos los docentes`}
        </p>
      </div>

      <Card className={cardCls}>
        <CardHeader className={headerCls}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg">Documentos de {title}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {isLoading ? "Cargando..." : `${filtered.length} de ${docs.length} documento${docs.length !== 1 ? "s" : ""}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                    Limpiar
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={loadDocs} disabled={isLoading} title="Actualizar">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {/* Buscador */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por docente, materia..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-8 text-sm h-9"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filtro Apartado — solo en modo multi-formulario */}
              {isMultiForm && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/75 px-2.5 py-1.5 dark:bg-slate-900/65">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Apartado:</span>
                  <Select value={apartadoFilter} onValueChange={setApartadoFilter}>
                    <SelectTrigger className="h-7 w-[170px] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {apartadosUnicos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro Carrera */}
              {!hideColumns.includes('carrera') && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/75 px-2.5 py-1.5 dark:bg-slate-900/65">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Carrera:</span>
                  <Select value={carreraFilter} onValueChange={setCarreraFilter}>
                    <SelectTrigger className="h-7 w-[160px] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {carrerasUnicas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro Parcial */}
              {!hideColumns.includes('parcial') && (
                <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/75 px-2.5 py-1.5 dark:bg-slate-900/65">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Parcial:</span>
                  <Select value={parcialFilter} onValueChange={setParcialFilter}>
                    <SelectTrigger className="h-7 w-[100px] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="1">Parcial 1</SelectItem>
                      <SelectItem value="2">Parcial 2</SelectItem>
                      <SelectItem value="3">Parcial 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro Estado */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/75 px-2.5 py-1.5 dark:bg-slate-900/65">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Estado:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-7 w-[110px] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="revisado">Revisado</SelectItem>
                    <SelectItem value="devuelto">Devuelto</SelectItem>
                    <SelectItem value="reenviado">Reenviado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Cargando documentos...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-40" />
              <p className="text-sm">{hasActiveFilters ? "Sin resultados para los filtros aplicados" : `No hay documentos de ${title.toLowerCase()}`}</p>
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs mt-1">Limpiar filtros</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-200/30 dark:border-emerald-900/25 bg-emerald-50/40 dark:bg-emerald-950/10">
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Docente</th>
                    {isMultiForm && (
                      <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden sm:table-cell">Apartado</th>
                    )}
                    {!hideColumns.includes('materia') && <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Materia</th>}
                    {!hideColumns.includes('carrera') && <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden lg:table-cell">Carrera</th>}
                    {!hideColumns.includes('grupo') && <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden sm:table-cell">Grupo</th>}
                    {!hideColumns.includes('parcial') && <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden md:table-cell">Parcial</th>}
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden md:table-cell">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc, idx) => {
                    const st = statusInfo(doc.status ?? "pendiente");
                    return (
                      <tr key={doc.id} className={`border-b border-emerald-200/20 dark:border-emerald-900/15 transition-colors hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 ${idx % 2 === 0 ? "" : "bg-slate-50/20 dark:bg-slate-900/10"}`}>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{doc.uploaded_by_name ?? "—"}</td>
                        {isMultiForm && (
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell text-xs" title={doc.form_title ?? undefined}>
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 max-w-[150px] truncate">
                              {doc.form_title ?? "—"}
                            </span>
                          </td>
                        )}
                        {!hideColumns.includes('materia') && <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[160px] truncate" title={doc.materia ?? undefined}>{doc.materia ?? "—"}</td>}
                        {!hideColumns.includes('carrera') && <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell max-w-[180px] truncate text-xs" title={doc.carrera_label ?? undefined}>{doc.carrera_label ?? "—"}</td>}
                        {!hideColumns.includes('grupo') && <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell text-xs">{doc.grupo ?? doc.group_code ?? "—"}</td>}
                        {!hideColumns.includes('parcial') && <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell text-xs">{doc.parcial ?? "—"}</td>}
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell text-xs">{formatDate(doc.submitted_at ?? doc.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setPreviewDoc(doc)}>
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={previewDoc !== null} onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewDoc?.materia ?? previewDoc?.form_title ?? "Documento"}</DialogTitle>
            {previewDoc && (
              <DialogDescription>
                {[previewDoc.uploaded_by_name, previewDoc.form_title, previewDoc.carrera_label, previewDoc.parcial]
                  .filter(Boolean).join(" · ")}
              </DialogDescription>
            )}
          </DialogHeader>
          {previewDoc && (
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
