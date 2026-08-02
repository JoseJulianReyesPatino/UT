import React, { useState, useEffect, useCallback } from "react";
import apiFetch from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useTourActive } from "../../context/TourContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { fetchDocumentBlob } from "../../lib/documents";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Eye,
} from "lucide-react";

import banner1 from "../../../assets/carrusel_web/carruselPC1.webp";
import banner2 from "../../../assets/carrusel_web/carruselPC2.webp";
import banner3 from "../../../assets/carrusel_web/carruselPC3.webp";
import banner4 from "../../../assets/carrusel_web/carruselPC4.webp";
import banner5 from "../../../assets/carrusel_web/carruselPC5.webp";
import banner6 from "../../../assets/carrusel_web/carruselPC6.webp";

import banner1Mobile from "../../../assets/carrusel_movil/carrusel1.webp";
import banner2Mobile from "../../../assets/carrusel_movil/carrusel2.webp";
import banner3Mobile from "../../../assets/carrusel_movil/carrusel3.webp";
import banner4Mobile from "../../../assets/carrusel_movil/carrusel4.webp";
import banner5Mobile from "../../../assets/carrusel_movil/carrusel5.webp";
import banner6Mobile from "../../../assets/carrusel_movil/carrusel6.png";

import { CarrerasLogoSlider } from "../../components/CarrerasLogoSlider";

// NUEVA VERSIÓN DE CACHÉ - esto resuelve el problema de raíz
const SESSION_KEY = 'docente-dashboard-cache-v2';

// Invalidar caché viejo automáticamente
try {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    const parsed = JSON.parse(existing);
    // Invalidar si falta icon o accent (shape anterior)
    if (parsed?.stats?.[0]?.icon !== undefined || !parsed?.stats?.[0]?.accent) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
} catch { 
  sessionStorage.removeItem(SESSION_KEY); 
}

// Limpiar también cualquier caché de versión anterior
try {
  const oldKeys = ['docente-dashboard-cache'];
  oldKeys.forEach(key => {
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
    }
  });
} catch {}

let dashboardCache: {
  stats: {
    title: string;
    value: string;
    description: string;
    icon: any;
    action?: string;
    accent: 'amber' | 'emerald' | 'slate';
  }[];
  recentDocuments: DocumentItem[];
  proximasEntregas: any[];
  timestamp: number;
} | null = null;

// Forzar limpieza de caché en memoria al recargar el módulo
// Esto solo afecta en desarrollo con HMR
if (import.meta.hot) {
  dashboardCache = null;
}

const STAT_ICONS = [Clock, CheckCircle2, AlertCircle];

const ACCENT = {
  amber:   { dot: "bg-amber-500",   value: "text-amber-700 dark:text-amber-400" },
  emerald: { dot: "bg-emerald-500", value: "text-emerald-700 dark:text-emerald-400" },
  slate:   { dot: "bg-slate-400",   value: "text-slate-600 dark:text-slate-300" },
} as const;

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

const introBanners = [banner1, banner2, banner3, banner4, banner5, banner6];
const introBannersMobile = [banner1Mobile, banner2Mobile, banner3Mobile, banner4Mobile, banner5Mobile, banner6Mobile];

function StatCardSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3 p-5">
          <div className="h-3 w-28 rounded-full bg-muted" />
          <div className="h-8 w-16 rounded-lg bg-muted" />
          <div className="h-3 w-32 rounded-full bg-muted" />
        </div>
      ))}
    </>
  );
}

function RecentDocsSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4">
          <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 rounded-full bg-muted" />
            <div className="h-4 w-2/3 rounded-full bg-muted" />
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
        <div key={i} className="flex animate-pulse items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 rounded-full bg-muted" />
            <div className="h-3 w-40 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AutoFadeBannerCarousel({ 
  images, 
  mobileImages, 
  links, 
  intervalMs = 4500 
}: { 
  images: string[]; 
  mobileImages?: string[];
  links?: (string | undefined)[];
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
        <div className="group relative block h-full w-full">
          {currentImages.map((src, index) => {
            const isActive = index === activeIndex;
            return (
              <img
                key={src}
                src={src}
                alt="Banner institucional"
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-in-out ${
                  isActive ? "opacity-100 group-hover:scale-[1.01]" : "opacity-0"
                } ${isMinimized ? "opacity-0" : ""}`}
                style={{ pointerEvents: "none" }}
              />
            );
          })}

          {!isMinimized && links?.[activeIndex] && (
            <a
              href={links[activeIndex]}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir documento"
              className="absolute inset-0 z-[6] block"
            />
          )}
        </div>

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
            
            {/* Dots / indicadores de paginación */}
            <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5">
              {currentImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveIndex(index); }}
                  aria-label={`Ir a la imagen ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex
                      ? "w-6 bg-emerald-400"
                      : "w-1.5 bg-white/50 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
        
        {isMinimized && (
          <div className="absolute inset-0 flex items-center gap-3 border-l-4 border-emerald-600 bg-slate-900/85 px-4 dark:bg-slate-950/90">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <p className="text-xs sm:text-sm font-medium text-white/90">
              Carrusel minimizado — clic en <span className="font-semibold text-white">Expandir</span> para verlo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const FAKE_STATS = [
  { title: "Documentos Pendientes", value: "2", description: "Pendientes de revisión", icon: Clock, action: "historial", accent: "amber" as const },
  { title: "Documentos Aprobados", value: "5", description: "Este cuatrimestre", icon: CheckCircle2, action: "historial", accent: "emerald" as const },
  { title: "En Revisión", value: "1", description: "Actualmente en proceso", icon: AlertCircle, action: "historial", accent: "slate" as const },
];

const FAKE_RECENT_DOCS: DocumentItem[] = [
  { id: 9801, nombre: "Planeación Didáctica — 1er Parcial", tipo: "Planeación Didáctica", fecha: "2026-07-10", status: "revisado" },
  { id: 9802, nombre: "Instrumento 40% — Programación Web", tipo: "Instrumento 40%", fecha: "2026-07-08", status: "pendiente" },
  { id: 9803, nombre: "Lista Concentrada — Cuatrimestre 2", tipo: "Lista Concentrada", fecha: "2026-07-05", status: "devuelto" },
];

export function DocenteDashboard(props: Readonly<DocenteDashboardProps> = {}) {
  const { onNavigate } = props;
  const manualDocenteUrl = new URL("../../../assets/manuales/Manual de Usuario del Docente.pdf", import.meta.url).href;
  const nomenclaturaUrl = new URL("../../../assets/manuales/Nomenclatura.pdf", import.meta.url).href;

  const bannerLinks: (string | undefined)[] = [manualDocenteUrl, nomenclaturaUrl];

  const { isReady, user } = useAuth();
  const { isDocenteTourActive } = useTourActive();

  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [stats, setStats] = useState<{
    title: string;
    value: string;
    description: string;
    icon: any;
    action?: string;
    accent: 'amber' | 'emerald' | 'slate';
  }[]>(() => (dashboardCache ?? readSessionCache())?.stats ?? []);
  const [isLoadingStats, setIsLoadingStats] = useState(() => !(dashboardCache ?? readSessionCache()));

  const [recentDocuments, setRecentDocuments] = useState<DocumentItem[]>(() => (dashboardCache ?? readSessionCache())?.recentDocuments ?? []);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(() => !(dashboardCache ?? readSessionCache()));

  const [proximasEntregas, setProximasEntregas] = useState<any[]>(() => (dashboardCache ?? readSessionCache())?.proximasEntregas ?? []);
  const [isLoadingProximas, setIsLoadingProximas] = useState(() => !(dashboardCache ?? readSessionCache()));

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
          accent: 'amber' as const,
        },
        {
          title: 'Documentos Aprobados',
          value: String(dashboard.documents_reviewed ?? 0),
          description: 'Este cuatrimestre',
          icon: CheckCircle2,
          action: 'historial',
          accent: 'emerald' as const,
        },
        {
          title: 'En Revisión',
          value: String((dashboard.documents_total ?? 0) - (dashboard.documents_reviewed ?? 0) - (dashboard.documents_pending ?? 0)),
          description: 'Actualmente en proceso',
          icon: AlertCircle,
          action: 'historial',
          accent: 'slate' as const,
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
    const hasCache = Boolean(dashboardCache ?? readSessionCache());
    refreshData(!hasCache);
  }, [isReady, user]);

  // Obtener nombre del usuario
  const nombreUsuario = (user?.name ?? (user as any)?.nombre ?? (user as any)?.first_name ?? 'Docente').toString().split(' ')[0];

  // Formatear fecha
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const fechaCapitalizada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Saludo y fecha */}
      <div className="px-1">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white sm:text-2xl">
          Hola, {nombreUsuario}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hoy es {fechaCapitalizada}
        </p>
      </div>

      {/* Carrusel con imágenes responsive */}
      <AutoFadeBannerCarousel 
        images={introBanners} 
        mobileImages={introBannersMobile}
        links={bannerLinks}
      />

      {/* Mensaje de error de carga */}
      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>{loadError}</p>
        </div>
      )}

      {/* ============ VERSIÓN MOBILE — una sola superficie, contenido en texto ============ */}
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60 sm:hidden">
        <div className="h-[3px] bg-emerald-600 dark:bg-emerald-500" />

        <div className="p-4">
          {/* Stats en línea de texto */}
          <div data-tour="docente-dashboard-stats" className="flex items-stretch divide-x divide-emerald-600/15 dark:divide-emerald-400/20">
            {!isDocenteTourActive && isLoadingStats ? (
              <div className="flex w-full animate-pulse justify-between gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex-1 space-y-2">
                    <div className="h-2.5 w-14 rounded-full bg-muted" />
                    <div className="h-6 w-8 rounded-lg bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              (isDocenteTourActive ? FAKE_STATS : stats).map((stat, i) => {
                const a = ACCENT[stat.accent] ?? ACCENT.slate;
                return (
                  <button
                    key={stat.title}
                    type="button"
                    onClick={() => onNavigate && stat.action && onNavigate(stat.action)}
                    className={`min-w-0 flex-1 text-left ${i > 0 ? "pl-2.5" : ""} ${i < 2 ? "pr-2.5" : ""}`}
                  >
                    <p className="flex items-center gap-1 text-[8px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                      <span className="truncate">{stat.title}</span>
                    </p>
                    <p className={`mt-1 text-xl font-semibold tabular-nums leading-none ${a.value}`}>
                      {stat.value}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Documentos recientes — lista de texto */}
          <div className="mt-5 border-t border-emerald-600/15 pt-4 dark:border-emerald-400/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Documentos Recientes</h3>
              <button
                type="button"
                onClick={() => onNavigate?.("historial")}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400"
              >
                Ver todos
              </button>
            </div>

            <div className="mt-1 divide-y divide-emerald-600/15 dark:divide-emerald-400/20">
              {(!isDocenteTourActive && isLoadingDocuments) ? (
                <RecentDocsSkeleton />
              ) : (!isDocenteTourActive && recentDocuments.length === 0) ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No tienes documentos enviados</p>
              ) : (
                (isDocenteTourActive ? FAKE_RECENT_DOCS : recentDocuments).slice(0, 6).map((doc) => {
                  const s = (doc.status ?? '').toLowerCase();
                  let dot = "bg-amber-500";
                  let label = "Pendiente";
                  if (doc.resubmittedAt) { dot = "bg-slate-400"; label = "Reenviado"; }
                  else if (s === "aprobado" || s === "revisado") { dot = "bg-emerald-500"; label = "Revisado"; }
                  else if (s === "devuelto") { dot = "bg-red-500"; label = "Devuelto"; }
                  else if (s === "revision") { dot = "bg-slate-400"; label = "En revisión"; }

                  const fileNameOnly = doc.nombre.includes(' - ')
                    ? doc.nombre.split(' - ').slice(1).join(' - ')
                    : doc.nombre;

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => openDocument(doc)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-400/80">
                          {doc.tipo}
                        </p>
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-white">
                          {fileNameOnly}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500">
                          {doc.fecha ? formatDate(doc.fecha) : ""}{doc.fecha ? " · " : ""}{label}
                        </p>
                      </div>
                      <Eye className="h-4 w-4 shrink-0 text-emerald-700/70 dark:text-emerald-400/70" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Próximas entregas — lista de texto */}
          <div className="mt-1 border-t border-emerald-600/15 pt-4 dark:border-emerald-400/20">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Próximas Entregas</h3>

            <div className="mt-1 divide-y divide-emerald-600/15 dark:divide-emerald-400/20">
              {isLoadingProximas ? (
                <ProximasSkeleton />
              ) : proximasEntregas.length === 0 || (proximasEntregas.length === 1 && proximasEntregas[0]?.isPlaceholder) ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {proximasEntregas[0]?.titulo || "No hay entregas programadas"}
                </p>
              ) : (
                proximasEntregas.filter((e) => !e.isPlaceholder).map((entrega, index) => {
                  const fecha = new Date(entrega.fecha);
                  const mes = fecha.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
                  const dia = fecha.getDate();
                  const diffMs = new Date(entrega.fecha).getTime() - Date.now();
                  const diffHrs = diffMs / 3_600_000;
                  const isUrgent = diffHrs < 24;
                  const isWarning = diffHrs >= 24 && diffHrs < 7 * 24;
                  const tiempoRestante = formatTiempoRestante(entrega.fecha);
                  const isGenericTitle = entrega.titulo?.trim().toLowerCase() === "docentes";
                  const tituloVisible = isGenericTitle ? entrega.detalle : entrega.titulo;

                  return (
                    <div key={`${entrega.titulo}-${index}`} className="flex items-center gap-3 py-3">
                      <span className={`shrink-0 text-xs font-semibold uppercase ${
                        isUrgent ? "text-red-600 dark:text-red-400" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                      }`}>
                        {mes} {dia}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                        {tituloVisible}
                      </p>
                      <span className={`shrink-0 text-xs font-medium ${
                        isUrgent ? "text-red-600 dark:text-red-400" :
                        isWarning ? "text-amber-600 dark:text-amber-400" :
                        "text-emerald-700 dark:text-emerald-300"
                      }`}>
                        {tiempoRestante.valor} {tiempoRestante.unidad}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ VERSIÓN DESKTOP/TABLET — panel con cajas (sin cambios) ============ */}
      <div className="hidden overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60 sm:mt-5 sm:block">
        <div className="h-[3px] bg-emerald-600 dark:bg-emerald-500" />

        <div
          data-tour="docente-dashboard-stats"
          className="grid grid-cols-1 divide-y divide-emerald-600/15 dark:divide-emerald-400/20 sm:grid-cols-3 sm:divide-y-0 sm:divide-x"
        >
          {!isDocenteTourActive && isLoadingStats ? (
            <StatCardSkeleton />
          ) : (
            (isDocenteTourActive ? FAKE_STATS : stats).map((stat) => {
              const a = ACCENT[stat.accent] ?? ACCENT.slate;
              return (
                <button
                  key={stat.title}
                  type="button"
                  onClick={() => onNavigate && stat.action && onNavigate(stat.action)}
                  className="flex flex-col gap-2 p-5 text-left transition-colors hover:bg-accent/30 dark:hover:bg-slate-900/60"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-slate-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
                    {stat.title}
                  </span>
                  <span className={`text-3xl font-semibold tabular-nums leading-none ${a.value}`}>
                    {stat.value}
                  </span>
                  <p className="text-[11px] leading-snug text-muted-foreground dark:text-slate-500">
                    {stat.description}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="grid divide-y divide-emerald-600/15 border-t border-emerald-600/15 dark:divide-emerald-400/20 dark:border-emerald-400/20 lg:grid-cols-[1fr_320px] lg:divide-y-0 lg:divide-x">
          <div data-tour="docente-dashboard-recent" className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Documentos Recientes</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Últimos documentos enviados</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.("historial")}
                className="shrink-0 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Ver todos
              </button>
            </div>

            <div className="thin-scroll mt-4 max-h-[60vh] overflow-x-hidden overflow-y-auto pr-1 sm:max-h-[22rem]">
              {(!isDocenteTourActive && isLoadingDocuments) ? (
                <RecentDocsSkeleton />
              ) : (!isDocenteTourActive && recentDocuments.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No tienes documentos enviados</p>
                </div>
              ) : (
                (isDocenteTourActive ? FAKE_RECENT_DOCS : recentDocuments).map((doc, i, arr) => {
                  const s = (doc.status ?? '').toLowerCase();
                  let dot = "bg-amber-500";
                  let label = "Pendiente";
                  if (doc.resubmittedAt) { dot = "bg-slate-400"; label = "Reenviado"; }
                  else if (s === "aprobado" || s === "revisado") { dot = "bg-emerald-500"; label = "Revisado"; }
                  else if (s === "devuelto") { dot = "bg-red-500"; label = "Devuelto"; }
                  else if (s === "revision") { dot = "bg-slate-400"; label = "En revisión"; }

                  const fileNameOnly = doc.nombre.includes(' - ')
                    ? doc.nombre.split(' - ').slice(1).join(' - ')
                    : doc.nombre;
                  const isLast = i === arr.length - 1;

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => openDocument(doc)}
                      className="group relative flex w-full gap-4 pb-5 text-left last:pb-0"
                    >
                      {!isLast && (
                        <span className="absolute left-[6.5px] top-4 bottom-0 w-px bg-emerald-600/20 dark:bg-emerald-400/25" />
                      )}
                      <span className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-card dark:ring-slate-950 ${dot}`} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700/80 dark:text-emerald-400/80">
                              {doc.tipo}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-medium text-slate-800 dark:text-white">
                              {fileNameOnly}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">
                              {doc.fecha ? formatDate(doc.fecha) : ""}
                              {doc.fecha ? " · " : ""}{label}
                            </p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 opacity-70 transition-opacity group-hover:opacity-100 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Ver</span>
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div data-tour="docente-dashboard-upcoming" className="p-5 sm:p-6">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Próximas Entregas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fechas límite importantes</p>

            <div className="thin-scroll mt-4 max-h-[60vh] overflow-x-hidden overflow-y-auto pr-1 sm:max-h-[22rem]">
              {isLoadingProximas ? (
                <ProximasSkeleton />
              ) : proximasEntregas.length === 0 || (proximasEntregas.length === 1 && proximasEntregas[0]?.isPlaceholder) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-600" />
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
                      <div key={index} className="border-b border-emerald-600/15 pb-3 last:border-0 last:pb-0 dark:border-emerald-400/20">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{entrega.titulo}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{entrega.fecha}</p>
                      </div>
                    );
                  }

                  const fecha = new Date(entrega.fecha);
                  const mes = fecha.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
                  const dia = fecha.getDate();

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
                      className="flex items-center gap-3 border-b border-emerald-600/15 py-3 first:pt-0 last:border-0 last:pb-0 dark:border-emerald-400/20"
                    >
                      <div className="flex shrink-0 flex-col items-center leading-none">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                          isUrgent ? "text-red-600 dark:text-red-400" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                        }`}>
                          {mes}
                        </span>
                        <span className="text-lg font-semibold text-slate-800 dark:text-white">{dia}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        {tituloVisible && (
                          <p className="truncate text-sm font-medium capitalize text-slate-800 dark:text-slate-200">{tituloVisible}</p>
                        )}
                        {detalle !== tituloVisible && (
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{detalle}</p>
                        )}
                      </div>

                      <p className={`shrink-0 text-xs font-medium ${
                        isUrgent ? "text-red-600 dark:text-red-400" :
                        isWarning ? "text-amber-600 dark:text-amber-400" :
                        "text-emerald-700 dark:text-emerald-300"
                      }`}>
                        {tiempoRestante.valor} {tiempoRestante.unidad}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slider infinito de logos institucionales */}
      <div data-tour="docente-dashboard-carreras">
        <CarrerasLogoSlider />
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