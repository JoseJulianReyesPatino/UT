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
import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard";
import SupervisorPlaneacion from "./pages/supervisor/SupervisorPlaneacion";
import SupervisorInstrumentos from "./pages/supervisor/SupervisorInstrumentos";
import SupervisorDocPage from "./pages/supervisor/SupervisorDocPage";
import PlaneacionPage from "./pages/docente/Planeacion";
import Instrumento30Page from "./pages/docente/Instrumento30";
import Instrumento40Page from "./pages/docente/Instrumento40";
import Instrumento60Page from "./pages/docente/Instrumento60";
import Instrumento70Page from "./pages/docente/Instrumento70";
import RemedialPage from "./pages/docente/Remedial";
import LogoUTSLRC from "../assets/LogotipoUTSLRC.webp";
import LogoUTSLRCWhite from "../assets/LogotipoUTSLRC-BLANCO.webp";
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
} from "lucide-react";

function AppContent() {
  const { isAuthenticated, isReady, user, notice, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const logoSrc = theme === "dark" ? "/src/assets/LogotipoUTSLRC-BLANCO.webp" : "/src/assets/LogotipoUTSLRC.webp";
  const splashLogoSrc = theme === "dark" ? LogoUTSLRCWhite : LogoUTSLRC;
  const currentViewStorageKey = "utslrc-current-view";
  const [currentView, setCurrentView] = useState(() => sessionStorage.getItem(currentViewStorageKey) ?? "dashboard");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [deferredMessageOpen, setDeferredMessageOpen] = useState<null | { conversationId?: number; recipientName?: string; recipientRole?: string; document?: { id: number; title: string; filePath?: string } }>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [minimumLoadingElapsed, setMinimumLoadingElapsed] = useState(false);
  const [isSplashExiting, setIsSplashExiting] = useState(false);
  const prevIsAuthenticatedRef = useRef<boolean | null>(null);
  const initialSplashPlayedRef = useRef(false);
  const canAccessTutorias = user?.role === "tutor" || user?.roles?.includes("tutor");
  const isSupervisor = user?.role === "supervisor" || user?.roles?.includes("supervisor");
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
  }, [currentView, isAuthenticated, isReady, user?.role, user?.supervisorSections]);

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

    // Ambas actualizaciones en el mismo callback → React 18 las agrupa en un
    // solo render, evitando el flash de un frame donde shouldShowSplash=false
    // antes de que isSplashExiting sea true.
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

  // CAMBIO: quitamos "splashing" del body en cuanto isReady es true (no esperamos
  // a que termine la animación). El contenido real ya queda montado debajo del
  // overlay opaco del splash, así que el cambio de fondo nunca se ve.
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

  // CAMBIO: el splash ahora es un overlay fixed con z-index alto, que se renderiza
  // ENCIMA del contenido real (Login o Dashboard), en vez de sustituirlo. Así, cuando
  // se desvanece (fade), revela el contenido que ya está montado debajo — nunca el
  // fondo "pelón" de la página.
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
          return <Configuration />;
        case "configuracion-cuenta":
          return <Configuration initialTab="cuenta" />;
        default:
          return <AdminDashboard onNavigate={setCurrentView} />;
      }
    }

    if (isSupervisor) {
      const sections = user?.supervisorSections ?? [];
      const defaultView = sections.includes("planeacion")
        ? "supervisor-planeacion"
        : sections.some((s) => ["instrumento-30","instrumento-40","instrumento-60","instrumento-70"].includes(s))
        ? "supervisor-instrumentos"
        : null;

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
          return <Profile />;
        default:
          if (defaultView) {
            return defaultView === "supervisor-planeacion" ? <SupervisorPlaneacion /> : <SupervisorInstrumentos allowedSections={sections} />;
          }
          return <Profile />;
      }
    }

    {
      const wrapForm = (formId: Parameters<typeof FormAccessGuard>[0]["formId"], title: string, element: React.ReactNode) => (
        <FormAccessGuard formId={formId} title={title}>
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
          return wrapForm("planeacion", "Planeación", <PlaneacionPage />);
        case "instrumento-30-normal":
          return wrapForm("instrumento-30-normal", "Instrumento 30%", <Instrumento30Page />);
        case "instrumento-40-nuevo":
          return wrapForm("instrumento-40-nuevo", "Instrumento 40%", <Instrumento40Page />);
        case "instrumento-60-nuevo":
          return wrapForm("instrumento-60-nuevo", "Instrumento 60%", <Instrumento60Page />);
        case "instrumento-70-normal":
          return wrapForm("instrumento-70-normal", "Instrumento 70%", <Instrumento70Page />);
        case "remedial":
          return wrapForm("remedial", "Remedial", <RemedialPage />);
        case "lista-concentrada":
          return wrapForm("lista-concentrada", "Lista Concentrada", <ListaConcentradaPage />);
        case "asesoria":
          return wrapForm("asesoria", "Asesoría", <AsesoriaPage />);
        case "portafolio":
          return wrapForm("portafolio-digital", "Portafolio Digital", <PortafolioDigitalPage />);
        case "acta-final":
          return wrapForm("acta-final", "Acta Final", <ActaFinalPage />);
        case "estadias":
          return wrapForm("estadias", "Estadías", <EstadiasPage />);
        case "tutorias":
          return wrapForm("tutorias", "Tutorías", <TutoriasPage />);
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
          return <DocumentHistory />;
        case "mensajes":
          return <Messages initialOpen={deferredMessageOpen} onConsume={() => setDeferredMessageOpen(null)} />;
        case "perfil":
          return <Profile />;
        default:
          return <DocenteDashboard onNavigate={setCurrentView} />;
      }
    }
  };

  return (
    <>
      {/* Splash siempre en posición 0 — fiber position estable, sin remount */}
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

      {/* Login — iris se abre desde círculo pequeño hacia afuera */}
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

      {/* Dashboard autenticado — iris se abre desde círculo pequeño hacia afuera */}
      {isReady && isAuthenticated && (
        <div
          className={`fixed inset-0 overflow-hidden${isSplashExiting ? " z-[9999] tv-iris-reveal" : " z-0"}`}
          style={{
            backgroundImage: theme === "dark"
              ? "url('/src/assets/ut_imagen14.png')"
              : "linear-gradient(rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.10)), url('/src/assets/ut_imagen14.png')",
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
              onNavigate={(view) => {
                setCurrentView(view);
                setMobileSidebarOpen(false);
              }}
              mobileOpen={mobileSidebarOpen}
              onMobileOpenChange={setMobileSidebarOpen}
            />
            <main className="relative flex-1 overflow-y-auto bg-transparent">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" />
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
          </div>
        </div>
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