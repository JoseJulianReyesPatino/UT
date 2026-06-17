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
  GraduationCap,
  School,
  BookOpenText,
  Landmark,
  Building2,
  NotebookPen,
  Backpack,
  PencilLine,
  ClipboardList,
  HeartHandshake,
  ScrollText,
  CircleDollarSign,
  Trophy,
  Microscope,
  Atom,
  BriefcaseBusiness,
  BadgeCheck,
  Presentation,
} from "lucide-react";

interface DocenteDashboardProps {
  onNavigate?: (view: string) => void;
}

const backgroundIcons = [
  { icon: GraduationCap, className: "left-[5%] top-[10%] h-12 w-12 rotate-[-12deg]" },
  { icon: School, className: "right-[7%] top-[8%] h-14 w-14 rotate-[10deg]" },
  { icon: BookOpenText, className: "left-[18%] top-[56%] h-10 w-10 rotate-[8deg]" },
  { icon: Landmark, className: "right-[20%] top-[50%] h-11 w-11 rotate-[-6deg]" },
  { icon: Building2, className: "left-[46%] top-[12%] h-9 w-9 rotate-[15deg]" },
  { icon: NotebookPen, className: "right-[6%] bottom-[10%] h-10 w-10 rotate-[-10deg]" },
  { icon: Backpack, className: "left-[3%] bottom-[7%] h-9 w-9 rotate-[6deg]" },
  { icon: PencilLine, className: "right-[35%] top-[18%] h-8 w-8 rotate-[-8deg]" },
  { icon: ClipboardList, className: "left-[62%] bottom-[14%] h-8 w-8 rotate-[7deg]" },
  { icon: HeartHandshake, className: "left-[70%] top-[22%] h-9 w-9 rotate-[5deg]" },
  { icon: ScrollText, className: "left-[30%] top-[6%] h-8 w-8 rotate-[11deg]" },
  { icon: CircleDollarSign, className: "right-[42%] top-[62%] h-9 w-9 rotate-[-9deg]" },
  { icon: Trophy, className: "left-[74%] bottom-[18%] h-9 w-9 rotate-[14deg]" },
  { icon: Microscope, className: "left-[55%] top-[72%] h-8 w-8 rotate-[-7deg]" },
  { icon: Atom, className: "right-[28%] top-[2%] h-7 w-7 rotate-[18deg]" },
  { icon: BriefcaseBusiness, className: "left-[86%] top-[33%] h-8 w-8 rotate-[-5deg]" },
  { icon: BadgeCheck, className: "left-[42%] bottom-[3%] h-8 w-8 rotate-[10deg]" },
  { icon: Presentation, className: "left-[24%] bottom-[18%] h-9 w-9 rotate-[-11deg]" },
];

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
    <div className="relative z-0 space-y-6 overflow-hidden pb-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-12 top-8 h-40 w-40 rounded-full bg-emerald-100/20 blur-3xl dark:bg-emerald-500/5" />
        <div className="absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-sky-100/10 blur-3xl dark:bg-sky-500/5" />
        {backgroundIcons.map(({ icon: Icon, className }, index) => (
          <span
            key={`${Icon.displayName ?? "icon"}-${index}`}
            className={`absolute text-emerald-300/15 dark:text-emerald-200/10 ${className}`}
          >
            <Icon className="h-full w-full" />
          </span>
        ))}
      </div>

      <div className="relative z-10">
        <Card className="overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/35 to-slate-50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-slate-900">
        <CardContent className="space-y-5 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Antes de comenzar</h2>
              {!isIntroOpen && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
              className="h-11 w-11 rounded-2xl border border-emerald-200 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isIntroOpen ? "rotate-180" : "rotate-0"}`} />
            </Button>
          </div>

          {isIntroOpen && (
            <div className="rounded-[22px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/15 dark:via-slate-950 dark:to-slate-900 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:border-emerald-900/60 dark:bg-slate-900/60 dark:text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Nuevo ingreso
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Antes de comenzar</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Revisa la guía inicial y completa la configuración antes de empezar a cargar documentos.
                    </p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>
                      Es fundamental leer la documentación proporcionada, ya que explica detalladamente el funcionamiento completo del sistema.
                    </p>
                    <p>
                      Además, es necesario completar la configuración de su perfil antes de proceder con otras acciones.
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Gracias por su atención y colaboración.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
                  <Button asChild className="w-full rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 lg:w-auto">
                    <a href={manualDocenteUrl} target="_blank" rel="noreferrer">
                      Manual Docente
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative z-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
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

      <div className="relative z-10 grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Documentos Recientes</CardTitle>
                <CardDescription className="mt-1">Últimos documentos enviados</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.("historial")} className="rounded-xl text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-2">
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
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{doc.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{doc.materia}</p>
                      </div>
                    </div>
                    <Badge variant={docStatusVariant}>{docStatusLabel}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Próximas Entregas</CardTitle>
                <CardDescription className="mt-1">Fechas límite importantes</CardDescription>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-2">
              {proximasEntregas.map((entrega) => (
                <div
                  key={entrega.titulo}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{entrega.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{entrega.fecha}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{entrega.dias} días</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">restantes</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      </div>

    </div>
  );
}

export default DocenteDashboard;