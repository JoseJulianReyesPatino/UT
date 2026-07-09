import React, { useState, useEffect, useCallback } from "react";
import apiFetch from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { StatsCard } from "../../components/StatsCard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { AUTH_TOKEN_STORAGE_KEY } from "../../lib/env";
import { getDocumentDisplayFileName, fetchDocumentBlob, getDocumentFileUrl } from "../../lib/documents";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Eye,
  RefreshCw,
  Clock2,
  Undo2,
} from "lucide-react";

// --- Importar las imágenes desde assets ---
import banner1 from "../../../assets/123.png";
import banner2 from "../../../assets/1234.png";
import banner3 from "../../../assets/ut_imagen3.webp";
import banner4 from "../../../assets/ut_imagen4.webp";

function formatTiempoRestante(fecha: string): { valor: string; unidad: string } {
  const diff = new Date(fecha).getTime() - Date.now();
  if (diff <= 0) return { valor: '0', unidad: 'minutos' };
  const mins  = Math.floor(diff / 60_000);
  const horas = Math.floor(diff / 3_600_000);
  const dias  = Math.floor(diff / 86_400_000);
  const sems  = Math.floor(dias / 7);
  const meses = Math.floor(dias / 30);
  if (mins  < 60)  return { valor: String(mins),  unidad: mins  === 1 ? 'minuto'  : 'minutos' };
  if (horas < 24)  return { valor: String(horas), unidad: horas === 1 ? 'hora'    : 'horas'   };
  if (dias  < 7)   return { valor: String(dias),  unidad: dias  === 1 ? 'día'     : 'días'    };
  if (dias  < 30)  return { valor: String(sems),  unidad: sems  === 1 ? 'semana'  : 'semanas' };
  return             { valor: String(meses), unidad: meses === 1 ? 'mes'     : 'meses'   };
}

interface DocenteDashboardProps {
  onNavigate?: (view: string) => void;
}

type DocumentItem = {
  id: number;
  nombre: string;
  materia?: string;
  grupo?: string;
  tipo?: string;
  fecha?: string | null;
  status: string;
  resubmittedAt?: string | null;
  filePath?: string | null;
  submittedAt?: string | null;
};

type FormItem = {
  id: number;
  title: string;
  section: string;
  description?: string;
  is_active: boolean;
  due_at?: string | null;
  access_roles?: string[];
};

// --- Arreglo de banners para el carrusel con las imágenes importadas ---
const introBanners = [
  banner1,
  banner2,
  banner3,
  banner4,
];

