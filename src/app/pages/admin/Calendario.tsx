import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Download, Eye, FileUp, Loader2, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { apiFetch } from "../../lib/api";
import { getCalendarDownloadUrl, getCalendarFileUrl } from "../../lib/calendar";

type CalendarMeta = {
  id: number | null;
  name: string;
  uploadedAt: string | null;
  isActive: boolean;
};

interface CalendarioAdminProps {
  layoutStyle?: string;
}

export function CalendarioAdmin({ layoutStyle }: CalendarioAdminProps) {
  const isFormal = layoutStyle === "formal";
  const [calendar, setCalendar] = useState<CalendarMeta | null>(null);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      setIsLoadingCalendar(true);
      try {
        const response = await apiFetch("/calendar");
        const data = response?.data;
        setCalendar({
          id: data?.id ?? null,
          name: data?.file_name ?? "Calendario25-26.pdf",
          uploadedAt: data?.uploaded_at ?? null,
          isActive: Boolean(data?.is_active),
        });
      } catch {
        setCalendar({
          id: null,
          name: "Calendario25-26.pdf",
          uploadedAt: null,
          isActive: false,
        });
      } finally {
        setIsLoadingCalendar(false);
      }
    })();
  }, []);

  const calendarSrc = useMemo(() => getCalendarFileUrl(calendar?.uploadedAt ?? "base"), [calendar?.uploadedAt]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("El archivo debe ser un PDF");
      return;
    }
    setPendingFile(file);
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile) return;
    const file = pendingFile;
    setPendingFile(null);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiFetch("/calendar", {
        method: "POST",
        body: formData,
      });
      const data = response?.data;
      setCalendar({
        id: data?.id ?? null,
        name: data?.file_name ?? file.name,
        uploadedAt: data?.uploaded_at ?? new Date().toISOString(),
        isActive: Boolean(data?.is_active ?? true),
      });
      toast.success("Calendario actualizado");
    } catch {
      toast.error("No se pudo cargar el calendario");
    } finally {
      setIsLoading(false);
    }
  };

  const uploadedLabel = calendar?.uploadedAt
    ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(new Date(calendar.uploadedAt))
    : null;

  const confirmDialog = (
    <Dialog open={!!pendingFile} onOpenChange={(open) => { if (!open) setPendingFile(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Reemplazar calendario vigente?</DialogTitle>
          <DialogDescription>
            Se sobreescribirá el archivo actual con <span className="font-medium text-foreground">{pendingFile?.name}</span>. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setPendingFile(null)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => void handleUploadConfirm()}>Reemplazar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  /* ── Modo empresarial ── */
  if (isFormal) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden text-foreground gap-0 bg-card dark:bg-slate-950">
        {/* Encabezado plano */}
        <div className="shrink-0 border-b border-border bg-card px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Calendario</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Sube el calendario institucional y revísalo antes de publicarlo.</p>
        </div>

        {/* Input oculto compartido */}
        <Input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} disabled={isLoading} />

        {/* Barra de controles móvil — fuera del body para no afectar el flex-row del visor */}
        <div className="shrink-0 border-b border-border bg-card px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950 sm:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="success" size="sm" className="gap-1.5 rounded-sm text-xs" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {isLoading ? "Subiendo..." : "Subir"}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-sm text-xs" disabled={isLoading || !calendar} onClick={() => window.open(calendarSrc, "_blank", "noopener,noreferrer")}>
              <Eye className="h-3.5 w-3.5" />Abrir PDF
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-sm text-xs" disabled={isLoading || !calendar} onClick={() => window.open(getCalendarDownloadUrl(), "_blank", "noopener,noreferrer")}>
              <Download className="h-3.5 w-3.5" />Descargar
            </Button>
            {!isLoadingCalendar && calendar && (
              <div className="ml-auto flex items-center gap-2 text-xs">
                <FileUp className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="max-w-[110px] truncate text-slate-600 dark:text-slate-300">{calendar.name}</span>
                <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${calendar.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {calendar.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cuerpo: siempre flex-row para que el visor PDF calcule el zoom correctamente */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Panel lateral — oculto en móvil */}
          <div className="hidden sm:flex w-60 shrink-0 flex-col border-r border-border bg-card overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
            <div className="p-4 space-y-5">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Acciones</p>
                <div className="space-y-2">
                  <Button type="button" variant="success" size="sm" className="w-full justify-start gap-2 rounded-sm text-xs" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {isLoading ? "Subiendo..." : "Subir calendario"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2 rounded-sm text-xs" disabled={isLoading || !calendar} onClick={() => window.open(calendarSrc, "_blank", "noopener,noreferrer")}>
                    <Eye className="h-3.5 w-3.5" />Abrir PDF
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2 rounded-sm text-xs" disabled={isLoading || !calendar} onClick={() => window.open(getCalendarDownloadUrl(), "_blank", "noopener,noreferrer")}>
                    <Download className="h-3.5 w-3.5" />Descargar
                  </Button>
                </div>
              </div>
              <div className="border-t border-border/60 pt-4 dark:border-slate-800/60">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Archivo vigente</p>
                {isLoadingCalendar ? (
                  <div className="space-y-2">
                    <div className="animate-pulse h-3 w-32 rounded bg-muted" />
                    <div className="animate-pulse h-3 w-24 rounded bg-muted" />
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <FileUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="break-all text-slate-700 dark:text-slate-300">{calendar?.name ?? "Sin archivo"}</span>
                    </div>
                    {uploadedLabel && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <span>Subido el {uploadedLabel}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${calendar?.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                        {calendar?.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visor PDF */}
          <div className="flex-1 min-h-0 overflow-hidden bg-card dark:bg-slate-950">
            {isLoadingCalendar ? (
              <div className="animate-pulse h-full w-full bg-muted/30" />
            ) : (
              <iframe
                src={`${calendarSrc}#toolbar=1&navpanes=0&zoom=page-width`}
                className="h-full w-full"
                title="Calendario institucional"
              />
            )}
          </div>
        </div>

        {confirmDialog}
      </div>
    );
  }

  /* ── Modo clásico ── */
  return (
    <div className="relative space-y-6 overflow-hidden">
      <div data-component="page-banner" className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-5 shadow-[0_24px_90px_-35px_color-mix(in_oklch,var(--color-emerald-500)_35%,transparent)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_oklch,var(--color-emerald-500)_16%,transparent),_transparent_42%)]" />
        <div className="relative space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Calendario</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Sube el calendario institucional y revísalo antes de publicarlo.</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[22px] border-border/70 bg-card shadow-sm dark:border-emerald-900/30 dark:bg-slate-950/60 dark:backdrop-blur-md">
        <CardHeader>
          <CardTitle>Calendario vigente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCalendar ? (
            <div className="space-y-4" aria-busy="true" aria-label="Cargando calendario">
              <div className="flex flex-wrap items-center gap-3">
                <div className="animate-pulse h-9 w-40 rounded-lg bg-muted" />
                <div className="animate-pulse h-9 w-28 rounded-lg bg-muted" />
                <div className="animate-pulse h-9 w-28 rounded-lg bg-muted" />
              </div>
              <div className="animate-pulse rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="h-3.5 w-24 rounded-full bg-muted" />
                <div className="h-3 w-48 rounded-full bg-muted" />
              </div>
              <div className="animate-pulse overflow-hidden rounded-2xl border border-border bg-muted/30 h-[72vh] w-full" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="success" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                  {isLoading ? "Subiendo..." : "Subir calendario"}
                </Button>
                <Input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} disabled={isLoading} />
                <Button type="button" variant="outline" disabled={isLoading || !calendar} onClick={() => window.open(calendarSrc, "_blank", "noopener,noreferrer")}>
                  <Eye className="mr-2 h-4 w-4" />Abrir PDF
                </Button>
                <Button type="button" variant="outline" disabled={isLoading || !calendar} onClick={() => window.open(getCalendarDownloadUrl(), "_blank", "noopener,noreferrer")}>
                  <Download className="mr-2 h-4 w-4" />Descargar
                </Button>
              </div>

              <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:bg-slate-900/90">
                <p className="text-sm font-medium text-foreground">Archivo actual</p>
                <p className="text-sm text-muted-foreground">{calendar?.name ?? "Calendario25-26.pdf"}</p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-background">
                <iframe
                  src={`${calendarSrc}#toolbar=1&navpanes=0`}
                  className="h-[72vh] w-full"
                  title="Calendario institucional"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {confirmDialog}
    </div>
  );
}

export default CalendarioAdmin;
