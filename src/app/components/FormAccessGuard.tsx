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

// Caché en memoria compartida entre todos los FormAccessGuard de la app.
// Evita volver a pedir /forms cada vez que el usuario cambia de formulario,
// que es lo que causaba el "flash" o retraso del chip de fecha límite.
let formsCache: { data: any[]; timestamp: number } | null = null;
let formsCachePromise: Promise<any[]> | null = null;
const FORMS_CACHE_TTL = 2 * 60 * 1000; // 2 minutos

function fetchFormsWithCache(): Promise<any[]> {
  if (formsCachePromise) return formsCachePromise;

  formsCachePromise = apiFetch("/forms")
    .then((res) => {
      const forms = res?.data ?? [];
      formsCache = { data: forms, timestamp: Date.now() };
      // Disparar evento para notificar que los forms están disponibles
      window.dispatchEvent(new CustomEvent('ut-forms-loaded', { detail: { forms } }));
      return forms;
    })
    .finally(() => {
      formsCachePromise = null;
    });

  return formsCachePromise;
}

// Función para precargar forms desde AuthContext
export function preloadForms(): Promise<any[]> {
  if (formsCache && Date.now() - formsCache.timestamp < FORMS_CACHE_TTL) {
    return Promise.resolve(formsCache.data);
  }
  return fetchFormsWithCache();
}

interface FormAccessGuardProps {
  formId: FormId;
  title: string;
  children: React.ReactNode;
}

export function FormAccessGuard(props: Readonly<FormAccessGuardProps>) {
  const { formId, title, children } = props;
  const { user } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Array<{ id: number; title?: string; file_path?: string; submitted_at?: string; status?: string; materia?: string; has_file?: boolean }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [previewItem, setPreviewItem] = useState<{ id: number; nombre: string } | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const resolveAccessRule = (formsList: any[], targetFormId: FormId) => {
    const backendCode = getBackendFormCode(targetFormId);
    const match = formsList.find((item: any) => String(item.form_code).replace(/_/g, "-") === backendCode);
    return match
      ? { roles: match.access_roles ?? [], dueAt: match.due_at ?? null }
      : { roles: [], dueAt: null };
  };

  const hasFreshCache = Boolean(formsCache && Date.now() - formsCache.timestamp < FORMS_CACHE_TTL);

  // Nuevo estado para acceso desde API — si ya hay caché fresca, se usa de
  // inmediato (síncrono) sin esperar red, así cambiar de formulario no
  // muestra ningún retraso ni parpadeo.
  const [accessRule, setAccessRule] = useState<{ roles: FormRole[]; dueAt: string | null } | null>(
    () => (hasFreshCache ? resolveAccessRule(formsCache!.data, formId) : null)
  );
  const [accessLoading, setAccessLoading] = useState(!hasFreshCache);
  const [accessNetworkError, setAccessNetworkError] = useState(false);

  const hasRole = (role: "docente" | "tutor" | "administrador") => user?.role === role || user?.roles?.includes(role);

  // Cargar reglas de acceso desde la API, usando y refrescando la caché compartida
  useEffect(() => {
    let cancelled = false;

    const freshNow = Boolean(formsCache && Date.now() - formsCache.timestamp < FORMS_CACHE_TTL);
    if (freshNow) {
      setAccessRule(resolveAccessRule(formsCache!.data, formId));
      setAccessLoading(false);
    } else {
      setAccessLoading(!formsCache);
    }

    void (async () => {
      try {
        const forms = await fetchFormsWithCache();
        if (!cancelled) {
          setAccessRule(resolveAccessRule(forms, formId));
        }
      } catch (error) {
        console.error("Could not load form access rule", error);
        if (!cancelled) {
          setAccessNetworkError(true);
          if (!formsCache) setAccessRule({ roles: [], dueAt: null });
        }
      } finally {
        if (!cancelled) setAccessLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [formId]);

  // Escuchar evento de forms precargados
  useEffect(() => {
    const handleFormsLoaded = (event: CustomEvent) => {
      const forms = event.detail?.forms ?? [];
      if (forms.length > 0) {
        setAccessRule(resolveAccessRule(forms, formId));
        setAccessLoading(false);
      }
    };

    window.addEventListener('ut-forms-loaded', handleFormsLoaded as EventListener);
    return () => {
      window.removeEventListener('ut-forms-loaded', handleFormsLoaded as EventListener);
    };
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

  // IMPORTANTE: no renderizar una pantalla de carga aquí.
  // Mientras la API responde, mostramos el formulario asumiendo acceso permitido
  // (stale-while-revalidate). El backend igual valida permisos reales al enviar
  // el formulario, así que esto es solo una capa de UX, no de seguridad.
  // Si accessLoading muestra un loader, el usuario ve un "flash" en cada
  // navegación — no lo reintroduzcas.

  if (accessLoading) {
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, { deadlineInfo: null });
    }
    return <>{children}</>;
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
                    {history.map((item) => {
                      const fileAvailable = item.has_file !== false;
                      return (
                        <div
                          key={item.id}
                          role={fileAvailable ? "button" : undefined}
                          tabIndex={fileAvailable ? 0 : undefined}
                          onClick={() => fileAvailable && openPreview(item)}
                          onKeyDown={(e) => fileAvailable && e.key === 'Enter' && openPreview(item)}
                          className={fileAvailable
                            ? "cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                            : "rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 opacity-60 dark:border-slate-800 dark:bg-slate-900/40"}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`rounded-xl p-2 shrink-0 ${fileAvailable ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"}`}>
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
                              {!fileAvailable && (
                                <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
                                  Archivo no disponible en el servidor
                                </p>
                              )}
                            </div>
                            {fileAvailable
                              ? <Eye className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
                              : <span className="text-xs text-slate-400">—</span>}
                          </div>
                        </div>
                      );
                    })}
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