// --- Componente del carrusel (solo las imágenes, sin ningún cuadro) ---
function AutoFadeBannerCarousel({ images, href, intervalMs = 4500 }: { images: string[]; href: string; intervalMs?: number }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="relative block h-48 w-full overflow-hidden rounded-2xl transition-transform duration-200 hover:scale-[1.01] sm:h-56"
    >
      {images.map((src, index) => (
        <img
          key={src}
          src={src}
          alt="Manual Docente"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </a>
  );
}

export function DocenteDashboard(props: Readonly<DocenteDashboardProps> = {}) {
  const { onNavigate } = props;
  const manualDocenteUrl = new URL("../../../assets/Manual de Usuario del Docente.pdf", import.meta.url).href;

  const { isReady, user } = useAuth();

  // --- Estado para el diálogo de vista previa ---
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // --------------------------------------------

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

  const [recentDocuments, setRecentDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  const [proximasEntregas, setProximasEntregas] = useState<any[]>([]);
  const [isLoadingProximas, setIsLoadingProximas] = useState(false);

  // --- Función para formatear fecha ---
  const formatDate = useCallback((dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  }, []);

  // --- Función para obtener la URL de previsualización ---
  const getPreviewUrl = useCallback((documentId: number) => {
    return getDocumentFileUrl(documentId);
  }, []);

  // --- Función para cargar la vista previa del documento ---
  const loadDocumentPreview = useCallback(async (doc: DocumentItem) => {
    if (!doc) return;
    
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewBlobUrl(null);
    
    try {
      const blob = await fetchDocumentBlob(Number(doc.id));
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPreviewBlobUrl(blobUrl);
    } catch (error: any) {
      setPreviewError(error?.message ?? "No fue posible abrir el documento");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // --- Función para recargar los datos manualmente ---
  const refreshData = useCallback(async () => {
    if (!isReady || !user) return;
    
    setIsLoadingStats(true);
    setIsLoadingDocuments(true);
    setIsLoadingProximas(true);
    
    try {
      // 1. Recargar estadísticas
      const dashboard = (await apiFetch('/dashboard/stats', { method: 'GET' })) as any;
      
      const statsArr = [
        {
          title: 'Documentos Pendientes',
          value: String(dashboard.documents_pending ?? 0),
          description: 'Pendientes de revisión',
          icon: Clock,
          action: 'historial',
          cardClass: 'bg-gradient-to-br from-slate-50 via-white to-slate-50/70 border-slate-200/70 dark:from-slate-900/55 dark:via-slate-950 dark:to-slate-950/20 dark:border-slate-700/70',
          accentClass: 'from-slate-400/35 via-slate-300/20 to-transparent',
        },
        {
          title: 'Documentos Aprobados',
          value: String(dashboard.documents_reviewed ?? 0),
          description: 'Este cuatrimestre',
          icon: CheckCircle2,
          action: 'historial',
          cardClass: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/80 border-emerald-200/70 dark:from-emerald-950/20 dark:via-slate-950 dark:to-emerald-950/25 dark:border-emerald-800/60',
          accentClass: 'from-emerald-400/35 via-emerald-300/20 to-transparent',
        },
        {
          title: 'En Revisión',
          value: String((dashboard.documents_total ?? 0) - (dashboard.documents_reviewed ?? 0) - (dashboard.documents_pending ?? 0)),
          description: 'En revisión',
          icon: AlertCircle,
          action: 'historial',
          cardClass: 'bg-gradient-to-br from-slate-50 via-white to-slate-50/70 border-slate-200/70 dark:from-slate-900/55 dark:via-slate-950 dark:to-slate-950/20 dark:border-slate-700/70',
          accentClass: 'from-slate-400/35 via-slate-300/20 to-transparent',
        },
      ];
      setStats(statsArr);

      // 2. Recargar documentos recientes con corrección de "undefined"
      const docsPayload = (await apiFetch('/documents?per_page=6', { method: 'GET' })) as any;
      const docs = (docsPayload?.data?.data ?? docsPayload?.data ?? []) as any[];
      
      setRecentDocuments(docs.map((d) => {
        const formTitle = (d?.form_title ?? d?.tipoLabel ?? d?.apartado_label ?? '').toString().trim();

        // Nombre de archivo tal cual lo subió el docente (último segmento del title, sin modificar)
        const titleStr = decodeURIComponent((d?.title ?? '').toString().trim());
        const lastSegment = titleStr.split(' - ').pop()?.trim() ?? titleStr;
        const fileName = lastSegment || 'Documento';
        const nombre = formTitle ? `${formTitle} - ${fileName}` : fileName;

        const rawMateria = (d?.materia ?? '').toString().trim();
        const materia = rawMateria && rawMateria !== 'Sin materia' ? rawMateria : '';

        const rawGrupo = (d?.grupo ?? d?.group_code ?? '').toString().trim();
        const grupo = rawGrupo && rawGrupo !== '-' ? rawGrupo : '';

        const fechaEnvio = d?.submitted_at ?? d?.fecha ?? d?.created_at ?? null;

        return {
          id: d.id,
          nombre,
          materia,
          grupo,
          tipo: formTitle || 'Documento',
          fecha: fechaEnvio,
          submittedAt: fechaEnvio,
          status: d.status ?? 'pendiente',
          resubmittedAt: d.resubmitted_at ?? null,
          filePath: d.file_path ?? d.filePath ?? null,
        };
      }));

      // 3. Recargar próximas entregas
      await loadProximasEntregas(docs);
      
    } catch (err) {
      console.error("Error al cargar el dashboard:", err);
    } finally {
      setIsLoadingStats(false);
      setIsLoadingDocuments(false);
      setIsLoadingProximas(false);
    }
  }, [isReady, user]);

  // --- Función separada para cargar próximas entregas ---
  const loadProximasEntregas = async (docs?: DocumentItem[]) => {
    try {
      setIsLoadingProximas(true);

      const userRoles = new Set((user?.roles ?? []).map(String));
      
      let allForms: FormItem[] = [];
      let formsLoaded = false;
      
      try {
        const formsPayload = await apiFetch('/forms', { method: 'GET' });
        allForms = (formsPayload?.data ?? []) as FormItem[];
        formsLoaded = true;
      } catch (formError) {
        console.error("❌ Error al cargar formularios:", formError);
      }

      const upcomingFromForms = formsLoaded && allForms.length > 0
        ? allForms
          .filter((form) => {
            const isActive = form.is_active === true;
            const hasDueDate = Boolean(form.due_at && form.due_at !== '');
            const isFuture = hasDueDate && new Date(form.due_at!) > new Date();
            const hasAccess = form.access_roles?.length ? form.access_roles.some((role) => userRoles.has(role)) : true;

            return isActive && hasDueDate && isFuture && hasAccess;
          })
          .map((form) => ({
            titulo: form.section?.trim() || form.title,
            detalle: form.title,
            fecha: form.due_at!,
            dias: Math.max(0, Math.ceil((new Date(form.due_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
          }))
          .sort((a, b) => a.dias - b.dias)
          .slice(0, 5)
        : [];

      if (upcomingFromForms.length === 0) {
        setProximasEntregas([
          {
            titulo: "No hay formularios próximos",
            fecha: "Sin fechas límite próximas",
            dias: 0,
            isPlaceholder: true,
          }
        ]);
      } else {
        setProximasEntregas(upcomingFromForms);
      }
      
    } catch (error) {
      console.error("❌ Error en loadProximasEntregas:", error);
      setProximasEntregas([
        {
          titulo: "No fue posible cargar los formularios",
          fecha: "Intenta de nuevo más tarde",
          dias: 0,
          isPlaceholder: true,
        }
      ]);
    } finally {
      setIsLoadingProximas(false);
    }
  };

  // --- Función para abrir el documento en el diálogo ---
  const openDocument = useCallback((doc: DocumentItem) => {
    setSelectedDocument(doc);
    loadDocumentPreview(doc);
  }, [loadDocumentPreview]);

  // --- Limpiar URL del blob al cerrar el diálogo ---
  const closePreview = useCallback(() => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setSelectedDocument(null);
  }, [previewBlobUrl]);
  // -----------------------------------------------------------

  // --- Efecto para cargar los datos del dashboard ---
  useEffect(() => {
    if (!isReady || !user) return;
    refreshData();
  }, [isReady, user]);

  // -----------------------------------------------------------

  return (
    <div className="relative z-0 space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-12 top-8 h-40 w-40 rounded-full bg-emerald-100/20 blur-3xl dark:bg-emerald-500/5" />
        <div className="absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-sky-100/10 blur-3xl dark:bg-sky-500/5" />
      </div>

      <div className="relative z-10">
        {/* Solo el carrusel de imágenes, sin ningún cuadro ni título */}
        <AutoFadeBannerCarousel images={introBanners} href={manualDocenteUrl} />

        {/* Stats cards */}
        <div className="relative z-10 mt-3 grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                className="cursor-pointer text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              >
                <Card className={`h-full overflow-hidden border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60 hover:shadow-md transition ${stat.cardClass}`}>
                  <div className={`h-1 bg-gradient-to-r ${stat.accentClass}`} />
                  <CardHeader className="flex flex-col items-start gap-3 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-xs font-semibold leading-tight text-foreground sm:text-sm dark:text-white">{stat.title}</CardTitle>
                    <div className="h-9 w-9 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/5 sm:h-10 sm:w-10">
                      {Icon ? <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden /> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl leading-none font-bold text-foreground dark:text-white sm:text-2xl">{stat.value}</div>
                    <p className="mt-1 text-[11px] leading-snug text-foreground/70 sm:text-xs dark:text-slate-400">{stat.description}</p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Documentos Recientes y Próximas Entregas */}
        <div className="relative z-10 mt-3 grid gap-6 xl:grid-cols-2">
          {/* Card de Documentos Recientes */}
          <Card className="overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">Documentos Recientes</CardTitle>
                  <CardDescription className="mt-1 text-slate-500 dark:text-slate-400">Últimos documentos enviados</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate?.("historial")} className="rounded-xl text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[24rem] space-y-3 overflow-x-hidden overflow-y-auto pr-2">
                {recentDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No tienes documentos enviados</p>
                  </div>
                ) : (
                  recentDocuments.map((doc) => {
                    const s = (doc.status ?? '').toLowerCase();
                    let docStatusVariant: "success" | "warning" | "outline" | "destructive" = "warning";
                    let docStatusLabel = "Pendiente";
                    let DocStatusIcon: React.ComponentType<{ className?: string }> = Clock2;

                    if (doc.resubmittedAt) {
                      docStatusVariant = "outline";
                      docStatusLabel = "Reenviado";
                      DocStatusIcon = RefreshCw;
                    } else if (s === "aprobado" || s === "revisado") {
                      docStatusVariant = "success";
                      docStatusLabel = "Revisado";
                      DocStatusIcon = CheckCircle2;
                    } else if (s === "devuelto") {
                      docStatusVariant = "destructive";
                      docStatusLabel = "Devuelto";
                      DocStatusIcon = Undo2;
                    } else if (s === "revision") {
                      docStatusVariant = "outline";
                      docStatusLabel = "En revisión";
                      DocStatusIcon = Clock2;
                    }

                    return (
                      <div
                        key={doc.id}
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-card/70 p-3 transition-colors hover:bg-accent/50 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:bg-slate-900"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{doc.nombre}</p>
                          {(doc.materia || doc.grupo) && (
                            <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                              {[doc.materia, doc.grupo].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {doc.fecha && (
                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-500">
                              {formatDate(doc.fecha)}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={docStatusVariant} className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 text-xs rounded-full dark:border-slate-700">
                            <DocStatusIcon className="h-3.5 w-3.5" />
                            {docStatusLabel}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 shrink-0 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                            onClick={() => openDocument(doc)}
                            aria-label="Ver documento"
                          >
                            <Eye className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card de Próximas Entregas */}
          <Card className="overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">Próximas Entregas</CardTitle>
                  <CardDescription className="mt-1 text-slate-500 dark:text-slate-400">Fechas límite importantes</CardDescription>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-300">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[24rem] space-y-3 overflow-x-hidden overflow-y-auto pr-2">
                {isLoadingProximas ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Cargando entregas...</p>
                    </div>
                  </div>
                ) : proximasEntregas.length === 0 || (proximasEntregas.length === 1 && proximasEntregas[0]?.isPlaceholder) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {proximasEntregas[0]?.titulo || "No hay entregas programadas"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {proximasEntregas[0]?.fecha || "Sin fecha límite"}
                    </p>
                  </div>
                ) : (
                  proximasEntregas.map((entrega, index) => {
                    if (entrega.isPlaceholder) {
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 p-3 dark:border-slate-700 dark:bg-slate-900/70"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{entrega.titulo}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{entrega.fecha}</p>
                          </div>
                        </div>
                      );
                    }

                    const diffMs = new Date(entrega.fecha).getTime() - Date.now();
                    const diffHrs = diffMs / 3_600_000;
                    const isUrgent = diffHrs < 24;
                    const isWarning = diffHrs >= 24 && diffHrs < 7 * 24;
                    const tiempoRestante = formatTiempoRestante(entrega.fecha);
                    const detalle = entrega.detalle ?? entrega.titulo;
                    const isGenericTitle = entrega.titulo?.trim().toLowerCase() === "docentes";
                    const tituloVisible = isGenericTitle ? "" : entrega.titulo;
                    
                    return (
                      <div
                        key={`${entrega.titulo}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 p-3 dark:border-slate-700 dark:bg-slate-900/70"
                      >
                        <div>
                          {tituloVisible && (
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{tituloVisible}</p>
                            </div>
                          )}
                          {detalle !== tituloVisible && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">{detalle}</p>
                          )}
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {new Date(entrega.fecha).toLocaleDateString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${
                            isUrgent ? "text-red-600 dark:text-red-400" :
                            isWarning ? "text-yellow-600 dark:text-yellow-400" :
                            "text-emerald-700 dark:text-emerald-300"
                          }`}>
                            {tiempoRestante.valor} {tiempoRestante.unidad}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">restantes</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo de vista previa del documento */}
      <Dialog open={Boolean(selectedDocument)} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col dark:bg-slate-950 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{selectedDocument?.nombre || "Documento"}</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="flex-1 min-h-0">
              {previewLoading ? (
                <div className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground dark:border-slate-700 dark:text-slate-400">
                  <p>Cargando...</p>
                </div>
              ) : previewError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                  {previewError}
                </div>
              ) : previewBlobUrl ? (
                <object data={previewBlobUrl} type="application/pdf" className="h-[82vh] w-full rounded-lg border border-border dark:border-slate-700">
                  <a href={previewBlobUrl} target="_blank" rel="noopener noreferrer" className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-primary underline dark:border-slate-700 dark:text-emerald-400">
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

export default DocenteDashboard;