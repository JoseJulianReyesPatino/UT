import React, { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "../../components/SearchableSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FileText, Eye, Loader2, MessageCircleMore, MessageSquare, Check, RefreshCw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob, getDocumentDisplayFileName } from "../../lib/documents";
import { carrieras } from "../../data/curricula";
import { useAuth } from "../../context/AuthContext";

type ReviewSection = "all" | "pendientes" | "revisados" | "hoy";

type TutorDocument = {
  id: number;
  ciclo: string;
  plan: string;
  tutor: string;
  documento: string;
  apartado: string;
  carrera: string;
  cuatrimestre?: string;
  grupo?: string;
  fecha?: string;
  status: string;
  filePath?: string;
  returned?: boolean;
  returnedAt?: string;
  reviewedAt?: string;
  submittedAt?: string;
  nota?: string | null;
};

type TutorDocumentItem = TutorDocument;

type ReturnConfirmation = {
  type: "return" | "cancel-return";
  document: TutorDocumentItem;
};

type CareerOption = {
  value: string;
  label: string;
};

const tutoriasApartadosPermitidos = new Set([
  "carga-academica",
  "reporte-bajas",
  "concentrado-asesorias",
  "acta-asistencia",
  "acta-asistencia-grupal",
  "ficha-tecnica",
]);

const normalizeApartado = (value: string) => value.toLowerCase().replaceAll("_", "-").trim();

const tutoriasApartadosEtiquetas: Record<string, string> = {
  "carga-academica": "Carga académica",
  "reporte-bajas": "Reporte de bajas",
  "concentrado-asesorias": "Concentrado de asesorías",
  "acta-asistencia": "Acta de asistencia grupal",
  "acta-asistencia-grupal": "Acta de asistencia grupal",
  "ficha-tecnica": "Ficha técnica",
};

const getTutoriasApartadoLabel = (apartado: string) => {
  const key = normalizeApartado(apartado);
  return tutoriasApartadosEtiquetas[key] ?? apartado;
};

const ensurePdfExtension = (name: string) =>
  name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;

const extractPreviewFileName = (documento: string) => {
  const lastSep = documento.lastIndexOf(" - ");
  const raw = lastSep !== -1 && documento.substring(lastSep + 3).trim()
    ? documento.substring(lastSep + 3).trim()
    : documento;
  return raw.toLowerCase().endsWith(".pdf") ? raw : `${raw}.pdf`;
};

const resolveTutorDocumentTitle = (doc: any): string => {
  const title = (doc?.title ?? "").toString().trim();
  if (title && !/^undefined\b/i.test(title)) {
    return title;
  }

  const fileName = getDocumentDisplayFileName(doc?.title, doc?.file_path);
  return fileName || "Documento";
};

const mapApiDocumentToTutorDocument = (doc: any): TutorDocument => ({
  id: Number(doc.id ?? 0),
  ciclo: doc.cycle_name?.trim() || "Sin ciclo",
  plan: doc.plan?.trim() || "Sin plan",
  tutor: doc.uploaded_by_name?.trim() || "Sin tutor",
  documento: resolveTutorDocumentTitle(doc),
  apartado: normalizeApartado(doc.apartado_label ?? doc.form_code ?? doc.form_title ?? ""),
  carrera: doc.carrera_label?.trim() || "",
  cuatrimestre: doc.cuatrimestre ? String(doc.cuatrimestre) : undefined,
  grupo: doc.group_code ? String(doc.group_code) : undefined,
  fecha: doc.submitted_at ?? undefined,
  status: doc.status ?? "pendiente",
  filePath: doc.file_path ?? undefined,
  returned: (doc.status ?? "") === "devuelto",
  returnedAt: doc.returned_at ?? undefined,
  reviewedAt: doc.reviewed_at ?? undefined,
  submittedAt: doc.submitted_at ?? undefined,
  nota: doc.nota ?? null,
});

const emptyStateLegend = "Aún no hay documentos de tutores para mostrar en esta sección. Cuando un tutor suba uno, aparecerá aquí automáticamente.";

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-2xl border border-border bg-muted/40 p-8 text-center text-muted-foreground shadow-sm">
    <div className="flex flex-col items-center gap-4">
      <p>{text}</p>
    </div>
  </div>
);

