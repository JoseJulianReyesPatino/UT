import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import apiFetch from "../../lib/api";
import { fetchDocumentBlob } from "../../lib/documents";
import { toast } from "sonner";
import { 
  Users,
  FileText,
  Clock,
  Eye,
  CheckCircle2,
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
};

type ActivityItem = {
  id: number;
  type: "review" | "upload";
  title: string;
  description: string;
  time: string;
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

const mapPendingDocument = (doc: ApiDocument): PendingDocument => ({
  id: Number(doc.id),
  docente: doc.uploaded_by_name ?? "Docente",
  documento: doc.title ?? "Documento sin título",
  carrera: doc.carrera_label ?? "Sin carrera",
  tipo: doc.apartado_label ?? doc.form_title ?? "Documento",
  fecha: formatDate(doc.submitted_at),
  revisado: false,
  submittedAt: doc.submitted_at ?? "",
  filePath: doc.file_path ?? null,
});

const mapReviewedDocument = (doc: ApiDocument): ReviewedDocument => {
  const reviewedAtIso = doc.reviewed_at ?? doc.submitted_at ?? "";
  return {
    id: Number(doc.id),
    docente: doc.uploaded_by_name ?? "Docente",
    documento: doc.title ?? "Documento sin título",
    carrera: doc.carrera_label ?? "Sin carrera",
    tipo: doc.apartado_label ?? doc.form_title ?? "Documento",
    fecha: formatDate(doc.submitted_at),
    reviewedAt: formatDate(reviewedAtIso),
    reviewedAtIso,
    filePath: doc.file_path ?? null,
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
    id: Number(`${doc.id}1`),
    type: "review",
    title: `Revisado documento de ${doc.docente}`,
    description: doc.documento,
    time: formatRelativeTime(doc.reviewedAtIso),
    related: doc.documento,
    relatedDocumentId: doc.id,
    sortAt: new Date(doc.reviewedAtIso.replace(" ", "T")).getTime() || 0,
  }));

  const pendingItems: Array<ActivityItem & { sortAt: number }> = pending.map((doc) => ({
    id: Number(`${doc.id}2`),
    type: "upload",
    title: `${doc.docente} subió un documento`,
    description: doc.documento,
    time: formatRelativeTime(doc.submittedAt),
    related: doc.documento,
    relatedDocumentId: doc.id,
    sortAt: new Date(doc.submittedAt.replace(" ", "T")).getTime() || 0,
  }));

  return [...reviewedItems, ...pendingItems]
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 8)
    .map(({ sortAt, ...item }) => item);
};

