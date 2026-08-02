import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { SearchableSelect } from "../../components/SearchableSelect";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob } from "../../lib/documents";
import { type DocRecord, getParcialNum, formatSentFecha } from "./supervisorShared";
import { Eye, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DocumentCardSkeleton } from "../admin/skeletons";
import { cn } from "../../../lib/utils";

type InstrumentoKey = "30" | "40" | "60" | "70";
type InstrumentoFilter = InstrumentoKey | "all";

const INSTRUMENTOS = [
  { key: "30" as InstrumentoKey, label: "Instrumento 30%", sublabel: "Plan Normal",      form_code: "instrumento-30-normal" },
  { key: "40" as InstrumentoKey, label: "Instrumento 40%", sublabel: "Plan Nuevo Modelo", form_code: "instrumento-40-nuevo" },
  { key: "60" as InstrumentoKey, label: "Instrumento 60%", sublabel: "Plan Nuevo Modelo", form_code: "instrumento-60-nuevo" },
  { key: "70" as InstrumentoKey, label: "Instrumento 70%", sublabel: "Plan Normal",      form_code: "instrumento-70-normal" },
] as const;


type FilterState = { carrera: string; docente: string; grupo: string; parcial: string };
const defaultFilter = (): FilterState => ({ carrera: "all", docente: "all", grupo: "all", parcial: "all" });
const ALL_INSTRUMENTO_KEYS: InstrumentoKey[] = INSTRUMENTOS.map((i) => i.key);

interface SupervisorInstrumentosProps {
  allowedSections?: string[];
  layoutStyle?: string;
}

