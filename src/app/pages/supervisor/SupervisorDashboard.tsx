import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { CheckCircle2, ClipboardList, FileStack, FileText, Users } from "lucide-react";

interface SupervisorDashboardProps {
  onNavigate?: (view: string) => void;
}

export default function SupervisorDashboard({ onNavigate }: Readonly<SupervisorDashboardProps>) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, revisados: 0, pendientes: 0, docentes: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [planeacionRes, instRes] = await Promise.all([
        apiFetch("/documents", { query: { form_id: 1, per_page: 1 } }) as Promise<any>,
        apiFetch("/documents", { query: { per_page: 1 } }) as Promise<any>,
      ]);
      const total = instRes?.total ?? instRes?.meta?.total ?? 0;
      const revisados = instRes?.revisados ?? 0;
      const pendientes = instRes?.pendientes ?? 0;
      setStats({ total, revisados, pendientes, docentes: planeacionRes?.docentes_count ?? 0 });
    } catch {
      // stats opcionales
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const firstName = user?.firstNames?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "Supervisor";

  const statCardCls = "overflow-hidden rounded-[22px] border border-border bg-card shadow-sm";

  return (
    <div className="relative space-y-6 overflow-hidden">
      {/* Encabezado */}
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            ¡Bienvenido(a), {firstName}!
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Panel de supervisión — visualización de documentos docentes
          </p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigate?.("supervisor-planeacion")}
          className="group relative overflow-hidden rounded-[22px] border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-emerald-400/60 hover:shadow-md dark:hover:border-emerald-600/40"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-emerald-950/30" />
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0 transition-colors group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50">
              <FileText className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Planeación</p>
              <p className="text-xs text-muted-foreground">Ver planeaciones de todos los docentes</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.("supervisor-instrumentos")}
          className="group relative overflow-hidden rounded-[22px] border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-emerald-400/60 hover:shadow-md dark:hover:border-emerald-600/40"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-emerald-950/30" />
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0 transition-colors group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50">
              <FileStack className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Instrumentos</p>
              <p className="text-xs text-muted-foreground">Ver instrumentos 30%, 40%, 60% y 70%</p>
            </div>
          </div>
        </button>
      </div>

      {/* Permisos de supervisión */}
      <Card className={statCardCls}>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Permisos de supervisión</p>

          <div className="flex items-start gap-3 rounded-xl border border-emerald-200/45 bg-emerald-50/40 p-4 dark:border-emerald-900/25 dark:bg-emerald-950/15">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Visualización de documentos</p>
              <p className="text-xs text-muted-foreground">
                Puedes ver y previsualizar todos los documentos de planeación e instrumentos subidos por los docentes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-emerald-200/45 bg-emerald-50/40 p-4 dark:border-emerald-900/25 dark:bg-emerald-950/15">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Filtros avanzados</p>
              <p className="text-xs text-muted-foreground">
                Filtra por docente, carrera, grupo, parcial y estado para una revisión específica.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-slate-50/40 p-4 dark:border-slate-700/30 dark:bg-slate-900/20">
            <ClipboardList className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin permisos de edición</p>
              <p className="text-xs text-muted-foreground">
                No puedes subir, modificar ni eliminar documentos. Solo visualización.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acceso */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => onNavigate?.("supervisor-planeacion")} className="gap-2">
          <FileText className="h-4 w-4" />
          Ver Planeación
        </Button>
        <Button variant="outline" onClick={() => onNavigate?.("supervisor-instrumentos")} className="gap-2">
          <FileStack className="h-4 w-4" />
          Ver Instrumentos
        </Button>
      </div>
    </div>
  );
}
