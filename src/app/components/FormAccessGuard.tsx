import React, { useEffect, useState } from "react";
import { CalendarClock, FileText, History, ShieldAlert, Calendar } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { FormClosedState } from "./FormClosedState";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { apiFetch } from "../lib/api";
import { getFormAccessRule, isFormExpired, isFormRoleAllowed, type FormId } from "../../lib/formConfig";
import { getCalendarFileUrl } from "../lib/calendar";

interface FormAccessGuardProps {
  formId: FormId;
  title: string;
  children: React.ReactNode;
}


export function FormAccessGuard(props: Readonly<FormAccessGuardProps>) {
  const { formId, title, children } = props;
  const { user } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Array<{ id: number; title?: string; file_path?: string; submitted_at?: string; status?: string; materia?: string }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const hasRole = (role: "docente" | "tutor" | "administrador") => user?.role === role || user?.roles?.includes(role);

  if (!user || hasRole("administrador")) {
    return <>{children}</>;
  }

  const roleAllowed = (isFormRoleAllowed(formId, "docente") && hasRole("docente")) || (isFormRoleAllowed(formId, "tutor") && hasRole("tutor"));
  const expired = isFormExpired(formId);
  const dueAt = getFormAccessRule(formId).dueAt;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!user || hasRole("administrador")) {
        setHistory([]);
        return;
      }

      try {
        setIsLoadingHistory(true);

        const query: Record<string, string | number> = {
          uploaded_by: user.id,
          per_page: 50,
        };

        if (/^\d+$/.test(String(formId))) {
          query.form_id = Number(formId);
        } else {
          query.form_code = String(formId);
        }

        const res = await apiFetch("/documents", {
          query,
        });

        if (cancelled) return;

        setHistory(Array.isArray(res?.data) ? res.data : []);
      } catch (error) {
        if (!cancelled) {
          setHistory([]);
          console.error("Could not load form history", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formId, user]);

  if (roleAllowed && !expired) {
    if (!dueAt) {
      return <>{children}</>;
    }

    const deadlineDate = new Date(dueAt);
    const msLeft = deadlineDate.getTime() - Date.now();
    const hoursLeft = msLeft / (1000 * 60 * 60);
    const formattedDeadline = deadlineDate.toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const bannerClass = hoursLeft < 24
      ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
      : hoursLeft < 72
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
      : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200";

    return (
      <div className="space-y-4">
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${bannerClass}`}>
          <CalendarClock className="h-4 w-4 shrink-0" />
          <span>
            Este formulario cierra el <strong>{formattedDeadline}</strong>
            {hoursLeft < 24 && " · ¡Tiempo limitado!"}
          </span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Botón Ver Historial - Esquina superior derecha de la página */}
      {user ? (
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetTrigger asChild>
            <button className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5 dark:bg-slate-900 dark:text-emerald-400 dark:shadow-black/30 sm:right-6 sm:top-6">
              <History className="h-4 w-4" />
              Ver historial
            </button>
          </SheetTrigger>

          <SheetContent side="right" className="w-full sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Historial de archivos</SheetTitle>
              <SheetDescription>
                Revisa los documentos que ya subiste para {title.toLowerCase()}.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6">
              {isLoadingHistory ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : history.length > 0 ? (
                <ScrollArea className="h-[min(78vh,44rem)] pr-2">
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {item.title ?? item.file_path ?? `Documento #${item.id}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.materia ?? title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.submitted_at ? new Date(item.submitted_at).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Fecha no disponible"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  No hay archivos cargados en esta sesión para este formulario.
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      {/* Botón Calendario - Abajo del botón Ver Historial */}
      <div className="fixed right-4 top-16 z-50 sm:right-6 sm:top-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(getCalendarFileUrl(), "_blank")}
          className="rounded-full bg-white text-slate-700 shadow-lg shadow-black/10 dark:bg-slate-900 dark:text-slate-300 dark:shadow-black/30"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Calendario
        </Button>
      </div>

      <FormClosedState
        title={title}
        message={`Si necesitas acceso, solicita al administrador que actualice la fecha de vencimiento o los roles permitidos para ${title.toLowerCase()}.`}
      />
    </div>
  );
}