const careerOptions: CareerOption[] = Array.from(
  new Map(
    [
      ...carrieras["nuevo-modelo"].tsu,
      ...carrieras["nuevo-modelo"].ingenieria,
      ...carrieras["plan-normal"].ingenieria,
    ].map((career) => [career.nombre, { value: career.nombre, label: career.nombre }])
  ).values()
);

// no mock initial data — load from backend

export default function Tutores() {
  const { isReady, isAuthenticated } = useAuth();
  const [pendingDocuments, setPendingDocuments] = useState<TutorDocument[]>([]);
  const [reviewedDocuments, setReviewedDocuments] = useState<TutorDocument[]>([]);
  const [filterTutor, setFilterTutor] = useState("all");
  const [filterApartado, setFilterApartado] = useState("all");
  const [filterReturned, setFilterReturned] = useState("all");
  const [activeSection, setActiveSection] = useState<ReviewSection>("all");
  const [previewDocument, setPreviewDocument] = useState<TutorDocumentItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [returnConfirmation, setReturnConfirmation] = useState<ReturnConfirmation | null>(null);
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [noteDialog, setNoteDialog] = useState<{ nota: string; tutor: string } | null>(null);
  const [reviewConfirmation, setReviewConfirmation] = useState<TutorDocument | null>(null);
  // Conteos estables por sección — no se mezclan con los documentos activos del tab
  const [countAll, setCountAll] = useState(0);
  const [countPending, setCountPending] = useState(0);
  const [countReviewed, setCountReviewed] = useState(0);

  const buildQueryFromFilters = () => {
    const q: Record<string, any> = { uploader_role: 'tutor', tutorias_only: 1, per_page: 500, page: 1 };
    if (filterTutor !== 'all') q.uploaded_by_name = filterTutor;
    if (filterApartado !== 'all') q.apartado_label = filterApartado;
    // Solo filtrar por status en la API cuando el usuario elige "Solo devueltos";
    // el resto se filtra en cliente para que los conteos sean siempre consistentes.
    if (filterReturned === 'returned') q.status = 'devuelto';
    return q;
  };

  const loadDocuments = async () => {
    if (!isReady) return;
    if (!isAuthenticated) {
      setPendingDocuments([]);
      setReviewedDocuments([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiFetch('/documents', { query: buildQueryFromFilters() });
      const documents = Array.isArray(response?.data)
        ? response.data
            .map(mapApiDocumentToTutorDocument)
            .filter((doc) => tutoriasApartadosPermitidos.has(normalizeApartado(doc.apartado)))
        : [];
      const pending = documents.filter((doc) => doc.status === 'pendiente');
      const reviewed = documents.filter((doc) => doc.status !== 'pendiente');
      setPendingDocuments(pending);
      setReviewedDocuments(reviewed);

      // Actualizar conteos siempre, respetando el filtro activo
      setCountAll(documents.length);
      setCountPending(pending.length);
      setCountReviewed(documents.filter((d) => d.status === 'revisado').length);
    } catch (error: any) {
      toast.error(error?.message ?? 'No fue posible cargar los documentos de tutores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    void loadDocuments();
  }, [isAuthenticated, isReady]);

  // reload when filters change (section y paginación son client-side)
  useEffect(() => {
    const to = setTimeout(() => { void loadDocuments(); }, 150);
    return () => clearTimeout(to);
  }, [filterTutor, filterApartado, filterReturned]);

  const allDocuments = [...pendingDocuments, ...reviewedDocuments];
  const toLocalDateKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const todayKey = toLocalDateKey(new Date().toISOString());

  const formatDateOnlyFromKey = (dateKey: string) => {
    try {
      const d = new Date(dateKey + "T00:00:00");
      return d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return dateKey;
    }
  };

  const formatTime12 = (iso?: string) => {
    if (!iso) return "";
    try {
      // Accept both ISO and 'YYYY-MM-DD HH:MM' by replacing space with 'T'
      const normalized = iso.includes(" ") && !iso.includes("T") ? iso.replace(" ", "T") : iso;
      const d = new Date(normalized);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    } catch {
      return iso;
    }
  };

  const formatSentFecha = (fecha?: string) => {
    if (!fecha) return "";
    // if contains time
    if (fecha.includes("T") || fecha.includes(" ")) {
      try {
        const d = new Date(fecha);
        const date = d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
        const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
        return `${date} ${time}`;
      } catch {
        return fecha;
      }
    }
    // assume YYYY-MM-DD
    try {
      const d = new Date(fecha + "T00:00:00");
      return d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return fecha;
    }
  };

  const formatDateTimeFromIso = (value?: string) => {
    if (!value) return "";
    try {
      const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
      const date = new Date(normalized);
      const datePart = date.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
      const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
      return `${datePart} ${timePart}`;
    } catch {
      return value;
    }
  };

  const matchesFilters = (doc: { tutor: string; apartado: string; returned?: boolean }) => {
    const matchesTutor = filterTutor === "all" || doc.tutor === filterTutor;
    const matchesApartado = filterApartado === "all" || doc.apartado === filterApartado;
    const isReturned = Boolean(doc.returned);
    const matchesReturned =
      filterReturned === "all"
      || (filterReturned === "returned" && isReturned)
      || (filterReturned === "not-returned" && !isReturned);

    return matchesTutor && matchesApartado && matchesReturned;
  };

  const filteredPending = pendingDocuments.filter(matchesFilters);
  const filteredReviewed = reviewedDocuments.filter((d) => d.status === 'revisado').filter(matchesFilters);
  const filteredAll = allDocuments.filter(matchesFilters);
  const reviewedToday = filteredReviewed.filter((doc) => doc.reviewedAt ? toLocalDateKey(doc.reviewedAt) === todayKey : false);

  const getDocumentStatusLabel = (doc: TutorDocumentItem) => {
    if ("resubmittedAt" in doc && doc.resubmittedAt) return "Reenviado";
    if (doc.returned) return "Devuelto";
    if (doc.reviewedAt) return "Revisado";
    return "Pendiente";
  };

  const reviewedByDate = useMemo(() => {
    return filteredReviewed.reduce<Record<string, TutorDocument[]>>((groups, doc) => {
      const date = doc.reviewedAt ? toLocalDateKey(doc.reviewedAt) : "";
      groups[date] = [...(groups[date] || []), doc];
      return groups;
    }, {});
  }, [filteredReviewed]);

  const tutoresDisponibles = Array.from(new Set(allDocuments.map((doc) => ("tutor" in doc ? doc.tutor : (doc as any).tutor))));

  const handleReviewDocument = async (documentId: number) => {
    try {
      const response = await apiFetch(`/documents/${documentId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revisado', notes: 'Revisado por administración' }),
      });

      const updated = mapApiDocumentToTutorDocument(response.data);
      setPendingDocuments((current) => current.filter((d) => d.id !== documentId));
      setReviewedDocuments((current) => [updated, ...current.filter((d) => d.id !== documentId)]);
      // pendiente → revisado: ajustar conteos
      setCountPending((n) => Math.max(0, n - 1));
      setCountReviewed((n) => n + 1);
      toast.success('Documento de tutor marcado como revisado');
    } catch (error: any) {
      toast.error(error?.message ?? 'No fue posible marcar el documento como revisado');
    }
  };

  const setDocumentReturnedState = async (documentId: number, returned: boolean, comment?: string) => {
    try {
      const targetStatus = returned ? 'devuelto' : 'revisado';
      const response = await apiFetch(`/documents/${documentId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          notes: returned ? (comment?.trim() || 'Documento devuelto') : 'Devolución cancelada',
        }),
      });

      const updated = mapApiDocumentToTutorDocument(response.data);
      setPendingDocuments((current) => current.filter((d) => d.id !== documentId));
      setReviewedDocuments((current) => [updated, ...current.filter((d) => d.id !== documentId)]);
      return updated;
    } catch (error: any) {
      toast.error(error?.message ?? 'No fue posible actualizar el estado del documento');
      return null;
    }
  };

  const handleConfirmReturnAction = async () => {
    if (!returnConfirmation || isConfirmingReturn) return;
    setIsConfirmingReturn(true);
    try {
      const shouldReturn = returnConfirmation.type === 'return';
      const docStatus = returnConfirmation.document.status;
      if (shouldReturn) {
        const trimmedComment = returnComment.trim();
        const result = await setDocumentReturnedState(returnConfirmation.document.id, true, trimmedComment);
        if (result) {
          const raw = returnConfirmation.document.documento ?? "Documento";
          const lastSep = raw.lastIndexOf(" - ");
          const baseName = lastSep !== -1 ? raw.substring(lastSep + 3).trim() : raw;
          const fileName = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
          const tutorName = returnConfirmation.document.tutor ?? "";
          if (docStatus === 'pendiente') setCountPending((n) => Math.max(0, n - 1));
          else if (docStatus === 'revisado') setCountReviewed((n) => Math.max(0, n - 1));
          toast.success(`${fileName} devuelto al tutor ${tutorName}`);
        }
      } else {
        const result = await setDocumentReturnedState(returnConfirmation.document.id, false);
        if (result) {
          const raw = returnConfirmation.document.documento ?? "Documento";
          const lastSep = raw.lastIndexOf(" - ");
          const baseName = lastSep !== -1 ? raw.substring(lastSep + 3).trim() : raw;
          const fileName = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
          setCountReviewed((n) => n + 1);
          toast.success(`Devolución de ${fileName} cancelada`);
        }
      }
      setReturnComment("");
      setReturnConfirmation(null);
    } finally {
      setIsConfirmingReturn(false);
    }
  };

  const handleShareToMessages = (doc: TutorDocumentItem) => {
    const recipientName = 'tutor' in doc ? doc.tutor : (doc as any).tutor;
    const lastSep = doc.documento.lastIndexOf(" - ");
    const cleanTitle = lastSep !== -1 && doc.documento.substring(lastSep + 3).trim()
      ? doc.documento.substring(lastSep + 3).trim()
      : doc.documento;
    globalThis.dispatchEvent(new CustomEvent('openMessagesConversation', { detail: { recipientName, recipientRole: 'Tutor', document: { id: doc.id, title: cleanTitle, filePath: doc.filePath ?? "" } } }));
  };

  const closePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewDocument(null);
  };

  useEffect(() => {
    if (!previewDocument) return;

    let cancelled = false;

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });

      try {
        const blob = await fetchDocumentBlob(previewDocument.id);
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(blobUrl);
      } catch (error: any) {
        if (cancelled) return;
        setPreviewError(error?.message ?? "No fue posible abrir el PDF");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, [previewDocument]);
  const apartadosDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.apartado))).filter((apartado) => apartado && apartado.trim().length > 0);

  const previewChipClassName =
    "h-8 rounded-full border border-border bg-background/80 px-3 text-xs font-medium text-foreground shadow-sm hover:bg-muted";

  const previewCardOverlayClassName =
    "absolute inset-0 z-10 rounded-xl cursor-pointer";

  const sectionCardClassName =
    "overflow-hidden rounded-[22px] border border-border bg-card shadow-sm";

  const filtersGridClassName = "grid grid-cols-2 gap-2 sm:grid-cols-3";
  const filterSelectTriggerClassName = "w-full min-w-0 max-w-full rounded-full text-[13px] leading-tight shadow-sm sm:text-sm";
  const filterSelectValueClassName = "truncate";

  const filtersBar = (
    <div className={filtersGridClassName}>
      <SearchableSelect
        value={filterTutor}
        onValueChange={setFilterTutor}
        options={tutoresDisponibles.map((t) => ({ value: t, label: t }))}
        placeholder="Buscar tutor..."
        allLabel="Todos los tutores"
      />
      <SearchableSelect
        value={filterApartado}
        onValueChange={setFilterApartado}
        options={apartadosDisponibles.map((a) => ({ value: a, label: getTutoriasApartadoLabel(a) }))}
        placeholder="Buscar apartado..."
        allLabel="Todos los apartados"
      />
      <div className="col-span-2 sm:col-span-1">
        <Select value={filterReturned} onValueChange={setFilterReturned}>
          <SelectTrigger className={filterSelectTriggerClassName}>
            <SelectValue className={filterSelectValueClassName} placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los documentos</SelectItem>
            <SelectItem value="returned">Solo devueltos</SelectItem>
            <SelectItem value="not-returned">No devueltos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const getDocumentRowClassName = (isReturned: boolean) => (
    `relative flex flex-col gap-4 rounded-2xl border p-4 transition-colors lg:flex-row lg:items-center lg:justify-between ${isReturned
      ? "border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/15"
      : "border-border bg-background hover:bg-muted/50"
    }`
  );

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Gestión de Tutores</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Revisa y aprueba los documentos enviados por los tutores.</p>
            </div>
            <button
              onClick={() => { void loadDocuments(); }}
              disabled={isLoading}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
              title="Actualizar documentos"
              aria-label="Actualizar documentos"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as ReviewSection)}>
        <div className="mb-4">
          <div className="sm:hidden mb-3">
            <Select value={activeSection} onValueChange={(v) => setActiveSection(v as ReviewSection)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Sección" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendientes">Pendientes</SelectItem>
                <SelectItem value="revisados">Revisados</SelectItem>
                <SelectItem value="hoy">Revisados hoy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden sm:grid w-full grid-cols-4 gap-2 p-1 bg-slate-100/90 dark:bg-slate-950/90 rounded-full shadow-sm border border-slate-200/70 dark:border-slate-800 overflow-hidden">
            <TabsTrigger value="all" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
              Todos
              <Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{countAll}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pendientes" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
              Pendientes
              <Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{countPending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="revisados" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
              Revisados
              <Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{countReviewed}</Badge>
            </TabsTrigger>
            <TabsTrigger value="hoy" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
              Revisados hoy
              <Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{reviewedToday.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              {filtersBar}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando documentos...</span>
                  </div>
                ) : filteredAll.length === 0 ? (
                  <EmptyState text={emptyStateLegend} />
                ) : filteredAll.map((doc) => {
                  const isReviewed = Boolean(doc.reviewedAt);
                  const isReturned = Boolean(doc.returned);
                  return (
                    <div key={doc.id} className={getDocumentRowClassName(isReturned)}>
                      <button
                        type="button"
                        aria-label={`Abrir vista previa de ${doc.documento}`}
                        onClick={() => setPreviewDocument(doc)}
                        className={previewCardOverlayClassName}
                      />
                      <div className="relative z-20 flex items-start gap-3 flex-1 min-w-0 pointer-events-none">
                        <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                          <p className="font-medium break-words text-sm sm:text-base">{ensurePdfExtension(doc.documento)}</p>
                          <p className="text-sm text-muted-foreground">{"tutor" in doc ? doc.tutor : (doc as any).tutor}</p>
                            {('fecha' in doc && doc.fecha) && (
                              <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatSentFecha(('fecha' in doc ? doc.fecha : ''))} {('fecha' in doc && doc.fecha && (doc.fecha.includes('T') || doc.fecha.includes(' '))) ? <span className="ml-2 text-xs text-muted-foreground">{formatTime12(doc.fecha)}</span> : null}</p>
                            )}
                            {'reviewedAt' in doc && doc.reviewedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>
                            )}
                            {'returnedAt' in doc && doc.returnedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                            )}
                            {'resubmittedAt' in doc && doc.resubmittedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>
                            )}
                        </div>
                      </div>
                      <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto sm:justify-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                        <ResponsiveActionButton
                          variant="outline"
                          size="sm"
                          label="Ver"
                          title="Ver PDF"
                          onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}
                          icon={<Eye className="h-4 w-4" />}
                        />

                        {!isReviewed && (
                        <ResponsiveActionButton
                          variant="outline"
                          size="sm"
                          label="Revisar"
                          title="Revisar documento"
                          onClick={(e) => { e.stopPropagation(); setReviewConfirmation(doc); }}
                          icon={<Check className="h-4 w-4" />}
                        />
                        )}

                        {doc.nota && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950" onClick={(e) => { e.stopPropagation(); setNoteDialog({ nota: doc.nota!, tutor: 'tutor' in doc ? (doc as TutorDocument).tutor : '' }); }} aria-label="Ver nota del tutor"><MessageCircleMore className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Nota del tutor</TooltipContent></Tooltip>}

                        <ResponsiveActionButton
                          variant="ghost"
                          size="sm"
                          label="Enviar"
                          title={`Enviar a mensajes ${'tutor' in doc ? doc.tutor : (doc as any).tutor}`}
                          onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }}
                          icon={<MessageSquare className="h-4 w-4" />}
                        />

                        {doc.returned ? (
                          <ResponsiveActionButton
                            variant="outline"
                            size="sm"
                            label="Cancelar"
                            title="Cancelar devolución"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReturnConfirmation({ type: "cancel-return", document: doc });
                            }}
                            icon={<Undo2 className="h-4 w-4" />}
                          />
                        ) : (
                            <ResponsiveActionButton
                              variant="destructive"
                              size="sm"
                              label="Devolver"
                              title="Devolver documento"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReturnConfirmation({ type: "return", document: doc });
                              }}
                              icon={<Undo2 className="h-4 w-4" />}
                            />
                        )}

                        <Badge variant={getDocumentStatusLabel(doc) === "Devuelto" ? "destructive" : "success"}>
                          {getDocumentStatusLabel(doc)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendientes" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              {filtersBar}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando documentos...</span>
                  </div>
                ) : filteredPending.length === 0 ? (
                  <EmptyState text={emptyStateLegend} />
                ) : filteredPending.map((doc) => {
                  const isReturned = Boolean(doc.returned);
                  return (
                  <div key={doc.id} className={getDocumentRowClassName(isReturned)}>
                    <button
                      type="button"
                      aria-label={`Abrir vista previa de ${doc.documento}`}
                      onClick={() => setPreviewDocument(doc)}
                      className={previewCardOverlayClassName}
                    />
                    <div className="relative z-20 flex items-start gap-3 flex-1 min-w-0 pointer-events-none">
                      <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                        <p className="break-words text-sm font-medium leading-snug sm:text-base">{ensurePdfExtension(doc.documento)}</p>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">{doc.tutor}</p>
                        {doc.fecha && (
                          <p className="mt-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">Enviado: {formatSentFecha(doc.fecha)} {doc.fecha && (doc.fecha.includes('T') || doc.fecha.includes(' ')) ? <span className="ml-2 text-[11px] text-muted-foreground sm:text-xs">{formatTime12(doc.fecha)}</span> : null}</p>
                        )}
                        {'returnedAt' in doc && doc.returnedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                        )}
                        {'resubmittedAt' in doc && doc.resubmittedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>
                        )}
                      </div>
                    </div>
                    <div className="relative z-20 grid grid-cols-2 gap-2 pointer-events-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                      {isReturned && <Badge variant="destructive" className="col-span-2 justify-self-end sm:col-span-1">Devuelto</Badge>}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} aria-label="Ver PDF">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver PDF</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setReviewConfirmation(doc); }} aria-label="Revisar documento">
                            <Check className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Revisar</TooltipContent>
                      </Tooltip>

                        {doc.nota && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950" onClick={(e) => { e.stopPropagation(); setNoteDialog({ nota: doc.nota!, tutor: 'tutor' in doc ? (doc as TutorDocument).tutor : '' }); }} aria-label="Ver nota del tutor"><MessageCircleMore className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Nota del tutor</TooltipContent></Tooltip>}

                        <ResponsiveActionButton
                          variant="ghost"
                          size="sm"
                          label="Enviar"
                          title={`Enviar a mensajes ${'tutor' in doc ? doc.tutor : (doc as any).tutor}`}
                          onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }}
                          icon={<MessageSquare className="h-4 w-4" />}
                        />

                      {doc.returned ? (
                        <ResponsiveActionButton
                          variant="outline"
                          size="sm"
                          label="Cancelar"
                          title="Cancelar devolución"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReturnConfirmation({ type: "cancel-return", document: doc });
                          }}
                          icon={<Undo2 className="h-4 w-4" />}
                        />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReturnConfirmation({ type: "return", document: doc });
                              }}
                              aria-label="Devolver documento"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Devolver</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisados" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              {filtersBar}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando documentos...</span>
                </div>
              ) : Object.keys(reviewedByDate).filter(Boolean).length === 0 ? (
                <EmptyState text={emptyStateLegend} />
              ) : (
                <div className="space-y-6">
                  {Object.entries(reviewedByDate).filter(([date]) => date).map(([date, docs]) => (
                    <div key={date}>
                      <div className="mb-3">
                        <p className="font-semibold text-sm text-foreground">{formatDateOnlyFromKey(date)}</p>
                        <p className="text-xs text-muted-foreground">{docs.length} documentos revisados</p>
                      </div>
                      <div className="space-y-3">
                        {docs.map((doc) => {
                          const isReturned = Boolean(doc.returned);
                          return (
                          <div key={doc.id} className={getDocumentRowClassName(isReturned)}>
                            <button
                              type="button"
                              aria-label={`Abrir vista previa de ${doc.documento}`}
                              onClick={() => setPreviewDocument(doc)}
                              className={previewCardOverlayClassName}
                            />
                            <div className="relative z-20 flex items-start gap-3 flex-1 pointer-events-none">
                              <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                                <p className="font-medium break-words text-sm sm:text-base">{ensurePdfExtension(doc.documento)}</p>
                                <p className="text-sm text-muted-foreground">{doc.tutor}</p>
                                {'reviewedAt' in doc && doc.reviewedAt && (
                                  <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>
                                )}
                                {'returnedAt' in doc && doc.returnedAt && (
                                  <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                                )}
                              </div>
                            </div>
                            <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto sm:justify-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} aria-label="Ver PDF">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver PDF</TooltipContent>
                              </Tooltip>
                              {doc.nota && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950" onClick={(e) => { e.stopPropagation(); setNoteDialog({ nota: doc.nota!, tutor: doc.tutor }); }} aria-label="Ver nota del tutor"><MessageCircleMore className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Nota del tutor</TooltipContent></Tooltip>}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.tutor}`}>
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Enviar</TooltipContent>
                              </Tooltip>
                              {doc.returned ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950" onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "cancel-return", document: doc }); }} aria-label="Cancelar devolución">
                                      <Undo2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Cancelar devolución</TooltipContent>
                                </Tooltip>
                              ) : (
                                <ResponsiveActionButton variant="destructive" size="sm" label="Devolver" title="Devolver documento" onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "return", document: doc }); }} icon={<Undo2 className="h-4 w-4" />} />
                              )}
                              <Badge variant={getDocumentStatusLabel(doc) === "Devuelto" ? "destructive" : "success"}>{getDocumentStatusLabel(doc)}</Badge>
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hoy" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              {filtersBar}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando documentos...</span>
                  </div>
                ) : reviewedToday.length === 0 ? (
                  <EmptyState text={emptyStateLegend} />
                ) : (
                  reviewedToday.map((doc) => {
                    const isReturned = Boolean(doc.returned);
                    return (
                    <div key={doc.id} className={getDocumentRowClassName(isReturned)}>
                        <button
                          type="button"
                          aria-label={`Abrir vista previa de ${doc.documento}`}
                          onClick={() => setPreviewDocument(doc)}
                          className={previewCardOverlayClassName}
                        />
                      <div className="relative z-20 flex items-start gap-3 flex-1 pointer-events-none">
                        <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                          <p className="font-medium break-words text-sm sm:text-base">{ensurePdfExtension(doc.documento)}</p>
                          <p className="text-sm text-muted-foreground">{doc.tutor}</p>
                            {doc.fecha && (
                              <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatSentFecha(doc.fecha)} {doc.fecha && (doc.fecha.includes('T') || doc.fecha.includes(' ')) ? <span className="ml-2 text-xs text-muted-foreground">{formatTime12(doc.fecha)}</span> : null}</p>
                            )}
                            {'reviewedAt' in doc && doc.reviewedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>
                            )}
                            {'returnedAt' in doc && doc.returnedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                            )}
                        </div>
                      </div>
                      <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto sm:justify-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} aria-label="Ver PDF">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver PDF</TooltipContent>
                        </Tooltip>

                        {doc.nota && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950" onClick={(e) => { e.stopPropagation(); setNoteDialog({ nota: doc.nota!, tutor: doc.tutor }); }} aria-label="Ver nota del tutor"><MessageCircleMore className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Nota del tutor</TooltipContent></Tooltip>}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.tutor}`}>
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Enviar</TooltipContent>
                        </Tooltip>

                        {doc.returned ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                                onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "cancel-return", document: doc }); }}
                                aria-label="Cancelar devolución"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancelar devolución</TooltipContent>
                          </Tooltip>
                        ) : (
                          <ResponsiveActionButton
                            variant="destructive"
                            size="sm"
                            label="Devolver"
                            title="Devolver documento"
                            onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "return", document: doc }); }}
                            icon={<Undo2 className="h-4 w-4" />}
                          />
                        )}

                        <Badge variant={getDocumentStatusLabel(doc) === "Devuelto" ? "destructive" : "success"}>{getDocumentStatusLabel(doc)}</Badge>
                      </div>
                    </div>
                  )})
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewDocument !== null} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewDocument ? extractPreviewFileName(previewDocument.documento) : ""}</DialogTitle>
            {previewDocument && <DialogDescription>{"tutor" in previewDocument ? previewDocument.tutor : (previewDocument as any).tutor}</DialogDescription>}
          </DialogHeader>
          {previewDocument && (
            <div className="flex-1 min-h-0">
              {previewLoading ? (
                <div className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
                  <p>Cargando...</p>
                </div>
              ) : previewError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
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

      <Dialog
        open={returnConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReturnConfirmation(null);
            setReturnComment("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {returnConfirmation?.type === "return" ? "Confirmar devolución" : "Cancelar devolución"}
            </DialogTitle>
            <DialogDescription>
              {returnConfirmation?.type === "return"
                ? "¿Seguro que quieres marcar este documento como devuelto?"
                : "¿Seguro que quieres cancelar la devolución de este documento?"}
            </DialogDescription>
          </DialogHeader>

          {returnConfirmation && (
            <div className="rounded-lg border border-border bg-muted p-3 text-sm">
              <p className="font-medium">{ensurePdfExtension(returnConfirmation.document.documento)}</p>
              <p className="text-muted-foreground">{returnConfirmation.document.tutor}</p>
            </div>
          )}

          {returnConfirmation?.type === "return" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Comentario para el tutor</p>
              <Textarea
                value={returnComment}
                onChange={(event) => setReturnComment(event.target.value)}
                placeholder="Escribe la razón de devolución del documento"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnConfirmation(null); setReturnComment(""); }}>
              Cancelar
            </Button>
            <Button
              variant={returnConfirmation?.type === "return" ? "destructive" : "success"}
              onClick={handleConfirmReturnAction}
              disabled={isConfirmingReturn}
            >
              {returnConfirmation?.type === "return" ? "Sí, devolver" : "Sí, cancelar devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reviewConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) setReviewConfirmation(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar revisión</DialogTitle>
            <DialogDescription>¿Seguro que quieres marcar este documento como revisado?</DialogDescription>
          </DialogHeader>

          {reviewConfirmation && (
            <div className="rounded-lg border border-border bg-muted p-3 text-sm">
              <p className="font-medium">{ensurePdfExtension(reviewConfirmation.documento)}</p>
              <p className="text-muted-foreground">{reviewConfirmation.tutor}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewConfirmation(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!reviewConfirmation) return;
                handleReviewDocument(reviewConfirmation.id);
                setReviewConfirmation(null);
              }}
            >
              Sí, marcar como revisado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialog !== null} onOpenChange={(open) => { if (!open) setNoteDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircleMore className="h-5 w-5 text-blue-500" />Nota del tutor</DialogTitle>
            <DialogDescription>{noteDialog?.tutor}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted p-4 text-sm whitespace-pre-wrap">{noteDialog?.nota}</div>
          <DialogFooter><Button variant="outline" onClick={() => setNoteDialog(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
