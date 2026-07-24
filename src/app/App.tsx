import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { Login } from "./pages/Login";
import DocenteDashboard from "./pages/docente/DocenteDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { DocumentHistory } from "./pages/docente/DocumentHistory";
import { Messages } from "./pages/Messages";
import DocenteManagement from "./pages/admin/DocenteManagement";
import Tutores from "./pages/admin/Tutores";
import CiclosEscolares from "./pages/admin/CiclosEscolares";
import DocumentReview from "./pages/admin/DocumentReview";
import Configuration from "./pages/admin/Configuration";
import EstadiasAdmin from "./pages/admin/Estadias";
import CalendarioAdmin from "./pages/admin/Calendario";
import { Profile } from "./pages/docente/Profile";
import SupervisorPlaneacion from "./pages/supervisor/SupervisorPlaneacion";
import SupervisorInstrumentos from "./pages/supervisor/SupervisorInstrumentos";
import SupervisorDocPage from "./pages/supervisor/SupervisorDocPage";
import PlaneacionPage from "./pages/docente/Planeacion";
import Instrumento30Page from "./pages/docente/Instrumento30";
import Instrumento40Page from "./pages/docente/Instrumento40";
import Instrumento60Page from "./pages/docente/Instrumento60";
import Instrumento70Page from "./pages/docente/Instrumento70";
import RemedialPage from "./pages/docente/Remedial";
import LogoUTSLRC from "../assets/elementos/LogotipoUTSLRC.webp";
import LogoUTSLRCWhite from "../assets/elementos/LogotipoUTSLRC-BLANCO.webp";
import ListaConcentradaPage from "./pages/docente/ListaConcentrada";
import AsesoriaPage from "./pages/docente/Asesoria";
import PortafolioDigitalPage from "./pages/docente/PortafolioDigital";
import ActaFinalPage from "./pages/docente/ActaFinal";
import EstadiasPage from "./pages/docente/Estadias";
import TutoriasPage from "./pages/docente/Tutorias";
import { Sidebar } from "./components/Sidebar";
import { FormAccessGuard } from "./components/FormAccessGuard";
import { Alert, AlertDescription } from "./components/ui/alert";
import { getFormConfig, saveFormConfig, getFormIdsForBackendCode, type FormId } from "../lib/formConfig";
import { apiFetch } from "./lib/api";

import { toast } from "sonner";
import { Toaster } from "./components/ui/toast";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./components/ui/dialog";
import {
  Menu,
  Sun,
  Moon,
  HelpCircle,
} from "lucide-react";
import { TourOverlay } from "./components/tour/TourOverlay";
import { adminTourSteps } from "./tours/adminTourSteps";
import { getDocenteTourSteps } from "./tours/docenteTourSteps";
import { TourContext } from "./context/TourContext";

