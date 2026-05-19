import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FileText, Eye, ArrowLeftCircle } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type ReviewSection = "all" | "pendientes" | "revisados" | "hoy";

interface DocumentReviewProps {
  initialSection?: ReviewSection;
}

type PendingDocument = {
  id: number;
  ciclo: string;
  plan: string;
  docente: string;
  documento: string;
  apartado: string;
  carrera: string;
  materia: string;
  cuatrimestre: string;
  grupo: string;
  fecha: string;
  returned?: boolean;
};

type ReviewedDocument = {
  id: number;
  ciclo: string;
  plan: string;
  docente: string;
  documento: string;
  apartado: string;
  carrera: string;
  reviewedAt: string;
  returned?: boolean;
};

type DocumentItem = PendingDocument | ReviewedDocument;

const initialPendingDocuments: PendingDocument[] = [
  {
    id: 1,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    docente: "Mtro. Juan Pérez",
    documento: "Planeación - Programación Web",
    apartado: "Planeación",
    carrera: "Ingeniería en Sistemas",
    materia: "Programación Web",
    cuatrimestre: "5",
    grupo: "A",
    fecha: "2026-05-17",
  },
  {
    id: 2,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    docente: "Dra. Ana Martínez",
    documento: "Instrumento 30% - Base de Datos",
    apartado: "Instrumento 30/40%",
    carrera: "TSU Desarrollo Software",
    materia: "Base de Datos",
    cuatrimestre: "3",
    grupo: "B",
    fecha: "2026-05-16",
  },
  {
    id: 3,
    ciclo: "Ciclo Escolar 2025",
    plan: "Plan Normal",
    docente: "Mtro. Carlos López",
    documento: "Lista Concentrada - Redes",
    apartado: "Lista Concentrada",
    carrera: "Ingeniería en Redes",
    materia: "Redes de Computadoras",
    cuatrimestre: "7",
    grupo: "A",
    fecha: "2026-05-15",
  },
  {
    id: 4,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    docente: "Dra. María González",
    documento: "Asesoría - Tutoría Grupal",
    apartado: "Tutorías",
    carrera: "Ingeniería en Sistemas",
    materia: "Tutorías BIS",
    cuatrimestre: "5",
    grupo: "C",
    fecha: "2026-05-14",
    returned: false,
  },
];

const initialReviewedDocuments: ReviewedDocument[] = [
  {
    id: 101,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    docente: "Dra. María González",
    documento: "Instrumento 60% - Programación Web",
    apartado: "Instrumento 60/70%",
    carrera: "Ingeniería en Sistemas",
    reviewedAt: "2026-05-17 09:15",
  },
  {
    id: 102,
    ciclo: "Ciclo Escolar 2025",
    plan: "Plan Normal",
    docente: "Mtro. Roberto Silva",
    documento: "Planeación - Redes",
    apartado: "Planeación",
    carrera: "Ingeniería en Redes",
    reviewedAt: "2026-05-17 10:05",
  },
  {
    id: 103,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    docente: "Dra. Ana Martínez",
    documento: "Lista Concentrada - Base de Datos",
    apartado: "Lista Concentrada",
    carrera: "TSU Desarrollo Software",
    reviewedAt: "2026-05-16 16:40",
  },
  {
    id: 104,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Normal",
    docente: "Mtro. Carlos López",
    documento: "Instrumento 30% - Redes",
    apartado: "Instrumento 30/40%",
    carrera: "Ingeniería en Redes",
    reviewedAt: "2026-05-15 11:25",
  },
  {
    id: 105,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    docente: "Dra. Laura Gómez",
    documento: "Ficha Técnica - Tutorías",
    apartado: "Tutorías",
    carrera: "TSU Infraestructura",
    reviewedAt: "2026-05-15 13:10",
    returned: false,
  },
];

