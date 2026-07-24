import React, { useMemo, useState, useCallback, useEffect } from "react";
import { PendingDocumentSkeleton, ActivitySkeleton, StatsGridSkeleton } from "./skeletons";
import FormNotFoundImg from "../../../assets/elementos/Form_Not_Found.webp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob } from "../../lib/documents";
import { toast } from "sonner";
import {
  Users,
  FileText,
  Clock,
  Eye,
  CheckCircle2,
  Undo2,
} from "lucide-react";

type AdminView = "dashboard" | "docentes" | "documentos" | "documentos-revisados" | "documentos-revisados-hoy";

interface AdminDashboardProps {
  onNavigate: (view: AdminView) => void;
}

type PendingDocument = {
  id: number;
  docente: string;
  documento: string;
  carrera: string;
  tipo: string;
  fecha: string;
  revisado: boolean;
  submittedAt: string;
  filePath?: string | null;
  materia?: string | null;
  cuatrimestre?: string | null;
  grupo?: string | null;
  formulario?: string | null;
  rawApartadoLabel?: string | null;
};

type ReviewedDocument = {
  id: number;
  docente: string;
  documento: string;
  carrera: string;
  tipo: string;
  fecha: string;
  reviewedAt: string;
  reviewedAtIso: string;
  filePath?: string | null;
  formulario?: string | null;
  rawApartadoLabel?: string | null;
};

type ActivityItem = {
  id: number;
  type: "review" | "upload";
  title: string;
  description: string;
  formulario?: string | null;
  rawApartadoLabel?: string | null;
  timestamp: string;
  related: string;
  relatedDocumentId: number;
};

type ApiDocument = {
  id: number;
  title?: string;
  form_title?: string;
  apartado_label?: string | null;
  carrera_label?: string | null;
  uploaded_by_name?: string;
  submitted_at?: string;
  reviewed_at?: string | null;
  status?: string;
  file_path?: string | null;
  materia?: string | null;
  cuatrimestre?: string | null;
  group_code?: string | null;
};