export function AdminDashboard({ onNavigate }: Readonly<AdminDashboardProps>) {
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [reviewedDocuments, setReviewedDocuments] = useState<ReviewedDocument[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [docentesTotal, setDocentesTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const showReloadLoader = useMemo(() => {
    if (typeof window === "undefined") return false;

    const navigationEntry = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return navigationEntry?.type === "reload";
  }, []);

  const [selectedDocument, setSelectedDocument] = useState<null | {
    id: number;
    docente: string;
    documento: string;
    carrera: string;
    tipo: string;
    fecha: string;
  }>(null);

  const [selectedActivity, setSelectedActivity] = useState<null | {
    id: number;
    type: string;
    title: string;
    description: string;
    time: string;
    related: string;
    relatedDocumentId: number;
  }>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);


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
        trend: `${reviewedDocuments.filter((doc) => isToday(doc.reviewedAtIso)).length} hoy`,
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

  const openDocument = useCallback((doc: { id: number; docente: string; documento: string; carrera: string; tipo: string; fecha: string }) => {
    setSelectedDocument(doc);
  }, []);

  const openActivity = useCallback((activity: { id: number; type: string; title: string; description: string; time: string; related: string; relatedDocumentId: number }) => {
    setSelectedActivity(activity);
  }, []);

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
    };
  }, [selectedDocument]);

  /* Small memoized presentational components to reduce re-renders */
  const StatsGrid = React.memo(function StatsGrid({ stats, onNavigate }: { stats: any[]; onNavigate: (view: AdminView) => void }) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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

  const PendingList = React.memo(function PendingList({ items, onOpen }: { items: typeof pendingDocuments; onOpen: (doc: any) => void }) {
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
            className="flex flex-col gap-3 p-3 rounded-2xl border border-slate-200 bg-white/70 hover:bg-slate-100/90 transition-colors cursor-pointer dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-950/50 dark:text-emerald-300">
                <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate text-foreground">{doc.documento}</p>
                <p className="text-xs text-muted-foreground">{doc.docente}</p>
                <Badge variant="outline" className="mt-2 w-fit max-w-full text-[11px]">
                  {doc.carrera}
                </Badge>
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

  const ActivityList = React.memo(function ActivityList({ items, onOpen }: { items: typeof recentActivity; onOpen: (a: any) => void }) {
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
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{activity.title}</p>
              <p className="text-xs text-muted-foreground">{activity.description}</p>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</p>
          </button>
        ))}
      </div>
    );
  });

  const openRelatedDocument = () => {
    if (!selectedActivity) return;

    const relatedDocument = pendingDocuments.find((item) => item.documento === selectedActivity.related)
      ?? reviewedDocuments.find((item) => item.documento === selectedActivity.related);

    if (relatedDocument && "revisado" in relatedDocument) {
      openDocument(relatedDocument);
      setSelectedActivity(null);
      return;
    }

    if (relatedDocument) {
      setSelectedDocument({
        id: relatedDocument.id,
        docente: relatedDocument.docente,
        documento: relatedDocument.documento,
        carrera: relatedDocument.carrera,
        tipo: relatedDocument.tipo,
        fecha: relatedDocument.fecha,
      });
    }

    setSelectedActivity(null);
  };

  const selectedActivityDocument = selectedActivity
    ? pendingDocuments.find((item) => item.id === selectedActivity.relatedDocumentId)
      ?? reviewedDocuments.find((item) => item.id === selectedActivity.relatedDocumentId)
      ?? null
    : null;

  return (
    <div className="relative z-0 space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-12 top-8 h-40 w-40 rounded-full bg-emerald-100/20 blur-3xl dark:bg-emerald-500/5" />
        <div className="absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-sky-100/10 blur-3xl dark:bg-sky-500/5" />
      </div>

      <div className="relative z-10">
        <Card className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800/70 dark:bg-slate-950/60 transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
          <CardContent className="space-y-5 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-white">Panel Administrativo</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Gestión y supervisión del sistema académico con acceso rápido a documentos y actividad.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <StatsGrid stats={stats} onNavigate={onNavigate} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800/70 dark:bg-slate-950/60 transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-foreground">Documentos Pendientes de Revisión</CardTitle>
              <Badge variant="warning" className="self-start sm:self-auto">{pendingDocuments.length}</Badge>
            </div>
            <CardDescription>Requieren tu aprobación</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && showReloadLoader ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Cargando...
              </div>
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : pendingDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay documentos pendientes por revisar.</p>
            ) : (
              <PendingList items={pendingDocuments} onOpen={openDocument} />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800/70 dark:bg-slate-950/60 transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
          <CardHeader>
            <CardTitle className="text-foreground">Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && showReloadLoader ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Cargando...
              </div>
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
            ) : (
              <ActivityList items={recentActivity} onOpen={openActivity} />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedDocument)} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Documento abierto</DialogTitle>
            <DialogDescription>
              Marca como revisado solo cuando estés listo.
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <Tabs defaultValue="preview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">Vista previa</TabsTrigger>
                <TabsTrigger value="details">Detalles</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-3">
                <div className="rounded-lg border border-border p-2 sm:p-3">
                  {previewLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando vista previa...</p>
                  ) : previewError ? (
                    <p className="text-sm text-destructive">{previewError}</p>
                  ) : previewBlobUrl ? (
                    <iframe
                      src={previewBlobUrl}
                      title={selectedDocument.documento}
                      className="h-[60vh] w-full rounded-md border border-border"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay vista previa disponible.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{selectedDocument.documento}</p>
                  <p className="text-xs text-muted-foreground">{selectedDocument.docente}</p>
                  <p className="text-xs text-muted-foreground">{selectedDocument.carrera}</p>
                  <p className="text-xs text-muted-foreground">{selectedDocument.tipo}</p>
                  <p className="text-xs text-muted-foreground">Fecha: {selectedDocument.fecha}</p>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDocument(null)}>
              Cerrar
            </Button>
            <Button
              disabled={isReviewing}
              onClick={() => {
                if (selectedDocument) {
                  void handleReviewDocument(selectedDocument.id);
                  setSelectedDocument(null);
                }
              }}
            >
              {isReviewing ? "Guardando..." : "Marcar como revisado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedActivity)} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de actividad</DialogTitle>
            <DialogDescription>
              La actividad seleccionada se puede abrir e inspeccionar.
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <Tabs defaultValue="activity" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="activity">Actividad</TabsTrigger>
                <TabsTrigger value="document">Documento</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="space-y-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{selectedActivity.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedActivity.description}</p>
                  <p className="text-xs text-muted-foreground">{selectedActivity.time}</p>
                  <p className="text-xs text-muted-foreground">Relacionado: {selectedActivity.related}</p>
                </div>
              </TabsContent>

              <TabsContent value="document" className="space-y-3">
                {selectedActivityDocument ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">{selectedActivityDocument.documento}</p>
                      <p className="text-xs text-muted-foreground">{selectedActivityDocument.docente}</p>
                      <p className="text-xs text-muted-foreground">{selectedActivityDocument.carrera}</p>
                      <p className="text-xs text-muted-foreground">{selectedActivityDocument.tipo}</p>
                      <p className="text-xs text-muted-foreground">Fecha: {selectedActivityDocument.fecha}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      Desde aquí puedes abrir el documento relacionado y revisar su contenido real.
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No se encontró un documento relacionado.</p>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedActivity(null)}>
              Cerrar
            </Button>
            <Button onClick={openRelatedDocument}>
              Abrir documento relacionado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminDashboard;
