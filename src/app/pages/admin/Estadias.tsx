import React, { useEffect, useMemo, useState } from "react";
import FormNotFoundImg from "../../../assets/Form_Not_Found.png";
import { DocumentCardSkeleton } from "./skeletons";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Eye, FileText, Check, MessageCircleMore, MessageSquare, RefreshCw, Undo2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob } from "../../lib/documents";
import { formatGroupCode } from "../../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { SearchableSelect } from "../../components/SearchableSelect";
import { useTourActive } from "../../context/TourContext";

type ReviewSection = "all" | "pendientes" | "devueltos" | "reenviados" | "revisados" | "hoy";

type EstadiaPendingDocument = {
  id: number;
  ciclo: string;
  plan: string;
  cuatrimestre: string;
  docente: string;
  documento: string;
  apartado: string;
  carrera: string;
  grupo: string;
  fecha: string;
  status?: string;
  file_path?: string | null;
  has_file?: boolean;
  returned?: boolean;
  returnedAt?: string;
  resubmittedAt?: string;
  nota?: string | null;
  batch_id?: string | null;
};

type EstadiaReviewedDocument = {
  id: number;
  ciclo: string;
  plan: string;
  cuatrimestre: string;
  docente: string;
  documento: string;
  apartado: string;
  carrera: string;
  grupo: string;
  file_path?: string | null;
  has_file?: boolean;
  reviewedAt: string;
  fecha?: string;
  returned?: boolean;
  returnedAt?: string;
  resubmittedAt?: string;
  nota?: string | null;
  batch_id?: string | null;
};

type EstadiaDocumentItem = EstadiaPendingDocument | EstadiaReviewedDocument;

type ApiDocument = {
  id: number;
  form_id?: number;
  nombre?: string;
  title?: string | null;
  tipo?: string | null;
  tipoLabel?: string | null;
  form_title?: string | null;
  cycle_name?: string | null;
  apartado_label?: string | null;
  carrera_label?: string | null;
  uploaded_by_name?: string | null;
  materia?: string | null;
  parcial?: string | null;
  grupo?: string | null;
  group?: { group_code?: string | null } | null;
  group_code?: string | null;
  plan?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  returned_at?: string | null;
  resubmitted_at?: string | null;
  fileUrl?: string | null;
  nota?: string | null;
  batch_id?: string | null;
};

const extractApiDocuments = (payload: unknown): ApiDocument[] => {
  if (Array.isArray(payload)) return payload as ApiDocument[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: ApiDocument[] }).data;
  }
  return [];
};

const extractPreviewFileName = (documento: string) => {
  const lastSep = documento.lastIndexOf(" - ");
  const raw = lastSep !== -1 && documento.substring(lastSep + 3).trim()
    ? documento.substring(lastSep + 3).trim()
    : documento;
  return raw.toLowerCase().endsWith(".pdf") ? raw : `${raw}.pdf`;
};

function TourFakeEstadiasRow({ isFirst }: { isFirst: boolean }) {
  const fakeData = [
    {
      nombre: "carta_presentacion_estadias.pdf",
      docente: "Dra. Ana García López",
      carrera: "TSU en Tecnologías de la Información",
      apartado: "Carta de presentación",
      plan: "Nuevo modelo",
      grupo: "11B-1",
      fecha: "18/07/2026 2:30 PM",
    },
    {
      nombre: "acta_final_estadias.pdf",
      docente: "Ing. Carlos Mendoza Ríos",
      carrera: "TSU en Administración",
      apartado: "Acta final",
      plan: "Nuevo modelo",
      grupo: "10A-2",
      fecha: "17/07/2026 10:15 AM",
    },
  ];
  const doc = fakeData[isFirst ? 0 : 1];
  return (
    <div
      data-tour={isFirst ? "admin-estadias-doc-row" : undefined}
      className="relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border/70 bg-white p-4 lg:flex-row lg:items-center lg:justify-between dark:bg-slate-900/90"
    >
      <div className="flex items-start gap-3 flex-1">
        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{doc.nombre}</p>
          <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>
            <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
            <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Enviado: {doc.fecha}</p>
        </div>
      </div>
      <div
        data-tour={isFirst ? "admin-estadias-doc-actions" : undefined}
        className="relative z-20 flex flex-wrap items-center gap-2 sm:justify-end justify-between w-full sm:w-auto mt-2 sm:mt-0"
      >
        <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium bg-background hover:bg-muted transition-colors">
          <Eye className="h-3.5 w-3.5" /> Ver
        </button>
        <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium bg-background hover:bg-muted transition-colors">
          <Check className="h-3.5 w-3.5" /> Revisar
        </button>
        <Badge variant="warning">Pendiente</Badge>
        <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors">
          <Undo2 className="h-3.5 w-3.5" /> Devolver
        </button>
      </div>
    </div>
  );
}

