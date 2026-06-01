import React, { useState, useEffect } from "react";
import apiFetch from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { StatsCard } from "../../components/StatsCard";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  ChevronDown,
} from "lucide-react";

interface DocenteDashboardProps {
  onNavigate?: (view: string) => void;
}

export function DocenteDashboard(props: Readonly<DocenteDashboardProps> = {}) {
  const { onNavigate } = props;
  const manualDocenteUrl = new URL("../../../assets/Manual de Usuario del Docente.pdf", import.meta.url).href;
  const [isIntroOpen, setIsIntroOpen] = useState(true);

  const { isReady } = useAuth();

  const [stats, setStats] = useState<{
    title: string;
    value: string;
    description: string;
    icon: any;
    trend?: string;
    color?: string;
    bgColor?: string;
    cardClass?: string;
    accentClass?: string;
    action?: string;
  }[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  const [proximasEntregas, setProximasEntregas] = useState<any[]>([]);

  useEffect(() => {
    if (!isReady) return;

    const load = async () => {
      setIsLoadingStats(true);
      setIsLoadingDocuments(true);
      try {
        const dashboard = (await apiFetch('/dashboard/stats', { method: 'GET' })) as any;

        const statsArr = [
          {
            title: 'Documentos Pendientes',
            value: String(dashboard.documents_pending ?? 0),
            description: 'Por entregar',
            icon: Clock,
            action: 'historial',
          },
          {
            title: 'Documentos Aprobados',
            value: String(dashboard.documents_reviewed ?? 0),
            description: 'Este cuatrimestre',
            icon: CheckCircle2,
            action: 'historial',
          },
          {
            title: 'En Revisión',
            value: String((dashboard.documents_total ?? 0) - (dashboard.documents_reviewed ?? 0) - (dashboard.documents_pending ?? 0)),
            description: 'En revisión',
            icon: AlertCircle,
            action: 'historial',
          },
        ];
        setStats(statsArr);

        // Load recent documents (user-scoped)
        const docsPayload = (await apiFetch('/documents?per_page=6', { method: 'GET' })) as any;
        const docs = (docsPayload?.data?.data ?? docsPayload?.data ?? []) as any[];
        setRecentDocuments(docs.map((d) => ({
          id: d.id,
          name: d.nombre ?? d.title ?? 'Documento',
          materia: d.materia ?? '-',
          tipo: d.tipoLabel ?? d.tipo ?? 'Documento',
          fecha: d.fecha ?? null,
          status: d.status ?? 'pendiente',
        })));

        // Upcoming: take pending documents and nearest dates
        const pending = docs.filter((d) => d.status === 'pendiente' && d.fecha).map((d) => ({ titulo: d.nombre ?? 'Documento', fecha: d.fecha }));
        const upcoming = pending
          .map((p) => ({ ...p, dias: Math.max(0, Math.ceil((new Date(p.fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) }))
          .sort((a, b) => a.dias - b.dias)
          .slice(0, 5);
        setProximasEntregas(upcoming);
      } catch (err) {
        // ignore, UI shows empty states
      } finally {
        setIsLoadingStats(false);
        setIsLoadingDocuments(false);
      }
    };

    void load();
  }, [isReady]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Bienvenido de vuelta</h1>
        <p className="text-muted-foreground">
          Aquí está el resumen de tu actividad académica
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-8">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Antes de comenzar:</h2>
              {!isIntroOpen && (
                <p className="text-sm text-muted-foreground">
                  Haz clic en el caret para ver la documentación y las indicaciones iniciales.
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsIntroOpen((current) => !current)}
              aria-label={isIntroOpen ? "Contraer información" : "Expandir información"}
              title={isIntroOpen ? "Contraer información" : "Expandir información"}
              className="h-9 w-9 rounded-full border border-emerald-200/70 bg-white/80 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isIntroOpen ? "rotate-180" : "rotate-0"}`} />
            </Button>
          </div>

          {isIntroOpen && (
            <div className="space-y-6 text-base leading-relaxed text-foreground/80">
              <div className="space-y-2">
                <p>
                  Es fundamental leer la documentación proporcionada, ya que explica detalladamente el funcionamiento completo del sistema. Además, es necesario completar la configuración de su perfil antes de proceder con otras acciones.
                </p>
              </div>

              <p>
                Tiene permitido el acceso a todos los módulos disponibles en el menú de navegación para explorar las distintas funcionalidades, incluyendo la carga de archivos. Tenga en cuenta que algunos envíos están sujetos a fechas límite. En caso de que se cierre el plazo sin que haya subido los archivos requeridos, puede ponerse en contacto con el administrador del sistema.
              </p>

              <p>Gracias por su atención y colaboración.</p>

              <div className="flex justify-end">
                <Button asChild variant="outline" className="rounded-none border-[#00A86B] px-8 text-[#00A86B] hover:bg-[#00A86B]/5">
                  <a href={manualDocenteUrl} target="_blank" rel="noreferrer">
                    Manual Docente
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const handleClick = () => {
            if (onNavigate && stat.action) onNavigate(stat.action);
          };

          return (
            <button
              key={stat.title}
              type="button"
              onClick={handleClick}
              className="text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <StatsCard
                title={stat.title}
                value={stat.value}
                description={stat.description}
                icon={Icon}
                trend={stat.trend}
                color={stat.color}
                bgColor={stat.bgColor}
                cardClass={stat.cardClass}
                accentClass={stat.accentClass}
              />
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/50 to-emerald-100/40 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/20 dark:to-emerald-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Documentos Recientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.("historial")}>
                Ver todos
              </Button>
            </div>
            <CardDescription>Últimos documentos enviados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.map((doc) => {
                let docStatusVariant: "success" | "warning" | "outline" = "outline";
                let docStatusLabel = "Pendiente";

                if (doc.status === "aprobado") {
                  docStatusVariant = "success";
                  docStatusLabel = "Aprobado";
                } else if (doc.status === "revision") {
                  docStatusVariant = "outline";
                  docStatusLabel = "En revisión";
                }

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-background/80 hover:bg-accent/60 transition-colors dark:bg-slate-950/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-950/50 dark:text-emerald-300">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.materia}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={docStatusVariant}>{docStatusLabel}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/70 bg-gradient-to-br from-white via-slate-50/50 to-emerald-100/35 shadow-sm dark:border-slate-900/50 dark:from-slate-950 dark:via-slate-950/20 dark:to-emerald-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Próximas Entregas</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Fechas límite importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proximasEntregas.map((entrega) => (
                <div
                  key={entrega.titulo}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-background/80 dark:bg-slate-950/60"
                >
                  <div>
                    <p className="font-medium text-sm text-foreground">{entrega.titulo}</p>
                    <p className="text-xs text-muted-foreground">{entrega.fecha}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{entrega.dias} días</p>
                    <p className="text-xs text-muted-foreground">restantes</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

export default DocenteDashboard;