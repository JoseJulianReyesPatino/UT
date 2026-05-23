import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { ArrowLeftCircle, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type ReviewSection = "all" | "pendientes" | "revisados" | "hoy";

type EstadiaPendingDocument = {
  id: number;
  ciclo: string;
  plan: string;
  docente: string;
  documento: string;
  apartado: string;
  carrera: string;
  grupo: string;
  fecha: string;
  returned?: boolean;
};

type EstadiaReviewedDocument = {
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

type EstadiaDocumentItem = EstadiaPendingDocument | EstadiaReviewedDocument;

const initialPending: EstadiaPendingDocument[] = [
  {
    id: 1,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    docente: "Mtro. Juan Pérez",
    documento: "Carta de presentación - Estadías Grupo A",
    apartado: "Carta de Presentación",
    carrera: "Ingeniería en Logística Internacional (ILI)",
    grupo: "ILI-9",
    fecha: "2026-05-17",
  },
  {
    id: 2,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    docente: "Dra. Ana Martínez",
    documento: "Carta de aceptación - Estadías Grupo B",
    apartado: "Carta de Aceptación",
    carrera: "TSU en Desarrollo de Software Multiplataforma (DSM)",
    grupo: "DSM-5",
    fecha: "2026-05-16",
  },
  {
    id: 3,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Normal",
    docente: "Mtro. Carlos López",
    documento: "Carta de terminación - Estadías Grupo C",
    apartado: "Carta de Terminación",
    carrera: "Ing. en Desarrollo y Gestión de Software PN (IDGS)",
    grupo: "IDGS-10",
    fecha: "2026-05-15",
  },
  {
    id: 4,
    ciclo: "Ciclo Escolar 2025",
    plan: "Plan Nuevo Modelo",
    docente: "Dra. María González",
    documento: "Acta final - Estadías Grupo D",
    apartado: "Acta Final",
    carrera: "TSU en Mecatrónica (IM)",
    grupo: "IM-5",
    fecha: "2026-05-14",
  },
];

const initialReviewed: EstadiaReviewedDocument[] = [
  {
    id: 101,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    docente: "Mtro. Roberto Silva",
    documento: "Carta de presentación - Estadías",
    apartado: "Carta de Presentación",
    carrera: "TSU en Automatización (AUT)",
    reviewedAt: "2026-05-17 09:15",
    returned: false,
  },
];

export default function Estadias() {
  const [pendingDocuments, setPendingDocuments] = useState<EstadiaPendingDocument[]>(initialPending);
  const [reviewedDocuments, setReviewedDocuments] = useState<EstadiaReviewedDocument[]>(initialReviewed);
  const [filterCiclo, setFilterCiclo] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterDocente, setFilterDocente] = useState("all");
  const [filterApartado, setFilterApartado] = useState("all");
  const [activeSection, setActiveSection] = useState<ReviewSection>("all");
  const [previewDocument, setPreviewDocument] = useState<EstadiaDocumentItem | null>(null);

  const allDocuments = [...pendingDocuments, ...reviewedDocuments];
  const todayKey = new Date().toISOString().slice(0, 10);

  const matchesFilters = (doc: { ciclo: string; plan: string; docente: string; apartado: string }) => {
    const matchesCiclo = filterCiclo === "all" || doc.ciclo === filterCiclo;
    const matchesPlan = filterPlan === "all" || doc.plan === filterPlan;
    const matchesDocente = filterDocente === "all" || doc.docente === filterDocente;
    const matchesApartado = filterApartado === "all" || doc.apartado === filterApartado;
    return matchesCiclo && matchesPlan && matchesDocente && matchesApartado;
  };

  const filteredPending = pendingDocuments.filter(matchesFilters);
  const filteredReviewed = reviewedDocuments.filter(matchesFilters);
  const filteredAll = allDocuments.filter(matchesFilters);
  const reviewedToday = filteredReviewed.filter((doc) => doc.reviewedAt.startsWith(todayKey));

  const reviewedByDate = useMemo(() => {
    return filteredReviewed.reduce<Record<string, EstadiaReviewedDocument[]>>((groups, doc) => {
      const date = doc.reviewedAt.slice(0, 10);
      groups[date] = [...(groups[date] || []), doc];
      return groups;
    }, {});
  }, [filteredReviewed]);

  const ciclosDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.ciclo)));
  const planesDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.plan)));
  const docentesDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.docente)));
  const apartadosDisponibles = ["Carta de Presentación", "Carta de Aceptación", "Carta de Terminación", "Acta Final"];

  const handleReviewDocument = (documentId: number) => {
    const documentToReview = pendingDocuments.find((doc) => doc.id === documentId);
    if (!documentToReview) return;

    const reviewedAt = new Date().toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    setPendingDocuments((current) => current.filter((doc) => doc.id !== documentId));
    setReviewedDocuments((current) => [
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
      ...current,
    ]);
    toast.success("Documento de estadías marcado como revisado");
  };

  const handleReturnDocument = (documentId: number) => {
    setPendingDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true } : doc)));
    setReviewedDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true } : doc)));
    toast.success("Documento marcado como devuelto");
  };

  const handleShareToMessages = (doc: EstadiaDocumentItem) => {
    globalThis.dispatchEvent(
      new CustomEvent("openMessagesConversation", {
        detail: {
          recipientName: doc.docente,
          recipientRole: "Docente",
          document: { id: doc.id, title: doc.documento },
        },
      })
    );
  };

  const closePreview = () => setPreviewDocument(null);

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div>
        <h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-emerald-300">
          Revisión de Estadías
        </h1>
        <p className="text-muted-foreground">Revisa y aprueba los documentos enviados por los docentes en el apartado de estadías</p>
      </div>

      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as ReviewSection)}>
        <TabsList className="bg-gradient-to-r from-emerald-100 via-emerald-50 to-emerald-50 p-1 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <TabsTrigger value="all">Todos <Badge variant="outline" className="ml-2">{allDocuments.length}</Badge></TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes <Badge variant="warning" className="ml-2">{filteredPending.length}</Badge></TabsTrigger>
          <TabsTrigger value="revisados">Revisados</TabsTrigger>
          <TabsTrigger value="hoy">Revisados hoy</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-emerald-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/15 dark:to-emerald-950/20">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los planes</SelectItem>
                    {planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDocente} onValueChange={setFilterDocente}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Docente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los docentes</SelectItem>
                    {docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterApartado} onValueChange={setFilterApartado}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="Apartado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los apartados</SelectItem>
                    {apartadosDisponibles.map((apartado) => <SelectItem key={apartado} value={apartado}>{apartado}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAll.map((doc) => {
                  const isReviewed = "reviewedAt" in doc;
                  return (
                    <div key={doc.id} className="cursor-pointer flex flex-col gap-2 rounded-xl border border-border/70 bg-background/80 p-4 lg:flex-row lg:items-center lg:justify-between shadow-sm hover:border-emerald-300/60 hover:bg-emerald-50/40 transition-colors dark:bg-slate-950/60 dark:hover:bg-slate-900/70">
                      <div>
                        <p className="font-medium">{doc.documento}</p>
                        <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">{doc.ciclo}</Badge>
                          <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                          <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>
                          <Eye className="h-4 w-4 mr-1" />Ver PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.docente}`}>
                          Enviar
                        </Button>
                        {('returned' in doc) && doc.returned && <Badge variant="destructive">Devuelto</Badge>}
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
          <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/40 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-emerald-950/20">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4">
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los planes</SelectItem>
                    {planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDocente} onValueChange={setFilterDocente}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por docente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los docentes</SelectItem>
                    {docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterApartado} onValueChange={setFilterApartado}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="Filtrar por apartado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los apartados</SelectItem>
                    {apartadosDisponibles.map((apartado) => <SelectItem key={apartado} value={apartado}>{apartado}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPending.map((doc) => (
                  <div key={doc.id} className="cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{doc.documento}</p>
                        <p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{doc.ciclo}</Badge>
                          <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                          <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>
                          <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>
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
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.docente}`}>
                        Enviar
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
                      <div key={doc.id} className="cursor-pointer flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                        <div>
                          <p className="font-medium">{doc.documento}</p>
                          <p className="text-sm text-muted-foreground">{doc.docente}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">{doc.carrera}</Badge>
                            <Badge variant="outline" className="text-xs">{doc.ciclo}</Badge>
                            <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                            <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>
                            <Eye className="h-4 w-4 mr-1" />Ver PDF
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.docente}`}>
                            Enviar
                          </Button>
                          <Badge variant="success">Revisado</Badge>
                        </div>
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
                {reviewedToday.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                    No hay documentos revisados hoy.
                  </div>
                ) : (
                  reviewedToday.map((doc) => (
                    <div key={doc.id} className="cursor-pointer flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                      <div>
                        <p className="font-medium">{doc.documento}</p>
                        <p className="text-sm text-muted-foreground">{doc.docente}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">{doc.carrera}</Badge>
                          <Badge variant="outline" className="text-xs">{doc.ciclo}</Badge>
                          <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                          <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>
                          <Eye className="h-4 w-4 mr-1" />Ver PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.docente}`}>
                          Enviar
                        </Button>
                        <Badge variant="success">{doc.reviewedAt}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewDocument !== null} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa del documento</DialogTitle>
            <DialogDescription>Simulación de lectura del archivo PDF del documento seleccionado.</DialogDescription>
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
                      <p><span className="font-medium">Grupo:</span> {"grupo" in previewDocument ? previewDocument.grupo : "N/D"}</p>
                      <p><span className="font-medium">Plan:</span> {previewDocument.plan}</p>
                      <p><span className="font-medium">Apartado:</span> {previewDocument.apartado}</p>
                    </div>
                  </div>
                  <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Esta es una vista previa simulada del PDF asociado al documento.
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setPreviewDocument(null)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { EstadiaDocumentItem };