// IMPORTAR LAS IMÁGENES AQUÍ
import PlaneacionSuperiorImg from "../assets/elementos/superior_form.webp";
import Instrumento30SuperiorImg from "../assets/elementos/superior_form.webp";
import Instrumento40SuperiorImg from "../assets/elementos/superior_form.webp";
import Instrumento60SuperiorImg from "../assets/elementos/superior_form.webp";
import Instrumento70SuperiorImg from "../assets/elementos/superior_form.webp";
import RemedialSuperiorImg from "../assets/elementos/superior_form.webp";
import ListaConcentradaSuperiorImg from "../assets/elementos/superior_form.webp";
import PortafolioDigitalSuperiorImg from "../assets/elementos/superior_form.webp";
import AsesoriaSuperiorImg from "../assets/elementos/superior_form.webp";
import EstadiasSuperiorImg from "../assets/elementos/superior_form.webp";
import ActaFinalSuperiorImg from "../assets/elementos/superior_form.webp";
import TutoriasSuperiorImg from "../assets/elementos/superior_form.webp";



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
  const noticeBanner = notice ? (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 sm:top-6">
      <Alert
        variant={notice.type === "error" ? "destructive" : "default"}
        className={`pointer-events-auto w-[min(100%,36rem)] rounded-2xl border px-5 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-300 ${notice.type === "error"
          ? "border-rose-300/80 bg-rose-50/95 text-rose-950 dark:border-rose-800/80 dark:bg-rose-950/90 dark:text-rose-50"
          : "border-emerald-300/80 bg-emerald-50/95 text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-950/90 dark:text-emerald-50"
        }`}
      >
        <AlertDescription className="text-center text-sm font-semibold tracking-wide">
          {notice.message}
        </AlertDescription>
      </Alert>
    </div>
  ) : null;

  // Cubre el fondo sincrónicamente antes de que el browser pinte cuando hay logout
  useLayoutEffect(() => {
    if (prevIsAuthenticatedRef.current !== null && prevIsAuthenticatedRef.current !== isAuthenticated) {
      if (!isAuthenticated) {
        document.body.classList.add("splashing");
      }
    }
    prevIsAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Quita la clase splashing después de que el login haya renderizado
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

  // Efecto para manejar estado offline/online sin PWA
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
          return <AdminDashboard onNavigate={setCurrentView} />;
        case "docentes":
          return <DocenteManagement />;
        case "tutores":
          return <Tutores />;
        case "mensajes":
          return <Messages initialOpen={deferredMessageOpen} onConsume={() => setDeferredMessageOpen(null)} />;
        case "documentos":
          return <DocumentReview initialSection="pendientes" />;
        case "remediales":
          return <DocumentReview initialSection="pendientes" initialForm="Remedial" />;
        case "documentos-revisados":
          return <DocumentReview initialSection="revisados" />;
        case "documentos-revisados-hoy":
          return <DocumentReview initialSection="hoy" />;
        case "ciclos":
          return <CiclosEscolares />;
        case "estadias-admin":
          return <EstadiasAdmin />;
        case "calendario":
          return <CalendarioAdmin />;
        case "configuracion":
          return <Configuration onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />;
        case "configuracion-cuenta":
          return <Configuration initialTab="cuenta" onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />;
        default:
          return <AdminDashboard onNavigate={setCurrentView} />;
      }
    }

    if (isSupervisor) {
      const sections = user?.supervisorSections ?? [];

      switch (currentView) {
        case "supervisor-planeacion":
          return <SupervisorPlaneacion />;
        case "supervisor-instrumentos":
          return <SupervisorInstrumentos allowedSections={sections} />;
        case "supervisor-remedial":
          return <SupervisorDocPage title="Remedial" formCode="remedial" />;
        case "supervisor-lista-concentrada":
          return <SupervisorDocPage title="Lista Concentrada" formCode="lista-concentrada" />;
        case "supervisor-asesoria":
          return <SupervisorDocPage title="Asesoría" formCode="asesoria" />;
        case "supervisor-portafolio":
          return <SupervisorDocPage title="Portafolio Digital Final" formCode="portafolio-digital" hideColumns={['parcial']} />;
        case "supervisor-acta-final":
          return <SupervisorDocPage title="Acta Final" formCode="acta-final" hideColumns={['parcial']} />;
        case "supervisor-estadias":
          return <SupervisorDocPage title="Estadías" hideColumns={['materia', 'parcial']} formCodes={[
            { code: "estadias",           label: "Estadías" },
            { code: "carta-presentacion", label: "Carta de Presentación" },
            { code: "carta-aceptacion",   label: "Carta de Aceptación" },
            { code: "carta-terminacion",  label: "Carta de Terminación" },
          ]} />;
        case "supervisor-tutorias":
          return <SupervisorDocPage title="Tutorías" hideColumns={['materia', 'carrera', 'grupo', 'parcial']} formCodes={[
            { code: "carga-academica",        label: "Carga Académica" },
            { code: "reporte-bajas",          label: "Reporte de Bajas" },
            { code: "concentrado-asesorias",  label: "Concentrado de Asesorías" },
            { code: "acta-asistencia-grupal", label: "Acta de Asistencia Grupal" },
            { code: "ficha-tecnica",          label: "Ficha Técnica" },
          ]} />;
        case "perfil":
          return <Profile onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />;
        default:
          return <Profile onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />;
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
          return <DocenteDashboard onNavigate={setCurrentView} />;
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
          return <TutoriasPage />;
        case "tutorias-carga-academica":
          return wrapForm("carga-academica", "Carga Académica", <TutoriasPage initialType="carga-academica" onNavigateHome={() => setCurrentView("tutorias")} />);
        case "tutorias-reporte-bajas":
          return wrapForm("reporte-bajas", "Reporte de Bajas", <TutoriasPage initialType="reporte-bajas" onNavigateHome={() => setCurrentView("tutorias")} />);
        case "tutorias-concentrado-asesorias":
          return wrapForm("concentrado-asesorias", "Concentrado de Asesorías", <TutoriasPage initialType="concentrado-asesorias" onNavigateHome={() => setCurrentView("tutorias")} />);
        case "tutorias-acta-asistencia-grupal":
          return wrapForm("acta-asistencia-grupal", "Acta de Asistencia Grupal", <TutoriasPage initialType="acta-asistencia-grupal" onNavigateHome={() => setCurrentView("tutorias")} />);
        case "tutorias-ficha-tecnica":
          return wrapForm("ficha-tecnica", "Ficha Técnica", <TutoriasPage initialType="ficha-tecnica" onNavigateHome={() => setCurrentView("tutorias")} />);
        case "historial":
          return <DocumentHistory isTourActive={isDocenteTourOpen} />;
        case "mensajes":
          return <Messages initialOpen={deferredMessageOpen} onConsume={() => setDeferredMessageOpen(null)} />;
        case "perfil":
          return <Profile onDirtyChange={(dirty) => { formEditingRef.current = dirty; }} />;
        default:
          return <DocenteDashboard onNavigate={setCurrentView} />;
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
        <TourContext.Provider value={{ isAdminTourActive: isAdminTourOpen }}>
        <div
          className={`fixed inset-0 overflow-hidden${isSplashExiting ? " z-[9999] tv-iris-reveal" : " z-0"}`}
          style={{
            backgroundImage: theme === "dark"
              ? "url('/src/assets/elementos/ut_imagen14.webp')"
              : "linear-gradient(rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.10)), url('/src/assets/elementos/ut_imagen14.webp')",
            backgroundColor: theme === "dark" ? "#000000" : "transparent",
            backgroundBlendMode: theme === "dark" ? "normal" : "screen",
            backgroundPosition: "center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        >
          <div className={`flex h-screen overflow-hidden ${isLoggingOut ? "animate-page-exit" : ""} motion-reduce:animate-none`}>
            <Sidebar
              currentView={currentView}
              onNavigate={safeNavigate}
              mobileOpen={mobileSidebarOpen}
              onMobileOpenChange={setMobileSidebarOpen}
              onLogoutRequest={safeLogout}
            />
            <main className="relative flex-1 overflow-y-auto bg-transparent">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" />

              {/* IMÁGENES DECORATIVAS - HIJAS DIRECTAS DE <main> */}
              {currentView === "planeacion" && (
                <img
                  src={PlaneacionSuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
              )}

              {currentView === "instrumento-30-normal" && (
                <img
                  src={Instrumento30SuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
              )}

              {currentView === "instrumento-40-nuevo" && (
                <img
                  src={Instrumento40SuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
           )}

                {currentView === "instrumento-60-nuevo" && (
                <img
                  src={Instrumento60SuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
           )}

            {currentView === "instrumento-70-normal" && (
                <img
                  src={Instrumento70SuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
           )}

            {currentView === "remedial" && (
                <img
                  src={RemedialSuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
              )}

               {currentView === "lista-concentrada" && (
                <img
                  src={ListaConcentradaSuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
              )}

               {currentView === "asesoria" && (
                <img
                  src={AsesoriaSuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
              )}

               {currentView === "portafolio" && (
                <img
                  src={PortafolioDigitalSuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
              )}

              {currentView === "estadias" && (
                <img
                  src={EstadiasSuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
              )}

              {currentView === "acta-final" && (
                <img
                  src={ActaFinalSuperiorImg}
                  alt="Decoración superior"
                  className="hidden md:block pointer-events-none select-none absolute w-24 sm:w-32 lg:w-44 opacity-90 z-0"
                  style={{ top: '-0.5rem', right: '0.1rem' }}
                />
              )}

               {currentView === "tutorias" && (
                <img
                  src={TutoriasSuperiorImg}
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
                {renderContent()}
              </div>
            </main>

            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsAdminTourOpen(true)}
                aria-label="Iniciar tutorial del sistema"
                title="Iniciar tutorial del sistema"
                className="fixed bottom-16 right-4 z-50 h-9 w-9 rounded-full border-[#3BBF82]/40 bg-white/85 text-emerald-600 shadow-lg backdrop-blur hover:bg-white hover:text-emerald-700 dark:bg-slate-900/85 dark:text-emerald-400 dark:hover:bg-slate-900"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}

            {isDocente && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsDocenteTourOpen(true)}
                aria-label="Iniciar tutorial del sistema"
                title="Iniciar tutorial del sistema"
                className="fixed bottom-16 right-4 z-50 h-9 w-9 rounded-full border-[#3BBF82]/40 bg-white/85 text-emerald-600 shadow-lg backdrop-blur hover:bg-white hover:text-emerald-700 dark:bg-slate-900/85 dark:text-emerald-400 dark:hover:bg-slate-900"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className="fixed bottom-4 right-4 z-50 h-9 w-9 rounded-full border-[#3BBF82]/40 bg-white/85 text-slate-800 shadow-lg backdrop-blur hover:bg-white dark:bg-slate-900/85 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Toaster />

            {isAdmin && (
              <TourOverlay
                steps={adminTourSteps}
                isOpen={isAdminTourOpen}
                onClose={() => setIsAdminTourOpen(false)}
                onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
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
                  // Mostrar tutorías solo si el usuario tiene rol docente Y tutor simultáneamente.
                  // Tutor puro → ya conoce la sección; docente puro → no aparece en su menú.
                  (user?.role === "docente" || (user?.roles?.includes("docente") ?? false)) && canAccessTutorias
                )}
                isOpen={isDocenteTourOpen}
                onClose={() => setIsDocenteTourOpen(false)}
                onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
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

            <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
              <DialogContent className="rounded-3xl border border-emerald-200/80 bg-white/95 px-6 py-6 shadow-2xl shadow-emerald-300/20 dark:border-slate-700 dark:bg-slate-950/95">
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
              <DialogContent className="rounded-3xl border border-emerald-200/80 bg-white/95 px-6 py-6 shadow-2xl shadow-emerald-300/20 dark:border-slate-700 dark:bg-slate-950/95">
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