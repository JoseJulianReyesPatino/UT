import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { apiFetch } from "../../lib/api";
import { AUTH_TOKEN_STORAGE_KEY } from "../../lib/env";
import { getDocumentFileUrl } from "../../lib/documents";
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

const INSTRUMENTOS = [
  { key: "30", label: "Instrumento 30%", sublabel: "Plan Normal", form_code: "instrumento-30-normal" },
  { key: "40", label: "Instrumento 40%", sublabel: "Plan Nuevo Modelo", form_code: "instrumento-40-nuevo" },
  { key: "60", label: "Instrumento 60%", sublabel: "Plan Nuevo Modelo", form_code: "instrumento-60-nuevo" },
  { key: "70", label: "Instrumento 70%", sublabel: "Plan Normal", form_code: "instrumento-70-normal" },
] as const;

type TabKey = "30" | "40" | "60" | "70";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  revisado: { label: "Revisado", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  devuelto: { label: "Devuelto", className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
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

const getFileUrl = (documentId: number) => {
  return getDocumentFileUrl(documentId);
};

type FilterState = { search: string; status: string; parcial: string; carrera: string };
const defaultFilter = (): FilterState => ({ search: "", status: "all", parcial: "all", carrera: "all" });

interface SupervisorInstrumentosProps {
  allowedSections?: string[];
}

export default function SupervisorInstrumentos({ allowedSections }: Readonly<SupervisorInstrumentosProps>) {
  const allowedTabs = useMemo<TabKey[]>(() => {
    if (!allowedSections || allowedSections.length === 0) {
      return ["30", "40", "60", "70"];
    }
    const map: Record<string, TabKey> = {
      "instrumento-30": "30",
      "instrumento-40": "40",
      "instrumento-60": "60",
      "instrumento-70": "70",
    };
    return (["30", "40", "60", "70"] as TabKey[]).filter((k) => {
      const section = Object.keys(map).find((s) => map[s] === k);
      return section ? allowedSections.includes(section) : false;
    });
  }, [allowedSections]);

  const [activeTab, setActiveTab] = useState<TabKey>(() => allowedTabs[0] ?? "30");
  const [docs, setDocs] = useState<Record<TabKey, DocRecord[]>>({ "30": [], "40": [], "60": [], "70": [] });
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({ "30": true, "40": true, "60": true, "70": true });
  const [filters, setFilters] = useState<Record<TabKey, FilterState>>({
    "30": defaultFilter(), "40": defaultFilter(), "60": defaultFilter(), "70": defaultFilter(),
  });
  const [previewDoc, setPreviewDoc] = useState<DocRecord | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const cardCls = "overflow-hidden border-emerald-200/60 bg-white/55 shadow-sm backdrop-blur dark:border-emerald-900/35 dark:bg-slate-950/55";
  const headerCls = "border-b border-emerald-200/30 p-4 sm:p-6 dark:border-emerald-900/25";

  const loadDocs = useCallback(async (key: TabKey, form_code: string) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await apiFetch("/documents", { query: { form_code, per_page: 500 } }) as any;
      const list: DocRecord[] = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setDocs((prev) => ({ ...prev, [key]: list }));
    } catch {
      toast.error("No fue posible cargar los documentos");
      setDocs((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  useEffect(() => {
    INSTRUMENTOS.filter((i) => allowedTabs.includes(i.key)).forEach(({ key, form_code }) => void loadDocs(key as TabKey, form_code));
  }, [loadDocs, allowedTabs]);

  // Revoca el blob anterior cuando cambia
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  // Carga el PDF cuando se selecciona un documento
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
        const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        const headers: Record<string, string> = {
          Accept: "application/pdf",
          "ngrok-skip-browser-warning": "true",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(getFileUrl(previewDoc.id), { method: "GET", headers, credentials: "include" });
        if (!response.ok) throw new Error(`No fue posible abrir el PDF (${response.status})`);

        const blob = await response.blob();
        if (!isMounted) return;
        setPreviewBlobUrl(URL.createObjectURL(blob));
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

  const setFilter = (key: TabKey, partial: Partial<FilterState>) =>
    setFilters((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }));

  const clearFilters = (key: TabKey) =>
    setFilters((prev) => ({ ...prev, [key]: defaultFilter() }));

  const currentInstrumento = INSTRUMENTOS.find((i) => i.key === activeTab)!;
  const currentDocs = docs[activeTab] ?? [];
  const isCurrentLoading = loading[activeTab] ?? false;
  const currentFilter = filters[activeTab];

  const carrerasUnicas = useMemo(() => {
    const set = new Set<string>();
    currentDocs.forEach((d) => { if (d.carrera_label) set.add(d.carrera_label); });
    return Array.from(set).sort();
  }, [currentDocs]);

  const filtered = useMemo(() => {
    const f = currentFilter;
    return currentDocs.filter((d) => {
      if (f.search.trim()) {
        const q = f.search.toLowerCase();
        const matchText =
          (d.uploaded_by_name ?? "").toLowerCase().includes(q) ||
          (d.materia ?? "").toLowerCase().includes(q) ||
          (d.grupo ?? d.group_code ?? "").toLowerCase().includes(q) ||
          (d.carrera_label ?? "").toLowerCase().includes(q);
        if (!matchText) return false;
      }
      if (f.status !== "all" && (d.status ?? "").toLowerCase() !== f.status) return false;
      if (f.parcial !== "all" && getParcialNum(d.parcial) !== f.parcial) return false;
      if (f.carrera !== "all" && (d.carrera_label ?? "") !== f.carrera) return false;
      return true;
    });
  }, [currentDocs, currentFilter]);

  const hasActiveFilters =
    currentFilter.search.trim() || currentFilter.status !== "all" ||
    currentFilter.parcial !== "all" || currentFilter.carrera !== "all";

  const statusInfo = (status: string) =>
    STATUS_LABELS[status.toLowerCase()] ?? { label: status, className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 bg-transparent text-slate-900 dark:text-slate-100">
      {/* Título */}
      <div className="shrink-0 rounded-2xl sm:rounded-3xl border border-emerald-200/30 p-4 sm:p-6 dark:border-emerald-900/25">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Instrumentos</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Instrumentos de evaluación enviados por todos los docentes
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {INSTRUMENTOS.filter((inst) => allowedTabs.includes(inst.key)).map((inst) => (
          <button
            key={inst.key}
            type="button"
            onClick={() => setActiveTab(inst.key as TabKey)}
            className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-all text-sm font-medium ${
              activeTab === inst.key
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                : "border-emerald-200/50 bg-white/40 text-slate-600 hover:bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-slate-950/30 dark:text-slate-400 dark:hover:bg-emerald-950/20"
            }`}
          >
            <span>{inst.label}</span>
            <span className="text-xs font-normal opacity-70">{inst.sublabel}</span>
          </button>
        ))}
      </div>

      <Card className={cardCls}>
        <CardHeader className={headerCls}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg">{currentInstrumento.label}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {isCurrentLoading ? "Cargando..." : `${filtered.length} de ${currentDocs.length} documento${currentDocs.length !== 1 ? "s" : ""}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={() => clearFilters(activeTab)} className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                    Limpiar
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={() => loadDocs(activeTab, currentInstrumento.form_id)} disabled={isCurrentLoading} title="Actualizar">
                  <RefreshCw className={`h-4 w-4 ${isCurrentLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por docente, materia..."
                  value={currentFilter.search}
                  onChange={(e) => setFilter(activeTab, { search: e.target.value })}
                  className="pl-9 pr-8 text-sm h-9"
                />
                {currentFilter.search && (
                  <button onClick={() => setFilter(activeTab, { search: "" })} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/75 px-2.5 py-1.5 dark:bg-slate-900/65">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">Carrera:</span>
                <Select value={currentFilter.carrera} onValueChange={(v) => setFilter(activeTab, { carrera: v })}>
                  <SelectTrigger className="h-7 w-[160px] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {carrerasUnicas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/75 px-2.5 py-1.5 dark:bg-slate-900/65">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Parcial:</span>
                <Select value={currentFilter.parcial} onValueChange={(v) => setFilter(activeTab, { parcial: v })}>
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

              <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/75 px-2.5 py-1.5 dark:bg-slate-900/65">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Estado:</span>
                <Select value={currentFilter.status} onValueChange={(v) => setFilter(activeTab, { status: v })}>
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
          {isCurrentLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Cargando documentos...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-40" />
              <p className="text-sm">{hasActiveFilters ? "Sin resultados para los filtros aplicados" : `No hay documentos de ${currentInstrumento.label}`}</p>
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={() => clearFilters(activeTab)} className="text-xs mt-1">Limpiar filtros</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-200/30 dark:border-emerald-900/25 bg-emerald-50/40 dark:bg-emerald-950/10">
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Docente</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Materia</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden lg:table-cell">Carrera</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden sm:table-cell">Grupo</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden md:table-cell">Parcial</th>
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
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[160px] truncate" title={doc.materia ?? undefined}>{doc.materia ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell max-w-[180px] truncate text-xs" title={doc.carrera_label ?? undefined}>{doc.carrera_label ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell text-xs">{doc.grupo ?? doc.group_code ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell text-xs">{doc.parcial ?? "—"}</td>
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

      {/* Preview dialog — mismo estilo que el admin */}
      <Dialog open={previewDoc !== null} onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewDoc?.materia ?? "Documento"}</DialogTitle>
            {previewDoc && (
              <DialogDescription>
                {previewDoc.uploaded_by_name ?? "Docente"}{previewDoc.carrera_label ? ` · ${previewDoc.carrera_label}` : ""}
                {previewDoc.parcial ? ` · ${previewDoc.parcial}` : ""}
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
                <iframe src={previewBlobUrl} className="h-[82vh] w-full rounded-lg border border-border" title={previewDoc.materia ?? "Documento"} />
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
