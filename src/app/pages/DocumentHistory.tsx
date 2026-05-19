import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { FileText, Search, Download, Eye, Filter } from "lucide-react";

export function DocumentHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const documents = [
    {
      id: 1,
      nombre: "Planeación - Programación Web",
      tipo: "Planeación",
      materia: "Programación Web",
      parcial: "1",
      grupo: "A",
      fecha: "2026-05-15",
      status: "aprobado",
      observaciones: "",
    },
    {
      id: 2,
      nombre: "Instrumento 30% - Base de Datos",
      tipo: "Instrumento 30%",
      materia: "Base de Datos",
      parcial: "1",
      grupo: "B",
      fecha: "2026-05-14",
      status: "revision",
      observaciones: "Favor de revisar el apartado de criterios",
    },
    {
      id: 3,
      nombre: "Lista Concentrada - Redes",
      tipo: "Lista Concentrada",
      materia: "Redes de Computadoras",
      parcial: "1",
      grupo: "A",
      fecha: "2026-05-10",
      status: "rechazado",
      observaciones: "Faltan firmas requeridas",
    },
    {
      id: 4,
      nombre: "Portafolio Digital - Desarrollo Móvil",
      tipo: "Portafolio Digital",
      materia: "Desarrollo Móvil",
      parcial: "2",
      grupo: "C",
      fecha: "2026-05-08",
      status: "aprobado",
      observaciones: "",
    },
  ];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.materia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1>Historial de Documentos</h1>
        <p className="text-muted-foreground">
          Revisa todos los documentos que has enviado
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Mis Documentos</CardTitle>
              <CardDescription>
                {filteredDocuments.length} documentos encontrados
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="aprobado">Aprobados</SelectItem>
                  <SelectItem value="revision">En revisión</SelectItem>
                  <SelectItem value="rechazado">Rechazados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{doc.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.materia} • Parcial {doc.parcial} • Grupo {doc.grupo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{doc.fecha}</p>
                    {doc.observaciones && (
                      <p className="text-xs text-warning mt-2 bg-warning/10 px-2 py-1 rounded inline-block">
                        {doc.observaciones}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      doc.status === "aprobado"
                        ? "success"
                        : doc.status === "revision"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {doc.status === "aprobado"
                      ? "Aprobado"
                      : doc.status === "revision"
                      ? "En revisión"
                      : "Rechazado"}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
