import React, { useState, useEffect, useCallback } from "react";
import apiFetch from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
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
// Imágenes para desktop
import banner1 from "../../../assets/123.png";
import banner2 from "../../../assets/carruselPC1.jpg";
import banner3 from "../../../assets/carruselPC2.jpg";
import banner4 from "../../../assets/carruselPC3.jpg";
import banner5 from "../../../assets/123.png";

// Imágenes para móvil (versiones optimizadas)
// Si no tienes versiones específicas para móvil, usa las mismas
import banner1Mobile from "../../../assets/carrusel1.png";
import banner2Mobile from "../../../assets/carrusel2.png";
import banner3Mobile from "../../../assets/carrusel3.png";
import banner4Mobile from "../../../assets/carrusel4.png";
import banner5Mobile from "../../../assets/carrusel5.png";

// --- Importar logos para el slider ---
import { CarrerasLogoSlider } from "../../components/CarrerasLogoSlider";
// Agrega más logos aquí si tienes otros
// import logoOtro from "../../../assets/OtroLogo.png";

// --- Caché en memoria compartida ---
let dashboardCache: {
  stats: {
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
  }[];
  recentDocuments: DocumentItem[];
  proximasEntregas: any[];
  timestamp: number;
} | null = null;

// --- Caché en sessionStorage (sobrevive recarga de página) ---
const SESSION_KEY = 'docente-dashboard-cache';

// Limpiar entradas corruptas de versiones anteriores (iconos serializados como {})
try {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    const parsed = JSON.parse(existing);
    if (parsed?.stats?.[0]?.icon !== undefined) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
} catch { sessionStorage.removeItem(SESSION_KEY); }

// Los iconos de Lucide son objetos forwardRef y no son serializables a JSON.
// Los guardamos por índice y los re-adjuntamos al leer de sessionStorage.
const STAT_ICONS = [Clock, CheckCircle2, AlertCircle];

const readSessionCache = (): typeof dashboardCache => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.stats) {
      parsed.stats = parsed.stats.map((s: any, i: number) => ({
        ...s,
        icon: STAT_ICONS[i] ?? Clock,
      }));
    }
    return parsed;
  } catch { return null; }
};
const writeSessionCache = (data: typeof dashboardCache) => {
  try {
    if (!data) return;
    // Guardar sin los iconos (funciones/objetos no serializables)
    const serializable = {
      ...data,
      stats: data.stats.map(({ icon: _icon, ...rest }) => rest),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
  } catch {}
};

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

// --- Arreglo de banners ---
const introBanners = [banner1, banner2, banner3, banner4, banner5];
const introBannersMobile = [banner1Mobile, banner2Mobile, banner3Mobile, banner4Mobile, banner5Mobile];

// --- Arreglo de logos para el slider (duplicados para efecto continuo) ---

// --- Skeletons de carga ---
function StatCardSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
          <div className="h-1 bg-muted" />
          <div className="flex flex-col items-start gap-3 px-4 pb-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-4 w-36 rounded-full bg-muted" />
            <div className="h-9 w-9 rounded-xl bg-muted sm:h-10 sm:w-10" />
          </div>
          <div className="space-y-2 px-4 pb-4 pt-0">
            <div className="h-8 w-10 rounded-lg bg-muted" />
            <div className="h-3 w-32 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </>
  );
}

function RecentDocsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 dark:border-slate-700 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-muted" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <div className="h-3 w-20 rounded-full bg-muted" />
              <div className="h-4 w-2/3 rounded-full bg-muted" />
              <div className="h-3 w-28 rounded-full bg-muted" />
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
            <div className="h-6 w-24 rounded-full bg-muted" />
            <div className="h-9 w-9 rounded-xl bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProximasSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 p-3 dark:border-slate-700 dark:bg-slate-900/70">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded-full bg-muted" />
            <div className="h-3 w-44 rounded-full bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-14 rounded-full bg-muted ml-auto" />
            <div className="h-3 w-12 rounded-full bg-muted ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Componente del carrusel con imágenes responsive ---