export function DocumentReview({ initialSection = "all" }: Readonly<DocumentReviewProps>) {
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>(initialPendingDocuments);
  const [reviewedDocuments, setReviewedDocuments] = useState<ReviewedDocument[]>(initialReviewedDocuments);
  const [filterCiclo, setFilterCiclo] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterDocente, setFilterDocente] = useState("all");
  const [filterApartado, setFilterApartado] = useState("all");
  const [activeSection, setActiveSection] = useState<ReviewSection>(initialSection);
  const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);

  const allDocuments = [...pendingDocuments, ...reviewedDocuments];
  const todayKey = new Date().toISOString().slice(0, 10);

  const matchesFilters = (doc: { ciclo: string; plan: string; carrera: string; docente: string; apartado: string }) => {
    const matchesCiclo = filterCiclo === "all" || doc.ciclo === filterCiclo;
    const matchesPlan = filterPlan === "all" || doc.plan === filterPlan;
    const matchesCarrera = filterCarrera === "all" || doc.carrera === filterCarrera;
    const matchesDocente = filterDocente === "all" || doc.docente === filterDocente;
    const matchesApartado = filterApartado === "all" || doc.apartado === filterApartado;
    return matchesCiclo && matchesPlan && matchesCarrera && matchesDocente && matchesApartado;
  };

  const filteredPendingDocuments = pendingDocuments.filter(matchesFilters);
  const filteredReviewedDocuments = reviewedDocuments.filter(matchesFilters);
  const filteredAllDocuments = allDocuments.filter(matchesFilters);
  const reviewedTodayDocuments = filteredReviewedDocuments.filter((doc) => doc.reviewedAt.startsWith(todayKey));

  const reviewedByDate = useMemo(() => {
    return filteredReviewedDocuments.reduce<Record<string, ReviewedDocument[]>>((groups, doc) => {
      const date = doc.reviewedAt.slice(0, 10);
      groups[date] = [...(groups[date] || []), doc];
      return groups;
    }, {});
  }, [filteredReviewedDocuments]);

  const ciclosDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.ciclo)));
  const docentesDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.docente)));
  const apartadosDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.apartado)));
  const planesDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.plan)));

  const handleReviewDocument = (documentId: number) => {
    const documentToReview = pendingDocuments.find((doc) => doc.id === documentId);

    if (!documentToReview) {
      return;
    }

    const reviewedAt = new Date().toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    setPendingDocuments((currentDocuments) => currentDocuments.filter((doc) => doc.id !== documentId));
    setReviewedDocuments((currentDocuments) => [
      {
        id: documentToReview.id,
        ciclo: documentToReview.ciclo,
        plan: documentToReview.plan,
        docente: documentToReview.docente,
        documento: documentToReview.documento,
        apartado: documentToReview.apartado,
        carrera: documentToReview.carrera,
        reviewedAt,
      },
      ...currentDocuments,
    ]);
    toast.success("Documento marcado como revisado");
  };

  const handleReturnDocument = (documentId: number) => {
    setPendingDocuments((current) => current.map((d) => (d.id === documentId ? { ...d, returned: true } : d)));
    setReviewedDocuments((current) => current.map((d) => (d.id === documentId ? { ...d, returned: true } : d)));
    toast.success("Documento marcado como devuelto");
  };

  const handleShareToMessages = (doc: DocumentItem) => {
    const recipientName = "docente" in doc ? doc.docente : (doc as any).docente;
    globalThis.dispatchEvent(new CustomEvent("openMessagesConversation", { detail: { recipientName, recipientRole: "Docente", document: { id: doc.id, title: doc.documento } } }));
  };

  const closePreview = () => {
    setPreviewDocument(null);
  };

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute top-16 right-0 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-500/10" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute top-10 left-[14%] h-px w-44 rotate-12 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute bottom-24 right-[18%] h-px w-36 -rotate-45 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute top-36 right-1/4 grid grid-cols-4 gap-2 opacity-30">
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className="h-1.5 w-1.5 rounded-full bg-emerald-400/50" />
          ))}
        </div>
      </div>

      <div>
        <h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-cyan-300">Revisión de Documentos</h1>
        <p className="text-muted-foreground">
          Revisa y aprueba los documentos enviados por los docentes
        </p>
      </div>

      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as ReviewSection)}>
        <TabsList className="bg-gradient-to-r from-emerald-100 via-emerald-50 to-sky-100 p-1 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <TabsTrigger value="all">
            Todos
            <Badge variant="outline" className="ml-2">{allDocuments.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pendientes">
            Pendientes
            <Badge variant="warning" className="ml-2">{filteredPendingDocuments.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="revisados">Revisados</TabsTrigger>
          <TabsTrigger value="hoy">Revisados hoy</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/15 dark:to-cyan-950/20">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDocente} onValueChange={setFilterDocente}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por docente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    <SelectItem value="Ingeniería en Sistemas">Ingeniería en Sistemas</SelectItem>
                    <SelectItem value="TSU Desarrollo Software">TSU Desarrollo Software</SelectItem>
                    <SelectItem value="Ingeniería en Redes">Ingeniería en Redes</SelectItem>
                    <SelectItem value="TSU Infraestructura">TSU Infraestructura</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterApartado} onValueChange={setFilterApartado}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="Filtrar por apartado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {apartadosDisponibles.map((apartado) => <SelectItem key={apartado} value={apartado}>{apartado}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAllDocuments.map((doc) => {
                  const isReviewed = "reviewedAt" in doc;
                  return (
                    <div
                      key={doc.id}
                      tabIndex={0}
                      onClick={() => setPreviewDocument(doc)}
                      onKeyDown={(e) => { if ((e as React.KeyboardEvent).key === "Enter") setPreviewDocument(doc); }}
                      className="cursor-pointer flex flex-col gap-2 rounded-xl border border-border/70 bg-background/80 p-4 lg:flex-row lg:items-center lg:justify-between shadow-sm hover:border-emerald-300/60 hover:bg-emerald-50/40 transition-colors dark:bg-slate-950/60 dark:hover:bg-slate-900/70"
                    >
                      <div>
                        <p className="font-medium">{doc.documento}</p>
                        <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setPreviewDocument(doc)}>{doc.ciclo}</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setPreviewDocument(doc)}>{doc.plan}</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setPreviewDocument(doc)}>{doc.apartado}</Badge>
                        </div>
                      </div>
                          <div className="flex items-center gap-2">
                            {('returned' in doc) && (doc as any).returned && <Badge variant="destructive">Devuelto</Badge>}
                            <Badge variant={isReviewed ? "success" : "warning"}>{isReviewed ? "Revisado" : "Pendiente"}</Badge>
                          </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendientes" className="space-y-4 mt-6">
          <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-cyan-50/40 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-cyan-950/20">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4">
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDocente} onValueChange={setFilterDocente}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por docente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    <SelectItem value="Ingeniería en Sistemas">Ingeniería en Sistemas</SelectItem>
                    <SelectItem value="TSU Desarrollo Software">TSU Desarrollo Software</SelectItem>
                    <SelectItem value="Ingeniería en Redes">Ingeniería en Redes</SelectItem>
                    <SelectItem value="TSU Infraestructura">TSU Infraestructura</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterApartado} onValueChange={setFilterApartado}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="Filtrar por apartado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {apartadosDisponibles.map((apartado) => <SelectItem key={apartado} value={apartado}>{apartado}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPendingDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    tabIndex={0}
                    onClick={() => setPreviewDocument(doc)}
                    onKeyDown={(e) => { if ((e as React.KeyboardEvent).key === "Enter") setPreviewDocument(doc); }}
                    className="cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{doc.documento}</p>
                        <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setPreviewDocument(doc)}>{doc.materia}</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setPreviewDocument(doc)}>{doc.cuatrimestre}° Cuatri</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setPreviewDocument(doc)}>Grupo {doc.grupo}</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setPreviewDocument(doc)}>{doc.ciclo}</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setPreviewDocument(doc)}>{doc.plan}</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setPreviewDocument(doc)}>{doc.apartado}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>
                        <Eye className="h-4 w-4 mr-1" />Ver PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleReviewDocument(doc.id); }}>
                        <Eye className="h-4 w-4 mr-1" />Revisar
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.docente}`}>
                        <ArrowLeftCircle className="h-5 w-5" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleReturnDocument(doc.id); }}>
                        Devolver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisados" className="space-y-4 mt-6">
          <div className="space-y-4">
            {Object.entries(reviewedByDate).map(([date, docs]) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle>{date}</CardTitle>
                  <CardDescription>{docs.length} documentos revisados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {docs.map((doc) => (
                      <div
                      key={doc.id}
                      tabIndex={0}
                      onClick={() => setPreviewDocument(doc)}
                      onKeyDown={(e) => { if ((e as React.KeyboardEvent).key === "Enter") setPreviewDocument(doc); }}
                      className="cursor-pointer flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                    >
                          <div>
                            <p className="font-medium">{doc.documento}</p>
                            <p className="text-sm text-muted-foreground">{doc.docente}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>{doc.carrera}</Badge>
                              <Badge variant="outline" className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>{doc.ciclo}</Badge>
                              <Badge variant="outline" className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>{doc.plan}</Badge>
                              <Badge variant="outline" className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>{doc.apartado}</Badge>
                            </div>
                          </div>
                          <Badge variant="success">Revisado</Badge>
                        </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="hoy" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Revisados hoy</CardTitle>
              <CardDescription>Documentos abiertos por administración en el día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reviewedTodayDocuments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                    No hay documentos revisados hoy.
                  </div>
                ) : (
                  reviewedTodayDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      tabIndex={0}
                      onClick={() => setPreviewDocument(doc)}
                      onKeyDown={(e) => { if ((e as React.KeyboardEvent).key === "Enter") setPreviewDocument(doc); }}
                      className="cursor-pointer flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                    >
                      <div>
                        <p className="font-medium">{doc.documento}</p>
                        <p className="text-sm text-muted-foreground">{doc.docente}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>{doc.carrera}</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>{doc.ciclo}</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>{doc.plan}</Badge>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>{doc.apartado}</Badge>
                        </div>
                      </div>
                      <Badge variant="success">{doc.reviewedAt}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewDocument !== null} onOpenChange={(open) => {
        if (!open) {
          closePreview();
        }
      }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa del documento</DialogTitle>
            <DialogDescription>
              Simulación de lectura del archivo PDF del documento seleccionado.
            </DialogDescription>
          </DialogHeader>
          {previewDocument && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{previewDocument.ciclo}</Badge>
                <Badge variant="outline">{previewDocument.plan}</Badge>
                <Badge variant="outline">{previewDocument.apartado}</Badge>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 md:p-6">
                <div className="mx-auto flex min-h-[70vh] w-full max-w-[1100px] flex-col justify-between rounded-lg border border-border bg-background p-6 md:p-10 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Documento PDF</p>
                      <h3 className="mt-2 text-2xl font-semibold md:text-3xl">{previewDocument.documento}</h3>
                      <p className="text-base text-muted-foreground">{previewDocument.docente}</p>
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-2 md:gap-4">
                      <p><span className="font-medium">Carrera:</span> {previewDocument.carrera}</p>
                      <p><span className="font-medium">Materia:</span> {"materia" in previewDocument ? previewDocument.materia : "N/D"}</p>
                      <p><span className="font-medium">Cuatrímestre:</span> {"cuatrimestre" in previewDocument ? previewDocument.cuatrimestre : "N/D"}</p>
                      <p><span className="font-medium">Grupo:</span> {"grupo" in previewDocument ? previewDocument.grupo : "N/D"}</p>
                    </div>
                  </div>
                  <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Esta es una vista previa simulada del PDF asociado al documento.
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default DocumentReview;
