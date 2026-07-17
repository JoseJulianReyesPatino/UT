import React, { useEffect, useLayoutEffect, useState } from "react";
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

// Actualiza el caché en memoria cuando el admin guarda cambios de configuración,
// sin esperar a que el TTL expire ni depender de que el consumidor esté montado.
export function updateFormsCache(backendCode: string, update: { roles: string[]; dueAt: string | null }) {
  if (!formsCache) return;
  formsCache = {
    ...formsCache,
    data: formsCache.data.map((f: any) =>
      String(f.form_code).replace(/_/g, "-") === backendCode
        ? { ...f, due_at: update.dueAt, access_roles: update.roles }
        : f
    ),
  };
}

interface FormAccessGuardProps {
  formId: FormId;
  title: string;
  children: React.ReactNode;
  tourForceOpen?: boolean;
}

export function FormAccessGuard(props: Readonly<FormAccessGuardProps>) {
  const { formId, title, children, tourForceOpen } = props;
  const { user } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Array<{
    id: number;
    title?: string;
    file_path?: string;
    submitted_at?: string;
    status?: string;
    materia?: string;
    has_file?: boolean;
    batch_id?: string;
    plan?: string;
    carrera_label?: string;
    cuatrimestre?: string;
    parcial?: string;
    group_code?: string;
    docente?: string;
    nota?: string;
  }>>([]);
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

  // Actualiza accessRule desde caché de forma SÍNCRONA antes de que el navegador pinte.
  // Esto evita el flash donde el título ya cambió al nuevo formulario pero el estado
  // "cerrado" del formulario anterior aún se muestra porque useEffect corre post-paint.
  useLayoutEffect(() => {
    const freshNow = Boolean(formsCache && Date.now() - formsCache.timestamp < FORMS_CACHE_TTL);
    if (freshNow) {
      setAccessRule(resolveAccessRule(formsCache!.data, formId));
      setAccessLoading(false);
    }
  }, [formId]);

  // Carga asíncrona desde la API y refresca si el caché expiró
  useEffect(() => {
    let cancelled = false;

    const freshNow = Boolean(formsCache && Date.now() - formsCache.timestamp < FORMS_CACHE_TTL);
    if (!freshNow) {
      // Si hay caché stale, usarla optimísticamente para evitar el flash de "cerrado"
      // mientras la red trae datos frescos. Sin esto: accessLoading=false + accessRule=null
      // → roleAllowed=false → se muestra FormClosedState brevemente.
      if (formsCache) {
        setAccessRule(resolveAccessRule(formsCache.data, formId));
      }
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

  // Actualización en tiempo real cuando el admin guarda la configuración de formularios.
  // El mensaje incluye los datos actualizados directamente, sin necesidad de llamada a la red.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel("form_config_changed");
    bc.onmessage = (event: MessageEvent) => {
      const msg = event.data ?? {};
      if (msg.formId !== formId) return;
      const newDueAt: string | null = msg.dueAt ?? null;
      const newRoles: FormRole[] = msg.roles ?? [];
      // Actualiza el caché compartido para que navegaciones futuras sean consistentes
      if (formsCache) {
        const backendCode = getBackendFormCode(formId);
        formsCache = {
          ...formsCache,
          data: formsCache.data.map((f: any) =>
            String(f.form_code).replace(/_/g, "-") === backendCode
              ? { ...f, due_at: newDueAt, access_roles: newRoles }
              : f
          ),
        };
      }
      setAccessRule({ roles: newRoles, dueAt: newDueAt });
    };
    return () => bc.close();
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

  // Agrupación por lote
  const groupedHistory = React.useMemo(() => {
    const groups = new Map<string, typeof history>();
    for (const doc of history) {
      const key = doc.batch_id ?? `single-${doc.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    }
    return Array.from(groups.values()).sort(
      (a, b) => new Date(b[0].submitted_at ?? 0).getTime() - new Date(a[0].submitted_at ?? 0).getTime()
    );
  }, [history]);

  const planLabelFor = (plan?: string) =>
    plan ? (String(plan).toLowerCase().includes("nuevo") ? "Plan Nuevo Modelo" : "Plan Normal") : undefined;

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

  // Vista previa del tour: formulario cerrado pero el tour necesita mostrar los campos.
  // El backdrop del tour (z-9997) bloquea todos los clics; inert bloquea teclado y foco.
  if (tourForceOpen) {
    const cloned = React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<any>, { deadlineInfo: null })
      : children;
    return (
      <div className="relative">
        <div
          className="sticky top-0 z-10 flex items-center justify-center bg-amber-500/90 px-4 py-2.5 text-center text-sm font-medium text-white backdrop-blur-sm dark:bg-amber-600/90"
          aria-live="polite"
        >
          Vista previa del tutorial — formulario no disponible para envíos
        </div>
        <div inert aria-hidden="true" className="pointer-events-none">
          {cloned}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Historial + Calendario, agrupados en la esquina superior derecha */}
      <div className="mx-auto flex max-w-2xl justify-end px-0 pt-2 sm:fixed sm:right-6 sm:top-44 sm:z-50 sm:mx-0 sm:max-w-none sm:px-0 sm:pt-0">
       <div className="flex flex-col items-end gap-2 rounded-2xl border border-white/20 bg-black/20 p-2 shadow-lg backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-950/40 sm:gap-2.5 sm:p-2.5">
          {user ? (
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button
                  data-tour="docente-history-btn"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full border-white/30 bg-white/15 text-white shadow-sm backdrop-blur-md hover:bg-white/25 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800/80"
                >
                  <History className="mr-2 h-4 w-4" />
                  Historial
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
                    <p className="text-sm text-muted-foreground dark:text-slate-400">Cargando...</p>
                  ) : groupedHistory.length > 0 ? (
                    <ScrollArea className="h-[min(78vh,44rem)] rounded-lg border border-border bg-background/40 pr-2 dark:border-slate-800/70 dark:bg-slate-900/30">
                      <div className="grid gap-3 p-1">
                        {groupedHistory.map((group) => {
                          const main = group[0];
                          const statuses = group.map((d) => String(d.status ?? "").toLowerCase());
                          const batchStatus = statuses.every((s) => s === "revisado")
                            ? "revisado"
                            : statuses.some((s) => s === "devuelto")
                            ? "devuelto"
                            : statuses.some((s) => s === "reenviado")
                            ? "reenviado"
                            : "pendiente";

                          const statusInfo = batchStatus === "revisado"
                            ? { text: "Revisado", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" }
                            : batchStatus === "devuelto"
                            ? { text: "Devuelto", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" }
                            : batchStatus === "reenviado"
                            ? { text: "Reenviado", cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" }
                            : { text: "Pendiente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };

                          return (
                            <div
                              key={main.batch_id ?? main.id}
                              className="rounded-xl border border-border bg-card p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/30 sm:rounded-2xl sm:p-5"
                            >
                              <div className="flex flex-col gap-2.5 sm:gap-4">
                                {/* Fecha y badge de estado */}
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-muted-foreground dark:text-slate-500 sm:text-xs">
                                    {main.submitted_at ? new Date(main.submitted_at).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Fecha no disponible"}
                                  </span>
                                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[10px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${statusInfo.cls}`}>
                                    {statusInfo.text}
                                  </span>
                                </div>

                                {/* Lista de archivos */}
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-slate-500 sm:text-[11px]">
                                    {group.length > 1 ? `${group.length} documentos enviados` : "Documento"}
                                  </p>
                                  <div className="space-y-1">
                                    {group.map((doc) => {
                                      const fileAvailable = doc.has_file !== false;
                                      return (
                                        <button
                                          key={doc.id}
                                          type="button"
                                          disabled={!fileAvailable}
                                          onClick={() => fileAvailable && openPreview(doc)}
                                          className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                                            fileAvailable
                                              ? "border-border/50 bg-muted/20 hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-slate-800/50 dark:hover:border-emerald-500/30 dark:hover:bg-slate-800/40"
                                              : "cursor-not-allowed border-dashed border-border/40 bg-muted/10 opacity-60 dark:border-slate-800/40"
                                          }`}
                                        >
                                          <span className="truncate text-xs font-semibold text-foreground dark:text-white sm:text-sm">
                                            {getFileName(doc)}
                                          </span>
                                          {fileAvailable
                                            ? <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground dark:text-slate-500" />
                                            : <span className="shrink-0 text-[10px] text-amber-600 dark:text-amber-500">No disponible</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Chips de información */}
                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
                                  {[
                                    { label: "Plan", value: planLabelFor(main.plan) },
                                    { label: "Carrera", value: main.carrera_label },
                                    { label: "Materia", value: main.materia },
                                    { label: "Grupo", value: main.group_code },
                                    { label: "Cuatrimestre", value: main.cuatrimestre },
                                    { label: "Parcial", value: main.parcial },
                                  ].filter((c) => c.value).map((chip) => (
                                    <div key={chip.label} className="flex items-start gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 dark:border-slate-800/60 dark:bg-slate-900/40 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2">
                                      <div className="min-w-0 w-full">
                                        <p className="text-[9px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 sm:text-[11px]">
                                          {chip.label}
                                        </p>
                                        <p className="text-xs font-medium leading-snug text-foreground break-words dark:text-slate-100 sm:text-sm">
                                          {chip.value}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Nota, si existe */}
                                {main.nota ? (
                                  <div className="flex items-start gap-1.5 rounded-lg border border-amber-200/70 bg-amber-50/60 px-2.5 py-1.5 dark:border-amber-900/40 dark:bg-amber-950/20 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2">
                                    <div className="min-w-0">
                                      <p className="text-[9px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400 sm:text-[11px]">
                                        Nota para administración
                                      </p>
                                      <p className="text-xs text-amber-900 break-words whitespace-pre-wrap dark:text-amber-100 sm:text-sm">
                                        {main.nota}
                                      </p>
                                    </div>
                                  </div>
                                ) : null}
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(getCalendarFileUrl(), "_blank")}
            className="shrink-0 rounded-full border-white/30 bg-white/15 text-white shadow-sm backdrop-blur-md hover:bg-white/25 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800/80"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Calendario
          </Button>
        </div>
      </div>

      <FormClosedState
        title={title}
        message={`El periodo para enviar ${title.toLowerCase()} ya finalizó. Si tienes dudas sobre tu entrega, contacta a administración.`}
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