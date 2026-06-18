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
    <div className="mx-auto max-w-5xl space-y-4">
      <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50 text-rose-900 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{title} no disponible</AlertTitle>
        <AlertDescription>
          {expired
            ? "El plazo asignado por el administrador ya venció."
            : "Tu rol no está autorizado para este formulario."}
        </AlertDescription>
      </Alert>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <FormClosedState
          title={title}
          message={`Si necesitas acceso, solicita al administrador que actualice la fecha de vencimiento o los roles permitidos para ${title.toLowerCase()}.`}
          historyAction={
            user ? (
              <SheetTrigger asChild>
                <Button className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:-translate-y-0.5">
                  <History className="mr-2 h-4 w-4" />
                  Ver historial
                </Button>
              </SheetTrigger>
            ) : null
          }
        />

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
  );
}