type ApiUserRole = string | { code?: string | null };
type ApiUser = {
  roles?: ApiUserRole[];
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-MX");
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "-";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const time = parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day}/${month}/${year} ${time}`;
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";

  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
};

const isToday = (value?: string | null) => {
  if (!value) return false;
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear()
    && parsed.getMonth() === now.getMonth()
    && parsed.getDate() === now.getDate()
  );
};

const addPdfExt = (name: string) => name.toUpperCase().endsWith(".PDF") ? name : `${name}.pdf`;

const ESTADIAS_APARTADOS: Record<string, string> = {
  "carta-presentacion": "Carta de Presentación",
  "carta-aceptacion": "Carta de Aceptación",
  "carta-terminacion": "Carta de Terminación",
  "acta-final-estadias": "Acta Final de Estadías",
};

const TUTORIAS_APARTADOS: Record<string, string> = {
  "carga-academica": "Carga Académica",
  "reporte-bajas": "Reporte de Bajas",
  "concentrado-asesorias": "Concentrado de Asesorías",
  "acta-asistencia-grupal": "Acta de Asistencia Grupal",
  "ficha-tecnica": "Ficha Técnica",
};

const buildFormularioLabel = (doc: ApiDocument): string | null => {
  const slug = doc.apartado_label ?? null;

  if (slug && slug in ESTADIAS_APARTADOS) {
    return `Estadías (${ESTADIAS_APARTADOS[slug]})`;
  }

  if (slug && slug in TUTORIAS_APARTADOS) {
    return `Tutorías (${TUTORIAS_APARTADOS[slug]})`;
  }

  const form = doc.form_title && doc.form_title !== "Documento" ? doc.form_title : null;
  return form ?? null;
};

const buildCuatrimestroLabel = (cuatrimestre?: string | null): string | null => {
  if (!cuatrimestre) return null;
  return cuatrimestre === "0" ? "Propedéutico" : `Cuatrimestre ${cuatrimestre}`;
};

const ESTADIAS_SLUG_SET = new Set(Object.keys(ESTADIAS_APARTADOS));
const TUTORIAS_SLUG_SET = new Set(Object.keys(TUTORIAS_APARTADOS));

const resolveAdminViewForDoc = (slug: string | null | undefined, activityType: "review" | "upload"): string => {
  if (slug && ESTADIAS_SLUG_SET.has(slug)) return "estadias-admin";
  if (slug && TUTORIAS_SLUG_SET.has(slug)) return "tutores";
  if (slug === "remedial") return activityType === "review" ? "documentos-revisados" : "remediales";
  return activityType === "review" ? "documentos-revisados" : "documentos";
};

const mapPendingDocument = (doc: ApiDocument): PendingDocument => ({
  id: Number(doc.id),
  docente: doc.uploaded_by_name ?? "Docente",
  documento: addPdfExt(doc.title ?? "Documento sin título"),
  carrera: doc.carrera_label ?? "",
  tipo: doc.apartado_label ?? doc.form_title ?? "Documento",
  fecha: formatDate(doc.submitted_at),
  revisado: false,
  submittedAt: doc.submitted_at ?? "",
  filePath: doc.file_path ?? null,
  materia: doc.materia && doc.materia !== "Sin materia" ? doc.materia : null,
  cuatrimestre: buildCuatrimestroLabel(doc.cuatrimestre),
  grupo: doc.group_code && doc.group_code !== "-" ? doc.group_code : null,
  formulario: buildFormularioLabel(doc),
  rawApartadoLabel: doc.apartado_label ?? null,
});

const mapReviewedDocument = (doc: ApiDocument): ReviewedDocument => {
  const reviewedAtIso = doc.reviewed_at ?? doc.submitted_at ?? "";
  return {
    id: Number(doc.id),
    docente: doc.uploaded_by_name ?? "Docente",
    documento: addPdfExt(doc.title ?? "Documento sin título"),
    carrera: doc.carrera_label ?? "",
    tipo: doc.apartado_label ?? doc.form_title ?? "Documento",
    fecha: formatDate(doc.submitted_at),
    reviewedAt: formatDate(reviewedAtIso),
    reviewedAtIso,
    filePath: doc.file_path ?? null,
    formulario: buildFormularioLabel(doc),
    rawApartadoLabel: doc.apartado_label ?? null,
  };
};

const isDocenteRole = (role: ApiUserRole) => {
  if (typeof role === "string") {
    const normalized = role.toLowerCase();
    return normalized.includes("docente") || normalized.includes("tutor");
  }

  const code = role?.code?.toLowerCase() ?? "";
  return code.includes("docente") || code.includes("tutor");
};

const countDocentes = (users: ApiUser[]) => users.filter((user) => (user.roles ?? []).some(isDocenteRole)).length;

const buildRecentActivity = (pending: PendingDocument[], reviewed: ReviewedDocument[]): ActivityItem[] => {
  const reviewedItems: Array<ActivityItem & { sortAt: number }> = reviewed.map((doc) => ({
    id: doc.id * 10 + 1,
    type: "review",
    title: `Revisado documento de ${doc.docente}`,
    description: doc.documento,
    formulario: doc.formulario ?? null,
    rawApartadoLabel: doc.rawApartadoLabel ?? null,
    timestamp: doc.reviewedAtIso,
    related: doc.documento,
    relatedDocumentId: doc.id,
    sortAt: new Date(doc.reviewedAtIso.replace(" ", "T")).getTime() || 0,
  }));

  const pendingItems: Array<ActivityItem & { sortAt: number }> = pending.map((doc) => ({
    id: doc.id * 10 + 2,
    type: "upload",
    title: `${doc.docente} subió un documento`,
    description: doc.documento,
    formulario: doc.formulario ?? null,
    rawApartadoLabel: doc.rawApartadoLabel ?? null,
    timestamp: doc.submittedAt,
    related: doc.documento,
    relatedDocumentId: doc.id,
    sortAt: new Date(doc.submittedAt.replace(" ", "T")).getTime() || 0,
  }));

  return [...reviewedItems, ...pendingItems]
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 8)
    .map(({ sortAt, ...item }) => item);
};

function DashboardEmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground">
      <img src={FormNotFoundImg} alt="Sin datos" className="h-36 w-36 object-contain opacity-60 dark:opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}


const StatsGrid = React.memo(function StatsGrid({ stats, onNavigate }: { stats: any[]; onNavigate: (view: AdminView) => void }) {
  return (
    <div data-tour="admin-dashboard-stats" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.title}
            type="button"
            onClick={() => onNavigate(stat.action)}
            className="text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className={`h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 shadow-sm transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer ${stat.cardClass}`}>
              <div className={`h-1 bg-gradient-to-r ${stat.accentClass}`} />
              <CardHeader className="flex flex-col items-start gap-3 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-xs font-semibold leading-tight text-foreground sm:text-sm">{stat.title}</CardTitle>
                <div className={`h-9 w-9 rounded-xl ${stat.bgColor} flex items-center justify-center ring-1 ring-black/5 dark:ring-white/5 sm:h-10 sm:w-10`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} aria-hidden />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl leading-none font-bold text-foreground sm:text-2xl">{stat.value}</div>
                <p className="mt-1 text-[11px] leading-snug text-foreground/70 sm:text-xs">{stat.description}</p>
                <p className={`mt-1 text-[11px] font-medium sm:text-xs ${stat.color}`}>{stat.trend}</p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
});

const PendingList = React.memo(function PendingList({ items, onOpen }: { items: PendingDocument[]; onOpen: (doc: PendingDocument) => void }) {
  return (
    <div className="max-h-[22rem] space-y-4 overflow-y-auto pr-2 sm:max-h-[24rem]">
      {items.filter((doc) => !doc.revisado).map((doc) => (
        <div
          key={doc.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(doc)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(doc);
            }
          }}
          className="flex flex-col gap-3 p-3 rounded-2xl border border-border/70 bg-white hover:bg-slate-50 transition-colors cursor-pointer dark:bg-slate-900/90 dark:hover:bg-slate-800/90 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-950/50 dark:text-emerald-300">
              <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate text-foreground">{doc.documento}</p>
              <p className="text-xs text-muted-foreground">{doc.docente}</p>
              {(doc.carrera || doc.materia || doc.cuatrimestre || doc.grupo) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {doc.carrera && (
                    <Badge variant="outline" className="text-[11px]">{doc.carrera}</Badge>
                  )}
                  {doc.materia && (
                    <Badge variant="outline" className="text-[11px]">{doc.materia}</Badge>
                  )}
                  {doc.cuatrimestre && (
                    <Badge variant="outline" className="text-[11px]">{doc.cuatrimestre}</Badge>
                  )}
                  {doc.grupo && (
                    <Badge variant="outline" className="text-[11px]">{doc.grupo}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex w-full items-center justify-end sm:w-auto sm:shrink-0">
            <ResponsiveActionButton
              icon={<Eye className="h-4 w-4" aria-hidden />}
              label="Abrir"
              size="sm"
              variant="ghost"
              tabIndex={-1}
              className="pointer-events-none w-full justify-center sm:w-auto sm:min-w-[6rem]"
            />
          </div>
        </div>
      ))}
    </div>
  );
});

const ActivityList = React.memo(function ActivityList({ items, onOpen }: { items: ActivityItem[]; onOpen: (a: ActivityItem) => void }) {
  return (
    <div className="max-h-[22rem] space-y-4 overflow-y-auto pr-2 sm:max-h-[24rem]">
      {items.map((activity) => (
        <button
          key={activity.id}
          type="button"
          onClick={() => onOpen(activity)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(activity);
            }
          }}
          className="w-full text-left flex items-start gap-3 rounded-2xl p-3 border border-transparent hover:border-slate-200/70 hover:bg-slate-100/90 transition-colors cursor-pointer dark:hover:border-slate-800/70 dark:hover:bg-slate-900/50"
        >
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-2 shadow-[0_0_0_4px_rgba(16,185,129,0.12)] dark:shadow-[0_0_0_4px_rgba(16,185,129,0.06)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{activity.title}</p>
            <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
            {activity.formulario && (
              <p className="text-[11px] text-muted-foreground/70 truncate">{activity.formulario}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(activity.timestamp)}</p>
        </button>
      ))}
    </div>
  );
});

export function AdminDashboard({ onNavigate }: Readonly<AdminDashboardProps>) {
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [reviewedDocuments, setReviewedDocuments] = useState<ReviewedDocument[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [docentesTotal, setDocentesTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [, setTimeTick] = useState(0);

  const [selectedDocument, setSelectedDocument] = useState<null | {
    id: number;
    docente: string;
    documento: string;
    carrera: string;
    tipo: string;
    fecha: string;
    submittedAt: string;
  }>(null);

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnComment, setReturnComment] = useState("");


  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pendingRes, reviewedRes, usersRes] = await Promise.all([
        apiFetch("/documents", { query: { status: "pendiente" } }),
        apiFetch("/documents", { query: { status: "revisado" } }),
        apiFetch("/users"),
      ]);

      const pending = ((pendingRes?.data ?? []) as ApiDocument[]).map(mapPendingDocument);
      const reviewed = ((reviewedRes?.data ?? []) as ApiDocument[]).map(mapReviewedDocument);
      const users = (usersRes?.data ?? []) as ApiUser[];

      setPendingDocuments(pending);
      setReviewedDocuments(reviewed);
      setRecentActivity(buildRecentActivity(pending, reviewed));
      setDocentesTotal(countDocentes(users));
    } catch {
      toast.error("No se pudo cargar el panel administrativo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(
    () => [
      {
        title: "Total Docentes",
        value: docentesTotal,
        description: "Activos este cuatrimestre",
        icon: Users,
        trend: docentesTotal > 0 ? "Con actividad" : "Sin registros",
        color: "text-emerald-700 dark:text-emerald-300",
        bgColor: "bg-emerald-100/80 dark:bg-emerald-950/40",
        cardClass: "bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 border-emerald-200/70 dark:from-emerald-950/25 dark:via-slate-950 dark:to-emerald-950/35 dark:border-emerald-800/60",
        accentClass: "from-emerald-400/40 via-emerald-300/20 to-transparent",
        action: "docentes" as AdminView,
      },
      {
        title: "Documentos Pendientes",
        value: pendingDocuments.length,
        description: "Por abrir y revisar",
        icon: Clock,
        trend: pendingDocuments.length > 0 ? `${pendingDocuments.length} por atender` : "Al día",
        color: "text-slate-700 dark:text-slate-200",
        bgColor: "bg-slate-100/80 dark:bg-slate-800/80",
        cardClass: "bg-gradient-to-br from-slate-50 via-white to-slate-50/70 border-slate-200/70 dark:from-slate-900/55 dark:via-slate-950 dark:to-slate-950/20 dark:border-slate-700/70",
        accentClass: "from-slate-400/35 via-slate-300/20 to-transparent",
        action: "documentos" as AdminView,
      },
      {
        title: "Documentos Revisados",
        value: reviewedDocuments.length,
        description: "Ya abiertos por administración",
        icon: CheckCircle2,
        trend: "",
        color: "text-emerald-700 dark:text-emerald-300",
        bgColor: "bg-emerald-100/70 dark:bg-emerald-950/40",
        cardClass: "bg-gradient-to-br from-emerald-50 via-white to-emerald-50/80 border-emerald-200/70 dark:from-emerald-950/20 dark:via-slate-950 dark:to-emerald-950/25 dark:border-emerald-800/60",
        accentClass: "from-emerald-400/35 via-emerald-300/20 to-transparent",
        action: "documentos-revisados" as AdminView,
      },
      {
        title: "Revisados Hoy",
        value: reviewedDocuments.filter((doc) => isToday(doc.reviewedAtIso)).length,
        description: "Documentos abiertos hoy",
        icon: Eye,
        trend: reviewedDocuments.filter((doc) => isToday(doc.reviewedAtIso)).length > 0 ? "En curso" : "Sin actividad",
        color: "text-slate-700 dark:text-slate-200",
        bgColor: "bg-slate-100/80 dark:bg-slate-800/80",
        cardClass: "bg-gradient-to-br from-slate-50 via-white to-slate-50/70 border-slate-200/70 dark:from-slate-900/55 dark:via-slate-950 dark:to-slate-950/20 dark:border-slate-700/70",
        accentClass: "from-slate-400/35 via-slate-300/20 to-transparent",
        action: "documentos-revisados-hoy" as AdminView,
      },
    ],
    [docentesTotal, pendingDocuments, reviewedDocuments]
  );

  const handleReviewDocument = useCallback(async (documentId: number) => {
    setIsReviewing(true);
    try {
      await apiFetch(`/documents/${documentId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revisado" }),
      });

      toast.success("Documento marcado como revisado");
      await loadDashboard();
    } catch {
      toast.error("No se pudo marcar el documento como revisado");
    } finally {
      setIsReviewing(false);
    }
  }, [loadDashboard]);

  const handleReturnDocument = useCallback(async (documentId: number, comment: string, docName?: string, docenteName?: string): Promise<boolean> => {
    try {
      await apiFetch(`/documents/${documentId}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: comment.trim() }),
      });
      const raw = docName ?? "Documento";
      const lastSep = raw.lastIndexOf(" - ");
      const baseName = lastSep !== -1 ? raw.substring(lastSep + 3).trim() : raw;
      const nombre = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
      const docente = docenteName ? ` al docente ${docenteName}` : "";
      toast.success(`${nombre} devuelto${docente}`);
      await loadDashboard();
      return true;
    } catch {
      toast.error("No se pudo devolver el documento");
      return false;
    }
  }, [loadDashboard]);

  const confirmReturn = useCallback(async () => {
    const trimmed = returnComment.trim();
    if (!selectedDocument) return;
    const doc = selectedDocument;
    setReturnDialogOpen(false);
    setReturnComment("");
    setSelectedDocument(null);
    const success = await handleReturnDocument(doc.id, trimmed, doc.documento, doc.docente);
    if (success) {
      globalThis.dispatchEvent(new CustomEvent("openMessagesConversation", {
        detail: { recipientName: doc.docente, recipientRole: "Docente", document: { id: doc.id, title: doc.documento, filePath: "" } },
      }));
    }
  }, [returnComment, selectedDocument, handleReturnDocument]);

  const openDocument = useCallback((doc: { id: number; docente: string; documento: string; carrera: string; tipo: string; fecha: string; submittedAt: string }) => {
    setSelectedDocument(doc);
  }, []);

  const openActivity = useCallback((activity: ActivityItem) => {
    sessionStorage.setItem("adminHighlightDocumentId", String(activity.relatedDocumentId));
    const targetView = resolveAdminViewForDoc(activity.rawApartadoLabel, activity.type);
    onNavigate(targetView);
  }, [onNavigate]);

  useEffect(() => {
    let isMounted = true;

    const loadPreview = async () => {
      if (!selectedDocument) {
        setPreviewBlobUrl(null);
        setPreviewLoading(false);
        setPreviewError(null);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewBlobUrl(null);

      try {
        const blob = await fetchDocumentBlob(selectedDocument.id);
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
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, [selectedDocument]);

  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Panel Administrativo</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Gestión y supervisión del sistema académico con acceso rápido a documentos y actividad.</p>
        </div>
      </div>

      {isLoading ? <StatsGridSkeleton /> : <StatsGrid stats={stats} onNavigate={onNavigate} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-tour="admin-dashboard-pending" className="overflow-hidden rounded-[22px] border-border/70 bg-card shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60 dark:backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-foreground">Documentos Pendientes de Revisión</CardTitle>
              <Badge variant="warning" className="self-start sm:self-auto">{pendingDocuments.length}</Badge>
            </div>
            <CardDescription>Requieren tu aprobación</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <PendingDocumentSkeleton />
            ) : pendingDocuments.length === 0 ? (
              <DashboardEmptyState text="No hay documentos pendientes por revisar." />
            ) : (
              <PendingList items={pendingDocuments} onOpen={openDocument} />
            )}
          </CardContent>
        </Card>

        <Card data-tour="admin-dashboard-activity" className="overflow-hidden rounded-[22px] border-border/70 bg-card shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60 dark:backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-foreground">Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ActivitySkeleton />
            ) : recentActivity.length === 0 ? (
              <DashboardEmptyState text="Sin actividad reciente en el sistema." />
            ) : (
              <ActivityList items={recentActivity} onOpen={openActivity} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de vista previa de documento pendiente */}
      <Dialog open={Boolean(selectedDocument)} onOpenChange={(open) => { if (!open) setSelectedDocument(null); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col p-4 gap-3">
          <DialogHeader className="flex-shrink-0 space-y-0.5">
            <DialogTitle className="text-sm sm:text-base leading-tight">{selectedDocument?.documento ?? ""}</DialogTitle>
            {selectedDocument && (
              <DialogDescription className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                <span>{selectedDocument.docente}</span>
                {selectedDocument.carrera && <><span>·</span><span>{selectedDocument.carrera}</span></>}
                <span>·</span><span>{formatDateTime(selectedDocument.submittedAt)}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedDocument && (
            <div style={{ height: "calc(95vh - 130px)" }}>
              {previewLoading ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
                  <p>Cargando...</p>
                </div>
              ) : previewError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                  {previewError}
                </div>
              ) : previewBlobUrl ? (
                <object
                  data={previewBlobUrl}
                  type="application/pdf"
                  className="w-full h-full rounded-lg border border-border"
                >
                  <a
                    href={previewBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-primary underline"
                  >
                    Abrir documento en nueva pestaña
                  </a>
                </object>
              ) : null}
            </div>
          )}

          <div className="flex-shrink-0 flex flex-row items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedDocument(null)}>
              <span className="hidden sm:inline">Cerrar</span>
              <span className="sm:hidden">✕</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
              onClick={() => setReturnDialogOpen(true)}
            >
              <Undo2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Devolver</span>
            </Button>
            <Button
              size="sm"
              disabled={isReviewing}
              onClick={() => {
                if (selectedDocument) {
                  void handleReviewDocument(selectedDocument.id);
                  setSelectedDocument(null);
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{isReviewing ? "Guardando..." : "Marcar como revisado"}</span>
              <span className="sm:hidden">{isReviewing ? "..." : "Revisado"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de devolución con comentario */}
      <Dialog open={returnDialogOpen} onOpenChange={(open) => { if (!open) { setReturnDialogOpen(false); setReturnComment(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver documento</DialogTitle>
            <DialogDescription>
              El comentario se enviará al docente junto con la notificación de devolución.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Comentario para el docente</p>
            <Textarea
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              placeholder="Escribe la razón de devolución del documento..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnDialogOpen(false); setReturnComment(""); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmReturn}>
              Confirmar devolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default AdminDashboard;
