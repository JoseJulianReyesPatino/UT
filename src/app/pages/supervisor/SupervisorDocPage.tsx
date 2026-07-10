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


export interface FormCodeEntry {
  code: string;
  label: string;
}

interface SupervisorDocPageProps {
  title: string;
  description?: string;
  formCode?: string;
  formCodes?: FormCodeEntry[];
  formId?: number;
  hideColumns?: ("carrera" | "grupo" | "parcial" | "materia")[];
}

export default function SupervisorDocPage({
  title,
  description,
  formCode,
  formCodes,
  formId,
  hideColumns = [],
}: Readonly<SupervisorDocPageProps>) {
  const isMultiForm = (formCodes?.length ?? 0) > 0;

  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [parcialFilter, setParcialFilter] = useState("all");
  const [carreraFilter, setCarreraFilter] = useState("all");
  const [docenteFilter, setDocenteFilter] = useState("all");
  const [grupoFilter, setGrupoFilter] = useState("all");
  const [apartadoFilter, setApartadoFilter] = useState("all");
  const [previewDoc, setPreviewDoc] = useState<DocRecord | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setIsLoading(true);
    try {
      const query: Record<string, string | number | boolean> = { per_page: 500 };
      if (isMultiForm && formCodes) {
        query.form_codes = formCodes.map((f) => f.code).join(",");
      } else if (formCode) {
        query.form_code = formCode;
      } else if (formId) {
        query.form_id = formId;
      }
      const res = (await apiFetch("/documents", { query })) as any;
      const list: DocRecord[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      setDocs(list);
    } catch {
      toast.error(`No fue posible cargar los documentos de ${title.toLowerCase()}`);
      setDocs([]);
    } finally {
      setIsLoading(false);
    }
  }, [formCode, formCodes, formId, isMultiForm, title]);

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

  const carrerasUnicas = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => { if (d.carrera_label) set.add(d.carrera_label); });
    return Array.from(set).sort();
  }, [docs]);

  const docentesUnicos = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => { if (d.uploaded_by_name) set.add(d.uploaded_by_name); });
    return Array.from(set).sort();
  }, [docs]);

  const gruposUnicos = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => { const g = d.grupo ?? d.group_code; if (g) set.add(g); });
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
      if (parcialFilter !== "all" && getParcialNum(d.parcial) !== parcialFilter) return false;
      if (carreraFilter !== "all" && (d.carrera_label ?? "") !== carreraFilter) return false;
      if (docenteFilter !== "all" && (d.uploaded_by_name ?? "") !== docenteFilter) return false;
      if (grupoFilter !== "all" && (d.grupo ?? d.group_code ?? "") !== grupoFilter) return false;
      if (isMultiForm && apartadoFilter !== "all" && (d.form_title ?? "") !== apartadoFilter) return false;
      return true;
    });
  }, [docs, parcialFilter, carreraFilter, docenteFilter, grupoFilter, apartadoFilter, isMultiForm]);

  const sectionCardCls = "overflow-hidden rounded-[22px] border border-border bg-card shadow-sm";

  const renderDocumentCard = (doc: DocRecord) => {
    const rawTitle = doc.title ?? "";
    const lastSep = rawTitle.lastIndexOf(" - ");
    const fileName = lastSep !== -1 && rawTitle.substring(lastSep + 3).trim()
      ? rawTitle.substring(lastSep + 3).trim()
      : rawTitle;
    const apartadoLabel = lastSep !== -1 ? rawTitle.substring(0, lastSep).trim() : (doc.form_title ?? "");
    const grupo = doc.grupo ?? doc.group_code;
    const parcialNum = getParcialNum(doc.parcial);

    return (
      <div key={doc.id} className="relative flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-muted/50 lg:flex-row lg:items-center lg:justify-between">
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
              {!hideColumns.includes("carrera") && doc.carrera_label ? ` • ${doc.carrera_label}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {apartadoLabel && (
                <Badge variant="outline" className="text-xs">{apartadoLabel}</Badge>
              )}
              {doc.cuatrimestre != null && String(doc.cuatrimestre) !== "" && String(doc.cuatrimestre) !== "-" && (
                <Badge variant="outline" className="text-xs">{`Cuatrimestre ${doc.cuatrimestre}`}</Badge>
              )}
              {!hideColumns.includes("grupo") && grupo && grupo !== "-" && (
                <Badge variant="outline" className="text-xs">{`Grupo ${grupo}`}</Badge>
              )}
              {!hideColumns.includes("parcial") && parcialNum && (
                <Badge variant="outline" className="text-xs">{`Parcial ${parcialNum}`}</Badge>
              )}
              {doc.materia && doc.materia !== "-" && doc.materia.toLowerCase() !== "sin materia" && (
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

  const renderFilters = () => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {!hideColumns.includes("carrera") && (
        <SearchableSelect
          value={carreraFilter}
          onValueChange={setCarreraFilter}
          options={carrerasUnicas.map((c) => ({ value: c, label: c }))}
          placeholder="Buscar carrera..."
          allLabel="Todas las carreras"
        />
      )}
      <SearchableSelect
        value={docenteFilter}
        onValueChange={setDocenteFilter}
        options={docentesUnicos.map((d) => ({ value: d, label: d }))}
        placeholder="Buscar docente..."
        allLabel="Todos los docentes"
      />
      {!hideColumns.includes("grupo") && (
        <SearchableSelect
          value={grupoFilter}
          onValueChange={setGrupoFilter}
          options={gruposUnicos.map((g) => ({ value: g, label: g }))}
          placeholder="Buscar grupo..."
          allLabel="Todos los grupos"
        />
      )}
      {!hideColumns.includes("parcial") && (
        <SearchableSelect
          value={parcialFilter}
          onValueChange={setParcialFilter}
          options={[
            { value: "1", label: "Parcial 1" },
            { value: "2", label: "Parcial 2" },
            { value: "3", label: "Parcial 3" },
          ]}
          allLabel="Todos los parciales"
        />
      )}
      {isMultiForm && (
        <SearchableSelect
          value={apartadoFilter}
          onValueChange={setApartadoFilter}
          options={apartadosUnicos.map((a) => ({ value: a, label: a }))}
          placeholder="Buscar apartado..."
          allLabel="Todos los apartados"
        />
      )}
    </div>
  );

  const renderDocList = (docList: DocRecord[]) => {
    if (isLoading) {
      return <DocumentCardSkeleton />;
    }
    if (docList.length === 0) {
      return (
        <div className="rounded-2xl border border-border bg-muted/40 p-8 text-center text-muted-foreground shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <FileText className="h-8 w-8 opacity-40" />
            <p className="text-sm">No hay documentos en esta sección.</p>
          </div>
        </div>
      );
    }
    return <div className="space-y-3">{docList.map(renderDocumentCard)}</div>;
  };

  return (
    <div className="relative space-y-6 overflow-hidden">
      {/* Encabezado */}
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {description ?? `Documentos de ${title.toLowerCase()} enviados por todos los docentes`}
            </p>
          </div>
          <button
            onClick={() => void loadDocs()}
            disabled={isLoading}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <Card className={sectionCardCls}>
        <CardHeader className="pb-4">{renderFilters()}</CardHeader>
        <CardContent>{renderDocList(filtered)}</CardContent>
      </Card>

      {/* Diálogo de vista previa */}
      <Dialog open={previewDoc !== null} onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title ?? "Documento"}</DialogTitle>
            {previewDoc && (
              <DialogDescription>
                {[previewDoc.uploaded_by_name, previewDoc.form_title, previewDoc.carrera_label, previewDoc.parcial]
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
    </div>
  );
}
