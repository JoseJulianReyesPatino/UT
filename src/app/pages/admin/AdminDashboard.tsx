import React, { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
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

export function AdminDashboard({ onNavigate }: Readonly<AdminDashboardProps>) {
  const [pendingDocuments, setPendingDocuments] = useState([
    {
      id: 1,
      docente: "Mtro. Juan Pérez",
      documento: "Planeación - Programación Web",
      carrera: "Ingeniería en Sistemas",
      tipo: "Planeación",
      fecha: "2026-05-17",
      revisado: false,
    },
    {
      id: 2,
      docente: "Dra. Ana Martínez",
      documento: "Instrumento 30% - Base de Datos",
      carrera: "TSU en Desarrollo de Software",
      tipo: "Instrumento 30%",
      fecha: "2026-05-16",
      revisado: false,
    },
    {
      id: 3,
      docente: "Mtro. Carlos López",
      documento: "Lista Concentrada - Redes",
      carrera: "Ingeniería en Redes",
      tipo: "Lista Concentrada",
      fecha: "2026-05-15",
      revisado: false,
    },
    {
      id: 4,
      docente: "Dra. Laura Gómez",
      documento: "Instrumento 60% - Infraestructura",
      carrera: "TSU en Infraestructura",
      tipo: "Instrumento 60%",
      fecha: "2026-05-17",
      revisado: false,
    },
  ]);

  const [reviewedDocuments, setReviewedDocuments] = useState([
    {
      id: 101,
      docente: "Dra. María González",
      documento: "Instrumento 60% - Programación Web",
      carrera: "Ingeniería en Sistemas",
      tipo: "Instrumento 60%",
      fecha: "2026-05-17",
      reviewedAt: "2026-05-17 09:15",
    },
    {
      id: 102,
      docente: "Mtro. Roberto Silva",
      documento: "Planeación - Redes",
      carrera: "Ingeniería en Redes",
      tipo: "Planeación",
      fecha: "2026-05-16",
      reviewedAt: "2026-05-17 10:05",
    },
  ]);

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: "review",
      title: "Revisado documento de Mtro. Juan Pérez",
      description: "Planeación - Programación Web",
      time: "Hace 5 min",
      related: "Planeación - Programación Web",
    },
    {
      id: 2,
      type: "upload",
      title: "Dra. Ana Martínez actualizó su instrumento",
      description: "Instrumento 30% - Base de Datos",
      time: "Hace 15 min",
      related: "Instrumento 30% - Base de Datos",
    },
    {
      id: 3,
      type: "upload",
      title: "Mtro. Roberto Silva subió nuevo documento",
      description: "Lista Concentrada - Redes",
      time: "Hace 30 min",
      related: "Lista Concentrada - Redes",
    },
    {
      id: 4,
      type: "comment",
      title: "Comentario agregado para Dra. Ana Martínez",
      description: "Se pidió corrección de portada",
      time: "Hace 1 hora",
      related: "Instrumento 30% - Base de Datos",
    },
  ]);

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

  const stats = useMemo(
    () => [
      {
        title: "Total Docentes",
        value: "48",
        description: "Activos este cuatrimestre",
        icon: Users,
        trend: "+3 vs anterior",
        color: "text-emerald-700 dark:text-emerald-300",
        bgColor: "bg-emerald-100/80 dark:bg-emerald-950/40",
        cardClass: "bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 border-emerald-200/70 dark:from-emerald-950/25 dark:via-slate-950 dark:to-emerald-950/35 dark:border-emerald-800/60",
        accentClass: "from-emerald-400/40 via-emerald-300/20 to-transparent",
        action: "docentes" as AdminView,
      },
      {
        title: "Documentos Pendientes",
        value: pendingDocuments.filter((doc) => !doc.revisado).length,
        description: "Por abrir y revisar",
        icon: Clock,
        trend: "Hoy llegaron 4",
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
        trend: "+2 hoy",
        color: "text-emerald-700 dark:text-emerald-300",
        bgColor: "bg-emerald-100/70 dark:bg-emerald-950/40",
        cardClass: "bg-gradient-to-br from-emerald-50 via-white to-emerald-50/80 border-emerald-200/70 dark:from-emerald-950/20 dark:via-slate-950 dark:to-emerald-950/25 dark:border-emerald-800/60",
        accentClass: "from-emerald-400/35 via-emerald-300/20 to-transparent",
        action: "documentos-revisados" as AdminView,
      },
      {
        title: "Revisados Hoy",
        value: reviewedDocuments.filter((doc) => doc.reviewedAt.startsWith("2026-05-17")).length,
        description: "Documentos abiertos hoy",
        icon: Eye,
        trend: "En curso",
        color: "text-slate-700 dark:text-slate-200",
        bgColor: "bg-slate-100/80 dark:bg-slate-800/80",
        cardClass: "bg-gradient-to-br from-slate-50 via-white to-slate-50/70 border-slate-200/70 dark:from-slate-900/55 dark:via-slate-950 dark:to-slate-950/20 dark:border-slate-700/70",
        accentClass: "from-slate-400/35 via-slate-300/20 to-transparent",
        action: "documentos-revisados-hoy" as AdminView,
      },
    ],
    [pendingDocuments, reviewedDocuments]
  );

  const handleReviewDocument = useCallback((documentId: number) => {
    const doc = pendingDocuments.find((item) => item.id === documentId);
    if (!doc) return;

    setPendingDocuments((current) => current.map((item) => (item.id === documentId ? { ...item, revisado: true } : item)));

    setReviewedDocuments((current) => [
      {
        id: Date.now(),
        docente: doc.docente,
        documento: doc.documento,
        carrera: doc.carrera,
        tipo: doc.tipo,
        fecha: doc.fecha,
        reviewedAt: new Date().toISOString(),
      },
      ...current,
    ]);

    setRecentActivity((current) => [
      {
        id: Date.now(),
        type: "review",
        title: `Revisado documento de ${doc.docente}`,
        description: doc.documento,
        time: "Hace unos segundos",
        related: doc.documento,
      },
      ...current,
    ]);
  }, [pendingDocuments]);

  const openDocument = useCallback((doc: { id: number; docente: string; documento: string; carrera: string; tipo: string; fecha: string }) => {
    setSelectedDocument(doc);
  }, []);

  const openActivity = useCallback((activity: { id: number; type: string; title: string; description: string; time: string; related: string }) => {
    setSelectedActivity(activity);
  }, []);

  /* Small memoized presentational components to reduce re-renders */
  const StatsGrid = React.memo(function StatsGrid({ stats, onNavigate }: { stats: any[]; onNavigate: (view: AdminView) => void }) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground">{stat.title}</CardTitle>
                  <div className={`h-10 w-10 rounded-xl ${stat.bgColor} flex items-center justify-center ring-1 ring-black/5 dark:ring-white/5`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} aria-hidden />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-foreground/70">{stat.description}</p>
                  <p className={`text-xs mt-1 font-medium ${stat.color}`}>{stat.trend}</p>
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
            className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-background/80 hover:bg-accent/60 transition-colors cursor-pointer dark:bg-slate-950/60"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-950/50 dark:text-emerald-300">
                <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-foreground">{doc.documento}</p>
                <p className="text-xs text-muted-foreground">{doc.docente}</p>
                <Badge variant="outline" className="mt-2 text-[11px]">
                  {doc.carrera}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" tabIndex={-1} className="pointer-events-none">
                Abrir
              </Button>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Documentos Pendientes de Revisión</CardTitle>
              <Badge variant="warning">{pendingDocuments.filter((doc) => !doc.revisado).length}</Badge>
            </div>
            <CardDescription>Requieren tu aprobación</CardDescription>
          </CardHeader>
          <CardContent>
            <PendingList items={pendingDocuments} onOpen={openDocument} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/70 bg-gradient-to-br from-white via-slate-50/50 to-emerald-100/35 shadow-sm dark:border-slate-900/50 dark:from-slate-950 dark:via-slate-950/20 dark:to-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-foreground">Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityList items={recentActivity} onOpen={openActivity} />
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
              onClick={() => {
                if (selectedDocument) {
                  handleReviewDocument(selectedDocument.id);
                  setSelectedDocument(null);
                }
              }}
            >
              Marcar como revisado
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