export default function SupervisorInstrumentos({ allowedSections, layoutStyle }: Readonly<SupervisorInstrumentosProps>) {
  const isFormal = layoutStyle === "formal";

  const allowedTabs = useMemo<InstrumentoKey[]>(() => {
    if (!allowedSections || allowedSections.length === 0) return ["30", "40", "60", "70"];
    const map: Record<string, InstrumentoKey> = {
      "instrumento-30": "30",
      "instrumento-40": "40",
      "instrumento-60": "60",
      "instrumento-70": "70",
    };
    return (["30", "40", "60", "70"] as InstrumentoKey[]).filter((k) => {
      const section = Object.keys(map).find((s) => map[s] === k);
      return section ? allowedSections.includes(section) : false;
    });
  }, [allowedSections]);

  const [activeInstrumento, setActiveInstrumento] = useState<InstrumentoFilter>("all");
  const [docs, setDocs] = useState<Record<InstrumentoKey, DocRecord[]>>({ "30": [], "40": [], "60": [], "70": [] });
  const [loading, setLoading] = useState<Record<InstrumentoKey, boolean>>({ "30": true, "40": true, "60": true, "70": true });
  const [filters, setFilters] = useState<Record<InstrumentoFilter, FilterState>>({
    "all": defaultFilter(), "30": defaultFilter(), "40": defaultFilter(), "60": defaultFilter(), "70": defaultFilter(),
  });
  const [previewDoc, setPreviewDoc] = useState<DocRecord | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadDocs = useCallback(async (key: InstrumentoKey, form_code: string) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = (await apiFetch("/documents", { query: { form_code, per_page: 500 } })) as any;
      const list: DocRecord[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      setDocs((prev) => ({ ...prev, [key]: list }));
    } catch {
      toast.error("No fue posible cargar los documentos");
      setDocs((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  useEffect(() => {
    INSTRUMENTOS.filter((i) => allowedTabs.includes(i.key)).forEach(({ key, form_code }) =>
      void loadDocs(key, form_code)
    );
  }, [loadDocs, allowedTabs]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, all: defaultFilter() }));
  }, [allowedTabs]);

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

  const setFilter = (key: InstrumentoFilter, partial: Partial<FilterState>) =>
    setFilters((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }));

  const clearAllFilters = () => setFilters((prev) => ({ ...prev, [activeInstrumento]: defaultFilter() }));

  const currentInstrumento = INSTRUMENTOS.find((i) => i.key === activeInstrumento) ?? null;
  const currentDocs = useMemo(() => {
    if (activeInstrumento === "all") {
      return ALL_INSTRUMENTO_KEYS.filter((k) => allowedTabs.includes(k)).flatMap((k) => docs[k] ?? []);
    }
    return docs[activeInstrumento] ?? [];
  }, [activeInstrumento, docs, allowedTabs]);
  const isCurrentLoading = activeInstrumento === "all"
    ? ALL_INSTRUMENTO_KEYS.filter((k) => allowedTabs.includes(k)).some((k) => loading[k])
    : (loading[activeInstrumento] ?? false);
  const currentFilter = filters[activeInstrumento];

  const carrerasUnicas = useMemo(() => {
    const set = new Set<string>();
    currentDocs.forEach((d) => { if (d.carrera_label) set.add(d.carrera_label); });
    return Array.from(set).sort();
  }, [currentDocs]);

  const docentesUnicos = useMemo(() => {
    const set = new Set<string>();
    currentDocs.forEach((d) => { if (d.uploaded_by_name) set.add(d.uploaded_by_name); });
    return Array.from(set).sort();
  }, [currentDocs]);

  const gruposUnicos = useMemo(() => {
    const set = new Set<string>();
    currentDocs.forEach((d) => { const g = d.grupo ?? d.group_code; if (g) set.add(g); });
    return Array.from(set).sort();
  }, [currentDocs]);

  const filtered = useMemo(() => {
    const f = currentFilter;
    return currentDocs.filter((d) => {
      if (f.carrera !== "all" && (d.carrera_label ?? "") !== f.carrera) return false;
      if (f.docente !== "all" && (d.uploaded_by_name ?? "") !== f.docente) return false;
      if (f.grupo !== "all" && (d.grupo ?? d.group_code ?? "") !== f.grupo) return false;
      if (f.parcial !== "all" && getParcialNum(d.parcial) !== f.parcial) return false;
      return true;
    });
  }, [currentDocs, currentFilter]);

  const activeFiltersCount = [
    currentFilter.carrera !== "all",
    currentFilter.docente !== "all",
    currentFilter.grupo !== "all",
    currentFilter.parcial !== "all",
    activeInstrumento !== "all",
  ].filter(Boolean).length;

  const sectionCardCls = "overflow-hidden rounded-[22px] border-border/70 bg-card shadow-sm dark:border-emerald-900/30 dark:bg-slate-950/60 dark:backdrop-blur-md";
  const formalFilterTriggerClassName = "h-8 w-full min-w-0 bg-transparent text-xs";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500";

  /* ── Filtros clásicos ── */
  const renderFilters = () => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {allowedTabs.length > 1 && (
        <SearchableSelect
          value={activeInstrumento}
          onValueChange={(v) => { setActiveInstrumento(v as InstrumentoFilter); }}
          options={INSTRUMENTOS.filter((i) => allowedTabs.includes(i.key)).map((i) => ({ value: i.key, label: `${i.label} — ${i.sublabel}` }))}
          placeholder="Buscar instrumento..."
          allLabel="Todos los instrumentos"
        />
      )}
      <SearchableSelect value={currentFilter.carrera} onValueChange={(v) => setFilter(activeInstrumento, { carrera: v })} options={carrerasUnicas.map((c) => ({ value: c, label: c }))} placeholder="Buscar carrera..." allLabel="Todas las carreras" />
      <SearchableSelect value={currentFilter.docente} onValueChange={(v) => setFilter(activeInstrumento, { docente: v })} options={docentesUnicos.map((d) => ({ value: d, label: d }))} placeholder="Buscar docente..." allLabel="Todos los docentes" />
      <SearchableSelect value={currentFilter.grupo} onValueChange={(v) => setFilter(activeInstrumento, { grupo: v })} options={gruposUnicos.map((g) => ({ value: g, label: g }))} placeholder="Buscar grupo..." allLabel="Todos los grupos" />
      <SearchableSelect value={currentFilter.parcial} onValueChange={(v) => setFilter(activeInstrumento, { parcial: v })} options={[{ value: "1", label: "Parcial 1" }, { value: "2", label: "Parcial 2" }, { value: "3", label: "Parcial 3" }]} allLabel="Todos los parciales" />
    </div>
  );

  /* ── Filtros formales ── */
  const renderFormalFilters = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <span className={labelCls}>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {activeFiltersCount} activo{activeFiltersCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button type="button" className="text-[11px] text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200" onClick={clearAllFilters}>
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
        {allowedTabs.length > 1 && (
          <div className="space-y-1">
            <p className={labelCls}>Instrumento</p>
            <SearchableSelect value={activeInstrumento} onValueChange={(v) => { setActiveInstrumento(v as InstrumentoFilter); }} options={INSTRUMENTOS.filter((i) => allowedTabs.includes(i.key)).map((i) => ({ value: i.key, label: i.label }))} placeholder="Buscar instrumento..." allLabel="Todos" triggerClassName={formalFilterTriggerClassName} />
          </div>
        )}
        <div className="space-y-1">
          <p className={labelCls}>Carrera</p>
          <SearchableSelect value={currentFilter.carrera} onValueChange={(v) => setFilter(activeInstrumento, { carrera: v })} options={carrerasUnicas.map((c) => ({ value: c, label: c }))} placeholder="Buscar carrera..." allLabel="Todas las carreras" triggerClassName={formalFilterTriggerClassName} />
        </div>
        <div className="space-y-1">
          <p className={labelCls}>Docente</p>
          <SearchableSelect value={currentFilter.docente} onValueChange={(v) => setFilter(activeInstrumento, { docente: v })} options={docentesUnicos.map((d) => ({ value: d, label: d }))} placeholder="Buscar docente..." allLabel="Todos los docentes" triggerClassName={formalFilterTriggerClassName} />
        </div>
        <div className="space-y-1">
          <p className={labelCls}>Grupo</p>
          <SearchableSelect value={currentFilter.grupo} onValueChange={(v) => setFilter(activeInstrumento, { grupo: v })} options={gruposUnicos.map((g) => ({ value: g, label: g }))} placeholder="Buscar grupo..." allLabel="Todos los grupos" triggerClassName={formalFilterTriggerClassName} />
        </div>
        <div className="space-y-1">
          <p className={labelCls}>Parcial</p>
          <SearchableSelect value={currentFilter.parcial} onValueChange={(v) => setFilter(activeInstrumento, { parcial: v })} options={[{ value: "1", label: "Parcial 1" }, { value: "2", label: "Parcial 2" }, { value: "3", label: "Parcial 3" }]} allLabel="Todos los parciales" triggerClassName={formalFilterTriggerClassName} />
        </div>
      </div>
    </div>
  );

  /* ── Fila formal ── */
  const renderFormalDocRow = (doc: DocRecord) => {
    const rawTitle = doc.title ?? "";
    const lastSep = rawTitle.lastIndexOf(" - ");
    const fileName = lastSep !== -1 && rawTitle.substring(lastSep + 3).trim()
      ? rawTitle.substring(lastSep + 3).trim()
      : rawTitle;
    const fileNameWithExt = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;

    return (
      <div
        key={doc.id}
        className={cn(
          "relative flex flex-col gap-2 border-l-4 border-l-emerald-500 px-3 py-2.5 transition-colors",
          "sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3",
          "bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900/60"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{fileNameWithExt}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {doc.uploaded_by_name ?? "Docente"}
              {doc.carrera_label ? ` · ${doc.carrera_label}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size="icon" className="h-7 w-7 sm:w-auto sm:px-2 sm:gap-1 text-xs" onClick={() => setPreviewDoc(doc)}>
            <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ver</span>
          </Button>
        </div>
      </div>
    );
  };

  /* ── Batch formal ── */
  const renderFormalBatch = (group: DocRecord[]) => {
    if (group.length === 1) return renderFormalDocRow(group[0]);
    const first = group[0];
    return (
      <div key={first.batch_id ?? first.id}>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border-b border-border dark:bg-slate-900/50">
          <FileText className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{group.length} archivos</span>
            {" del mismo envío · "}{first.uploaded_by_name}
          </span>
        </div>
        <div className="divide-y divide-border">
          {group.map(renderFormalDocRow)}
        </div>
      </div>
    );
  };

  /* ── Tarjeta clásica ── */
  const renderDocumentCard = (doc: DocRecord) => {
    const rawTitle = doc.title ?? "";
    const lastSep = rawTitle.lastIndexOf(" - ");
    const fileName = lastSep !== -1 && rawTitle.substring(lastSep + 3).trim()
      ? rawTitle.substring(lastSep + 3).trim()
      : rawTitle;
    const apartadoLabel = lastSep !== -1 ? rawTitle.substring(0, lastSep).trim() : "";
    const grupo = doc.grupo ?? doc.group_code;
    const parcialNum = getParcialNum(doc.parcial);

    return (
      <div key={doc.id} className="relative flex flex-col gap-4 rounded-2xl border border-border/70 bg-white p-4 transition-colors hover:bg-slate-50 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold tracking-wide text-foreground">
              {fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`}
            </p>
            <p className="text-xs text-muted-foreground">
              {doc.uploaded_by_name ?? "Docente"}
              {doc.carrera_label ? ` • ${doc.carrera_label}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(apartadoLabel || doc.form_title) && (
                <Badge variant="outline" className="text-xs">{apartadoLabel || doc.form_title}</Badge>
              )}
              {doc.cuatrimestre != null && String(doc.cuatrimestre) !== "" && String(doc.cuatrimestre) !== "-" && (
                <Badge variant="outline" className="text-xs">{`Cuatrimestre ${doc.cuatrimestre}`}</Badge>
              )}
              {grupo && grupo !== "-" && (
                <Badge variant="outline" className="text-xs">{`Grupo ${grupo}`}</Badge>
              )}
              {parcialNum && (
                <Badge variant="outline" className="text-xs">{`Parcial ${parcialNum}`}</Badge>
              )}
              {doc.materia && (
                <Badge variant="outline" className="text-xs">{doc.materia}</Badge>
              )}
            </div>
            {(doc.submitted_at ?? doc.created_at) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Enviado: {formatSentFecha(doc.submitted_at ?? doc.created_at)}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => setPreviewDoc(doc)}>
            <Eye className="h-4 w-4" />
            Ver
          </Button>
        </div>
      </div>
    );
  };

  const groupDocsByBatch = (docList: DocRecord[]): DocRecord[][] => {
    const groups = new Map<string, DocRecord[]>();
    for (const doc of docList) {
      const key = doc.batch_id ?? `single-${doc.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    }
    return Array.from(groups.values());
  };

  const renderBatchGroup = (group: DocRecord[]) => {
    if (group.length === 1) return renderDocumentCard(group[0]);
    const first = group[0];
    const docenteName = first.uploaded_by_name ?? "Docente";
    const apartado = first.form_title ?? first.title ?? "";
    return (
      <div key={first.batch_id} className="overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
        <div className="flex items-center gap-2 bg-emerald-50/80 px-4 py-2.5 dark:bg-emerald-950/30">
          <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {group.length} archivos del mismo envío
          </span>
          <span className="text-xs text-emerald-600/70 dark:text-emerald-500">
            · {docenteName}{apartado ? ` · ${apartado}` : ""}
          </span>
        </div>
        <div className="divide-y divide-border/50">
          {group.map(renderDocumentCard)}
        </div>
      </div>
    );
  };

  const emptyState = (
    <div className="rounded-2xl border border-border bg-muted/40 p-8 text-center text-muted-foreground shadow-sm">
      <div className="flex flex-col items-center gap-3">
        <FileText className="h-8 w-8 opacity-40" />
        <p className="text-sm">No hay documentos en esta sección.</p>
      </div>
    </div>
  );

  const renderDocList = (docList: DocRecord[]) => {
    if (isCurrentLoading) return <DocumentCardSkeleton />;
    if (docList.length === 0) return emptyState;
    if (isFormal) {
      return (
        <div className="divide-y divide-border border border-border overflow-hidden rounded-sm">
          {groupDocsByBatch(docList).map((group) => renderFormalBatch(group))}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {groupDocsByBatch(docList).map((group) => renderBatchGroup(group))}
      </div>
    );
  };

  const handleRefresh = () => {
    if (currentInstrumento) {
      void loadDocs(currentInstrumento.key, currentInstrumento.form_code);
    } else {
      INSTRUMENTOS.filter((i) => allowedTabs.includes(i.key)).forEach((i) => void loadDocs(i.key, i.form_code));
    }
  };

  const previewDialog = (
    <Dialog open={previewDoc !== null} onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{previewDoc?.title ?? "Documento"}</DialogTitle>
          {previewDoc && (
            <DialogDescription>
              {[previewDoc.uploaded_by_name, previewDoc.carrera_label, previewDoc.parcial]
                .filter((v) => v && v !== "-")
                .join(" · ")}
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
  );

  /* ── Modo empresarial ── */
  if (isFormal) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden text-foreground bg-card dark:bg-slate-950">
        <div className="shrink-0 border-b border-border bg-card px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Instrumentos de Evaluación</h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Instrumentos enviados por todos los docentes</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isCurrentLoading}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-transparent px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCurrentLoading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-5 space-y-4">
            <Card className="overflow-hidden border-border/70 bg-card shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <CardHeader className="pb-4">{renderFormalFilters()}</CardHeader>
              <CardContent>{renderDocList(filtered)}</CardContent>
            </Card>
          </div>
        </div>
        {previewDialog}
      </div>
    );
  }

  /* ── Modo clásico ── */
  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-5 shadow-[0_24px_90px_-35px_color-mix(in_oklch,var(--color-emerald-500)_35%,transparent)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_oklch,var(--color-emerald-500)_16%,transparent),_transparent_42%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Instrumentos de Evaluación</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Instrumentos enviados por todos los docentes
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isCurrentLoading}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
          >
            <RefreshCw className={`h-4 w-4 ${isCurrentLoading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <Card className={sectionCardCls}>
        <CardHeader className="pb-4">{renderFilters()}</CardHeader>
        <CardContent>{renderDocList(filtered)}</CardContent>
      </Card>

      {previewDialog}
    </div>
  );
}
