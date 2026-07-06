import React, { useEffect, useState } from "react";
import { CalendarClock, Eye, FileText, History, Calendar } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { FormClosedState } from "./FormClosedState";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { apiFetch } from "../lib/api";
import { fetchDocumentBlob } from "../lib/documents";
import { getBackendFormCode, type FormId, type FormRole } from "../../lib/formConfig";
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
  const [previewItem, setPreviewItem] = useState<{ id: number; nombre: string } | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Nuevo estado para acceso desde API
  const [accessRule, setAccessRule] = useState<{ roles: FormRole[]; dueAt: string | null } | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessNetworkError, setAccessNetworkError] = useState(false);

  const hasRole = (role: "docente" | "tutor" | "administrador") => user?.role === role || user?.roles?.includes(role);

  // Cargar reglas de acceso desde la API en cada carga
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setAccessLoading(true);
      try {
        const res = await apiFetch("/forms");
        const forms = res?.data ?? [];
        const backendCode = getBackendFormCode(formId);
        const match = forms.find((item: any) => String(item.form_code).replace(/_/g, "-") === backendCode);
        if (!cancelled) {
          setAccessRule(
            match
              ? { roles: match.access_roles ?? [], dueAt: match.due_at ?? null }
              : { roles: [], dueAt: null }
          );
        }
      } catch (error) {
        console.error("Could not load form access rule", error);
        if (!cancelled) {
          setAccessNetworkError(true);
          setAccessRule({ roles: [], dueAt: null });
        }
      } finally {
        if (!cancelled) setAccessLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [formId]);

  const roleAllowed = Boolean(
    accessRule &&
    ((accessRule.roles.includes("docente") && hasRole("docente")) ||
      (accessRule.roles.includes("tutor") && hasRole("tutor")))
  );
  const dueAt = accessRule?.dueAt ?? null;
  const expired = Boolean(dueAt && new Date(dueAt).getTime() < Date.now());

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

  const getFileName = (item: { title?: string; file_path?: string; id: number }): string => {
    const t = (item.title ?? '').toString().trim();
    if (t && !/^undefined\b/i.test(t)) {
      const parts = t.split(' - ');
      const last = (parts.length > 1 ? parts[parts.length - 1] : t).trim();
      return /\.pdf$/i.test(last) ? last : last + '.pdf';
    }
    const p = (item.file_path ?? '').toString();
    if (p) {
      const raw = decodeURIComponent(p.split('?')[0].split('/').pop() ?? '');
      const cleaned = raw.replace(/^doc_[^_]+_/, '');
      return cleaned ? (/\.pdf$/i.test(cleaned) ? cleaned : cleaned + '.pdf') : 'Documento.pdf';
    }
    return `Documento #${item.id}.pdf`;
  };

  const openPreview = async (item: { id: number; title?: string; file_path?: string }) => {
    const nombre = getFileName(item);
    setPreviewItem({ id: item.id, nombre });
    setPreviewBlobUrl(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const blob = await fetchDocumentBlob(item.id);
      setPreviewBlobUrl(URL.createObjectURL(blob));
    } catch {
      setPreviewError('No fue posible cargar el documento.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewBlobUrl(null);
    setPreviewItem(null);
    setPreviewError(null);
  };

  // Pantalla de carga mientras se resuelve la consulta
  if (accessLoading) {
    return (
      <div className="flex min-h-[60vh] items-end justify-center pb-32">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent mx-auto" />
          <p className="text-base font-medium text-white drop-shadow">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error de red — distinto de "formulario cerrado"
  if (accessNetworkError) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <FormClosedState
          title={title}
          message="No fue posible verificar el acceso al formulario. Revisa tu conexión a internet e intenta recargar la página."
        />
      </div>
    );
  }

  // Acceso concedido
  if (roleAllowed && !expired) {
    const deadlineDate = dueAt ? new Date(dueAt) : null;
    const msLeft = deadlineDate ? deadlineDate.getTime() - Date.now() : null;
    const hoursLeft = msLeft !== null ? msLeft / (1000 * 60 * 60) : null;
    const formattedDeadline = deadlineDate
      ? deadlineDate.toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })
      : null;

    const deadlineInfo = formattedDeadline
      ? { formattedDeadline, isUrgent: hoursLeft !== null && hoursLeft < 24 }
      : null;

    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, { deadlineInfo });
    }

    return <>{children}</>;
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
                        role="button"
                        tabIndex={0}
                        onClick={() => openPreview(item)}
                        onKeyDown={(e) => e.key === 'Enter' && openPreview(item)}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="break-words text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {getFileName(item)}
                            </p>
                            {item.materia && <p className="text-xs text-muted-foreground">{item.materia}</p>}
                            <p className="text-xs text-muted-foreground">
                              {item.submitted_at ? new Date(item.submitted_at).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Fecha no disponible"}
                            </p>
                          </div>
                          <Eye className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
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

      {/* Diálogo de vista previa */}
      <Dialog open={previewItem !== null} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewItem?.nombre ?? 'Documento'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewLoading ? (
              <div className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
                <p>Cargando...</p>
              </div>
            ) : previewError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                {previewError}
              </div>
            ) : previewBlobUrl ? (
              <object data={previewBlobUrl} type="application/pdf" className="h-[82vh] w-full rounded-lg border border-border">
                <a href={previewBlobUrl} target="_blank" rel="noopener noreferrer" className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-primary underline">
                  Abrir documento en nueva pestaña
                </a>
              </object>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}