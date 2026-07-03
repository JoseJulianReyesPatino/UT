import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Download, Eye, FileUp } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import apiFetch from "../../lib/api";
import { getCalendarDownloadUrl, getCalendarFileUrl } from "../../lib/calendar";

type CalendarMeta = {
  id: number | null;
  name: string;
  uploadedAt: string | null;
  isActive: boolean;
};

export function CalendarioAdmin() {
  const [calendar, setCalendar] = useState<CalendarMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
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
      }
    })();
  }, []);

  const calendarSrc = useMemo(() => getCalendarFileUrl(calendar?.uploadedAt ?? "base"), [calendar?.uploadedAt]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("El archivo debe ser un PDF");
      return;
    }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white drop-shadow-sm">Calendario</h1>
          <p className="text-sm text-white/80">Sube el calendario institucional y revísalo antes de publicarlo.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CalendarDays className="h-4 w-4" />
          Admin
        </div>
      </div>

      <Card className="border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-slate-50/70 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-slate-950">
        <CardHeader>
          <CardTitle>Calendario vigente</CardTitle>
          <CardDescription>El archivo se guarda en la API para que docentes y admin vean la misma versión.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="success" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              <FileUp className="mr-2 h-4 w-4" />Subir calendario
            </Button>
            <Input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={isLoading} />
            <Button type="button" variant="outline" onClick={() => window.open(calendarSrc, "_blank", "noopener,noreferrer")}>
              <Eye className="mr-2 h-4 w-4" />Abrir PDF
            </Button>
            <Button type="button" variant="outline" onClick={() => window.open(getCalendarDownloadUrl(), "_blank", "noopener,noreferrer") }>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default CalendarioAdmin;
