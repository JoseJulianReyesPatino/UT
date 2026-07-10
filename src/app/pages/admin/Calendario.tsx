import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, FileUp, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
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

export function CalendarioAdmin() {
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

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Calendario</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Sube el calendario institucional y revísalo antes de publicarlo.</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Calendario vigente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCalendar ? (
            <div className="space-y-4" aria-busy="true" aria-label="Cargando calendario">
              {/* Fila de botones */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="animate-pulse h-9 w-40 rounded-lg bg-muted" />
                <div className="animate-pulse h-9 w-28 rounded-lg bg-muted" />
                <div className="animate-pulse h-9 w-28 rounded-lg bg-muted" />
              </div>
              {/* Caja "Archivo actual" */}
              <div className="animate-pulse rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <div className="h-3.5 w-24 rounded-full bg-muted" />
                <div className="h-3 w-48 rounded-full bg-muted" />
              </div>
              {/* Área del PDF */}
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

              <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
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
    </div>
  );
}

export default CalendarioAdmin;
