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
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from "../../lib/env";
import { getDocumentDisplayFileName, fetchDocumentBlob } from "../../lib/documents";
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
  Eye,
  RefreshCw,
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

type DocumentItem = {
  id: number;
  nombre: string;
  materia?: string;
  tipo?: string;
  fecha?: string | null;
  status: string;
  filePath?: string | null;
  submittedAt?: string | null;  // ← NUEVO: fecha de envío
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

export function DocenteDashboard(props: Readonly<DocenteDashboardProps> = {}) {
  const { onNavigate } = props;
  const manualDocenteUrl = new URL("../../../assets/Manual de Usuario del Docente.pdf", import.meta.url).href;
  const [isIntroOpen, setIsIntroOpen] = useState(true);

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
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${baseUrl}/api/documents/${documentId}/file`;
  }, []);

  // --- Función para cargar la vista previa del documento ---
  const loadDocumentPreview = useCallback(async (doc: DocumentItem) => {
    if (!doc) return;
    
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewBlobUrl(null);
    
    try {
      const blob = await fetchDocumentBlob(Number(doc.id));
      const blobUrl = URL.createObjectURL(blob);
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
          cardClass: 'border-slate-200/80 bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-slate-950',
          accentClass: 'from-emerald-500 via-emerald-400 to-emerald-300',
        },
        {
          title: 'Documentos Aprobados',
          value: String(dashboard.documents_reviewed ?? 0),
          description: 'Este cuatrimestre',
          icon: CheckCircle2,
          action: 'historial',
          cardClass: 'border-slate-200/80 bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-slate-950',
          accentClass: 'from-emerald-500 via-emerald-400 to-emerald-300',
        },
        {
          title: 'En Revisión',
          value: String((dashboard.documents_total ?? 0) - (dashboard.documents_reviewed ?? 0) - (dashboard.documents_pending ?? 0)),
          description: 'En revisión',
          icon: AlertCircle,
          action: 'historial',
          cardClass: 'border-slate-200/80 bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-slate-950',
          accentClass: 'from-emerald-500 via-emerald-400 to-emerald-300',
        },
      ];
      setStats(statsArr);

      // 2. Recargar documentos recientes con corrección de "undefined"
      const docsPayload = (await apiFetch('/documents?per_page=6', { method: 'GET' })) as any;
      const docs = (docsPayload?.data?.data ?? docsPayload?.data ?? []) as any[];
      
      setRecentDocuments(docs.map((d) => {
        // Resolver el título correctamente (evita "undefined")
        const title = (d?.nombre ?? d?.title ?? "").toString().trim();
        let nombre = title;
        
        // Si el título es "undefined" o está vacío, usar el nombre del archivo
        if (!nombre || /^undefined\b/i.test(nombre)) {
          nombre = getDocumentDisplayFileName(d?.title, d?.filePath) || 'Documento';
        }
        
        // Obtener la fecha correcta (submitted_at o fecha)
        const fechaEnvio = d?.submitted_at ?? d?.fecha ?? d?.created_at ?? null;
        
        return {
          id: d.id,
          nombre: nombre,
          materia: d.materia ?? d?.carrera_label ?? '-',
          tipo: d.tipoLabel ?? d.apartado_label ?? d.form_title ?? 'Documento',
          fecha: fechaEnvio,
          submittedAt: fechaEnvio,
          status: d.status ?? 'pendiente',
          filePath: d.filePath ?? null,
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
      
      let documents = docs;
      if (!documents) {
        const docsPayload = (await apiFetch('/documents?per_page=100', { method: 'GET' })) as any;
        documents = (docsPayload?.data?.data ?? docsPayload?.data ?? []) as DocumentItem[];
      }

      const userRoles = user?.roles ?? [];
      
      let allForms: FormItem[] = [];
      let formsLoaded = false;
      
      try {
        const formsPayload = await apiFetch('/forms', { method: 'GET' });
        allForms = (formsPayload?.data ?? []) as FormItem[];
        formsLoaded = true;
        console.log("📋 Total formularios cargados:", allForms.length);
        console.log("📋 Formularios activos:", allForms.filter(f => f.is_active).length);
      } catch (formError) {
        console.error("❌ Error al cargar formularios:", formError);
      }

      let upcomingFromForms: any[] = [];
      
      if (formsLoaded && allForms.length > 0) {
        console.log("🔍 Roles del usuario:", userRoles);
        
        upcomingFromForms = allForms
          .filter((form) => {
            const isActive = form.is_active === true;
            const hasDueDate = form.due_at && form.due_at !== null && form.due_at !== '';
            const isFuture = hasDueDate && new Date(form.due_at!) > new Date();
            const hasAccess = form.access_roles?.some((role) => userRoles.includes(role)) ?? false;
            
            if (isActive && hasDueDate) {
              console.log(`  📄 ${form.title}: activo=${isActive}, dueDate=${form.due_at}, futuro=${isFuture}, acceso=${hasAccess}`);
            }
            
            return isActive && hasDueDate && isFuture && hasAccess;
          })
          .map((form) => ({
            titulo: form.title,
            fecha: form.due_at!,
            dias: Math.max(0, Math.ceil((new Date(form.due_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
            source: 'formulario',
          }))
          .sort((a, b) => a.dias - b.dias)
          .slice(0, 10);
          
        console.log("📅 Entregas desde formularios:", upcomingFromForms.length);
      }

      const pendingDocuments = (documents || [])
        .filter((d) => d.status === 'pendiente' && d.fecha)
        .map((d) => ({
          titulo: d.nombre ?? 'Documento',
          fecha: d.fecha!,
          dias: Math.max(0, Math.ceil((new Date(d.fecha!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
          source: 'documento',
        }))
        .sort((a, b) => a.dias - b.dias)
        .slice(0, 5);

      console.log("📄 Entregas desde documentos:", pendingDocuments.length);

      let combined = [...upcomingFromForms];
      
      if (combined.length < 5 && pendingDocuments.length > 0) {
        const remaining = 5 - combined.length;
        const docsToAdd = pendingDocuments
          .filter(p => !combined.some(c => c.titulo === p.titulo))
          .slice(0, remaining);
        combined = [...combined, ...docsToAdd];
      }

      if (combined.length === 0) {
        setProximasEntregas([
          {
            titulo: "No hay entregas programadas",
            fecha: "Sin fecha límite",
            dias: 0,
            isPlaceholder: true,
          }
        ]);
      } else {
        combined.sort((a, b) => a.dias - b.dias);
        setProximasEntregas(combined.slice(0, 5));
      }
      
    } catch (error) {
      console.error("❌ Error en loadProximasEntregas:", error);
      setProximasEntregas([
        {
          titulo: "Error al cargar datos",
          fecha: "Intenta de nuevo",
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
    <div className="relative z-0 space-y-8 overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 backdrop-blur-xl pb-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800/60 dark:bg-slate-950/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-10 top-8 h-44 w-44 rounded-[2rem] bg-emerald-100/25 blur-[120px] dark:bg-emerald-500/8" />
        <div className="absolute left-[8%] top-[34%] h-40 w-40 rounded-[2rem] bg-sky-100/18 blur-[120px] dark:bg-sky-500/8" />
        <div className="absolute -left-12 bottom-0 h-56 w-56 rounded-[2rem] bg-emerald-200/18 blur-[140px] dark:bg-emerald-600/8" />
      </div>

      <div className="relative z-10">
        <Card className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800/70 dark:bg-slate-950/60">
          <CardContent className="space-y-5 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-white">Antes de comenzar</h2>
                {!isIntroOpen && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
                className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 text-emerald-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800"
              >
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isIntroOpen ? "rotate-180" : "rotate-0"}`} />
              </Button>
            </div>

            {isIntroOpen && (
              <div className="rounded-[22px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-emerald-50/35 to-slate-100 p-5 shadow-sm ring-1 ring-slate-200/70 dark:border-emerald-900/60 dark:from-emerald-950/15 dark:via-slate-950 dark:to-slate-900 dark:ring-emerald-900/20 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/60 dark:text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Nuevo ingreso
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Antes de comenzar</h3>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        Revisa la guía inicial y completa la configuración antes de empezar a cargar documentos.
                      </p>
                    </div>
                    <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                      <p>
                        Es fundamental leer la documentación proporcionada, ya que explica detalladamente el funcionamiento completo del sistema.
                      </p>
                      <p>
                        Además, es necesario completar la configuración de su perfil antes de proceder con otras acciones.
                      </p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">Gracias por su atención y colaboración.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:items-end">
                    <Button asChild className="w-full rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600 lg:w-auto">
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

        <div className="relative z-10 mt-3 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                <StatsCard
                  title={stat.title}
                  value={stat.value}
                  description={stat.description}
                  icon={Icon}
                  trend={stat.trend}
                  color={stat.color}
                  bgColor={stat.bgColor}
                  cardClass={`${stat.cardClass} bg-white/70 border-slate-200/70 backdrop-blur-xl dark:bg-slate-950/60 dark:border-slate-800/70`}
                  accentClass={stat.accentClass}
                />
              </button>
            );
          })}
        </div>

        <div className="relative z-10 mt-3 grid gap-6 xl:grid-cols-2">
          {/* Card de Documentos Recientes */}
          <Card className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.05)] dark:border-slate-800/70 dark:bg-slate-950/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
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
              <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-2">
                {recentDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No tienes documentos enviados</p>
                  </div>
                ) : (
                  recentDocuments.map((doc) => {
                    let docStatusVariant: "success" | "warning" | "outline" = "outline";
                    let docStatusLabel = "Pendiente";

                    if (doc.status === "aprobado" || doc.status === "revisado") {
                      docStatusVariant = "success";
                      docStatusLabel = "Aprobado";
                    } else if (doc.status === "revision") {
                      docStatusVariant = "outline";
                      docStatusLabel = "En revisión";
                    } else if (doc.status === "devuelto") {
                      docStatusVariant = "warning";
                      docStatusLabel = "Devuelto";
                    }

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 p-3 transition-colors hover:bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{doc.nombre}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{doc.materia}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={docStatusVariant}>{docStatusLabel}</Badge>
                          <ResponsiveActionButton
                            icon={<Eye className="h-4 w-4" aria-hidden />}
                            label="Abrir"
                            size="sm"
                            variant="ghost"
                            onClick={() => openDocument(doc)}
                            className="pointer-events-auto w-full justify-center sm:w-auto sm:min-w-[6rem]"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card de Próximas Entregas */}
          <Card className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.05)] dark:border-slate-800/70 dark:bg-slate-950/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-white">Próximas Entregas</CardTitle>
                  <CardDescription className="mt-1 text-slate-500 dark:text-slate-400">Fechas límite importantes</CardDescription>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-2">
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
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{entrega.titulo}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{entrega.fecha}</p>
                          </div>
                        </div>
                      );
                    }

                    const isUrgent = entrega.dias <= 3;
                    const isWarning = entrega.dias <= 7 && entrega.dias > 3;
                    const isFromForm = entrega.source === 'formulario';
                    
                    return (
                      <div
                        key={`${entrega.titulo}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/70"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{entrega.titulo}</p>
                            {isFromForm && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/30">
                                Formulario
                              </Badge>
                            )}
                          </div>
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
                            {entrega.dias} días
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
      <Dialog open={Boolean(selectedDocument)} onOpenChange={(open) => {
        if (!open) {
          closePreview();
        }
      }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Vista previa del documento</DialogTitle>
            <DialogDescription>
              {selectedDocument?.nombre || "Documento"}
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
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
                        <p className="text-sm text-muted-foreground">Cargando vista previa...</p>
                      </div>
                    </div>
                  ) : previewError ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                        <p className="text-sm text-destructive">{previewError}</p>
                      </div>
                    </div>
                  ) : previewBlobUrl ? (
                    <iframe
                      src={previewBlobUrl}
                      title={selectedDocument.nombre}
                      className="h-[60vh] w-full rounded-md border border-border"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No hay vista previa disponible.</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-3">
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Nombre</p>
                    <p className="text-sm text-foreground">{selectedDocument.nombre || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Materia</p>
                    <p className="text-sm text-foreground">{selectedDocument.materia || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Tipo</p>
                    <p className="text-sm text-foreground">{selectedDocument.tipo || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Fecha de envío</p>
                    <p className="text-sm text-foreground">
                      {selectedDocument.submittedAt ? formatDate(selectedDocument.submittedAt) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Estado</p>
                    <Badge variant={
                      selectedDocument.status === "aprobado" || selectedDocument.status === "revisado" ? "success" :
                      selectedDocument.status === "devuelto" ? "warning" : "outline"
                    } className="mt-1">
                      {selectedDocument.status === "aprobado" || selectedDocument.status === "revisado" ? "Aprobado" :
                       selectedDocument.status === "devuelto" ? "Devuelto" :
                       selectedDocument.status === "revision" ? "En revisión" : "Pendiente"}
                    </Badge>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closePreview}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DocenteDashboard;