function AutoFadeBannerCarousel({ 
  images, 
  mobileImages, 
  href, 
  intervalMs = 4500 
}: { 
  images: string[]; 
  mobileImages?: string[];
  href: string; 
  intervalMs?: number 
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(() => {
    try { return localStorage.getItem("carousel_minimized") === "true"; } catch { return false; }
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [imageLoaded, setImageLoaded] = useState(() => {
    const firstSrc = (window.innerWidth < 640 && mobileImages?.length) ? mobileImages[0] : images[0];
    if (!firstSrc) return true;
    try { const img = new Image(); img.src = firstSrc; return img.complete; } catch { return false; }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  const goPrev = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };

  const goNext = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex((current) => (current + 1) % images.length);
  };

  const toggleMinimize = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const next = !isMinimized;
    setIsMinimized(next);
    try { localStorage.setItem("carousel_minimized", String(next)); } catch {}
  };

  const currentImages = (isMobile && mobileImages && mobileImages.length > 0) ? mobileImages : images;

  if (!imageLoaded) {
    return (
      <div className="relative w-full">
        <div className="w-full animate-pulse rounded-2xl bg-muted aspect-[1852/849] sm:aspect-[5375/934]" />
        <img
          src={currentImages[0]}
          alt=""
          aria-hidden="true"
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl transition-all duration-300 ease-in-out">
      <div 
        className={`relative w-full overflow-hidden rounded-2xl transition-all duration-300 ease-in-out ${
          isMinimized
            ? 'h-14 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/40 dark:border-emerald-800/40'
            : 'aspect-[1852/849] sm:aspect-[5375/934]'
        }`}
      >
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`relative block h-full w-full transition-transform duration-200 ${
            !isMinimized ? 'hover:scale-[1.01]' : ''
          }`}
        >
          {currentImages.map((src, index) => (
            <img
              key={src}
              src={src}
              alt="Manual Docente"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                index === activeIndex ? "opacity-100" : "opacity-0"
              } ${isMinimized ? 'opacity-0' : ''}`}
            />
          ))}
        </a>

        {/* Botón de minimizar/expandir */}
        <button
          type="button"
          onClick={toggleMinimize}
          aria-label={isMinimized ? "Expandir carrusel" : "Minimizar carrusel"}
          className={`absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 ${
            isMinimized 
              ? 'bg-emerald-600/90 hover:bg-emerald-700/90 dark:bg-emerald-500/90 dark:hover:bg-emerald-600/90' 
              : 'bg-black/50 hover:bg-black/70'
          }`}
        >
          {isMinimized ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Expandir</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M5 15l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Minimizar</span>
            </>
          )}
        </button>

        {/* Flechas de navegación */}
        {currentImages.length > 1 && !isMinimized && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Imagen anterior"
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/60 sm:left-4 sm:h-10 sm:w-10"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Imagen siguiente"
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/60 sm:right-4 sm:h-10 sm:w-10"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}

        {/* Estado minimizado - Diseño mejorado con texto semitransparente */}
        {isMinimized && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="flex flex-col items-center gap-1">
              {/* Icono decorativo */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100/70 dark:bg-emerald-900/50">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M8 8h8M8 12h6M8 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              {/* Texto semitransparente con mensaje institucional */}
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600/80 dark:text-slate-300/80">
                  Carrusel minimizado
                </p>
                <p className="text-xs text-slate-500/60 dark:text-slate-400/60">
                  Haz clic en <span className="font-medium text-emerald-600/80 dark:text-emerald-400/80">Expandir</span> para ver las imágenes
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Componente del slider infinito de logos ---

export function DocenteDashboard(props: Readonly<DocenteDashboardProps> = {}) {
  const { onNavigate } = props;
  const manualDocenteUrl = new URL("../../../assets/Manual de Usuario del Docente.pdf", import.meta.url).href;

  const { isReady, user } = useAuth();

  // --- Estado para el diálogo de vista previa ---
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // --- Estado para errores de carga ---
  const [loadError, setLoadError] = useState<string | null>(null);

  // Combina caché de memoria (navegación) y sessionStorage (recarga de página)
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
  }[]>(() => (dashboardCache ?? readSessionCache())?.stats ?? []);
  const [isLoadingStats, setIsLoadingStats] = useState(() => !(dashboardCache ?? readSessionCache()));

  const [recentDocuments, setRecentDocuments] = useState<DocumentItem[]>(() => (dashboardCache ?? readSessionCache())?.recentDocuments ?? []);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(() => !(dashboardCache ?? readSessionCache()));

  const [proximasEntregas, setProximasEntregas] = useState<any[]>(() => (dashboardCache ?? readSessionCache())?.proximasEntregas ?? []);
  const [isLoadingProximas, setIsLoadingProximas] = useState(() => !(dashboardCache ?? readSessionCache()));

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
  // showLoading=false cuando ya hay datos en caché: refresca en silencio sin mostrar skeletons
  const refreshData = useCallback(async (showLoading = true) => {
    if (!isReady || !user) return;

    if (showLoading) {
      setIsLoadingStats(true);
      setIsLoadingDocuments(true);
      setIsLoadingProximas(true);
    }
    setLoadError(null);
    
    try {
      const [dashboardResult, docsPayloadResult, formsResult] = await Promise.allSettled([
        apiFetch('/dashboard/stats', { method: 'GET' }) as Promise<any>,
        apiFetch('/documents?per_page=6', { method: 'GET' }) as Promise<any>,
        apiFetch('/forms', { method: 'GET' }) as Promise<any>,
      ]);

      const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value : {};
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
          description: 'Actualmente en proceso',
          icon: AlertCircle,
          action: 'historial',
          cardClass: 'bg-gradient-to-br from-slate-50 via-white to-slate-50/70 border-slate-200/70 dark:from-slate-900/55 dark:via-slate-950 dark:to-slate-950/20 dark:border-slate-700/70',
          accentClass: 'from-slate-400/35 via-slate-300/20 to-transparent',
        },
      ];
      setStats(statsArr);
      setIsLoadingStats(false);

      const docsPayload = docsPayloadResult.status === 'fulfilled' ? docsPayloadResult.value : null;
      const docs = (docsPayload?.data?.data ?? docsPayload?.data ?? []) as any[];

      const mappedDocs = docs.map((d) => {
        const formTitle = (d?.form_title ?? d?.tipoLabel ?? d?.apartado_label ?? '').toString().trim();
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
      });
      setRecentDocuments(mappedDocs);
      setIsLoadingDocuments(false);

      const userRoles = new Set((user?.roles ?? []).map(String));
      const allForms = (formsResult.status === 'fulfilled' ? formsResult.value?.data : []) as FormItem[] ?? [];

      const upcomingFromForms = allForms.length > 0
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

      const nextProximas = upcomingFromForms.length > 0
        ? upcomingFromForms
        : [{ titulo: "No hay formularios próximos", fecha: "Sin fechas límite próximas", dias: 0, isPlaceholder: true }];

      setProximasEntregas(nextProximas);
      setIsLoadingProximas(false);

      const anyFailed = [dashboardResult, docsPayloadResult, formsResult].some((r) => r.status === 'rejected');
      if (anyFailed) {
        setLoadError('Algunos datos no se pudieron actualizar. Mostrando la última información disponible.');
      }

      const newCache = {
        stats: statsArr,
        recentDocuments: mappedDocs,
        proximasEntregas: nextProximas,
        timestamp: Date.now(),
      };
      dashboardCache = newCache;
      writeSessionCache(newCache);

    } catch (err) {
      setLoadError('No fue posible actualizar la información del panel. Intenta de nuevo en unos momentos.');
      setIsLoadingStats(false);
      setIsLoadingDocuments(false);
      setIsLoadingProximas(false);
    }
  }, [isReady, user]);

  const openDocument = useCallback((doc: DocumentItem) => {
    setSelectedDocument(doc);
    loadDocumentPreview(doc);
  }, [loadDocumentPreview]);

  const closePreview = useCallback(() => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setSelectedDocument(null);
  }, [previewBlobUrl]);

  useEffect(() => {
    if (!isReady || !user) return;
    // Si ya hay datos (memoria o sessionStorage), refresca en silencio sin skeletons
    const hasCache = Boolean(dashboardCache ?? readSessionCache());
    refreshData(!hasCache);
  }, [isReady, user]);

  return (
    <div className="relative z-0 space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-12 top-8 h-40 w-40 rounded-full bg-emerald-100/20 blur-3xl dark:bg-emerald-500/5" />
        <div className="absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-sky-100/10 blur-3xl dark:bg-sky-500/5" />
      </div>

      <div className="relative z-10">
        {/* Carrusel con imágenes responsive */}
        <AutoFadeBannerCarousel 
          images={introBanners} 
          mobileImages={introBannersMobile}
          href={manualDocenteUrl} 
        />

        {/* Mensaje de error de carga */}
        {loadError && (
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>{loadError}</p>
          </div>
        )}

        {/* Stats cards */}
        <div data-tour="docente-dashboard-stats" className="relative z-10 mt-3 grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoadingStats ? (
            <StatCardSkeleton />
          ) : (
            stats.map((stat) => {
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
            })
          )}
        </div>

        {/* Documentos Recientes y Próximas Entregas */}
        <div className="relative z-10 mt-3 grid gap-6 xl:grid-cols-2">
          {/* Card de Documentos Recientes */}
          <Card data-tour="docente-dashboard-recent" className="overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
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
              <div className="max-h-[60vh] space-y-3 overflow-x-hidden overflow-y-auto pr-2 sm:max-h-[24rem]">
                {isLoadingDocuments ? (
                  <RecentDocsSkeleton />
                ) : recentDocuments.length === 0 ? (
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

                    const fileNameOnly = doc.nombre.includes(' - ')
                      ? doc.nombre.split(' - ').slice(1).join(' - ')
                      : doc.nombre;

                    return (
                      <div
                        key={doc.id}
                        className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 transition-colors hover:bg-accent/50 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:bg-slate-900 sm:flex-row sm:items-center sm:gap-3"
                      >
                        <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                              {doc.tipo}
                            </p>
                            <p className="break-words text-sm font-semibold text-slate-800 dark:text-white sm:truncate">
                              {fileNameOnly}
                            </p>
                            {doc.fecha && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-500">
                                {formatDate(doc.fecha)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
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
          <Card data-tour="docente-dashboard-upcoming" className="overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
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
              <div className="max-h-[60vh] space-y-3 overflow-x-hidden overflow-y-auto pr-2 sm:max-h-[24rem]">
                {isLoadingProximas ? (
                  <ProximasSkeleton />
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
                              <p className="text-sm font-semibold capitalize text-emerald-700 dark:text-emerald-400">{tituloVisible}</p>
                            </div>
                          )}
                          {detalle !== tituloVisible && (
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{detalle}</p>
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

        {/* Slider infinito de logos institucionales */}
        <div data-tour="docente-dashboard-carreras">
          <CarrerasLogoSlider />
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