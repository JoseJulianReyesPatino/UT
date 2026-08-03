import React, { createContext, useContext } from "react";

/** Cuando es true, el DocumentHistoryCard oculta los botones de acción. */
export const HistorialReadOnlyContext = createContext(false);
import { ArrowLeft, Calendar, CalendarClock, History } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { getCalendarFileUrl } from "../lib/calendar";
import gallosMascot from "../../assets/elementos/Form_Not_Found.webp";

export interface FormalFormLayoutProps {
  /** Nombre del formulario; se muestra en el header y en la fila "Formulario" del estado cerrado. */
  title: string;
  /** Si se provee, el header muestra "<label> / {title}" con botón de regreso (para formularios multi-tipo). */
  backButton?: { label: string; onClick: () => void };

  /* ── Estado de acceso ── */
  isLoading: boolean;
  canSubmit: boolean;

  /* ── Fecha límite (estado abierto) ── */
  deadlineInfo?: { formattedDeadline: string; isUrgent: boolean } | null;

  /* ── Sheet de historial ── */
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  historialDescription?: string;
  historialContent: React.ReactNode;

  /* ── Slots de contenido (estado abierto) ── */
  editingBanners?: React.ReactNode;
  leftColumn: React.ReactNode;
  rightColumn: React.ReactNode;
  footerActions: React.ReactNode;
  dialogs?: React.ReactNode;
}

export function FormalFormLayout({
  title,
  backButton,
  isLoading,
  canSubmit,
  deadlineInfo,
  sheetOpen,
  onSheetOpenChange,
  historialDescription,
  historialContent,
  editingBanners,
  leftColumn,
  rightColumn,
  footerActions,
  dialogs,
}: FormalFormLayoutProps) {
  const headerTitle = backButton ? (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <button
        type="button"
        onClick={backButton.onClick}
        className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backButton.label}
      </button>
      <span className="shrink-0 text-slate-300 dark:text-slate-700">/</span>
      <span className="truncate text-xs font-semibold text-slate-900 dark:text-white">{title}</span>
    </div>
  ) : (
    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
  );

  const historialSheet = (
    <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-muted dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Historial</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-x-hidden overflow-y-auto sm:max-w-xl dark:border-slate-800/70 dark:bg-slate-950/60 dark:backdrop-blur-md"
        overlayClassName="bg-black/30 dark:bg-black/20 backdrop-blur-[2px]"
      >
        <SheetHeader>
          <SheetTitle className="dark:text-white">Historial de archivos</SheetTitle>
          <SheetDescription className="dark:text-slate-400">
            {historialDescription ?? "Selecciona un documento para ver, descargar o editar."}
          </SheetDescription>
        </SheetHeader>
        <HistorialReadOnlyContext.Provider value={!canSubmit}>
          <div className="mt-4 space-y-4 overflow-x-hidden pb-4">{historialContent}</div>
        </HistorialReadOnlyContext.Provider>
      </SheetContent>
    </Sheet>
  );

  /* ── Formulario cerrado ── */
  if (!isLoading && !canSubmit) {
    return (
      <>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            {headerTitle}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(getCalendarFileUrl(), "_blank")}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-muted dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Calendario</span>
            </button>
            {historialSheet}
          </div>
        </div>
        <div className="flex flex-col divide-border sm:flex-row sm:divide-x dark:divide-slate-800">
          <div className="flex flex-col items-center justify-center gap-3 border-b border-border px-8 py-8 sm:w-64 sm:shrink-0 sm:border-b-0 dark:border-slate-800">
            <img
              src={gallosMascot}
              alt=""
              width={180}
              height={180}
              loading="eager"
              fetchPriority="high"
              className="h-40 w-40 select-none object-contain"
              draggable={false}
            />
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              Formulario cerrado
            </span>
          </div>
          <div className="flex flex-1 flex-col divide-y divide-border dark:divide-slate-800">
            <div className="px-6 py-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Estado del formulario</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                El período de entrega para este formulario ha concluido
              </p>
            </div>
            <div className="grid grid-cols-[9rem_1fr] items-center gap-3 px-6 py-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Formulario</span>
              <span className="text-sm font-medium text-slate-800 dark:text-white">{title}</span>
            </div>
            <div className="grid grid-cols-[9rem_1fr] items-center gap-3 px-6 py-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Estado</span>
              <span className="inline-flex items-center gap-1.5 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="font-medium text-red-700 dark:text-red-400">No disponible</span>
              </span>
            </div>
            <div className="grid grid-cols-[9rem_1fr] items-start gap-3 px-6 py-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Acción</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Contacta a administración si tienes dudas sobre tu entrega anterior
              </span>
            </div>
            <div className="grid grid-cols-[9rem_1fr] items-center gap-3 px-6 py-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Historial</span>
              <button
                type="button"
                onClick={() => onSheetOpenChange(true)}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                <History className="h-3.5 w-3.5" />
                Ver documentos enviados
              </button>
            </div>
          </div>
        </div>
      </div>
      {dialogs}
      </>
    );
  }

  /* ── Formulario abierto ── */
  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:h-[calc(100vh-64px)] dark:border-slate-800 dark:bg-slate-950">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-4 border-b border-border px-6 py-3 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2">
            {headerTitle}
            {deadlineInfo && (
              <span
                className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  deadlineInfo.isUrgent
                    ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                }`}
              >
                <CalendarClock className="h-3 w-3" />
                Cierra el {deadlineInfo.formattedDeadline}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(getCalendarFileUrl(), "_blank")}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-muted dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Calendario</span>
            </button>
            {historialSheet}
          </div>
        </div>

        {/* Banners de edición */}
        {editingBanners}

        {/* Columnas */}
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto sm:flex-row sm:overflow-hidden sm:divide-x divide-border dark:divide-slate-800">
          {leftColumn}
          {rightColumn}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-border px-6 py-3 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 dark:text-slate-500">* campos obligatorios</p>
          <div className="flex items-center gap-2">{footerActions}</div>
        </div>
      </div>

      {dialogs}
    </>
  );
}
