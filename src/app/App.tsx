import React, { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { Alert, AlertDescription } from "./components/ui/alert";
import { getFormConfig, saveFormConfig, getFormIdsForBackendCode, type FormId } from "../lib/formConfig";
import { apiFetch } from "./lib/api";
import { resolveApiAssetUrl } from "./lib/env";
import { toast } from "sonner";
import { Toaster } from "./components/ui/toast";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./components/ui/alert-dialog";
import { Check, ChevronUp, HelpCircle, ImageIcon, LayoutGrid, Loader2, Menu, Moon, Palette, RotateCcw, Sun, Upload, X } from "lucide-react";
import { APP_THEMES, type AppThemeId, applyAppTheme } from "./lib/themes";
import { LAYOUT_STYLES, type LayoutStyleId, applyLayoutStyle } from "./lib/layoutStyles";
import { adminTourSteps } from "./tours/adminTourSteps";
import { getDocenteTourSteps } from "./tours/docenteTourSteps";
import { TourContext } from "./context/TourContext";
import { Login } from "./pages/Login";
import { Sidebar } from "./components/Sidebar";
import { FormAccessGuard } from "./components/FormAccessGuard";
import LogoUTSLRC from "../assets/elementos/LogotipoUTSLRC.webp";
import LogoUTSLRCWhite from "../assets/elementos/LogotipoUTSLRC-BLANCO.webp";
import SuperiorFormImg from "../assets/elementos/superior_form.webp";
import BgDefault from "../assets/Fondos/ut_imagen14.webp";
import BgITIID from "../assets/Fondos/Fondo_ITIID.png";
import BgMecatronica from "../assets/Fondos/Fondo_Mecatronica.png";
import BgAlimentarios from "../assets/Fondos/Fondo_Procesos_Alimentarios.png";

// Páginas cargadas bajo demanda
const DocenteDashboard = React.lazy(() => import("./pages/docente/DocenteDashboard"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const DocumentHistory = React.lazy(() => import("./pages/docente/DocumentHistory").then(m => ({ default: m.DocumentHistory })));
const Messages = React.lazy(() => import("./pages/Messages").then(m => ({ default: m.Messages })));
const DocenteManagement = React.lazy(() => import("./pages/admin/DocenteManagement"));
const Tutores = React.lazy(() => import("./pages/admin/Tutores"));
const CiclosEscolares = React.lazy(() => import("./pages/admin/CiclosEscolares"));
const DocumentReview = React.lazy(() => import("./pages/admin/DocumentReview"));
const Configuration = React.lazy(() => import("./pages/admin/Configuration"));
const EstadiasAdmin = React.lazy(() => import("./pages/admin/Estadias"));
const CalendarioAdmin = React.lazy(() => import("./pages/admin/Calendario"));
const Profile = React.lazy(() => import("./pages/docente/Profile").then(m => ({ default: m.Profile })));
const SupervisorPlaneacion = React.lazy(() => import("./pages/supervisor/SupervisorPlaneacion"));
const SupervisorInstrumentos = React.lazy(() => import("./pages/supervisor/SupervisorInstrumentos"));
const SupervisorDocPage = React.lazy(() => import("./pages/supervisor/SupervisorDocPage"));
const PlaneacionPage = React.lazy(() => import("./pages/docente/Planeacion"));
const Instrumento30Page = React.lazy(() => import("./pages/docente/Instrumento30"));
const Instrumento40Page = React.lazy(() => import("./pages/docente/Instrumento40"));
const Instrumento60Page = React.lazy(() => import("./pages/docente/Instrumento60"));
const Instrumento70Page = React.lazy(() => import("./pages/docente/Instrumento70"));
const RemedialPage = React.lazy(() => import("./pages/docente/Remedial"));
const ListaConcentradaPage = React.lazy(() => import("./pages/docente/ListaConcentrada"));
const AsesoriaPage = React.lazy(() => import("./pages/docente/Asesoria"));
const PortafolioDigitalPage = React.lazy(() => import("./pages/docente/PortafolioDigital"));
const ActaFinalPage = React.lazy(() => import("./pages/docente/ActaFinal"));
const EstadiasPage = React.lazy(() => import("./pages/docente/Estadias"));
const TutoriasPage = React.lazy(() => import("./pages/docente/Tutorias"));
const TourOverlay = React.lazy(() => import("./components/tour/TourOverlay").then(m => ({ default: m.TourOverlay })));

const BG_OPTIONS = [
  { key: "default",      label: "Universidad",  src: BgDefault },
  { key: "itiid",        label: "ITIID",        src: BgITIID },
  { key: "mecatronica",  label: "Mecatrónica",  src: BgMecatronica },
  { key: "alimentarios", label: "Alimentos",    src: BgAlimentarios },
] as const;
const BG_STORAGE_KEY       = "utslrc-bg-key";
const BG_OVERLAY_KEY       = "utslrc-bg-overlay";
const CONTAINER_ALPHA_KEY  = "utslrc-container-alpha";
const CONTAINER_BLUR_KEY   = "utslrc-container-blur";
const BG_CUSTOM_URL_KEY    = "utslrc-bg-custom-url";
const APP_THEME_KEY        = "utslrc-app-theme";
const LAYOUT_STYLE_KEY     = "utslrc-layout-style";

function AppContent() {
  const { isAuthenticated, isReady, user, notice, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const logoSrc = theme === "dark" ? LogoUTSLRCWhite : LogoUTSLRC;
  const splashLogoSrc = theme === "dark" ? LogoUTSLRCWhite : LogoUTSLRC;
  const currentViewStorageKey = "utslrc-current-view";
  const [currentView, setCurrentView] = useState(() => sessionStorage.getItem(currentViewStorageKey) ?? "dashboard");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [deferredMessageOpen, setDeferredMessageOpen] = useState<null | { conversationId?: number; recipientName?: string; recipientRole?: string; document?: { id: number; title: string; filePath?: string } }>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [pendingView, setPendingView] = useState<string | null>(null);
  const formEditingRef = useRef(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [minimumLoadingElapsed, setMinimumLoadingElapsed] = useState(false);
  const [isSplashExiting, setIsSplashExiting] = useState(false);
  const prevIsAuthenticatedRef = useRef<boolean | null>(null);
  const initialSplashPlayedRef = useRef(false);
  const canAccessTutorias = user?.role === "tutor" || user?.roles?.includes("tutor");
  const isSupervisor = user?.role === "supervisor" || user?.roles?.includes("supervisor");
  const isAdmin = user?.role === "administrador";
  const [isAdminTourOpen, setIsAdminTourOpen] = useState(false);
  const isDocente = !isAdmin && !isSupervisor;
  const [isDocenteTourOpen, setIsDocenteTourOpen] = useState(false);
  const [showTourConfirm, setShowTourConfirm] = useState<"admin" | "docente" | null>(null);
  const [selectedBgKey, setSelectedBgKey] = useState<string>("default");
  const [bgOverlay, setBgOverlay] = useState<number>(30);
  const [containerAlpha, setContainerAlpha] = useState<number>(100);
  const [containerBlur, setContainerBlur] = useState<number>(0);
  const [bgCustomUrl, setBgCustomUrl] = useState<string | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [isBgPanelOpen, setIsBgPanelOpen] = useState(false);
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
  const [appTheme, setAppTheme] = useState<AppThemeId>("emerald");
  const [isLayoutPanelOpen, setIsLayoutPanelOpen] = useState(false);
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyleId>("default");
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const activeBgSrc = selectedBgKey === "custom" && bgCustomUrl
    ? bgCustomUrl
    : BG_OPTIONS.find(b => b.key === selectedBgKey)?.src ?? BgDefault;

  const prefKey = useCallback((base: string) => `${base}-${user?.id ?? "__guest__"}`, [user?.id]);

  const savePrefsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPrefs = useRef<{ bgKey?: string; bgOverlay?: number; containerAlpha?: number; containerBlur?: number; appTheme?: AppThemeId; layoutStyle?: LayoutStyleId }>({});
  const savePrefs = useCallback((patch: { bgKey?: string; bgOverlay?: number; containerAlpha?: number; containerBlur?: number; appTheme?: AppThemeId; layoutStyle?: LayoutStyleId }) => {
    if (!user?.id) return;
    if (patch.bgKey          !== undefined) localStorage.setItem(prefKey(BG_STORAGE_KEY),      patch.bgKey);
    if (patch.bgOverlay      !== undefined) localStorage.setItem(prefKey(BG_OVERLAY_KEY),      String(patch.bgOverlay));
    if (patch.containerAlpha !== undefined) localStorage.setItem(prefKey(CONTAINER_ALPHA_KEY), String(patch.containerAlpha));
    if (patch.containerBlur  !== undefined) localStorage.setItem(prefKey(CONTAINER_BLUR_KEY),  String(patch.containerBlur));
    if (patch.appTheme       !== undefined) localStorage.setItem(prefKey(APP_THEME_KEY),       patch.appTheme);
    if (patch.layoutStyle    !== undefined) localStorage.setItem(prefKey(LAYOUT_STYLE_KEY),    patch.layoutStyle);
    pendingPrefs.current = { ...pendingPrefs.current, ...patch };
    if (savePrefsTimer.current) clearTimeout(savePrefsTimer.current);
    savePrefsTimer.current = setTimeout(() => {
      const toSend = { ...pendingPrefs.current };
      pendingPrefs.current = {};
      apiFetch('/auth/preferences', { method: 'PATCH', body: JSON.stringify(toSend) }).catch(() => {});
    }, 1500);
  }, [user?.id, prefKey]);

  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const data = await apiFetch("/auth/preferences/background", { method: "POST", body: formData });
      const rawPath = data?.bgCustomUrl as string;
      setBgCustomUrl(resolveApiAssetUrl(rawPath) ?? null);
      localStorage.setItem(prefKey(BG_CUSTOM_URL_KEY), rawPath);
      setSelectedBgKey("custom");
      savePrefs({ bgKey: "custom" });
      toast.success("¡Fondo personalizado guardado!");
    } catch {
      toast.error("No se pudo subir la imagen. Inténtalo de nuevo.");
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleBgDelete = async () => {
    try {
      await apiFetch("/auth/preferences/background", { method: "DELETE" });
      setBgCustomUrl(null);
      localStorage.removeItem(prefKey(BG_CUSTOM_URL_KEY));
      if (selectedBgKey === "custom") {
        setSelectedBgKey("default");
        savePrefs({ bgKey: "default" });
      }
      toast.success("Fondo personalizado eliminado.");
    } catch {
      toast.error("No se pudo eliminar el fondo.");
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setSelectedBgKey("default");
      setBgOverlay(30);
      setContainerAlpha(100);
      setContainerBlur(0);
      setBgCustomUrl(null);
      setAppTheme("emerald");
      applyAppTheme("emerald");
      setLayoutStyle("default");
      applyLayoutStyle("default");
      return;
    }
    setSelectedBgKey(localStorage.getItem(prefKey(BG_STORAGE_KEY))      ?? "default");
    setBgOverlay(    Number(localStorage.getItem(prefKey(BG_OVERLAY_KEY))      ?? "30"));
    setContainerAlpha(Number(localStorage.getItem(prefKey(CONTAINER_ALPHA_KEY)) ?? "100"));
    setContainerBlur( Number(localStorage.getItem(prefKey(CONTAINER_BLUR_KEY))  ?? "0"));
    setBgCustomUrl(resolveApiAssetUrl(localStorage.getItem(prefKey(BG_CUSTOM_URL_KEY))) ?? null);
    const storedTheme = (localStorage.getItem(prefKey(APP_THEME_KEY)) as AppThemeId) ?? "emerald";
    setAppTheme(storedTheme);
    applyAppTheme(storedTheme);
    const storedLayout = (localStorage.getItem(prefKey(LAYOUT_STYLE_KEY)) as LayoutStyleId) ?? "default";
    setLayoutStyle(storedLayout);
    applyLayoutStyle(storedLayout);
    apiFetch('/auth/preferences')
      .then(data => {
        const p = data?.preferences;
        if (!p || typeof p !== 'object') return;
        if (p.bgKey          !== undefined) { setSelectedBgKey(p.bgKey);          localStorage.setItem(prefKey(BG_STORAGE_KEY),      p.bgKey); }
        if (p.bgOverlay      !== undefined) { setBgOverlay(p.bgOverlay);           localStorage.setItem(prefKey(BG_OVERLAY_KEY),      String(p.bgOverlay)); }
        if (p.containerAlpha !== undefined) { setContainerAlpha(p.containerAlpha); localStorage.setItem(prefKey(CONTAINER_ALPHA_KEY), String(p.containerAlpha)); }
        if (p.containerBlur  !== undefined) { setContainerBlur(p.containerBlur);   localStorage.setItem(prefKey(CONTAINER_BLUR_KEY),  String(p.containerBlur)); }
        if (p.bgCustomUrl    !== undefined) { setBgCustomUrl(resolveApiAssetUrl(p.bgCustomUrl) ?? null); localStorage.setItem(prefKey(BG_CUSTOM_URL_KEY), p.bgCustomUrl); }
        if (p.appTheme       !== undefined) { setAppTheme(p.appTheme); applyAppTheme(p.appTheme); localStorage.setItem(prefKey(APP_THEME_KEY), p.appTheme); }
        if (p.layoutStyle    !== undefined) { setLayoutStyle(p.layoutStyle); applyLayoutStyle(p.layoutStyle); localStorage.setItem(prefKey(LAYOUT_STYLE_KEY), p.layoutStyle); }
      })
      .catch(() => {});
  }, [user?.id, prefKey]);

  useEffect(() => { applyAppTheme(appTheme); }, [appTheme]);
  useEffect(() => { applyLayoutStyle(layoutStyle); }, [layoutStyle]);

useEffect(() => {
    document.documentElement.style.setProperty("--ui-card-alpha", String(containerAlpha));
    const pct = containerAlpha;
    const blur = containerBlur;
    const styleId = "utslrc-ui-alpha";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) { el = document.createElement("style"); el.id = styleId; document.head.appendChild(el); }

    // Si el usuario no ha tocado ningún slider (valores por defecto), no se
    // inyecta ninguna regla — se respeta el diseño original tal cual, incluyendo
    // las opacidades ya incorporadas en clases como bg-slate-950/60.
    if (pct === 100 && blur === 0) {
      el.textContent = "";
      return;
    }

    const colorRules = pct !== 100 ? `
      html:not(.dark) [class~="bg-white"]:not([class*="rounded-full"]),
      html:not(.dark) [class*="bg-white/7"]:not([class*="rounded-full"]),
      html:not(.dark) [class*="bg-white/8"]:not([class*="rounded-full"]),
      html:not(.dark) [class*="bg-white/9"]:not([class*="rounded-full"]) {
        background-image: none !important;
        background-color: oklch(1 0 0 / calc(${pct} / 100)) !important;
      }
      html:not(.dark) [class*="bg-gradient-to-"]:not([class*="rounded-full"]):not(.login-page):not(.login-page *):not([class*="from-emerald-"]) {
        background-image: none !important;
        background-color: oklch(1 0 0 / calc(${pct} / 100)) !important;
      }
      /* slate-900 y slate-950 llevan su propio tono azul (hue≈265) en Tailwind —
         se preserva ese tono, solo se ajusta la opacidad al valor del slider */
      .dark [class*="dark:bg-slate-900"],
      .dark [class*="bg-slate-900"] {
        background-image: none !important;
        background-color: color-mix(in oklch, oklch(0.208 0.042 265.755) ${pct}%, transparent) !important;
      }
      .dark [class*="dark:bg-slate-950"],
      .dark [class*="bg-slate-950"] {
        background-image: none !important;
        background-color: color-mix(in oklch, oklch(0.129 0.042 264.695) ${pct}%, transparent) !important;
      }
      .dark [class*="dark:from-slate-"] {
        background-image: none !important;
        background-color: color-mix(in oklch, oklch(0.129 0.042 264.695) ${pct}%, transparent) !important;
      }
    ` : "";

    const blurRules = blur !== 0 ? `
      html:not(.dark) [class~="bg-white"]:not([class*="rounded-full"]),
      html:not(.dark) [class*="bg-white/7"]:not([class*="rounded-full"]),
      html:not(.dark) [class*="bg-white/8"]:not([class*="rounded-full"]),
      html:not(.dark) [class*="bg-white/9"]:not([class*="rounded-full"]),
      html:not(.dark) [class*="bg-gradient-to-"]:not([class*="rounded-full"]):not(.login-page):not(.login-page *):not([class*="from-emerald-"]),
      [class~="bg-card"]:not([class*="rounded-full"]),
      [class~="bg-background"]:not([class*="rounded-full"]),
      [class~="bg-secondary"]:not([class*="rounded-full"]),
      [class~="bg-muted"]:not([class*="rounded-full"]),
      .dark [class*="dark:bg-slate-9"],
      .dark [class*="bg-slate-9"],
      .dark [class*="dark:from-slate-"],
      .dark [class*="backdrop-blur"] {
        backdrop-filter: blur(${blur}px) !important;
      }
    ` : "";

    el.textContent = colorRules + blurRules;
  }, [containerAlpha, containerBlur]);

  const toggleToolbar = () => {
    setIsToolbarExpanded(prev => {
      if (prev) { setIsBgPanelOpen(false); setIsThemePanelOpen(false); setIsLayoutPanelOpen(false); }
      return !prev;
    });
  };

  const noticeBanner = notice ? (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 sm:top-6">
      <Alert
        variant={notice.type === "error" ? "destructive" : "default"}
        className={`pointer-events-auto w-[min(100%,36rem)] rounded-2xl border px-5 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-300 ${notice.type === "error"
          ? "border-rose-300/80 bg-rose-50/95 text-rose-950 dark:border-rose-800/80 dark:bg-rose-950/90 dark:text-rose-50"
          : "border-emerald-300/80 bg-emerald-50/95 text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-950/90 dark:text-emerald-50"
        }`}
      >
        <AlertDescription className="col-span-full w-full justify-items-center text-center text-base font-semibold tracking-wide">
          {notice.message}
        </AlertDescription>
      </Alert>
    </div>
  ) : null;

  useLayoutEffect(() => {
    if (prevIsAuthenticatedRef.current !== null && prevIsAuthenticatedRef.current !== isAuthenticated) {
      if (!isAuthenticated) {
        document.body.classList.add("splashing");
      }
    }
    prevIsAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && isReady) {
      const timer = window.setTimeout(() => {
        document.body.classList.remove("splashing");
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [isAuthenticated, isReady]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      formEditingRef.current = false;
      setUnsavedChangesOpen(false);
      setPendingView(null);
      setMobileSidebarOpen(false);
      setDeferredMessageOpen(null);
      setCurrentView("dashboard");
      sessionStorage.removeItem(currentViewStorageKey);
      return;
    }

    const allowedViews = user?.role === "administrador"
      ? new Set([
          "dashboard",
          "docentes",
          "tutores",
          "mensajes",
          "documentos",
          "remediales",
          "documentos-revisados",
          "documentos-revisados-hoy",
          "ciclos",
          "estadias-admin",
          "calendario",
          "configuracion",
          "configuracion-cuenta",
        ])
      : (user?.role === "supervisor" || user?.roles?.includes("supervisor"))
      ? new Set([
          "supervisor-planeacion",
          "supervisor-instrumentos",
          "supervisor-remedial",
          "supervisor-lista-concentrada",
          "supervisor-asesoria",
          "supervisor-portafolio",
          "supervisor-acta-final",
          "supervisor-estadias",
          "supervisor-tutorias",
          "perfil",
        ])
      : new Set([
          "dashboard",
          "planeacion",
          "instrumento-30-normal",
          "instrumento-40-nuevo",
          "instrumento-60-nuevo",
          "instrumento-70-normal",
          "remedial",
          "lista-concentrada",
          "asesoria",
          "portafolio",
          "acta-final",
          "estadias",
          "tutorias",
          "tutorias-carga-academica",
          "tutorias-reporte-bajas",
          "tutorias-concentrado-asesorias",
          "tutorias-acta-asistencia-grupal",
          "tutorias-ficha-tecnica",
          "historial",
          "mensajes",
          "perfil",
        ]);

    if (!allowedViews.has(currentView)) {
      const isSup = user?.role === "supervisor" || user?.roles?.includes("supervisor");
      if (isSup) {
        const sections = user?.supervisorSections ?? [];
        const fallback = sections.includes("planeacion")
          ? "supervisor-planeacion"
          : sections.some((s) => ["instrumento-30","instrumento-40","instrumento-60","instrumento-70"].includes(s))
          ? "supervisor-instrumentos"
          : sections.includes("remedial") ? "supervisor-remedial"
          : sections.includes("lista-concentrada") ? "supervisor-lista-concentrada"
          : sections.includes("asesoria") ? "supervisor-asesoria"
          : sections.includes("portafolio") ? "supervisor-portafolio"
          : sections.includes("acta-final") ? "supervisor-acta-final"
          : sections.includes("estadias") ? "supervisor-estadias"
          : sections.includes("tutorias") ? "supervisor-tutorias"
          : "perfil";
        setCurrentView(fallback);
        sessionStorage.setItem(currentViewStorageKey, fallback);
      } else {
        setCurrentView("dashboard");
        sessionStorage.setItem(currentViewStorageKey, "dashboard");
      }
    } else {
      sessionStorage.setItem(currentViewStorageKey, currentView);
    }
    setIsLoggingOut(false);
  }, [currentView, isAuthenticated, isReady, user?.role, user?.roles, user?.supervisorSections]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      setDeferredMessageOpen(detail);
      setCurrentView("mensajes");
    };

    globalThis.addEventListener("openMessagesConversation", handler);
    return () => globalThis.removeEventListener("openMessagesConversation", handler);
  }, []);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      const message = "¿Estás seguro de salir del sistema?";
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    const popStateHandler = () => {
      setLeaveDialogOpen(true);
      window.history.pushState({ page: currentView }, "", window.location.href);
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.history.replaceState({ page: currentView }, "", window.location.href);
    window.addEventListener("popstate", popStateHandler);

    const syncFormConfig = async () => {
      try {
        const res = await apiFetch('/forms');
        const currentConfig = getFormConfig();
        const nextAccess = { ...currentConfig.formAccess };

        for (const form of res?.data ?? []) {
          const backendFormCode = String(form.form_code).replace(/_/g, '-');
          const formIds = getFormIdsForBackendCode(backendFormCode);

          for (const formId of formIds) {
            if (formId in nextAccess) {
              nextAccess[formId] = {
                roles: form.access_roles ?? nextAccess[formId].roles,
                dueAt: form.due_at !== undefined ? form.due_at : nextAccess[formId].dueAt,
              };
            }
          }
        }

        saveFormConfig({ ...currentConfig, formAccess: nextAccess });
      } catch (error) {
        console.error('Failed to sync form configuration', error);
      }
    };

    syncFormConfig();

    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      window.removeEventListener("popstate", popStateHandler);
    };
  }, [isReady, isAuthenticated, currentView]);

  useEffect(() => {
    const handleOnline = () => {
      if (!navigator.onLine || !isOffline) {
        return;
      }
      setIsOffline(false);
      toast.success("Conexión restaurada.");
    };

    const handleOffline = () => {
      if (navigator.onLine || isOffline) {
        return;
      }
      setIsOffline(true);
      toast.error("Sin conexión a internet. Algunas funciones estarán limitadas.");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [isAuthenticated, isOffline]);

  useEffect(() => {
    if (!isReady) {
      setMinimumLoadingElapsed(false);
      setIsSplashExiting(false);
      return;
    }

    const enterTimer = window.setTimeout(() => {
      setMinimumLoadingElapsed(true);
      setIsSplashExiting(true);
    }, 1_500);

    return () => window.clearTimeout(enterTimer);
  }, [isReady]);

  useEffect(() => {
    if (!isSplashExiting) return;

    const exitTimer = window.setTimeout(() => {
      setIsSplashExiting(false);
    }, 1800);

    return () => window.clearTimeout(exitTimer);
  }, [isSplashExiting]);

  const shouldShowSplash = !isReady || !minimumLoadingElapsed || isSplashExiting;

  useEffect(() => {
    if (isReady && typeof document !== "undefined") {
      document.body.classList.remove("splashing");
    }
  }, [isReady]);

  useEffect(() => {
    if (!shouldShowSplash) {
      initialSplashPlayedRef.current = true;
    }
  }, [shouldShowSplash]);

  const cancelLeave = () => setLeaveDialogOpen(false);

  const safeNavigate = (view: string) => {
    if (formEditingRef.current) {
      setPendingView(view);
      setUnsavedChangesOpen(true);
    } else {
      setCurrentView(view);
      setMobileSidebarOpen(false);
    }
  };

  const safeLogout = () => {
    if (formEditingRef.current) {
      setPendingView("__logout__");
      setUnsavedChangesOpen(true);
    } else {
      setLogoutConfirmOpen(true);
    }
  };

  const confirmDiscardChanges = () => {
    formEditingRef.current = false;
    setUnsavedChangesOpen(false);
    if (pendingView === "__logout__") {
      setPendingView(null);
      logout();
    } else if (pendingView) {
      setCurrentView(pendingView);
      setMobileSidebarOpen(false);
      setPendingView(null);
    }
  };

  const cancelDiscardChanges = () => {
    setUnsavedChangesOpen(false);
    setPendingView(null);
  };

  const splashOverlay = shouldShowSplash
    ? createPortal(
        <div
          className={
            isSplashExiting
              ? "tv-fullscreen tv-loader-exit fixed inset-0 z-[9998] flex min-h-screen items-center justify-center overflow-hidden text-sm"
              : "tv-fullscreen fixed inset-0 z-[9998] flex min-h-screen items-center justify-center overflow-hidden text-sm"
          }
          style={{ backgroundColor: theme === "dark" ? "#000000" : "#f8fafc" }}
        >
          <div
            className={
              isSplashExiting
                ? "tv-loader-group tv-loader-group-exit relative z-10 flex flex-col items-center justify-center gap-6 px-6 text-center"
                : "tv-loader-group relative z-10 flex flex-col items-center justify-center gap-6 px-6 text-center"
            }
          >
            <img
              src={splashLogoSrc}
              alt="Logo UTSLRC"
              className="tv-loader-image tv-image-same-size select-none object-contain"
            />
          </div>
        </div>,
        document.body
      )
    : null;

  const confirmLeaveAndLogout = () => {
    setLeaveDialogOpen(false);
    logout();
  };

  const renderContent = () => {
    if (user?.role === "administrador") {
      switch (currentView) {
        case "dashboard":
          return <AdminDashboard onNavigate={setCurrentView} layoutStyle={layoutStyle} />;
        case "docentes":
          return <DocenteManagement layoutStyle={layoutStyle} />;
        case "tutores":
          return <Tutores layoutStyle={layoutStyle} />;
        case "mensajes":
          return <Messages initialOpen={deferredMessageOpen} onConsume={() => setDeferredMessageOpen(null)} />;
        case "documentos":
          return <DocumentReview initialSection="pendientes" layoutStyle={layoutStyle} />;
        case "remediales":
          return <DocumentReview initialSection="pendientes" initialForm="Remedial" layoutStyle={layoutStyle} />;
        case "documentos-revisados":
          return <DocumentReview initialSection="revisados" layoutStyle={layoutStyle} />;
        case "documentos-revisados-hoy":
          return <DocumentReview initialSection="hoy" layoutStyle={layoutStyle} />;
        case "ciclos":
          return <CiclosEscolares layoutStyle={layoutStyle} />;
        case "estadias-admin":
          return <EstadiasAdmin layoutStyle={layoutStyle} />;
        case "calendario":
          return <CalendarioAdmin layoutStyle={layoutStyle} />;
        case "configuracion":
          return <Configuration onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} layoutStyle={layoutStyle} />;
        case "configuracion-cuenta":
          return <Configuration initialTab="cuenta" onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} layoutStyle={layoutStyle} />;
        default:
          return <AdminDashboard onNavigate={setCurrentView} layoutStyle={layoutStyle} />;
      }
    }

    if (isSupervisor) {
      const sections = user?.supervisorSections ?? [];

      switch (currentView) {
        case "supervisor-planeacion":
          return <SupervisorPlaneacion layoutStyle={layoutStyle} />;
        case "supervisor-instrumentos":
          return <SupervisorInstrumentos allowedSections={sections} layoutStyle={layoutStyle} />;
        case "supervisor-remedial":
          return <SupervisorDocPage title="Remedial" formCode="remedial" layoutStyle={layoutStyle} />;
        case "supervisor-lista-concentrada":
          return <SupervisorDocPage title="Lista Concentrada" formCode="lista-concentrada" layoutStyle={layoutStyle} />;
        case "supervisor-asesoria":
          return <SupervisorDocPage title="Asesoría" formCode="asesoria" layoutStyle={layoutStyle} />;
        case "supervisor-portafolio":
          return <SupervisorDocPage title="Portafolio Digital Final" formCode="portafolio-digital" hideColumns={['parcial']} layoutStyle={layoutStyle} />;
        case "supervisor-acta-final":
          return <SupervisorDocPage title="Acta Final" formCode="acta-final" hideColumns={['parcial']} layoutStyle={layoutStyle} />;
        case "supervisor-estadias":
          return <SupervisorDocPage title="Estadías" hideColumns={['materia', 'parcial']} layoutStyle={layoutStyle} formCodes={[
            { code: "estadias",           label: "Estadías" },
            { code: "carta-presentacion", label: "Carta de Presentación" },
            { code: "carta-aceptacion",   label: "Carta de Aceptación" },
            { code: "carta-terminacion",  label: "Carta de Terminación" },
          ]} />;
        case "supervisor-tutorias":
          return <SupervisorDocPage title="Tutorías" hideColumns={['materia', 'carrera', 'grupo', 'parcial']} layoutStyle={layoutStyle} formCodes={[
            { code: "carga-academica",        label: "Carga Académica" },
            { code: "reporte-bajas",          label: "Reporte de Bajas" },
            { code: "concentrado-asesorias",  label: "Concentrado de Asesorías" },
            { code: "acta-asistencia-grupal", label: "Acta de Asistencia Grupal" },
            { code: "ficha-tecnica",          label: "Ficha Técnica" },
          ]} />;
        case "perfil":
          return <Profile onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} layoutStyle={layoutStyle} />;
        default:
          return <Profile onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} layoutStyle={layoutStyle} />;
      }
    }

    {
      const wrapForm = (formId: Parameters<typeof FormAccessGuard>[0]["formId"], title: string, element: React.ReactNode) => (
        <FormAccessGuard formId={formId} title={title} tourForceOpen={isDocenteTourOpen}>
          {element}
        </FormAccessGuard>
      );

      if (!canAccessTutorias && currentView.startsWith("tutorias")) {
        return <DocenteDashboard />;
      }

      switch (currentView) {
        case "dashboard":
          return <DocenteDashboard onNavigate={setCurrentView} layoutStyle={layoutStyle} />;
        case "planeacion":
          return wrapForm("planeacion", "Planeación", <PlaneacionPage onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} isTourActive={isDocenteTourOpen} />);
        case "instrumento-30-normal":
          return wrapForm("instrumento-30-normal", "Instrumento 30%", <Instrumento30Page onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />);
        case "instrumento-40-nuevo":
          return wrapForm("instrumento-40-nuevo", "Instrumento 40%", <Instrumento40Page onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />);
        case "instrumento-60-nuevo":
          return wrapForm("instrumento-60-nuevo", "Instrumento 60%", <Instrumento60Page onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />);
        case "instrumento-70-normal":
          return wrapForm("instrumento-70-normal", "Instrumento 70%", <Instrumento70Page onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />);
        case "remedial":
          return wrapForm("remedial", "Remedial", <RemedialPage onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />);
        case "lista-concentrada":
          return wrapForm("lista-concentrada", "Lista Concentrada", <ListaConcentradaPage onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />);
        case "asesoria":
          return wrapForm("asesoria", "Asesoría", <AsesoriaPage onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />);
        case "portafolio":
          return wrapForm("portafolio-digital", "Portafolio Digital", <PortafolioDigitalPage onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />);
        case "acta-final":
          return wrapForm("acta-final", "Acta Final", <ActaFinalPage onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />);
        case "estadias":
          return <EstadiasPage onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />;
        case "tutorias":
          return <TutoriasPage layoutStyle={layoutStyle} />;
        case "tutorias-carga-academica":
          return wrapForm("carga-academica", "Carga Académica", <TutoriasPage initialType="carga-academica" onNavigateHome={() => setCurrentView("tutorias")} layoutStyle={layoutStyle} />);
        case "tutorias-reporte-bajas":
          return wrapForm("reporte-bajas", "Reporte de Bajas", <TutoriasPage initialType="reporte-bajas" onNavigateHome={() => setCurrentView("tutorias")} layoutStyle={layoutStyle} />);
        case "tutorias-concentrado-asesorias":
          return wrapForm("concentrado-asesorias", "Concentrado de Asesorías", <TutoriasPage initialType="concentrado-asesorias" onNavigateHome={() => setCurrentView("tutorias")} layoutStyle={layoutStyle} />);
        case "tutorias-acta-asistencia-grupal":
          return wrapForm("acta-asistencia-grupal", "Acta de Asistencia Grupal", <TutoriasPage initialType="acta-asistencia-grupal" onNavigateHome={() => setCurrentView("tutorias")} layoutStyle={layoutStyle} />);
        case "tutorias-ficha-tecnica":
          return wrapForm("ficha-tecnica", "Ficha Técnica", <TutoriasPage initialType="ficha-tecnica" onNavigateHome={() => setCurrentView("tutorias")} layoutStyle={layoutStyle} />);
        case "historial":
          return <DocumentHistory isTourActive={isDocenteTourOpen} layoutStyle={layoutStyle} />;
        case "mensajes":
          return <Messages initialOpen={deferredMessageOpen} onConsume={() => setDeferredMessageOpen(null)} layoutStyle={layoutStyle} />;
        case "perfil":
          return <Profile onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} layoutStyle={layoutStyle} />;
        default:
          return <DocenteDashboard onNavigate={setCurrentView} layoutStyle={layoutStyle} />;
      }
    }
  };

  return (
    <>
      {splashOverlay}
      {noticeBanner}
      {isAuthenticated && isOffline && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[110] flex justify-center px-4 py-4">
          <Alert variant="destructive" className="pointer-events-auto w-[min(100%,36rem)] rounded-2xl border px-5 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            <AlertDescription className="text-center text-sm font-semibold tracking-wide">
              Sin conexión a internet. Algunas funciones estarán limitadas.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {isReady && !isAuthenticated && (
        <div
          className={
            isSplashExiting
              ? "fixed inset-0 z-[9999] overflow-hidden tv-iris-reveal bg-background"
              : "fixed inset-0 z-0 bg-background motion-reduce:animate-none"
          }
        >
          <Login />
        </div>
      )}

      {isReady && isAuthenticated && (
        <TourContext.Provider value={{ isAdminTourActive: isAdminTourOpen, isDocenteTourActive: isDocenteTourOpen }}>
        <div
          className={`fixed inset-0 overflow-hidden${isSplashExiting ? " z-[9999] tv-iris-reveal" : " z-0"}`}
          style={{
            backgroundImage: theme === "dark"
              ? `url('${activeBgSrc}')`
              : `linear-gradient(rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.10)), url('${activeBgSrc}')`,
            backgroundColor: theme === "dark" ? "#000000" : "transparent",
            backgroundBlendMode: theme === "dark" ? "normal" : "screen",
            backgroundPosition: "center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        >
          {/* Capa de oscurecimiento del fondo */}
          <div
            className="pointer-events-none absolute inset-0 transition-[background-color] duration-300"
            style={{ backgroundColor: `rgba(0,0,0,${bgOverlay / 100})`, zIndex: 1 }}
          />
          <div className={`relative flex h-screen overflow-hidden ${isLoggingOut ? "animate-page-exit" : ""} motion-reduce:animate-none`} style={{ zIndex: 2 }}>
            <Sidebar
              currentView={currentView}
              onNavigate={safeNavigate}
              mobileOpen={mobileSidebarOpen}
              onMobileOpenChange={setMobileSidebarOpen}
              onLogoutRequest={safeLogout}
              layoutStyle={layoutStyle}
            />
            <main className="relative flex-1 overflow-y-auto bg-transparent">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" />

              {/* IMÁGENES DECORATIVAS */}
              {["planeacion","instrumento-30-normal","instrumento-40-nuevo","instrumento-60-nuevo","instrumento-70-normal","remedial","lista-concentrada","asesoria","portafolio","estadias","acta-final","tutorias"].includes(currentView) && (
                <img
                  src={SuperiorFormImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
              )}

              <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur md:hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileSidebarOpen(true)}
                    className="h-10 w-10"
                    aria-label="Abrir menú"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>

                  <img
                    src={logoSrc}
                    alt="Logo institucional"
                    className="h-8 w-auto object-contain"
                  />

                  <div className="h-10 w-10" />
                </div>
              </div>
              <div className="container relative z-10 mx-auto max-w-7xl p-6 lg:p-8">
                <Suspense fallback={<div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>}>
                  {renderContent()}
                </Suspense>
              </div>
            </main>

            <AlertDialog open={showTourConfirm !== null} onOpenChange={(open) => { if (!open) setShowTourConfirm(null); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Iniciar el tutorial?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se iniciará la guía interactiva del sistema. Te llevará paso a paso por cada sección principal.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (showTourConfirm === "admin") setIsAdminTourOpen(true);
                      else if (showTourConfirm === "docente") setIsDocenteTourOpen(true);
                      setShowTourConfirm(null);
                    }}
                  >
                    Sí, iniciar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Panel selector de diseño / estructura */}
            {isLayoutPanelOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsLayoutPanelOpen(false)} />
                <div className="fixed bottom-4 right-[3.5rem] z-50 w-72 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Diseño del sistema</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Vinculado a tu cuenta</p>
                    </div>
                    <button onClick={() => setIsLayoutPanelOpen(false)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Clásico */}
                    <button
                      onClick={() => { setLayoutStyle("default"); savePrefs({ layoutStyle: "default" }); }}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all ${
                        layoutStyle === "default"
                          ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30"
                          : "border-transparent bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <svg width="100%" viewBox="0 0 110 72" xmlns="http://www.w3.org/2000/svg">
                          <rect x="2" y="2" width="22" height="68" rx="8" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="0.5"/>
                          <rect x="5" y="11" width="16" height="5" rx="2.5" fill="#10b981"/>
                          <rect x="5" y="20" width="16" height="3" rx="1.5" fill="#a7f3d0"/>
                          <rect x="5" y="26" width="16" height="3" rx="1.5" fill="#a7f3d0"/>
                          <rect x="5" y="32" width="16" height="3" rx="1.5" fill="#a7f3d0"/>
                          <rect x="5" y="38" width="16" height="3" rx="1.5" fill="#a7f3d0"/>
                          <rect x="28" y="2" width="80" height="16" rx="6" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="0.5"/>
                          <rect x="32" y="6" width="40" height="4" rx="2" fill="#6ee7b7"/>
                          <rect x="28" y="22" width="18" height="16" rx="4" fill="#f0fdf4" stroke="#d1fae5" strokeWidth="0.5"/>
                          <rect x="49" y="22" width="18" height="16" rx="4" fill="#f0fdf4" stroke="#d1fae5" strokeWidth="0.5"/>
                          <rect x="70" y="22" width="18" height="16" rx="4" fill="#f0fdf4" stroke="#d1fae5" strokeWidth="0.5"/>
                          <rect x="91" y="22" width="17" height="16" rx="4" fill="#f0fdf4" stroke="#d1fae5" strokeWidth="0.5"/>
                          <rect x="28" y="42" width="38" height="28" rx="6" fill="#f0fdf4" stroke="#d1fae5" strokeWidth="0.5"/>
                          <rect x="70" y="42" width="38" height="28" rx="6" fill="#f0fdf4" stroke="#d1fae5" strokeWidth="0.5"/>
                        </svg>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Clásico</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Predeterminado</span>
                      {layoutStyle === "default" && (
                        <div className="rounded-full bg-emerald-500 p-0.5"><Check className="h-2.5 w-2.5 text-white" /></div>
                      )}
                    </button>

                    {/* Empresarial */}
                    <button
                      onClick={() => { setLayoutStyle("formal"); savePrefs({ layoutStyle: "formal" }); }}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all ${
                        layoutStyle === "formal"
                          ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30"
                          : "border-transparent bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <svg width="100%" viewBox="0 0 110 72" xmlns="http://www.w3.org/2000/svg">
                          <rect x="0" y="0" width="22" height="72" fill="#f8fafc"/>
                          <line x1="22" y1="0" x2="22" y2="72" stroke="#e2e8f0" strokeWidth="1"/>
                          <rect x="3" y="3" width="16" height="4" rx="0" fill="#e2e8f0"/>
                          <rect x="0" y="11" width="2.5" height="5" fill="#10b981"/>
                          <rect x="4" y="11" width="15" height="4" rx="0" fill="#dbeafe"/>
                          <rect x="4" y="18" width="9" height="1.5" rx="0" fill="#94a3b8"/>
                          <rect x="4" y="21" width="15" height="2.5" rx="0" fill="#e2e8f0"/>
                          <rect x="4" y="25" width="15" height="2.5" rx="0" fill="#e2e8f0"/>
                          <rect x="4" y="30" width="9" height="1.5" rx="0" fill="#94a3b8"/>
                          <rect x="4" y="33" width="15" height="2.5" rx="0" fill="#e2e8f0"/>
                          <rect x="4" y="37" width="15" height="2.5" rx="0" fill="#e2e8f0"/>
                          <rect x="4" y="41" width="15" height="2.5" rx="0" fill="#e2e8f0"/>
                          <rect x="4" y="46" width="9" height="1.5" rx="0" fill="#94a3b8"/>
                          <rect x="4" y="49" width="15" height="2.5" rx="0" fill="#e2e8f0"/>
                          <rect x="4" y="53" width="15" height="2.5" rx="0" fill="#e2e8f0"/>
                          <rect x="25" y="4" width="32" height="3.5" rx="0" fill="#1e293b"/>
                          <rect x="25" y="9" width="44" height="2" rx="0" fill="#94a3b8"/>
                          <line x1="22" y1="14" x2="110" y2="14" stroke="#e2e8f0" strokeWidth="0.8"/>
                          <rect x="24" y="17" width="84" height="11" rx="0" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <line x1="45" y1="17" x2="45" y2="28" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <line x1="66" y1="17" x2="66" y2="28" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <line x1="87" y1="17" x2="87" y2="28" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <rect x="27" y="19" width="9" height="1.5" rx="0" fill="#94a3b8"/>
                          <rect x="27" y="22" width="7" height="3" rx="0" fill="#1e293b"/>
                          <rect x="48" y="19" width="9" height="1.5" rx="0" fill="#94a3b8"/>
                          <rect x="48" y="22" width="7" height="3" rx="0" fill="#1e293b"/>
                          <rect x="69" y="19" width="9" height="1.5" rx="0" fill="#94a3b8"/>
                          <rect x="69" y="22" width="7" height="3" rx="0" fill="#1e293b"/>
                          <rect x="90" y="19" width="9" height="1.5" rx="0" fill="#94a3b8"/>
                          <rect x="90" y="22" width="7" height="3" rx="0" fill="#10b981"/>
                          <rect x="24" y="31" width="56" height="39" rx="0" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <rect x="24" y="31" width="56" height="6" rx="0" fill="#f8fafc"/>
                          <line x1="24" y1="37" x2="80" y2="37" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <rect x="27" y="33" width="10" height="2" rx="0" fill="#94a3b8"/>
                          <rect x="40" y="33" width="9" height="2" rx="0" fill="#94a3b8"/>
                          <rect x="52" y="33" width="9" height="2" rx="0" fill="#94a3b8"/>
                          <rect x="27" y="40" width="10" height="2" rx="0" fill="#1e293b"/>
                          <rect x="40" y="40" width="8" height="2" rx="0" fill="#64748b"/>
                          <rect x="52" y="40" width="7" height="2" rx="0" fill="#10b981"/>
                          <line x1="24" y1="44" x2="80" y2="44" stroke="#f1f5f9" strokeWidth="0.5"/>
                          <rect x="27" y="47" width="10" height="2" rx="0" fill="#1e293b"/>
                          <rect x="40" y="47" width="8" height="2" rx="0" fill="#64748b"/>
                          <rect x="52" y="47" width="7" height="2" rx="0" fill="#f59e0b"/>
                          <line x1="24" y1="51" x2="80" y2="51" stroke="#f1f5f9" strokeWidth="0.5"/>
                          <rect x="27" y="54" width="10" height="2" rx="0" fill="#1e293b"/>
                          <rect x="40" y="54" width="8" height="2" rx="0" fill="#64748b"/>
                          <rect x="52" y="54" width="7" height="2" rx="0" fill="#94a3b8"/>
                          <line x1="24" y1="58" x2="80" y2="58" stroke="#f1f5f9" strokeWidth="0.5"/>
                          <rect x="27" y="61" width="10" height="2" rx="0" fill="#1e293b"/>
                          <rect x="40" y="61" width="8" height="2" rx="0" fill="#64748b"/>
                          <rect x="52" y="61" width="7" height="2" rx="0" fill="#94a3b8"/>
                          <line x1="24" y1="65" x2="80" y2="65" stroke="#f1f5f9" strokeWidth="0.5"/>
                          <rect x="27" y="67" width="10" height="2" rx="0" fill="#1e293b"/>
                          <rect x="40" y="67" width="8" height="2" rx="0" fill="#64748b"/>
                          <rect x="52" y="67" width="7" height="2" rx="0" fill="#94a3b8"/>
                          <rect x="82" y="31" width="26" height="39" rx="0" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <rect x="85" y="34" width="15" height="2" rx="0" fill="#1e293b"/>
                          <line x1="82" y1="38" x2="108" y2="38" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <circle cx="86" cy="42" r="1.5" fill="#10b981"/>
                          <rect x="89" y="40" width="15" height="2" rx="0" fill="#1e293b"/>
                          <rect x="89" y="43" width="11" height="1.5" rx="0" fill="#94a3b8"/>
                          <line x1="82" y1="47" x2="108" y2="47" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <circle cx="86" cy="51" r="1.5" fill="#f59e0b"/>
                          <rect x="89" y="49" width="15" height="2" rx="0" fill="#1e293b"/>
                          <rect x="89" y="52" width="11" height="1.5" rx="0" fill="#94a3b8"/>
                          <line x1="82" y1="56" x2="108" y2="56" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <circle cx="86" cy="60" r="1.5" fill="#3b82f6"/>
                          <rect x="89" y="58" width="15" height="2" rx="0" fill="#1e293b"/>
                          <rect x="89" y="61" width="11" height="1.5" rx="0" fill="#94a3b8"/>
                          <line x1="82" y1="65" x2="108" y2="65" stroke="#e2e8f0" strokeWidth="0.5"/>
                          <circle cx="86" cy="69" r="1.5" fill="#8b5cf6"/>
                          <rect x="89" y="67" width="15" height="2" rx="0" fill="#1e293b"/>
                        </svg>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Empresarial</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Formal y ordenado</span>
                      {layoutStyle === "formal" && (
                        <div className="rounded-full bg-emerald-500 p-0.5"><Check className="h-2.5 w-2.5 text-white" /></div>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Panel selector de tema */}
            {isThemePanelOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsThemePanelOpen(false)} />
                <div className="fixed bottom-4 right-[3.5rem] z-50 w-64 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tema de color</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Vinculado a tu cuenta</p>
                    </div>
                    <button
                      onClick={() => setIsThemePanelOpen(false)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {APP_THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setAppTheme(t.id); savePrefs({ appTheme: t.id }); }}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all ${
                          appTheme === t.id
                            ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30"
                            : "border-transparent bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700"
                        }`}
                      >
                        <div
                          className="h-8 w-8 rounded-full shadow ring-2 ring-white dark:ring-slate-800"
                          style={{ backgroundColor: t.preview }}
                        />
                        <span className="text-[10px] font-semibold leading-tight text-slate-700 dark:text-slate-200">{t.label}</span>
                        <span className="text-[9px] leading-tight text-slate-400 dark:text-slate-500">{t.description}</span>
                        {appTheme === t.id && (
                          <div className="rounded-full bg-emerald-500 p-0.5">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Panel selector de fondo */}
            {isBgPanelOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsBgPanelOpen(false)} />
                <div className="fixed bottom-4 right-[3.5rem] z-50 w-72 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Fondo de pantalla</span>
                    <button
                      onClick={() => setIsBgPanelOpen(false)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {BG_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSelectedBgKey(opt.key); savePrefs({ bgKey: opt.key }); }}
                        className={`relative aspect-video overflow-hidden rounded-xl border-2 transition-all ${
                          selectedBgKey === opt.key
                            ? "border-emerald-500 ring-2 ring-emerald-500/30"
                            : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <img src={opt.src} alt={opt.label} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/25" />
                        <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-semibold text-white drop-shadow">{opt.label}</span>
                        {selectedBgKey === opt.key && (
                          <div className="absolute right-1 top-1 rounded-full bg-emerald-500 p-0.5">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}

                    {/* Slot de imagen personalizada */}
                    {bgCustomUrl ? (
                      <div className="relative">
                        <button
                          onClick={() => { setSelectedBgKey("custom"); savePrefs({ bgKey: "custom" }); }}
                          className={`relative aspect-video w-full overflow-hidden rounded-xl border-2 transition-all ${
                            selectedBgKey === "custom"
                              ? "border-emerald-500 ring-2 ring-emerald-500/30"
                              : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          <img src={bgCustomUrl ?? undefined} alt="Mi fondo" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/25" />
                          <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-semibold text-white drop-shadow">Mi fondo</span>
                          {selectedBgKey === "custom" && (
                            <div className="absolute right-1 top-1 rounded-full bg-emerald-500 p-0.5">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </button>
                        <button
                          onClick={handleBgDelete}
                          title="Eliminar fondo personalizado"
                          className="absolute left-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-rose-600 transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => bgFileInputRef.current?.click()}
                        disabled={isUploadingBg}
                        className="relative aspect-video overflow-hidden rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 dark:hover:border-emerald-500 transition-all disabled:opacity-50"
                      >
                        {isUploadingBg
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Upload className="h-4 w-4" />
                        }
                        <span className="text-[9px] font-semibold">{isUploadingBg ? "Subiendo..." : "Subir imagen"}</span>
                      </button>
                    )}
                  </div>

                  {/* Input oculto para seleccionar archivo */}
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBgFileChange}
                  />

                  {/* Botón para cambiar imagen si ya existe una personalizada */}
                  {bgCustomUrl && (
                    <button
                      onClick={() => bgFileInputRef.current?.click()}
                      disabled={isUploadingBg}
                      className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {isUploadingBg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      {isUploadingBg ? "Subiendo..." : "Cambiar imagen personalizada"}
                    </button>
                  )}

                  <div className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Oscurecer fondo</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{bgOverlay}%</span>
                    </div>
                    <input
                      type="range" min={0} max={80} value={bgOverlay}
                      onChange={(e) => { const val = Number(e.target.value); setBgOverlay(val); savePrefs({ bgOverlay: val }); }}
                      className="w-full accent-emerald-500"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>Sin oscurecer</span>
                      <span>Máximo</span>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Transparencia de paneles</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{100 - containerAlpha}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={containerAlpha}
                      onChange={(e) => { const val = Number(e.target.value); setContainerAlpha(val); savePrefs({ containerAlpha: val }); }}
                      className="w-full accent-emerald-500"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>Transparente</span>
                      <span>Sólido</span>
                    </div>
                  </div>

                  {/* Slider 3: Desenfoque */}
                  <div className="border-t border-border/40 pt-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Desenfoque de paneles</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{containerBlur === 0 ? "Sin efecto" : `${containerBlur}px`}</span>
                    </div>
                    <input
                      type="range" min={0} max={20} value={containerBlur}
                      onChange={(e) => { const val = Number(e.target.value); setContainerBlur(val); savePrefs({ containerBlur: val }); }}
                      className="w-full accent-emerald-500"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>Sin efecto</span>
                      <span>Cristal esmerilado</span>
                    </div>
                  </div>

                  {/* ✅ Botón restablecer valores predeterminados con 100% de opacidad */}
                  <div className="border-t border-border/40 pt-3">
                    <button
                    onClick={() => {
                        setSelectedBgKey("default");
                        setBgOverlay(30);
                        setContainerAlpha(100);
                        setContainerBlur(0);
                        setAppTheme("emerald");
                        savePrefs({ bgKey: "default", bgOverlay: 30, containerAlpha: 100, containerBlur: 0, appTheme: "emerald" });
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restablecer predeterminado
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Barra flotante de herramientas */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse items-center gap-3">
              <Button
                type="button" variant="outline" size="icon"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                className="h-9 w-9 rounded-full border-[#3BBF82]/40 bg-white/85 text-slate-800 shadow-lg backdrop-blur hover:bg-white dark:bg-slate-900/85 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <button
                onClick={toggleToolbar}
                aria-label={isToolbarExpanded ? "Ocultar opciones" : "Mostrar opciones"}
                title={isToolbarExpanded ? "Ocultar opciones" : "Mostrar opciones"}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3BBF82]/50 bg-white/85 text-emerald-700 shadow-md backdrop-blur transition-colors hover:bg-white hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900/85 dark:text-emerald-400 dark:hover:bg-slate-900"
              >
                <ChevronUp className={`h-4 w-4 transition-transform duration-200 ${isToolbarExpanded ? "rotate-180" : ""}`} />
              </button>

              {isToolbarExpanded && (
                <>
                  <Button
                    type="button" variant="outline" size="icon"
                    onClick={() => { setIsBgPanelOpen(false); setIsThemePanelOpen(false); setIsLayoutPanelOpen(p => !p); }}
                    aria-label="Cambiar diseño del sistema"
                    title="Cambiar diseño del sistema"
                    className={`h-9 w-9 rounded-full border border-[#3BBF82]/60 bg-white/85 shadow-lg backdrop-blur hover:bg-white dark:border-emerald-700/60 dark:bg-slate-900/85 dark:hover:bg-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-150 ${isLayoutPanelOpen ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button" variant="outline" size="icon"
                    onClick={() => { setIsBgPanelOpen(false); setIsLayoutPanelOpen(false); setIsThemePanelOpen(p => !p); }}
                    aria-label="Cambiar tema de color"
                    title="Cambiar tema de color"
                    className={`h-9 w-9 rounded-full border border-[#3BBF82]/60 bg-white/85 shadow-lg backdrop-blur hover:bg-white dark:border-emerald-700/60 dark:bg-slate-900/85 dark:hover:bg-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-150 ${isThemePanelOpen ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    <Palette className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button" variant="outline" size="icon"
                    onClick={() => { setIsThemePanelOpen(false); setIsLayoutPanelOpen(false); setIsBgPanelOpen(p => !p); }}
                    aria-label="Cambiar fondo de pantalla"
                    title="Cambiar fondo de pantalla"
                    className={`h-9 w-9 rounded-full border-[#3BBF82]/40 bg-white/85 shadow-lg backdrop-blur hover:bg-white dark:bg-slate-900/85 dark:hover:bg-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-150 ${isBgPanelOpen ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>

                  {isAdmin && !isAdminTourOpen && (
                    <Button
                      type="button" variant="outline" size="icon"
                      onClick={() => setShowTourConfirm("admin")}
                      aria-label="Iniciar tutorial del sistema"
                      title="Iniciar tutorial del sistema"
                      className="h-9 w-9 rounded-full border border-[#3BBF82]/60 bg-white/85 text-emerald-600 shadow-lg backdrop-blur hover:bg-white hover:text-emerald-700 dark:border-emerald-700/60 dark:bg-slate-900/85 dark:text-emerald-400 dark:hover:bg-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-150"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {isDocente && !isDocenteTourOpen && (
                    <Button
                      type="button" variant="outline" size="icon"
                      onClick={() => setShowTourConfirm("docente")}
                      aria-label="Iniciar tutorial del sistema"
                      title="Iniciar tutorial del sistema"
                      className="h-9 w-9 rounded-full border border-[#3BBF82]/60 bg-white/85 text-emerald-600 shadow-lg backdrop-blur hover:bg-white hover:text-emerald-700 dark:border-emerald-700/60 dark:bg-slate-900/85 dark:text-emerald-400 dark:hover:bg-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-150"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>

            <Toaster />

            <Suspense fallback={null}>
              {isAdmin && (
                <TourOverlay
                  steps={adminTourSteps}
                  isOpen={isAdminTourOpen}
                  onClose={() => setIsAdminTourOpen(false)}
                  onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
                  onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
                  onNavigate={(view) => {
                    const [mainView, subParam] = view.split(":");
                    setCurrentView(mainView);
                    if (subParam) {
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("tour-sub-nav", { detail: subParam }));
                      }, 200);
                    }
                  }}
                />
              )}

              {isDocente && (
                <TourOverlay
                  steps={getDocenteTourSteps(
                    (user?.role === "docente" || (user?.roles?.includes("docente") ?? false)) && canAccessTutorias
                  )}
                  isOpen={isDocenteTourOpen}
                  onClose={() => setIsDocenteTourOpen(false)}
                  onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
                  onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
                  onNavigate={(view) => {
                    const [mainView, subParam] = view.split(":");
                    setCurrentView(mainView);
                    if (subParam) {
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("tour-sub-nav", { detail: subParam }));
                      }, 200);
                    }
                  }}
                />
              )}
            </Suspense>

            <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
              <DialogContent aria-describedby={undefined} className="rounded-3xl border border-emerald-200/80 bg-white/95 px-6 py-6 shadow-2xl shadow-emerald-300/20 dark:border-slate-700 dark:bg-slate-950/95">
                <DialogHeader>
                  <DialogTitle>¿Estás seguro que quieres salir del sistema?</DialogTitle>
                </DialogHeader>
                <DialogFooter className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={cancelLeave}>Cancelar</Button>
                  <Button onClick={confirmLeaveAndLogout}>Salir</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={unsavedChangesOpen} onOpenChange={cancelDiscardChanges}>
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl dark:border-slate-800/70 dark:bg-slate-950/90 dark:backdrop-blur-md">
                <DialogHeader>
                  <DialogTitle className="dark:text-white">¿Salir sin guardar?</DialogTitle>
                  <DialogDescription className="dark:text-slate-400">
                    Tienes cambios sin guardar en el formulario. Si te vas ahora, se perderá todo lo que hayas editado.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-row justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={cancelDiscardChanges} className="dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">
                    Seguir editando
                  </Button>
                  <Button variant="destructive" onClick={confirmDiscardChanges}>
                    Descartar cambios
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
              <DialogContent aria-describedby={undefined} className="rounded-3xl border border-emerald-200/80 bg-white/95 px-6 py-6 shadow-2xl shadow-emerald-300/20 dark:border-slate-700 dark:bg-slate-950/95">
                <DialogHeader>
                  <DialogTitle>¿Estás seguro que quieres salir del sistema?</DialogTitle>
                </DialogHeader>
                <DialogFooter className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>Cancelar</Button>
                  <Button onClick={() => { setLogoutConfirmOpen(false); logout(); }}>Salir</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        </TourContext.Provider>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}