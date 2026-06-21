import React, { useEffect, useState } from "react";
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
import { getFormConfig, saveFormConfig, type FormId } from "../lib/formConfig";
import { apiFetch } from "./lib/api";
import { getDeferredPrompt, onBeforeInstallPrompt, type BeforeInstallPromptEvent } from "./lib/pwaInstall";

import { Toaster } from "./components/ui/toast";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./components/ui/dialog";
import {
  Menu,
  Sun,
  Moon,
  Download,
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
  Library,
  Shapes,
  Compass,
  Badge,
  Sparkles,
  ClipboardCheck,
  Users2,
  Star,
  FileBadge,
  ShieldCheck,
} from "lucide-react";

const pageDecorIcons = [
  { icon: GraduationCap, className: "left-[3%] top-[8%] h-14 w-14 rotate-[-11deg]" },
  { icon: School, className: "right-[5%] top-[6%] h-16 w-16 rotate-[10deg]" },
  { icon: BookOpenText, className: "left-[18%] top-[58%] h-11 w-11 rotate-[7deg]" },
  { icon: Landmark, className: "right-[20%] top-[52%] h-12 w-12 rotate-[-6deg]" },
  { icon: Building2, className: "left-[48%] top-[9%] h-10 w-10 rotate-[15deg]" },
  { icon: NotebookPen, className: "right-[6%] bottom-[12%] h-11 w-11 rotate-[-10deg]" },
  { icon: Backpack, className: "left-[2%] bottom-[8%] h-10 w-10 rotate-[6deg]" },
  { icon: PencilLine, className: "right-[36%] top-[18%] h-9 w-9 rotate-[-8deg]" },
  { icon: ClipboardList, className: "left-[62%] bottom-[15%] h-9 w-9 rotate-[7deg]" },
  { icon: HeartHandshake, className: "left-[70%] top-[22%] h-10 w-10 rotate-[5deg]" },
  { icon: ScrollText, className: "left-[30%] top-[4%] h-9 w-9 rotate-[11deg]" },
  { icon: CircleDollarSign, className: "right-[42%] top-[63%] h-10 w-10 rotate-[-9deg]" },
  { icon: Trophy, className: "left-[74%] bottom-[18%] h-10 w-10 rotate-[14deg]" },
  { icon: Microscope, className: "left-[56%] top-[72%] h-9 w-9 rotate-[-7deg]" },
  { icon: Atom, className: "right-[28%] top-[2%] h-8 w-8 rotate-[18deg]" },
  { icon: BriefcaseBusiness, className: "left-[88%] top-[33%] h-9 w-9 rotate-[-5deg]" },
  { icon: BadgeCheck, className: "left-[42%] bottom-[3%] h-9 w-9 rotate-[10deg]" },
  { icon: Presentation, className: "left-[24%] bottom-[18%] h-10 w-10 rotate-[-11deg]" },
  { icon: Library, className: "right-[12%] top-[35%] h-9 w-9 rotate-[8deg]" },
  { icon: Shapes, className: "left-[80%] top-[68%] h-8 w-8 rotate-[-12deg]" },
  { icon: Compass, className: "left-[12%] top-[32%] h-8 w-8 rotate-[14deg]" },
  { icon: Badge, className: "right-[2%] top-[44%] h-8 w-8 rotate-[6deg]" },
  { icon: Sparkles, className: "left-[66%] top-[3%] h-7 w-7 rotate-[-14deg]" },
  { icon: ClipboardCheck, className: "left-[7%] top-[74%] h-9 w-9 rotate-[9deg]" },
  { icon: Users2, className: "right-[48%] bottom-[6%] h-9 w-9 rotate-[12deg]" },
  { icon: Star, className: "left-[38%] top-[82%] h-7 w-7 rotate-[-10deg]" },
  { icon: FileBadge, className: "right-[15%] top-[78%] h-9 w-9 rotate-[13deg]" },
  { icon: ShieldCheck, className: "left-[84%] bottom-[5%] h-8 w-8 rotate-[-8deg]" },
];

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
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(() => getDeferredPrompt());
  const [isInstallAvailable, setIsInstallAvailable] = useState(() => Boolean(getDeferredPrompt()));
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [minimumLoadingElapsed, setMinimumLoadingElapsed] = useState(false);
  const [isSplashExiting, setIsSplashExiting] = useState(false);
  const canAccessTutorias = user?.role === "tutor" || user?.roles?.includes("tutor");
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
      setCurrentView("dashboard");
      sessionStorage.setItem(currentViewStorageKey, "dashboard");
    } else {
      sessionStorage.setItem(currentViewStorageKey, currentView);
    }
    setIsLoggingOut(false);
  }, [currentView, isAuthenticated, isReady, user?.role]);

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
          const formCode = String(form.form_code).replace(/_/g, '-') as FormId;
          if (formCode in nextAccess) {
            nextAccess[formCode] = {
              roles: form.access_roles ?? nextAccess[formCode].roles,
              dueAt: form.due_at ?? nextAccess[formCode].dueAt,
            };
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
    if (!isReady) {
      setMinimumLoadingElapsed(false);
      setIsSplashExiting(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setMinimumLoadingElapsed(true);
    }, 1_500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !minimumLoadingElapsed) {
      setIsSplashExiting(false);
      return;
    }

    setIsSplashExiting(true);
    const timer = window.setTimeout(() => {
      setIsSplashExiting(false);
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isReady, minimumLoadingElapsed]);

  const cancelLeave = () => setLeaveDialogOpen(false);

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;

    await deferredInstallPrompt.prompt();

    const choiceResult = await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
    setIsInstallAvailable(false);

    console.log('PWA install choice:', choiceResult.outcome);
  };

  useEffect(() => {
    const unsubscribe = onBeforeInstallPrompt((prompt) => {
      setDeferredInstallPrompt(prompt);
      setIsInstallAvailable(Boolean(prompt));
    });

    const appInstalledHandler = () => {
      setDeferredInstallPrompt(null);
      setIsInstallAvailable(false);
      console.log('PWA installed successfully');
    };

    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      unsubscribe();
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  // logout handled by AuthContext logout directly where needed

  const shouldShowSplash = !isReady || !minimumLoadingElapsed || isSplashExiting;

  if (shouldShowSplash) {
    return (
      <div className={isSplashExiting ? "tv-fullscreen tv-loader-exit relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-sm text-muted-foreground" : "tv-fullscreen relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-sm text-muted-foreground"}>
        <div className={isSplashExiting ? "tv-loader-group tv-loader-group-exit relative z-10 flex flex-col items-center justify-center gap-6 px-6 text-center" : "tv-loader-group relative z-10 flex flex-col items-center justify-center gap-6 px-6 text-center"}>
          <img
            src={splashLogoSrc}
            alt="Logo UTSLRC"
            className="tv-loader-image tv-image-same-size select-none object-contain"
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {noticeBanner}
        <div className="animate-page-enter motion-reduce:animate-none">
          <Login />
        </div>
      </>
    );
  }

  const confirmLeaveAndLogout = () => {
    setLeaveDialogOpen(false);
    logout();
  };

  const renderContent = () => {
    if (user?.role !== "administrador") {
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
    } else {
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
  };

  return (
    <>
      {noticeBanner}
      <div className={`flex h-screen overflow-hidden bg-background ${isLoggingOut ? "animate-page-exit" : "animate-page-enter"} motion-reduce:animate-none`}>
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            setMobileSidebarOpen(false);
          }}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <main className="relative flex-1 overflow-y-auto bg-gradient-to-br from-emerald-50 via-background to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-12 top-8 h-44 w-44 rounded-full bg-emerald-100/20 blur-3xl dark:bg-emerald-500/5" />
            <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-sky-100/10 blur-3xl dark:bg-sky-500/5" />
            {pageDecorIcons.map(({ icon: Icon, className }, index) => (
              <span
                key={`${Icon.displayName ?? "icon"}-${index}`}
                className={`absolute text-emerald-300/12 dark:text-emerald-200/8 ${className}`}
              >
                <Icon className="h-full w-full" />
              </span>
            ))}
          </div>
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

        {currentView !== "configuracion" && currentView !== "configuracion-cuenta" && (
          <>
            {isInstallAvailable && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleInstallApp}
                aria-label="Instalar aplicación"
                title="Instalar aplicación"
                className="fixed bottom-16 right-4 z-50 h-9 w-9 rounded-full border-[#3BBF82]/40 bg-white/85 text-slate-800 shadow-lg backdrop-blur hover:bg-white dark:bg-slate-900/85 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                <Download className="h-4 w-4" />
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
          </>
        )}

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