export default function Estadias() {
  const { isReady, isAuthenticated } = useAuth();
  const { isAdminTourActive } = useTourActive();
  const [pendingDocuments, setPendingDocuments] = useState<EstadiaPendingDocument[]>([]);
  const [reviewedDocuments, setReviewedDocuments] = useState<EstadiaReviewedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterCuatrimestre, setFilterCuatrimestre] = useState("all");
  const [filterGrupo, setFilterGrupo] = useState("all");
  const [filterDocente, setFilterDocente] = useState("all");
  const [filterApartado, setFilterApartado] = useState("all");
  const [filterReturned, setFilterReturned] = useState("all");
  const [activeSection, setActiveSection] = useState<ReviewSection>("all");
  const [previewDocument, setPreviewDocument] = useState<EstadiaDocumentItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [reviewConfirmation, setReviewConfirmation] = useState<EstadiaPendingDocument | null>(null);
  const [highlightDocumentId, setHighlightDocumentId] = useState<number | null>(() => {
    const stored = sessionStorage.getItem("adminHighlightDocumentId");
    if (stored) { sessionStorage.removeItem("adminHighlightDocumentId"); return Number(stored); }
    return null;
  });

  useEffect(() => {
    if (!isLoading && highlightDocumentId !== null) {
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById(`doc-row-${highlightDocumentId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      const clearTimer = setTimeout(() => setHighlightDocumentId(null), 4000);
      return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
    }
  }, [isLoading, highlightDocumentId]);
  const [returnConfirmation, setReturnConfirmation] = useState<{ type: "return" | "cancel-return"; document: EstadiaDocumentItem } | null>(null);
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [noteDialog, setNoteDialog] = useState<{ nota: string; docente: string } | null>(null);

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
      const normalized = iso.includes(" ") && !iso.includes("T") ? iso.replace(" ", "T") : iso;
      const d = new Date(normalized);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    } catch {
      return iso;
    }
  };

  const formatSentFecha = (fecha?: string) => {
    if (!fecha) return "";
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
    try {
      const d = new Date(fecha + "T00:00:00");
      return d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return fecha;
    }
  };

  const ensurePdfExtension = (name: string) =>
    name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;

  const formatDateTimeFromIso = (value?: string) => {
    if (!value) return "";
    try {
      const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
      const d = new Date(normalized);
      const date = d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
      const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
      return `${date} ${time}`;
    } catch {
      return value;
    }
  };

  const resolveApartado = (doc: ApiDocument): string => {
    const norm = (v: string) =>
      v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").trim();
    const match = (s: string | null | undefined): string => {
      const n = norm(s ?? "");
      if (n.includes("carta") && n.includes("presentacion")) return "Carta de presentación";
      if (n.includes("carta") && n.includes("aceptacion")) return "Carta de aceptación";
      if (n.includes("carta") && n.includes("terminacion")) return "Carta de terminación";
      if (n.includes("acta") && n.includes("final")) return "Acta final";
      return "";
    };
    return (
      match(doc.apartado_label) ||
      match(doc.tipoLabel) ||
      match(doc.form_title) ||
      match(doc.tipo) ||
      match(doc.title ?? doc.nombre) ||
      "Documento"
    );
  };

  const isEstadiasDocument = (doc: ApiDocument) => {
    const formId = Number(doc.form_id ?? 0);
    if ([13, 14, 15, 16].includes(formId)) return true;

    const normalize = (value?: string | null) =>
      (value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[_\s]+/g, "-")
        .replace(/-+/g, "-")
        .trim();

    const tipo = normalize(doc.tipo ?? doc.tipoLabel ?? doc.form_title);
    const label = normalize(doc.apartado_label ?? doc.tipoLabel ?? doc.form_title);

    const allowed = new Set([
      "carta-presentacion",
      "carta-aceptacion",
      "carta-terminacion",
      "estadias",
      "acta-final-estadias",
    ]);

    return allowed.has(tipo) || allowed.has(label);
  };

  const mapApiDocument = (doc: ApiDocument, kind: "pending" | "reviewed"): EstadiaPendingDocument | EstadiaReviewedDocument => {
    const base = {
      id: Number(doc.id),
      ciclo: doc.cycle_name?.trim() || "Sin ciclo",
      plan: (() => { const v = doc.plan?.trim() ?? ""; return v === "plan_normal" ? "Plan normal" : v === "nuevo_modelo" ? "Nuevo modelo" : v || "Nuevo modelo"; })(),
      cuatrimestre: doc.parcial ?? "-",
      docente: doc.uploaded_by_name?.trim() || "Docente",
      documento: doc.title ?? doc.nombre ?? "Documento sin título",
      apartado: resolveApartado(doc),
      carrera: doc.carrera_label?.trim() || "Sin carrera",
      grupo: formatGroupCode(doc.group?.group_code ?? doc.group_code ?? "-"),
      fecha: doc.submitted_at ?? "",
      file_path: doc.file_path ?? null,
      has_file: (doc as any).has_file ?? (doc.file_path != null ? undefined : false),
      status: doc.status ?? "pendiente",
      returned: doc.status === "devuelto",
      returnedAt: doc.returned_at ?? undefined,
      resubmittedAt: doc.resubmitted_at ?? undefined,
      nota: doc.nota ?? null,
      batch_id: doc.batch_id ?? null,
    };

    if (kind === "reviewed") {
      return {
        ...base,
        reviewedAt: doc.reviewed_at ?? doc.submitted_at ?? new Date().toISOString(),
      };
    }

    return base;
  };

  const emptyStateLegend = "Aún no hay documentos de estadías para mostrar en esta sección. Cuando un docente suba uno, aparecerá aquí automáticamente.";

  const EmptyState = ({ text }: { text: string }) => (
    <div className="rounded-2xl border border-border bg-muted/40 p-8 text-center text-muted-foreground shadow-sm">
      <div className="flex flex-col items-center gap-4">
        <img src={FormNotFoundImg} alt="Sin documentos" className="h-36 w-36 object-contain opacity-60 dark:opacity-40" />
        <p>{text}</p>
      </div>
    </div>
  );

  const previewChipClassName =
    "h-8 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-muted";

  const previewCardOverlayClassName = "absolute inset-0 z-10 rounded-xl cursor-pointer";

  const sectionCardClassName =
    "overflow-hidden border-border/70 bg-card shadow-sm dark:border-emerald-900/30 dark:bg-slate-950/60 dark:backdrop-blur-md";

  const documentRowClassName =
    "relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border/70 bg-white p-4 transition-colors hover:bg-slate-50 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 lg:flex-row lg:items-center lg:justify-between";

  const getDocumentRowClassName = (isReturned: boolean) => (
    `relative flex flex-col gap-4 overflow-hidden rounded-xl border p-4 transition-colors lg:flex-row lg:items-center lg:justify-between ${isReturned
      ? "border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/15"
      : "border-border/70 bg-white hover:bg-slate-50 dark:bg-slate-900/90 dark:hover:bg-slate-800/90"
    }`
  );

  const filtersGridClassName = "grid grid-cols-2 gap-2 sm:grid-cols-3";
  const filterSelectTriggerClassName = "w-full min-w-0 max-w-full rounded-full bg-background text-[13px] leading-tight shadow-sm sm:text-sm";
  const filterSelectValueClassName = "truncate";

  const matchesFilters = (doc: { ciclo: string; plan: string; carrera: string; cuatrimestre: string; grupo: string; docente: string; apartado: string; returned?: boolean }) => {
    const matchesPlan = filterPlan === "all" || doc.plan === filterPlan;
    const matchesCarrera = filterCarrera === "all" || doc.carrera === filterCarrera;
    const matchesCuatrimestre = filterCuatrimestre === "all" || doc.cuatrimestre === filterCuatrimestre;
    const matchesGrupo = filterGrupo === "all" || doc.grupo === filterGrupo;
    const matchesDocente = filterDocente === "all" || doc.docente === filterDocente;
    const matchesApartado = filterApartado === "all" || doc.apartado === filterApartado;
    const isReturned = Boolean(doc.returned);
    const matchesReturned =
      filterReturned === "all" ||
      (filterReturned === "returned" && isReturned) ||
      (filterReturned === "not-returned" && !isReturned);
    return matchesPlan && matchesCarrera && matchesCuatrimestre && matchesGrupo && matchesDocente && matchesApartado && matchesReturned;
  };

  const filteredPending = pendingDocuments.filter(matchesFilters);
  const filteredReviewed = reviewedDocuments.filter(matchesFilters);
  const filteredAll = allDocuments.filter(matchesFilters);
  const filteredPendienteOnly = filteredPending.filter((d) => d.status !== "reenviado");
  const filteredReenviados = filteredPending.filter((d) => d.status === "reenviado");
  const filteredDevueltos = filteredAll.filter((d) => d.returned === true);
  const reviewedToday = filteredReviewed.filter((doc) => toLocalDateKey(doc.reviewedAt) === todayKey);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      setPendingDocuments([]);
      setReviewedDocuments([]);
      setLoadError("Inicia sesión para cargar los documentos de estadías.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadDocuments = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [pendingResponse, reviewedResponse, returnedResponse, reenviadoResponse] = await Promise.all([
          apiFetch("/documents", { query: { status: "pendiente", per_page: "500" } }),
          apiFetch("/documents", { query: { status: "revisado", per_page: "500" } }),
          apiFetch("/documents", { query: { status: "devuelto", per_page: "500" } }),
          apiFetch("/documents", { query: { status: "reenviado", per_page: "500" } }),
        ]);

        const pendingItems = [
          ...extractApiDocuments(pendingResponse).filter(isEstadiasDocument).map((doc) => mapApiDocument(doc, "pending")),
          ...extractApiDocuments(reenviadoResponse).filter(isEstadiasDocument).map((doc) => mapApiDocument(doc, "pending")),
        ];

        const reviewedItems = [
          ...extractApiDocuments(reviewedResponse).filter(isEstadiasDocument).map((doc) => mapApiDocument(doc, "reviewed")),
          ...extractApiDocuments(returnedResponse).filter(isEstadiasDocument).map((doc) => mapApiDocument(doc, "reviewed")),
        ];

        if (!isMounted) return;

        setPendingDocuments(pendingItems);
        setReviewedDocuments(reviewedItems);
      } catch {
        if (!isMounted) return;
        setLoadError("No fue posible cargar los documentos de estadías desde el backend");
        setPendingDocuments([]);
        setReviewedDocuments([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isReady, refreshTrigger]);

  const reviewedByDate = useMemo(() => {
    return filteredReviewed.reduce<Record<string, EstadiaReviewedDocument[]>>((groups, doc) => {
      const date = doc.reviewedAt ? toLocalDateKey(doc.reviewedAt) : "";
      groups[date] = [...(groups[date] || []), doc];
      return groups;
    }, {});
  }, [filteredReviewed]);

  const nonEmptyOptions = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));

  const planesDisponibles = nonEmptyOptions(allDocuments.map((doc) => doc.plan));
  const carrerasDisponibles = nonEmptyOptions(allDocuments.map((doc) => doc.carrera));
  const gruposDisponibles = nonEmptyOptions(allDocuments.map((doc) => doc.grupo)).sort((a, b) => a.localeCompare(b));
  const cuatrimestresDisponibles = useMemo(() => {
    const fromDocs = nonEmptyOptions(allDocuments.map((doc) => doc.cuatrimestre)).sort((a, b) => Number(a) - Number(b));
    return fromDocs.length > 0 ? fromDocs : ["6", "10", "11"];
  }, [allDocuments]);
  const docentesDisponibles = nonEmptyOptions(allDocuments.map((doc) => doc.docente));
  const apartadosDisponibles = nonEmptyOptions(allDocuments.map((doc) => doc.apartado));
  const renderSelectItems = (values: string[]) => nonEmptyOptions(values).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>);

  const filtersBar = (
    <div data-tour="admin-estadias-filters" className={filtersGridClassName}>
      <Select value={filterPlan} onValueChange={setFilterPlan}>
        <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por plan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los planes</SelectItem>
          {renderSelectItems(planesDisponibles)}
        </SelectContent>
      </Select>
      <SearchableSelect
        value={filterCarrera}
        onValueChange={setFilterCarrera}
        options={carrerasDisponibles.map((c) => ({ value: c, label: c }))}
        placeholder="Buscar carrera..."
        allLabel="Todas las carreras"
      />
      <Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}>
        <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por cuatrimestre" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los cuatrimestres</SelectItem>
          {renderSelectItems(cuatrimestresDisponibles)}
        </SelectContent>
      </Select>
      <SearchableSelect
        value={filterGrupo}
        onValueChange={setFilterGrupo}
        options={gruposDisponibles.map((g) => ({ value: g, label: g }))}
        placeholder="Buscar grupo..."
        allLabel="Todos los grupos"
      />
      <SearchableSelect
        value={filterDocente}
        onValueChange={setFilterDocente}
        options={docentesDisponibles.map((d) => ({ value: d, label: d }))}
        placeholder="Buscar docente..."
        allLabel="Todos los docentes"
      />
      <Select value={filterApartado} onValueChange={setFilterApartado}>
        <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por apartado" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los apartados</SelectItem>
          {renderSelectItems(apartadosDisponibles)}
        </SelectContent>
      </Select>
      <Select value={filterReturned} onValueChange={setFilterReturned}>
        <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por estado" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los documentos</SelectItem>
          <SelectItem value="returned">Solo devueltos</SelectItem>
          <SelectItem value="not-returned">No devueltos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  React.useEffect(() => {
    if (filterCuatrimestre !== "all" && !cuatrimestresDisponibles.includes(filterCuatrimestre)) {
      setFilterCuatrimestre("all");
    }
  }, [filterCuatrimestre, cuatrimestresDisponibles]);

  const handleReviewDocument = async (documentId: number) => {
    const reviewedDoc = pendingDocuments.find((doc) => doc.id === documentId);
    try {
      await apiFetch(`/documents/${documentId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revisado" }),
      });

      setPendingDocuments((current) => current.filter((doc) => doc.id !== documentId));
      setReviewedDocuments((current) => {
        if (!reviewedDoc) return current;

        return [
          {
            ...reviewedDoc,
            reviewedAt: new Date().toISOString(),
            returned: false,
          },
          ...current,
        ];
      });
      toast.success("Documento de estadías marcado como revisado");
    } catch {
      toast.error("No se pudo marcar el documento como revisado");
    }
  };

  const handleReturnDocument = async (documentId: number, comment: string) => {
    const doc = [...pendingDocuments, ...reviewedDocuments].find((d) => d.id === documentId);
    const raw = doc?.documento ?? "Documento";
    const lastSep = raw.lastIndexOf(" - ");
    const baseName = lastSep !== -1 ? raw.substring(lastSep + 3).trim() : raw;
    const fileName = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
    const docenteName = doc?.docente ?? "";
    try {
      await apiFetch(`/documents/${documentId}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: comment.trim() }),
      });
      const returnedAt = new Date().toISOString();
      setPendingDocuments((current) => current.map((d) => (d.id === documentId ? { ...d, returned: true, returnedAt, resubmittedAt: undefined } : d)));
      setReviewedDocuments((current) => current.map((d) => (d.id === documentId ? { ...d, returned: true, returnedAt, resubmittedAt: undefined } : d)));
      toast.success(`${fileName} devuelto al docente ${docenteName}`);
    } catch {
      toast.error("No se pudo devolver el documento");
    }
  };

  const setDocumentReturnedState = (documentId: number, returned: boolean) => {
    const updatedAt = new Date().toISOString();

    setPendingDocuments((current) =>
      current.map((d) =>
        d.id === documentId
          ? { ...d, returned, returnedAt: returned ? updatedAt : d.returnedAt, resubmittedAt: returned ? d.resubmittedAt : updatedAt }
          : d
      )
    );
    setReviewedDocuments((current) =>
      current.map((d) =>
        d.id === documentId
          ? { ...d, returned, returnedAt: returned ? updatedAt : d.returnedAt, resubmittedAt: returned ? d.resubmittedAt : updatedAt }
          : d
      )
    );
  };

  const handleShareToMessages = (doc: EstadiaDocumentItem) => {
    const recipientName = 'docente' in doc ? doc.docente : (doc as any).docente;
    const lastSep = doc.documento.lastIndexOf(" - ");
    const cleanTitle = lastSep !== -1 && doc.documento.substring(lastSep + 3).trim()
      ? doc.documento.substring(lastSep + 3).trim()
      : doc.documento;
    globalThis.dispatchEvent(
      new CustomEvent("openMessagesConversation", {
        detail: {
          recipientName,
          recipientRole: "Docente",
          document: { id: doc.id, title: cleanTitle, filePath: doc.file_path ?? "" },
        },
      })
    );
  };

  const closePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setPreviewDocument(null);
  };

  useEffect(() => {
    if (!previewDocument) {
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      if (previewDocument.has_file === false) {
        setPreviewError("El archivo de este documento no está disponible en el servidor. El docente debe volver a subirlo.");
        setPreviewLoading(false);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);

      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }

      try {
        const blob = await fetchDocumentBlob(previewDocument.id);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "No se pudo cargar la vista previa del PDF";
        setPreviewError(message);
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
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

  const handleConfirmReturnAction = async () => {
    if (!returnConfirmation || isConfirmingReturn) return;
    setIsConfirmingReturn(true);
    try {
      if (returnConfirmation.type === "return") {
        const trimmedComment = returnComment.trim();
        await handleReturnDocument(returnConfirmation.document.id, trimmedComment);
      } else {
        const docId = returnConfirmation.document.id;
        const raw = returnConfirmation.document.documento ?? "Documento";
        const lastSep = raw.lastIndexOf(" - ");
        const baseName = lastSep !== -1 ? raw.substring(lastSep + 3).trim() : raw;
        const fileName = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
        try {
          await apiFetch(`/documents/${docId}/review`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "revisado", notes: "Devolución cancelada" }),
          });
          setDocumentReturnedState(docId, false);
          toast.success(`Devolución de ${fileName} cancelada`);
        } catch {
          toast.error("No se pudo cancelar la devolución");
        }
      }
      setReturnComment("");
      setReturnConfirmation(null);
    } finally {
      setIsConfirmingReturn(false);
    }
  };

  const groupDocsByBatch = (docs: EstadiaDocumentItem[]): EstadiaDocumentItem[][] => {
    const groups = new Map<string, EstadiaDocumentItem[]>();
    for (const doc of docs) {
      const key = doc.batch_id ?? `single-${doc.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    }
    return Array.from(groups.values());
  };

  const batchHeader = (group: EstadiaDocumentItem[]) => (
    <div className="flex items-center gap-2 border-b border-emerald-200/50 bg-emerald-50/80 px-4 py-2.5 dark:border-emerald-800/30 dark:bg-emerald-950/20">
      <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        {group.length} archivos del mismo envío
      </span>
      <span className="text-xs text-muted-foreground">
        · {group[0].docente} · {group[0].apartado}
      </span>
    </div>
  );

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Revisión de Estadías</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Revisa y aprueba los documentos de estadías enviados por los docentes.</p>
            </div>
            <button
              onClick={() => setRefreshTrigger((n) => n + 1)}
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
        <div className="sm:hidden mb-3">
          <Select value={activeSection} onValueChange={(v) => setActiveSection(v as ReviewSection)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Sección" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendientes">Pendientes</SelectItem>
              <SelectItem value="devueltos">Devueltos</SelectItem>
              <SelectItem value="reenviados">Reenviados</SelectItem>
              <SelectItem value="revisados">Revisados</SelectItem>
              <SelectItem value="hoy">Revisados hoy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsList data-tour="admin-estadias-tabs" className="hidden sm:grid w-full grid-cols-6 gap-2 p-1 bg-slate-100/90 dark:bg-slate-950/90 rounded-full shadow-sm border border-slate-200/70 dark:border-slate-800 overflow-hidden">
          <TabsTrigger value="all" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
            Todos
            <Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{filteredAll.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pendientes" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
            Pendientes
            <Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{filteredPendienteOnly.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="devueltos" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
            Devueltos
            <Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{filteredDevueltos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reenviados" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">
            Reenviados
            <Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{filteredReenviados.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="revisados" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">Revisados<Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{filteredReviewed.filter(d => !d.returned).length}</Badge></TabsTrigger>
          <TabsTrigger value="hoy" className="inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 transition duration-200 hover:bg-white/90 dark:hover:bg-slate-800 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm">Revisados hoy<Badge variant="outline" className="ml-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">{reviewedToday.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              {filtersBar}
            </CardHeader>
            <CardContent className="overflow-x-hidden">
              <div className="min-w-0 space-y-3">
                {/* Filas decorativas del recorrido — siempre visibles cuando el tour está activo */}
                {isAdminTourActive && (
                  <>
                    <TourFakeEstadiasRow isFirst={true} />
                    <TourFakeEstadiasRow isFirst={false} />
                  </>
                )}
                {!isAdminTourActive && isLoading && <DocumentCardSkeleton />}
                {!isAdminTourActive && !isLoading && loadError && <p className="text-sm text-destructive">{loadError}</p>}
                {!isAdminTourActive && !isLoading && !loadError && filteredAll.length === 0 && (
                  <EmptyState text={emptyStateLegend} />
                )}
                {!isAdminTourActive && !isLoading && !loadError && groupDocsByBatch(filteredAll).map((group, groupIdx) => {
                  const renderRow = (doc: EstadiaDocumentItem, isFirstRow?: boolean) => {
                  const isReviewed = "reviewedAt" in doc;
                  const isReturned = Boolean(doc.returned);
                  return (
                    <div key={doc.id} id={`doc-row-${doc.id}`} data-tour={isFirstRow ? "admin-estadias-doc-row" : undefined} className={`${getDocumentRowClassName(isReturned)}${highlightDocumentId === doc.id ? " ring-2 ring-emerald-400/60 bg-emerald-50/20 dark:bg-emerald-950/25" : ""}`}>
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{extractPreviewFileName(doc.documento)}</p>
                          <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {doc.apartado && doc.apartado !== "Documento" && (
                              <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                            {doc.grupo && doc.grupo !== "-" && (
                              <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>
                            )}
                          </div>
                          {('fecha' in doc && doc.fecha) && (
                            <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatSentFecha(doc.fecha)} {doc.fecha && (doc.fecha.includes('T') || doc.fecha.includes(' ')) ? <span className="ml-2 text-xs text-muted-foreground">{formatTime12(doc.fecha)}</span> : null}</p>
                          )}
                          {'returnedAt' in doc && doc.returnedAt && (
                            <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                          )}
                          {'resubmittedAt' in doc && doc.resubmittedAt && (
                            <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>
                          )}
                          {'reviewedAt' in doc && doc.reviewedAt && (
                            <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>
                          )}
                        </div>
                      </div>
                      <div data-tour={isFirstRow ? "admin-estadias-doc-actions" : undefined} className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto sm:justify-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                        <ResponsiveActionButton
                          variant="outline"
                          size="sm"
                          label="Ver"
                          title="Ver PDF"
                          onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}
                          icon={<Eye className="h-4 w-4" />}
                        />

                        {doc.nota && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40" onClick={(e) => { e.stopPropagation(); setNoteDialog({ nota: doc.nota, docente: doc.docente }); }} aria-label="Ver nota del docente"><MessageCircleMore className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Nota del docente</TooltipContent></Tooltip>}

                        <ResponsiveActionButton
                          variant="ghost"
                          size="sm"
                          label="Enviar"
                          title={`Enviar a mensajes ${doc.docente}`}
                          onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }}
                          icon={<MessageSquare className="h-4 w-4" />}
                        />

                        {isReturned ? <Badge variant="destructive">Devuelto</Badge> : <Badge variant={isReviewed ? "success" : "warning"}>{isReviewed ? "Revisado" : "Pendiente"}</Badge>}

                        {doc.returned ? (
                          <ResponsiveActionButton
                            variant="outline"
                            size="sm"
                            label="Cancelar"
                            title="Cancelar devolución"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                            onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "cancel-return", document: doc }); }}
                            icon={<Undo2 className="h-4 w-4" />}
                          />
                        ) : (
                          <ResponsiveActionButton
                            variant="destructive"
                            size="sm"
                            label="Devolver"
                            title="Devolver"
                            onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "return", document: doc }); }}
                            icon={<Undo2 className="h-4 w-4" />}
                          />
                        )}
                      </div>
                    </div>
                  );
                  };
                  if (group.length === 1) return renderRow(group[0], groupIdx === 0);
                  return (
                    <div key={group[0].batch_id ?? group[0].id} className="overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
                      {batchHeader(group)}
                      <div className="divide-y divide-border/50 dark:divide-slate-800/50">{group.map((doc, docIdx) => renderRow(doc, groupIdx === 0 && docIdx === 0))}</div>
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
            <CardContent className="overflow-x-hidden">
              <div className="min-w-0 space-y-3">
                {isLoading ? <DocumentCardSkeleton /> : null}
                {!isLoading && loadError && <p className="text-sm text-destructive">{loadError}</p>}
                {!isLoading && !loadError && filteredPendienteOnly.length === 0 ? (
                  <EmptyState text={emptyStateLegend} />
                ) : !isLoading && !loadError && groupDocsByBatch(filteredPendienteOnly).map((group) => {
                  const renderRow = (doc: EstadiaPendingDocument) => {
                  const isReturned = Boolean(doc.returned);
                  return (
                  <div key={doc.id} id={`doc-row-${doc.id}`} className={`${getDocumentRowClassName(isReturned)}${highlightDocumentId === doc.id ? " ring-2 ring-emerald-400/60 bg-emerald-50/20 dark:bg-emerald-950/25" : ""}`}>
                    <button type="button" aria-label={`Abrir vista previa de ${doc.documento}`} onClick={() => setPreviewDocument(doc)} className={previewCardOverlayClassName} />
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{extractPreviewFileName(doc.documento)}</p>
                        <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {doc.apartado && doc.apartado !== "Documento" && (
                            <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                          {doc.grupo && doc.grupo !== "-" && (
                            <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>
                          )}
                        </div>
                        {doc.fecha && (
                          <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatSentFecha(doc.fecha)} {doc.fecha && (doc.fecha.includes('T') || doc.fecha.includes(' ')) ? <span className="ml-2 text-xs text-muted-foreground">{formatTime12(doc.fecha)}</span> : null}</p>
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

                      <ResponsiveActionButton
                        variant="outline"
                        size="sm"
                        label="Revisar"
                        title="Revisar documento"
                        onClick={(e) => { e.stopPropagation(); setReviewConfirmation(doc); }}
                        icon={<Check className="h-4 w-4" />}
                      />

                      {doc.nota && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40" onClick={(e) => { e.stopPropagation(); setNoteDialog({ nota: doc.nota, docente: doc.docente }); }} aria-label="Ver nota del docente"><MessageCircleMore className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Nota del docente</TooltipContent></Tooltip>}

                      <ResponsiveActionButton
                        variant="ghost"
                        size="sm"
                        label="Enviar"
                        title={`Enviar a mensajes ${doc.docente}`}
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
                          onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "cancel-return", document: doc }); }}
                          icon={<Undo2 className="h-4 w-4" />}
                        />
                      ) : (
                        <ResponsiveActionButton
                          variant="destructive"
                          size="sm"
                          label="Devolver"
                          title="Devolver"
                          onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "return", document: doc }); }}
                          icon={<Undo2 className="h-4 w-4" />}
                        />
                      )}
                    </div>
                  </div>
                  );
                  };
                  if (group.length === 1) return renderRow(group[0] as EstadiaPendingDocument);
                  return (
                    <div key={group[0].batch_id ?? group[0].id} className="overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
                      {batchHeader(group)}
                      <div className="divide-y divide-border/50 dark:divide-slate-800/50">{group.map((d) => renderRow(d as EstadiaPendingDocument))}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devueltos" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">{filtersBar}</CardHeader>
            <CardContent className="overflow-x-hidden">
              <div className="min-w-0 space-y-3">
                {isLoading ? <DocumentCardSkeleton /> : null}
                {!isLoading && loadError && <p className="text-sm text-destructive">{loadError}</p>}
                {!isLoading && !loadError && filteredDevueltos.length === 0 ? (
                  <EmptyState text="No hay documentos devueltos." />
                ) : !isLoading && !loadError && groupDocsByBatch(filteredDevueltos).map((group) => {
                  const renderRow = (doc: EstadiaDocumentItem) => (
                  <div key={doc.id} className={getDocumentRowClassName(true)}>
                    <button type="button" aria-label={`Abrir vista previa de ${doc.documento}`} onClick={() => setPreviewDocument(doc)} className={previewCardOverlayClassName} />
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{extractPreviewFileName(doc.documento)}</p>
                        <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {doc.apartado && doc.apartado !== "Documento" && <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>}
                          <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                          {doc.grupo && doc.grupo !== "-" && <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>}
                        </div>
                        {'returnedAt' in doc && doc.returnedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                        )}
                      </div>
                    </div>
                    <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto sm:justify-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                      <ResponsiveActionButton variant="outline" size="sm" label="Ver" title="Ver PDF" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} icon={<Eye className="h-4 w-4" />} />
                      <Badge variant="destructive">Devuelto</Badge>
                      <ResponsiveActionButton
                        variant="outline" size="sm" label="Cancelar" title="Cancelar devolución"
                        className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                        onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "cancel-return", document: doc }); }}
                        icon={<Undo2 className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                  );
                  if (group.length === 1) return renderRow(group[0]);
                  return (
                    <div key={group[0].batch_id ?? group[0].id} className="overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
                      {batchHeader(group)}
                      <div className="divide-y divide-border/50 dark:divide-slate-800/50">{group.map(renderRow)}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reenviados" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">{filtersBar}</CardHeader>
            <CardContent className="overflow-x-hidden">
              <div className="min-w-0 space-y-3">
                {isLoading ? <DocumentCardSkeleton /> : null}
                {!isLoading && loadError && <p className="text-sm text-destructive">{loadError}</p>}
                {!isLoading && !loadError && filteredReenviados.length === 0 ? (
                  <EmptyState text="No hay documentos reenviados." />
                ) : !isLoading && !loadError && groupDocsByBatch(filteredReenviados).map((group) => {
                  const renderRow = (doc: EstadiaPendingDocument) => (
                  <div key={doc.id} className={getDocumentRowClassName(false)}>
                    <button type="button" aria-label={`Abrir vista previa de ${doc.documento}`} onClick={() => setPreviewDocument(doc)} className={previewCardOverlayClassName} />
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{extractPreviewFileName(doc.documento)}</p>
                        <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {doc.apartado && doc.apartado !== "Documento" && <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>}
                          <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                          {doc.grupo && doc.grupo !== "-" && <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>}
                        </div>
                        {'resubmittedAt' in doc && doc.resubmittedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>
                        )}
                        {doc.fecha && (
                          <p className="mt-1 text-xs text-muted-foreground">Enviado orig.: {formatSentFecha(doc.fecha)}</p>
                        )}
                      </div>
                    </div>
                    <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto sm:justify-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                      <ResponsiveActionButton variant="outline" size="sm" label="Ver" title="Ver PDF" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} icon={<Eye className="h-4 w-4" />} />
                      <Badge variant="secondary" className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" />Reenviado</Badge>
                      <ResponsiveActionButton
                        variant="default" size="sm" label="Revisar" title="Marcar como revisado"
                        onClick={(e) => { e.stopPropagation(); setReviewConfirmation(doc as EstadiaPendingDocument); }}
                        icon={<Check className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                  );
                  if (group.length === 1) return renderRow(group[0] as EstadiaPendingDocument);
                  return (
                    <div key={group[0].batch_id ?? group[0].id} className="overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
                      {batchHeader(group)}
                      <div className="divide-y divide-border/50 dark:divide-slate-800/50">{group.map((d) => renderRow(d as EstadiaPendingDocument))}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisados" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              {filtersBar}
            </CardHeader>
            <CardContent className="overflow-x-hidden">
              {Object.entries(reviewedByDate).filter(([date]) => date).length === 0 ? (
                <EmptyState text={emptyStateLegend} />
              ) : (
                <div className="min-w-0 space-y-6">
                  {Object.entries(reviewedByDate).filter(([date]) => date).map(([date, docs]) => (
                    <div key={date}>
                      <div className="mb-3">
                        <p className="font-semibold text-sm text-foreground">{formatDateOnlyFromKey(date)}</p>
                        <p className="text-xs text-muted-foreground">{docs.length} documentos revisados</p>
                      </div>
                      <div className="space-y-3">
                    {groupDocsByBatch(docs).map((group) => {
                      const renderRevRow = (doc: EstadiaDocumentItem) => {
                      const isReturned = Boolean(doc.returned);
                      return (
                        <div key={doc.id} id={`doc-row-${doc.id}`} className={`${getDocumentRowClassName(isReturned)}${highlightDocumentId === doc.id ? " ring-2 ring-emerald-400/60 bg-emerald-50/20 dark:bg-emerald-950/25" : ""}`}>
                          <button type="button" aria-label={`Abrir vista previa de ${doc.documento}`} onClick={() => setPreviewDocument(doc)} className={previewCardOverlayClassName} />
                          <div className="relative z-20 flex items-start gap-3 flex-1 pointer-events-none">
                            <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                              <p className="font-medium">{extractPreviewFileName(doc.documento)}</p>
                              <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {doc.apartado && doc.apartado !== "Documento" && (
                                  <Badge variant="outline" className="text-xs pointer-events-none">{doc.apartado}</Badge>
                                )}
                                <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                  {doc.plan}
                                </Button>
                                {doc.grupo && doc.grupo !== "-" && (
                                  <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                    Grupo {doc.grupo}
                                  </Button>
                                )}
                              </div>
                              {'fecha' in doc && doc.fecha && (
                                <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatDateTimeFromIso(doc.fecha)}</p>
                              )}
                              {'returnedAt' in doc && doc.returnedAt && (
                                <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                              )}
                              {'resubmittedAt' in doc && doc.resubmittedAt && (
                                <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>
                              )}
                              {'reviewedAt' in doc && doc.reviewedAt && (
                                <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>
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

                            <ResponsiveActionButton
                              variant="ghost"
                              size="sm"
                              label="Enviar"
                              title={`Enviar a mensajes ${doc.docente}`}
                              onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }}
                              icon={<MessageSquare className="h-4 w-4" />}
                            />

                            {isReturned && <Badge variant="destructive">Devuelto</Badge>}
                            <Badge variant="success">Revisado</Badge>
                          </div>
                        </div>
                      );
                      };
                      if (group.length === 1) return renderRevRow(group[0]);
                      return (
                        <div key={group[0].batch_id ?? group[0].id} className="overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
                          {batchHeader(group)}
                          <div className="divide-y divide-border/50 dark:divide-slate-800/50">{group.map(renderRevRow)}</div>
                        </div>
                      );
                    })}
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
            <CardContent className="overflow-x-hidden">
              <div className="min-w-0 space-y-3">
                {isLoading ? <DocumentCardSkeleton /> : reviewedToday.length === 0 ? (
                  <EmptyState text={emptyStateLegend} />
                ) : (
                  groupDocsByBatch(reviewedToday).map((group) => {
                    const renderTodayRow = (doc: EstadiaDocumentItem) => {
                    const isReturned = Boolean(doc.returned);
                    return (
                    <div key={doc.id} id={`doc-row-${doc.id}`} className={`${getDocumentRowClassName(isReturned)}${highlightDocumentId === doc.id ? " ring-2 ring-emerald-400/60 bg-emerald-50/20 dark:bg-emerald-950/25" : ""}`}>
                        <button type="button" aria-label={`Abrir vista previa de ${doc.documento}`} onClick={() => setPreviewDocument(doc)} className={previewCardOverlayClassName} />
                      <div className="relative z-20 flex items-start gap-3 flex-1 pointer-events-none">
                        <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                          <p className="font-medium">{extractPreviewFileName(doc.documento)}</p>
                          <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {doc.apartado && doc.apartado !== "Documento" && (
                              <Badge variant="outline" className="text-xs pointer-events-none">{doc.apartado}</Badge>
                            )}
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.plan}
                            </Button>
                            {doc.grupo && doc.grupo !== "-" && (
                              <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                Grupo {doc.grupo}
                              </Button>
                            )}
                          </div>
                          {'reviewedAt' in doc && doc.reviewedAt && (
                            <p className="mt-1 text-xs text-muted-foreground">{formatTime12(doc.reviewedAt)}</p>
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

                        {doc.nota && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40" onClick={(e) => { e.stopPropagation(); setNoteDialog({ nota: doc.nota, docente: doc.docente }); }} aria-label="Ver nota del docente"><MessageCircleMore className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Nota del docente</TooltipContent></Tooltip>}

                        <ResponsiveActionButton
                          variant="ghost"
                          size="sm"
                          label="Enviar"
                          title={`Enviar a mensajes ${doc.docente}`}
                          onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }}
                          icon={<MessageSquare className="h-4 w-4" />}
                        />

                        {isReturned && <Badge variant="destructive">Devuelto</Badge>}
                        <Badge variant="success">Revisado</Badge>
                      </div>
                    </div>
                    );
                    };
                    if (group.length === 1) return renderTodayRow(group[0]);
                    return (
                      <div key={group[0].batch_id ?? group[0].id} className="overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
                        {batchHeader(group)}
                        <div className="divide-y divide-border/50 dark:divide-slate-800/50">{group.map(renderTodayRow)}</div>
                      </div>
                    );
                  })
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
            {previewDocument && <DialogDescription>{previewDocument.docente} · {previewDocument.carrera}</DialogDescription>}
          </DialogHeader>
          {previewDocument && (
            <div className="flex-1 min-h-0">
              {previewLoading ? (
                <div className="flex h-[82vh] items-center justify-center text-sm text-muted-foreground">
                  Cargando PDF...
                </div>
              ) : previewError ? (
                <div className="flex h-[82vh] items-center justify-center text-sm text-destructive">
                  {previewError}
                </div>
              ) : previewBlobUrl ? (
                <object data={previewBlobUrl} type="application/pdf" className="h-[82vh] w-full rounded-lg border border-border bg-background">
                  <a href={previewBlobUrl} target="_blank" rel="noopener noreferrer" className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-primary underline">
                    Abrir documento en nueva pestaña
                  </a>
                </object>
              ) : (
                <div className="flex h-[82vh] items-center justify-center text-sm text-muted-foreground">
                  No hay vista previa disponible para este PDF.
                </div>
              )}
            </div>
          )}
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
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{ensurePdfExtension(reviewConfirmation.documento)}</p>
              <p className="text-muted-foreground">{reviewConfirmation.docente}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewConfirmation(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!reviewConfirmation) return;
              handleReviewDocument(reviewConfirmation.id);
              setReviewConfirmation(null);
            }}>Sí, marcar como revisado</Button>
          </DialogFooter>
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
            <DialogTitle>{returnConfirmation?.type === "return" ? "Confirmar devolución" : "Cancelar devolución"}</DialogTitle>
            <DialogDescription>
              {returnConfirmation?.type === "return"
                ? "¿Seguro que quieres marcar este documento como devuelto?"
                : "¿Seguro que quieres cancelar la devolución de este documento?"}
            </DialogDescription>
          </DialogHeader>

          {returnConfirmation && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{ensurePdfExtension(returnConfirmation.document.documento)}</p>
              <p className="text-muted-foreground">{'docente' in returnConfirmation.document ? returnConfirmation.document.docente : (returnConfirmation.document as any).docente}</p>
            </div>
          )}

          {returnConfirmation?.type === "return" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Comentario para el docente</p>
              <Textarea
                value={returnComment}
                onChange={(event) => setReturnComment(event.target.value)}
                placeholder="Escribe la razón de devolución del documento"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnConfirmation(null); setReturnComment(""); }}>Cancelar</Button>
            <Button variant={returnConfirmation?.type === "return" ? "destructive" : "success"} onClick={handleConfirmReturnAction} disabled={isConfirmingReturn}>
              {returnConfirmation?.type === "return" ? "Sí, devolver" : "Sí, cancelar devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialog !== null} onOpenChange={(open) => { if (!open) setNoteDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircleMore className="h-5 w-5 text-blue-500" />Nota del docente</DialogTitle>
            <DialogDescription>{noteDialog?.docente}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm whitespace-pre-wrap">{noteDialog?.nota}</div>
          <DialogFooter><Button variant="outline" onClick={() => setNoteDialog(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { EstadiaDocumentItem };