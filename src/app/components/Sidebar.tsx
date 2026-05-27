import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { cn } from "../../lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  FileText,
  BarChart3,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  FileStack,
  CalendarDays,
  Briefcase,
  FolderOpen,
  History,
  User,
  LayoutDashboard,
  FileArchive,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar(props: Readonly<SidebarProps>) {
  const { currentView, onNavigate, mobileOpen, onMobileOpenChange } = props;
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  // Sidebar starts expanded for both admin and docente.
  const [collapsed, setCollapsed] = useState(false);
  const logoSrc = theme === "dark" ? "/src/assets/Logotipo UTSLRC-BLANCO.png" : "/src/assets/Logotipo  UTSLRC.png";
  const canAccessTutorias = user?.role === "tutor" || user?.roles?.includes("tutor");
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [instrumento3040Open, setInstrumento3040Open] = useState(true);
  const [instrumento6070Open, setInstrumento6070Open] = useState(true);

  const instrumento3040Children = useMemo(
    () => [
      { id: "instrumento-30-normal", label: "Instrumento 30%", description: "Plan Normal" },
      { id: "instrumento-40-nuevo", label: "Instrumento 40%", description: "Plan Nuevo Modelo" },
    ],
    [],
  );

  const instrumento6070Children = useMemo(
    () => [
      { id: "instrumento-60-nuevo", label: "Instrumento 60%", description: "Plan Nuevo Modelo" },
      { id: "instrumento-70-normal", label: "Instrumento 70%", description: "Plan Normal" },
    ],
    [],
  );

  useEffect(() => {
    if (instrumento3040Children.some((item) => item.id === currentView)) {
      setInstrumento3040Open(true);
    }
    if (instrumento6070Children.some((item) => item.id === currentView)) {
      setInstrumento6070Open(true);
    }
  }, [currentView, instrumento3040Children, instrumento6070Children]);

  const docenteMenuItems = [
    { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
    { id: "planeacion", label: "Planeación", icon: FileText },
    { id: "lista-concentrada", label: "Lista Concentrada", icon: FileStack },
    { id: "asesoria", label: "Asesoría", icon: Users },
    { id: "portafolio", label: "Portafolio Digital", icon: FolderOpen },
    { id: "acta-final", label: "Acta Final", icon: FileText },
    { id: "estadias", label: "Estadías", icon: Briefcase },
    { id: "tutorias", label: "Tutorías", icon: CalendarDays },
    { id: "mensajes", label: "Mensajes", icon: MessageSquare },
    { id: "historial", label: "Historial PDFs", icon: History },
    { id: "perfil", label: "Mi Perfil", icon: User },
  ];

  const adminMenuItems = [
    { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
    { id: "docentes", label: "Gestión Usuarios", icon: Users },
    { id: "tutores", label: "Tutores", icon: CalendarDays },
    { id: "estadias-admin", label: "Estadías", icon: FileArchive },
    { id: "calendario", label: "Calendario", icon: CalendarDays },
    { id: "documentos", label: "Documentos", icon: FileText },
    { id: "ciclos", label: "Ciclos Escolares", icon: CalendarDays },
    { id: "mensajes", label: "Mensajes", icon: MessageSquare },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ];

  const menuItems = user?.role === "administrador"
    ? adminMenuItems
    : canAccessTutorias
    ? docenteMenuItems
    : docenteMenuItems.filter((item) => item.id !== "tutorias");

  const isInstrumento3040Active = instrumento3040Children.some((item) => item.id === currentView);
  const isInstrumento6070Active = instrumento6070Children.some((item) => item.id === currentView);

  const isMenuItemActive = (itemId: string) => {
    if (itemId === "documentos") {
      return ["documentos", "documentos-revisados", "documentos-revisados-hoy"].includes(currentView);
    }
    if (itemId === "tutorias") {
      return canAccessTutorias && [
        "tutorias",
        "tutorias-carga-academica",
        "tutorias-reporte-bajas",
        "tutorias-concentrado-asesorias",
        "tutorias-acta-asistencia-grupal",
        "tutorias-ficha-tecnica",
      ].includes(currentView);
    }
    return currentView === itemId;
  };

  const renderContent = (isMobile = false) => {
    const isCollapsedLocal = isMobile ? false : collapsed;
    const containerClass = cn(
      "relative h-full overflow-hidden flex flex-col border-r border-emerald-200/70 bg-gradient-to-b from-emerald-50 via-white to-cyan-50/60 text-sidebar-foreground shadow-[0_12px_40px_rgba(16,185,129,0.08)] transition-all duration-300 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900",
      isCollapsedLocal ? "w-16" : "w-64"
    );

    return (
      <div className={containerClass}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-400/10 to-transparent dark:from-emerald-500/10" />
      <div className="p-4 border-b border-sidebar-border/70 bg-background/60 backdrop-blur-sm">
        <div className="relative flex items-center justify-end">
          {!isCollapsedLocal && (
              <div className="absolute left-1/2 -translate-x-1/2">
              <img
                src={logoSrc}
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
            <Button
            variant="ghost"
            size="icon"
            onClick={() => {
                setCollapsed((prev) => !prev);
            }}
            aria-label={isCollapsedLocal ? "Expandir sidebar" : "Colapsar sidebar"}
            title={isCollapsedLocal ? "Expandir sidebar" : "Colapsar sidebar"}
            className="h-8 w-8 rounded-full border border-emerald-200/70 bg-white/80 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-emerald-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsedLocal && "rotate-180")} />
          </Button>
        </div>
      </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isMenuItemActive(item.id);
            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => {
                    onNavigate(item.id);
                    if (isMobile) {
                      if (onMobileOpenChange) onMobileOpenChange(false);
                      return;
                    }

                    setCollapsed(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                    isActive
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25"
                      : "text-slate-700 hover:bg-emerald-100/70 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-emerald-300"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-emerald-600 dark:text-emerald-300")} />
                  {!isCollapsedLocal && <span className="font-medium">{item.label}</span>}
                </button>

                {!isCollapsedLocal && user?.role !== "administrador" && item.id === "planeacion" && (
                  <div className="space-y-1 pl-4 pt-1">
                    <button
                      type="button"
                      onClick={() => setInstrumento3040Open((value) => !value)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                        isInstrumento3040Active
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25"
                          : "text-slate-700 hover:bg-emerald-100/70 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-emerald-300",
                      )}
                    >
                      <BarChart3 className={cn("h-5 w-5 shrink-0", isInstrumento3040Active ? "text-white" : "text-emerald-600 dark:text-emerald-300")} />
                      <span className="font-medium flex-1">Instrumento 30/40%</span>
                      {instrumento3040Open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {instrumento3040Open && (
                      <div className="space-y-1 pl-4">
                        {instrumento3040Children.map((child) => {
                          const isChildActive = currentView === child.id;
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => {
                                onNavigate(child.id);
                                if (isMobile) {
                                  onMobileOpenChange?.(false);
                                  return;
                                }
                                setCollapsed(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left text-sm",
                                isChildActive
                                  ? "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100"
                                  : "text-slate-600 hover:bg-emerald-100/60 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-emerald-200",
                              )}
                            >
                              <ChevronRight className={cn("h-4 w-4 shrink-0", isChildActive ? "text-emerald-700 dark:text-emerald-200" : "text-emerald-500 dark:text-emerald-400")} />
                              <div className="min-w-0 text-left">
                                <div className="font-medium">{child.label}</div>
                                <div className="text-xs opacity-80">{child.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setInstrumento6070Open((value) => !value)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                        isInstrumento6070Active
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25"
                          : "text-slate-700 hover:bg-emerald-100/70 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-emerald-300",
                      )}
                    >
                      <BarChart3 className={cn("h-5 w-5 shrink-0", isInstrumento6070Active ? "text-white" : "text-emerald-600 dark:text-emerald-300")} />
                      <span className="font-medium flex-1">Instrumento 60/70%</span>
                      {instrumento6070Open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {instrumento6070Open && (
                      <div className="space-y-1 pl-4">
                        {instrumento6070Children.map((child) => {
                          const isChildActive = currentView === child.id;
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => {
                                onNavigate(child.id);
                                if (isMobile) {
                                  onMobileOpenChange?.(false);
                                  return;
                                }
                                setCollapsed(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left text-sm",
                                isChildActive
                                  ? "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100"
                                  : "text-slate-600 hover:bg-emerald-100/60 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-emerald-200",
                              )}
                            >
                              <ChevronRight className={cn("h-4 w-4 shrink-0", isChildActive ? "text-emerald-700 dark:text-emerald-200" : "text-emerald-500 dark:text-emerald-400")} />
                              <div className="min-w-0 text-left">
                                <div className="font-medium">{child.label}</div>
                                <div className="text-xs opacity-80">{child.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

        <div className="p-4 border-t border-sidebar-border/70 space-y-3 bg-background/60 backdrop-blur-sm">
        {!isCollapsedLocal && (
            <button
              type="button"
              onClick={() => {
                const targetView = user?.role === "administrador" ? "configuracion-cuenta" : "perfil";
                onNavigate(targetView);
                if (isMobile && onMobileOpenChange) onMobileOpenChange(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-cyan-50 shadow-sm transition-colors hover:bg-emerald-100/70 dark:border-slate-700 dark:from-slate-900 dark:to-slate-950 dark:hover:bg-slate-800 text-left"
            >
            <Avatar className="h-8 w-8 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                {user?.avatar && (
                  <AvatarImage
                    src={user.avatar}
                    alt={user.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAvatarOpen(true);
                    }}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer"
                  />
                )}
              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
            </div>
            </button>
        )}
        <Button
          variant="ghost"
          size={isCollapsedLocal ? "icon" : "default"}
          onClick={() => {
            logout();
            if (onMobileOpenChange) onMobileOpenChange(false);
          }}
          aria-label="Cerrar sesión"
          className="w-full shrink-0 justify-start rounded-xl border border-emerald-200/70 bg-white/80 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-emerald-300 dark:hover:bg-slate-800"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsedLocal && <span className="ml-3">Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
    );
  };

  // Render: desktop hidden on small screens, mobile drawer when `mobileOpen` is true
  return (
    <>
      <div className="hidden md:flex">{renderContent(false)}</div>

      {/* Mobile drawer */}
      <div className={cn("md:hidden fixed inset-0 z-40", mobileOpen ? "" : "hidden")}>
        <button
          type="button"
          aria-label="Cerrar menú"
          className="absolute inset-0 bg-black/40"
          onClick={() => onMobileOpenChange?.(false)}
        />
        <div className="absolute left-0 top-0 bottom-0 w-64">
          {renderContent(true)}
        </div>
      </div>
      <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
            <DialogDescription>Vista previa de tu imagen de perfil</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-center">
            {user?.avatar ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img src={user.avatar} alt={`Foto de perfil de ${user?.name}`} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
            ) : (
              <div className="h-40 w-40 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-2xl">
                {user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
