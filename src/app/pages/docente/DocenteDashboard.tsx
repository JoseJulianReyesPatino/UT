import React, { useState, useEffect } from "react";
import apiFetch from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "../../components/ui/carousel";
import { StatsCard } from "../../components/StatsCard";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  ChevronDown,
} from "lucide-react";

const introSlides = [
  {
    src: new URL("../../../assets/ut_imagen1.webp", import.meta.url).href,
    alt: "Pre-registro nuevo ingreso 1",
  },
  {
    src: new URL("../../../assets/ut_imagen2.webp", import.meta.url).href,
    alt: "Pre-registro nuevo ingreso 2",
  },
  {
    src: new URL("../../../assets/ut_imagen3.webp", import.meta.url).href,
    alt: "Pre-registro nuevo ingreso 3",
  },
  {
    src: new URL("../../../assets/ut_imagen4.webp", import.meta.url).href,
    alt: "Pre-registro nuevo ingreso 4",
  },
  {
    src: new URL("../../../assets/ut_imagen5.webp", import.meta.url).href,
    alt: "Pre-registro nuevo ingreso 5",
  },
];

interface DocenteDashboardProps {
  onNavigate?: (view: string) => void;
}

export function DocenteDashboard(props: Readonly<DocenteDashboardProps> = {}) {
  const { onNavigate } = props;
  const manualDocenteUrl = new URL("../../../assets/Manual de Usuario del Docente.pdf", import.meta.url).href;
  const [isIntroOpen, setIsIntroOpen] = useState(true);
  const [introCarouselApi, setIntroCarouselApi] = useState<CarouselApi | null>(null);
  const [introSlide, setIntroSlide] = useState(0);

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

  useEffect(() => {
    if (!introCarouselApi || !isIntroOpen) return;

    const onSelect = () => {
      setIntroSlide(introCarouselApi.selectedScrollSnap());
    };

    onSelect();
    introCarouselApi.on("select", onSelect);

    const intervalId = window.setInterval(() => {
      introCarouselApi.scrollNext();
    }, 5500);

    return () => {
      window.clearInterval(intervalId);
      introCarouselApi.off("select", onSelect);
    };
  }, [introCarouselApi, isIntroOpen]);

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
            <div className="relative h-[320px] overflow-hidden rounded-[20px] border border-emerald-200/70 shadow-[0_14px_28px_rgba(15,23,42,0.10)] dark:border-emerald-900/60 sm:h-[360px] lg:h-[400px]">
              <div className="relative h-full">
                <Carousel
                  setApi={setIntroCarouselApi}
                  opts={{ loop: true }}
                  className="h-full w-full"
                >
                  <CarouselContent className="ml-0 h-full">
                    {introSlides.map((slide, index) => (
                      <CarouselItem key={slide.src} className="h-full pl-0">
                        <div className="relative h-full">
                          <img
                            src={slide.src}
                            alt={slide.alt}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-[#08302c]/80 via-[#0a3f39]/50 to-[#051915]/80 dark:from-black/78 dark:via-black/45 dark:to-black/75" />
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.16),transparent_30%)]" />
                          <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                            {index + 1}/{introSlides.length}
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => introCarouselApi?.scrollPrev()}
                    aria-label="Imagen anterior"
                    className="absolute left-4 top-1/2 z-30 h-12 w-12 -translate-y-1/2 rounded-full border border-white/15 bg-black/25 text-white backdrop-blur-md hover:bg-black/45 hover:text-white"
                  >
                    <span className="text-2xl leading-none">‹</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => introCarouselApi?.scrollNext()}
                    aria-label="Siguiente imagen"
                    className="absolute right-4 top-1/2 z-30 h-12 w-12 -translate-y-1/2 rounded-full border border-white/15 bg-black/25 text-white backdrop-blur-md hover:bg-black/45 hover:text-white"
                  >
                    <span className="text-2xl leading-none">›</span>
                  </Button>
                </Carousel>

                <div className="absolute inset-0 z-20 flex items-center justify-center px-3 py-2 sm:px-4">
                  <div className="w-full max-w-xl rounded-[18px] border border-white/12 bg-white/10 p-3 text-white shadow-[0_10px_22px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">
                          <span className="h-2 w-2 rounded-full bg-emerald-300" />
                          Nuevo ingreso
                        </span>
                        <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs font-medium text-white/75 backdrop-blur-sm">
                          Guía inicial
                        </span>
                      </div>

                      <div className="max-w-xl space-y-1">
                        <h2 className="text-base font-black tracking-tight text-white sm:text-xl lg:text-2xl">
                          Antes de comenzar
                        </h2>
                        <p className="text-[10px] leading-4 text-white/80 sm:text-[11px]">
                          Revisa la guía inicial y completa la configuración antes de empezar a cargar documentos.
                        </p>
                      </div>

                      <div className="grid gap-2 lg:grid-cols-[1.35fr_0.9fr] lg:items-end">
                        <div className="space-y-2 rounded-[16px] border border-white/12 bg-black/18 p-2.5 backdrop-blur-md sm:p-3">
                          <p className="text-[10px] leading-4 text-white/92 sm:text-[11px]">
                            Es fundamental leer la documentación proporcionada, ya que explica detalladamente el funcionamiento completo del sistema.
                          </p>

                          <p className="hidden text-[10px] leading-4 text-white/92 sm:block sm:text-[11px]">
                            Además, es necesario completar la configuración de su perfil antes de proceder con otras acciones.
                          </p>

                          <p className="hidden text-[10px] font-medium text-white/90 sm:block sm:text-[11px]">Gracias por su atención y colaboración.</p>
                        </div>

                        <div className="flex flex-col gap-2 lg:items-end">
                          <Button asChild className="w-full rounded-full bg-emerald-400 px-4 py-1.5 text-[10px] font-semibold text-slate-950 shadow-[0_8px_18px_rgba(16,185,129,0.30)] hover:bg-emerald-300 lg:w-auto">
                            <a href={manualDocenteUrl} target="_blank" rel="noreferrer">
                              Manual Docente
                            </a>
                          </Button>

                          <div className="flex items-center gap-2 rounded-full border border-white/12 bg-black/20 px-2 py-0.5 backdrop-blur-sm">
                            {introSlides.map((slide, index) => (
                              <button
                                key={slide.src}
                                type="button"
                                onClick={() => introCarouselApi?.scrollTo(index)}
                                className={`h-1 rounded-full transition-all duration-200 ${
                                  introSlide === index ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/75"
                                }`}
                                aria-label={`Ir a la imagen ${index + 1}`}
                                aria-pressed={introSlide === index}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
            <div className="max-h-[24rem] space-y-4 overflow-y-auto pr-2">
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
            <div className="max-h-[24rem] space-y-4 overflow-y-auto pr-2">
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