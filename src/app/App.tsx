import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { Login } from "./pages/Login";
import DocenteDashboard from "./pages/docente/DocenteDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { DocumentHistory } from "./pages/DocumentHistory";
import { Messages } from "./pages/Messages";
import DocenteManagement from "./pages/admin/DocenteManagement";
import Tutores from "./pages/admin/Tutores";
import CiclosEscolares from "./pages/admin/CiclosEscolares";
import DocumentReview from "./pages/admin/DocumentReview";
import Configuration from "./pages/admin/Configuration";
import { Profile } from "./pages/docente/Profile";
import PlaneacionPage from "./pages/docente/Planeacion";
import Instrumento3040Page from "./pages/docente/Instrumento3040";
import Instrumento6070Page from "./pages/docente/Instrumento6070";
import ListaConcentradaPage from "./pages/docente/ListaConcentrada";
import AsesoriaPage from "./pages/docente/Asesoria";
import PortafolioDigitalPage from "./pages/docente/PortafolioDigital";
import ActaFinalPage from "./pages/docente/ActaFinal";
import EstadiasPage from "./pages/docente/Estadias";
import TutoriasPage from "./pages/docente/Tutorias";
import { Sidebar } from "./components/Sidebar";

import { Toaster } from "./components/ui/toast";
import { Button } from "./components/ui/button";
import { Menu } from "lucide-react";

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? "/src/assets/Logotipo UTSLRC-BLANCO.png" : "/src/assets/Logotipo  UTSLRC.png";
  const [currentView, setCurrentView] = useState("dashboard");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [deferredMessageOpen, setDeferredMessageOpen] = useState<null | { conversationId?: number; recipientName?: string; recipientRole?: string; document?: { id: number; title: string } }>(null);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoggingOut(false);
    } else {
      setMobileSidebarOpen(false);
    }
  }, [isAuthenticated]);

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

  // logout handled by AuthContext logout directly where needed

  if (!isAuthenticated) {
    return (
      <div className="animate-page-enter motion-reduce:animate-none">
        <Login />
      </div>
    );
  }

  const renderContent = () => {
    if (user?.role === "docente") {
      switch (currentView) {
        case "dashboard":
          return <DocenteDashboard />;
        case "planeacion":
          return <PlaneacionPage />;
        case "instrumento-30":
          return <Instrumento3040Page />;
        case "instrumento-60":
          return <Instrumento6070Page />;
        case "lista-concentrada":
          return <ListaConcentradaPage />;
        case "asesoria":
          return <AsesoriaPage />;
        case "portafolio":
          return <PortafolioDigitalPage />;
        case "acta-final":
          return <ActaFinalPage />;
        case "estadias":
          return <EstadiasPage />;
        case "tutorias":
          return <TutoriasPage />;
        case "historial":
          return <DocumentHistory />;
        case "mensajes":
          return <Messages initialOpen={deferredMessageOpen} onConsume={() => setDeferredMessageOpen(null)} />;
        case "perfil":
          return <Profile />;
        default:
          return <DocenteDashboard />;
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
          return <Messages />;
        case "documentos":
          return <DocumentReview initialSection="pendientes" />;
        case "documentos-revisados":
          return <DocumentReview initialSection="revisados" />;
        case "documentos-revisados-hoy":
          return <DocumentReview initialSection="hoy" />;
        case "ciclos":
          return <CiclosEscolares />;
        case "configuracion":
          return <Configuration />;
        default:
          return <AdminDashboard onNavigate={setCurrentView} />;
      }
    }
  };

  return (
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
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-emerald-50 via-background to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
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
      <Toaster />
    </div>
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