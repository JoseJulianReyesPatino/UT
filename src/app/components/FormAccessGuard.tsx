import React, { useEffect, useState } from "react";
import { FileText, History, ShieldAlert } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { FormClosedState } from "./FormClosedState";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { apiFetch } from "../lib/api";
import { isFormExpired, isFormRoleAllowed, type FormId } from "../../lib/formConfig";

interface FormAccessGuardProps {
  formId: FormId;
  title: string;
  children: React.ReactNode;
}

const roleLabels = {
  docente: "Docente",
  tutor: "Tutor",
  administrador: "Administrador",
} as const;

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
  const configuredRoleLabels = ["docente", "tutor"]
    .filter((role) => isFormRoleAllowed(formId, role as "docente" | "tutor"))
    .map((role) => roleLabels[role as "docente" | "tutor"]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!user || hasRole("administrador")) {
        setHistory([]);
        return;
      }

      try {
        setIsLoadingHistory(true);
        const res = await apiFetch("/documents", {
          query: {
            uploaded_by: user.id,
            form_id: formId,
            per_page: 50,
          },
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

  const historyCount = history.length;

  if (roleAllowed && !expired) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50 text-rose-900 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{title} no disponible</AlertTitle>
        <AlertDescription>
          {expired
            ? "El plazo asignado por el administrador ya venció."
            : "Tu rol no está autorizado para este formulario."}
        </AlertDescription>
      </Alert>

      <FormClosedState
        title={title}
        message={`Si necesitas acceso, solicita al administrador que actualice la fecha de vencimiento o los roles permitidos para ${title.toLowerCase()}.`}
      />

      {user ? (
        <div className="rounded-[1.75rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-4 shadow-sm dark:border-amber-900/60 dark:from-amber-950/30 dark:via-slate-950 dark:to-emerald-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700 dark:text-amber-200">
                Consulta rápida
              </p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Tus archivos siguen disponibles
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Aunque este formulario esté cerrado, puedes revisar el historial de documentos que ya subiste.
              </p>
            </div>

            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button className="h-auto min-w-[15rem] rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform hover:-translate-y-0.5 hover:shadow-xl dark:shadow-emerald-950/40">
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                      <History className="h-5 w-5" />
                    </span>
                    <span className="flex flex-col items-start text-left leading-tight">
                      <span>Historial de archivos</span>
                      <span className="text-xs font-normal text-white/80">
                        {isLoadingHistory ? "Cargando..." : `${historyCount} documento${historyCount === 1 ? "" : "s"}`}
                      </span>
                    </span>
                  </span>
                </Button>
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
                                  {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "Fecha no disponible"}
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
