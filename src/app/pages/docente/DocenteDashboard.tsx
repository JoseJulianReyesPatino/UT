import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  ChevronDown,
} from "lucide-react";

export function DocenteDashboard() {
  const manualDocenteUrl = new URL("../../../assets/Manual de Usuario del Docente.pdf", import.meta.url).href;
  const [isIntroOpen, setIsIntroOpen] = useState(true);

  const stats = [
    {
      title: "Documentos Pendientes",
      value: "3",
      description: "Por entregar esta semana",
      icon: Clock,
      trend: "+2 desde ayer",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Documentos Aprobados",
      value: "12",
      description: "Este cuatrimestre",
      icon: CheckCircle2,
      trend: "+3 este mes",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "En Revisión",
      value: "2",
      description: "Esperando aprobación",
      icon: AlertCircle,
      trend: "Últimas 24h",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Materias",
      value: "5",
      description: "Cuatrimestre actual",
      icon: FileText,
      trend: "3 grupos",
      color: "text-foreground",
      bgColor: "bg-muted",
    },
  ];

  const recentDocuments = [
    {
      id: 1,
      name: "Planeación - Programación Web",
      materia: "Programación Web",
      tipo: "Planeación",
      fecha: "2026-05-15",
      status: "aprobado",
    },
    {
      id: 2,
      name: "Instrumento 30% - Base de Datos",
      materia: "Base de Datos",
      tipo: "Instrumento 30%",
      fecha: "2026-05-14",
      status: "revision",
    },
    {
      id: 3,
      name: "Lista Concentrada - Redes",
      materia: "Redes de Computadoras",
      tipo: "Lista Concentrada",
      fecha: "2026-05-10",
      status: "pendiente",
    },
  ];

  const proximasEntregas = [
    { titulo: "Instrumento 60% - Todos los grupos", fecha: "2026-05-20", dias: 3 },
    { titulo: "Portafolio Digital - TSU", fecha: "2026-05-25", dias: 8 },
    { titulo: "Acta Final - Ingeniería", fecha: "2026-06-01", dias: 15 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1>Bienvenido de vuelta</h1>
        <p className="text-muted-foreground">
          Aquí está el resumen de tu actividad académica
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-8">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Antes de comenzar:</h2>
              {!isIntroOpen && (
                <p className="text-sm text-muted-foreground">
                  Haz clic en el caret para ver la documentación y las indicaciones iniciales.
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsIntroOpen((current) => !current)}
              aria-label={isIntroOpen ? "Contraer información" : "Expandir información"}
              title={isIntroOpen ? "Contraer información" : "Expandir información"}
              className="h-9 w-9 rounded-full border border-emerald-200/70 bg-white/80 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isIntroOpen ? "rotate-180" : "rotate-0"}`} />
            </Button>
          </div>

          {isIntroOpen && (
            <div className="space-y-6 text-base leading-relaxed text-foreground/80">
              <div className="space-y-2">
                <p>
                  Es fundamental leer la documentación proporcionada, ya que explica detalladamente el funcionamiento completo del sistema. Además, es necesario completar la configuración de su perfil antes de proceder con otras acciones.
                </p>
              </div>

              <p>
                Tiene permitido el acceso a todos los módulos disponibles en el menú de navegación para explorar las distintas funcionalidades, incluyendo la carga de archivos. Tenga en cuenta que algunos envíos están sujetos a fechas límite. En caso de que se cierre el plazo sin que haya subido los archivos requeridos, puede ponerse en contacto con el administrador del sistema.
              </p>

              <p>Gracias por su atención y colaboración.</p>

              <div className="flex justify-end">
                <Button asChild variant="outline" className="rounded-none border-[#00A86B] px-8 text-[#00A86B] hover:bg-[#00A86B]/5">
                  <a href={manualDocenteUrl} target="_blank" rel="noreferrer">
                    Manual Docente
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <p className="text-xs text-success mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documentos Recientes</CardTitle>
              <Button variant="ghost" size="sm">Ver todos</Button>
            </div>
            <CardDescription>Últimos documentos enviados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.map((doc) => {
                let docStatusVariant: "success" | "warning" | "outline" = "outline";
                let docStatusLabel = "Pendiente";

                if (doc.status === "aprobado") {
                  docStatusVariant = "success";
                  docStatusLabel = "Aprobado";
                } else if (doc.status === "revision") {
                  docStatusVariant = "warning";
                  docStatusLabel = "En revisión";
                }

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.materia}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={docStatusVariant}>{docStatusLabel}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Próximas Entregas</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Fechas límite importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proximasEntregas.map((entrega) => (
                <div
                  key={entrega.titulo}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-sm">{entrega.titulo}</p>
                    <p className="text-xs text-muted-foreground">{entrega.fecha}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-success">{entrega.dias} días</p>
                    <p className="text-xs text-muted-foreground">restantes</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

export default DocenteDashboard;