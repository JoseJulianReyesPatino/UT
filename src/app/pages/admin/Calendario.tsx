import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Download, FileUp, Eye, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const CALENDAR_STORAGE_KEY = "utslrc-admin-calendar-pdf";

type StoredCalendar = {
  name: string;
  dataUrl: string;
};

const readStoredCalendar = (): StoredCalendar | null => {
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCalendar;
    if (!parsed || typeof parsed.dataUrl !== "string" || typeof parsed.name !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
};

export function CalendarioAdmin() {
  const [calendar, setCalendar] = useState<StoredCalendar | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCalendar(readStoredCalendar());
  }, []);

  const calendarSrc = useMemo(() => calendar?.dataUrl ?? new URL("../../../assets/Calendario25-26.pdf", import.meta.url).href, [calendar]);

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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
        reader.readAsDataURL(file);
      });

      const nextCalendar = { name: file.name, dataUrl };
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(nextCalendar));
      setCalendar(nextCalendar);
      toast.success("Calendario actualizado");
    } catch {
      toast.error("No se pudo cargar el calendario");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    localStorage.removeItem(CALENDAR_STORAGE_KEY);
    setCalendar(null);
    toast.success("Calendario restaurado al archivo base");
  };

  const handleOpen = () => {
    window.open(calendarSrc, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Calendario</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Sube el calendario institucional y revísalo antes de publicarlo.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CalendarDays className="h-4 w-4" />
          Admin
        </div>
      </div>

      <Card className="border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-slate-50/70 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-slate-950">
        <CardHeader>
          <CardTitle>Calendario vigente</CardTitle>
          <CardDescription>
            Si subes un PDF nuevo, este panel mostrará esa versión en esta sesión del navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="calendar-upload" className="cursor-pointer">
              <Button type="button" variant="success" asChild>
                <span>
                  <FileUp className="mr-2 h-4 w-4" />Subir calendario
                </span>
              </Button>
            </Label>
            <Input id="calendar-upload" type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={isLoading} />
            <Button type="button" variant="outline" onClick={handleOpen}>
              <Eye className="mr-2 h-4 w-4" />Abrir PDF
            </Button>
            <Button type="button" variant="outline" onClick={() => window.open(calendarSrc, "_blank", "noopener,noreferrer") }>
              <Download className="mr-2 h-4 w-4" />Descargar
            </Button>
            {calendar && (
              <Button type="button" variant="ghost" onClick={handleRemove}>
                <Trash2 className="mr-2 h-4 w-4" />Restaurar archivo base
              </Button>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
            <p className="text-sm font-medium text-foreground">Archivo actual</p>
            <p className="text-sm text-muted-foreground">{calendar?.name ?? "Calendario25-26.pdf"}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <iframe src={`${calendarSrc}#toolbar=1&navpanes=0`} className="h-[72vh] w-full" title="Calendario institucional" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CalendarioAdmin;
