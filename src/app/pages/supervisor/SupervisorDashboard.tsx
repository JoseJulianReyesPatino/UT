import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { ClipboardList, FileStack, FileText, CheckCircle2, Clock, Users } from "lucide-react";

interface SupervisorDashboardProps {
  onNavigate?: (view: string) => void;
}

export default function SupervisorDashboard({ onNavigate }: Readonly<SupervisorDashboardProps>) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, revisados: 0, pendientes: 0, docentes: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const cardCls = "overflow-hidden border-emerald-200/60 bg-white/55 shadow-sm backdrop-blur dark:border-emerald-900/35 dark:bg-slate-950/55";
  const panelCls = "rounded-2xl border border-emerald-200/45 bg-white/45 p-4 dark:border-emerald-900/25 dark:bg-slate-950/35";

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
      // silencioso - stats opcionales
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const firstName = user?.firstNames?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "Supervisor";

  return (
    <div className="flex flex-col gap-4 sm:gap-6 bg-transparent text-slate-900 dark:text-slate-100">
      {/* Encabezado */}
      <div className="shrink-0 rounded-2xl sm:rounded-3xl border border-emerald-200/30 p-4 sm:p-6 dark:border-emerald-900/25">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
          ¡Bienvenido(a), {firstName}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Panel de supervisión — visualización de documentos docentes
        </p>
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={`${cardCls} cursor-pointer transition-transform hover:scale-[1.01]`} onClick={() => onNavigate?.("supervisor-planeacion")}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Planeación</p>
              <p className="text-xs text-muted-foreground">Ver planeaciones de todos los docentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`${cardCls} cursor-pointer transition-transform hover:scale-[1.01]`} onClick={() => onNavigate?.("supervisor-instrumentos")}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
              <FileStack className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Instrumentos</p>
              <p className="text-xs text-muted-foreground">Ver instrumentos 30%, 40%, 60% y 70%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info de rol */}
      <Card className={cardCls}>
        <CardHeader className="border-b border-emerald-200/30 p-4 sm:p-6 dark:border-emerald-900/25">
          <CardTitle className="text-base">Permisos de Supervisión</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-3">
          <div className={`flex items-start gap-3 ${panelCls}`}>
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Visualización de documentos</p>
              <p className="text-xs text-muted-foreground">Puedes ver y previsualizar todos los documentos de planeación e instrumentos subidos por los docentes.</p>
            </div>
          </div>
          <div className={`flex items-start gap-3 ${panelCls}`}>
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Filtro por docente</p>
              <p className="text-xs text-muted-foreground">Puedes filtrar los documentos por nombre de docente para una revisión específica.</p>
            </div>
          </div>
          <div className={`flex items-start gap-3 ${panelCls}`}>
            <ClipboardList className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin permisos de edición</p>
              <p className="text-xs text-muted-foreground">No puedes subir, modificar ni eliminar documentos. Solo visualización.</p>
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
