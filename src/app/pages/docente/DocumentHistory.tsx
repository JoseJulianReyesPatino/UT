import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { FileText, Search, Download, Eye, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { PdfPreview } from "../../components/PdfPreview";

export function DocumentHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState(() => {
    try {
      return localStorage.getItem("docs-filter-status") || "all";
    } catch {
      return "all";
    }
  });
  const [filterTipo, setFilterTipo] = useState(() => {
    try {
      return localStorage.getItem("docs-filter-tipo") || "all";
    } catch {
      return "all";
    }
  });
  const statusOptions = [
    { value: "all", label: "Todos los estados" },
    { value: "aprobado", label: "Revisados" },
    { value: "revision", label: "En revisión" },
    { value: "rechazado", label: "Devueltos" },
  ];
  const [openPreview, setOpenPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | undefined>(undefined);

  const documents = [
    {
      id: 1,
      nombre: "Planeación - Programación Web",
      tipo: "planeacion",
      tipoLabel: "Planeación",
      materia: "Programación Web",
      parcial: "1",
      grupo: "A",
      fecha: "2026-05-15",
      hora: "14:32",
      status: "aprobado",
      observaciones: "",
    },
    {
      id: 2,
      nombre: "Instrumento 30% - Base de Datos",
      tipo: "instrumento3040",
      tipoLabel: "Instrumento 30/40",
      materia: "Base de Datos",
      parcial: "1",
      grupo: "B",
      fecha: "2026-05-14",
      hora: "09:10",
      status: "revision",
      observaciones: "Favor de revisar el apartado de criterios",
    },
    {
      id: 3,
      nombre: "Lista Concentrada - Redes",
      tipo: "lista",
      tipoLabel: "Lista Concentrada",
      materia: "Redes de Computadoras",
      parcial: "1",
      grupo: "A",
      fecha: "2026-05-10",
      hora: "16:45",
      status: "rechazado",
      observaciones: "Faltan firmas requeridas",
    },
    {
      id: 4,
      nombre: "Portafolio Digital - Desarrollo Móvil",
      tipo: "portafolio",
      tipoLabel: "Portafolio Digital",
      materia: "Desarrollo Móvil",
      parcial: "2",
      grupo: "C",
      fecha: "2026-05-08",
      hora: "11:20",
      status: "aprobado",
      observaciones: "",
    },
  ];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.materia.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const matchesTipo = filterTipo === "all" || doc.tipo === filterTipo;
    return matchesSearch && matchesStatus && matchesTipo;
  });

  useEffect(() => {
    try {
      localStorage.setItem("docs-filter-status", filterStatus);
    } catch {
      // ignore
    }
  }, [filterStatus]);

  useEffect(() => {
    try {
      localStorage.setItem("docs-filter-tipo", filterTipo);
    } catch {
      // ignore
    }
  }, [filterTipo]);

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
            <div className="grid w-full gap-2 sm:w-auto sm:flex sm:flex-row sm:items-center sm:gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full min-w-[190px] sm:w-[190px] whitespace-nowrap">
                  <SelectValue placeholder="Tipo" className="whitespace-nowrap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los apartados</SelectItem>
                  <SelectItem value="planeacion">Planeación</SelectItem>
                  <SelectItem value="instrumento3040">Instrumento 30/40</SelectItem>
                  <SelectItem value="instrumento6070">Instrumento 60/70</SelectItem>
                  <SelectItem value="lista">Lista Concentrada</SelectItem>
                  <SelectItem value="asesoria">Asesoría</SelectItem>
                  <SelectItem value="portafolio">Portafolio Digital</SelectItem>
                  <SelectItem value="acta">Acta Final</SelectItem>
                  <SelectItem value="estadias">Estadías</SelectItem>
                  <SelectItem value="tutorias">Tutorías</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full min-w-[190px] sm:w-[190px] [&>svg:last-child]:hidden">
                  <span className="flex min-w-0 items-center gap-2">
                    <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Estado" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
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
                    <p className="text-xs text-muted-foreground mt-1">{doc.fecha} {doc.hora ? `• ${doc.hora}` : null}</p>
                    {doc.observaciones && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted px-2 py-1 rounded inline-block">
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
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {doc.status === "aprobado"
                      ? "Revisado"
                      : doc.status === "revision"
                      ? "En revisión"
                      : "Devuelto"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      // crear un archivo simulado para vista previa
                      const content = `Documento: ${doc.nombre}\nMateria: ${doc.materia}\nParcial: ${doc.parcial}\nGrupo: ${doc.grupo}\nFecha: ${doc.fecha} ${doc.hora ?? ""}\n\nObservaciones:\n${doc.observaciones || "-"}`;
                      const file = new File([content], `${doc.nombre}.txt`, { type: "text/plain" });
                      setPreviewFile(file);
                      setPreviewTitle(doc.nombre);
                      setOpenPreview(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const content = `Documento: ${doc.nombre}\nMateria: ${doc.materia}\nParcial: ${doc.parcial}\nGrupo: ${doc.grupo}\nFecha: ${doc.fecha} ${doc.hora ?? ""}\n\nObservaciones:\n${doc.observaciones || "-"}`;
                      const blob = new Blob([content], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${doc.nombre}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openPreview} onOpenChange={(val) => setOpenPreview(val)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>Vista previa del documento</DialogDescription>
          </DialogHeader>
          {previewFile ? <PdfPreview file={previewFile} title={previewTitle} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
