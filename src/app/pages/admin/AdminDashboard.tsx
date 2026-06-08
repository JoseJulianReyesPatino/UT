import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import apiFetch from "../../lib/api";
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
};

type ActivityItem = {
  id: number;
  type: "review" | "upload";
  title: string;
  description: string;
  time: string;
  related: string;
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
    sortAt: new Date(doc.reviewedAtIso.replace(" ", "T")).getTime() || 0,
  }));

  const pendingItems: Array<ActivityItem & { sortAt: number }> = pending.map((doc) => ({
    id: Number(`${doc.id}2`),
    type: "upload",
    title: `${doc.docente} subió un documento`,
    description: doc.documento,
    time: formatRelativeTime(doc.submittedAt),
    related: doc.documento,
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
  }>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pendingRes, reviewedRes, usersRes] = await Promise.all([
        apiFetch("/documents", { query: { status: "pendiente" } }),
        apiFetch("/documents", { query: { status: "revisado" } }),
        apiFetch("/users"),
      ]);

      const pending = ((pendingRes?.data?.data ?? []) as ApiDocument[]).map(mapPendingDocument);
      const reviewed = ((reviewedRes?.data?.data ?? []) as ApiDocument[]).map(mapReviewedDocument);
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

  const openActivity = useCallback((activity: { id: number; type: string; title: string; description: string; time: string; related: string }) => {
    setSelectedActivity(activity);
  }, []);

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
              <Card className={`h-full overflow-hidden border shadow-sm hover:shadow-md transition cursor-pointer ${stat.cardClass}`}>
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
      <div className="space-y-4">
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
            className="flex flex-col gap-3 p-3 rounded-xl border border-border/70 bg-background/80 hover:bg-accent/60 transition-colors cursor-pointer dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between"
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
      <div className="space-y-4">
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
            className="w-full text-left flex items-start gap-3 rounded-xl p-3 border border-transparent hover:border-border/70 hover:bg-accent/60 transition-colors cursor-pointer dark:hover:bg-slate-900/50"
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

  return (
    <div className="relative space-y-6 overflow-hidden">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-emerald-300">
            Panel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Gestión y supervisión del sistema académico
          </p>
        </div>
      </div>

      <StatsGrid stats={stats} onNavigate={onNavigate} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/50 to-emerald-100/40 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/20 dark:to-emerald-950/20">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-foreground">Documentos Pendientes de Revisión</CardTitle>
              <Badge variant="warning" className="self-start sm:self-auto">{pendingDocuments.length}</Badge>
            </div>
            <CardDescription>Requieren tu aprobación</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando documentos pendientes...</p>
            ) : pendingDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay documentos pendientes por revisar.</p>
            ) : (
              <PendingList items={pendingDocuments} onOpen={openDocument} />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/70 bg-gradient-to-br from-white via-slate-50/50 to-emerald-100/35 shadow-sm dark:border-slate-900/50 dark:from-slate-950 dark:via-slate-950/20 dark:to-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-foreground">Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando actividad reciente...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
            ) : (
              <ActivityList items={recentActivity} onOpen={openActivity} />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedDocument)} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Documento abierto</DialogTitle>
            <DialogDescription>
              Marca como revisado solo cuando estés listo.
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{selectedDocument.documento}</p>
                <p className="text-xs text-muted-foreground">{selectedDocument.docente}</p>
                <p className="text-xs text-muted-foreground">{selectedDocument.carrera}</p>
                <p className="text-xs text-muted-foreground">{selectedDocument.tipo}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Vista previa simulada del documento. Aquí puede ir un visor PDF, modal o iframe.
              </div>
            </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de actividad</DialogTitle>
            <DialogDescription>
              La actividad seleccionada se puede abrir e inspeccionar.
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{selectedActivity.title}</p>
                <p className="text-xs text-muted-foreground">{selectedActivity.description}</p>
                <p className="text-xs text-muted-foreground">{selectedActivity.time}</p>
                <p className="text-xs text-muted-foreground">Relacionado: {selectedActivity.related}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Aquí puede mostrarse la trazabilidad del evento, el documento abierto o el cambio realizado por el docente.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedActivity(null)}>
              Cerrar
            </Button>
            <Button onClick={openRelatedDocument}>
              Abrir relacionado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminDashboard;
