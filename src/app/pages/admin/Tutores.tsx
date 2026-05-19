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

type TutorPendingDocument = {
  id: number;
  ciclo: string;
  plan: string;
  tutor: string;
  documento: string;
  apartado: string;
  carrera: string;
  materia?: string;
  cuatrimestre?: string;
  grupo?: string;
  fecha: string;
  returned?: boolean;
};

type TutorReviewedDocument = {
  id: number;
  ciclo: string;
  plan: string;
  tutor: string;
  documento: string;
  apartado: string;
  carrera: string;
  reviewedAt: string;
  returned?: boolean;
};

type TutorDocumentItem = TutorPendingDocument | TutorReviewedDocument;

const initialPending: TutorPendingDocument[] = [
  {
    id: 1,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    tutor: "Mtro. Juan Pérez",
    documento: "Carga académica - Tutoría Grupo A",
    apartado: "Carga académica",
    carrera: "Ingeniería en Sistemas",
    materia: "-",
    cuatrimestre: "5",
    grupo: "A",
    fecha: "2026-05-17",
  },
  {
    id: 2,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    tutor: "Dra. Ana Martínez",
    documento: "Reporte de bajas - Tutoría Grupo B",
    apartado: "Reporte de bajas",
    carrera: "TSU Desarrollo Software",
    materia: "-",
    cuatrimestre: "3",
    grupo: "B",
    fecha: "2026-05-16",
  },
  {
    id: 3,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    tutor: "Mtra. Laura Gómez",
    documento: "Concentrado de asesorías y bajas - Grupo C",
    apartado: "Concentrado de asesorías y bajas",
    carrera: "Ingeniería en Sistemas",
    materia: "-",
    cuatrimestre: "4",
    grupo: "C",
    fecha: "2026-05-15",
  },
  {
    id: 4,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    tutor: "Mtro. Carlos López",
    documento: "Acta de asistencia grupal - Tutoría Grupal",
    apartado: "Acta de asistencia grupal",
    carrera: "Ingeniería en Redes",
    materia: "-",
    cuatrimestre: "7",
    grupo: "A",
    fecha: "2026-05-14",
  },
  {
    id: 5,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    tutor: "Dra. María González",
    documento: "Ficha Técnica - Tutoría Grupo D",
    apartado: "Ficha Técnica",
    carrera: "TSU Infraestructura",
    materia: "-",
    cuatrimestre: "2",
    grupo: "D",
    fecha: "2026-05-13",
    returned: false,
  },
];

const initialReviewed: TutorReviewedDocument[] = [
  {
    id: 101,
    ciclo: "Ciclo Escolar 2026",
    plan: "Plan Nuevo Modelo",
    tutor: "Mtro. Roberto Silva",
    documento: "Ficha Técnica - Tutorías",
    apartado: "Ficha Técnica",
    carrera: "Ingeniería en Sistemas",
    reviewedAt: "2026-05-17 09:15",
    returned: false,
  },
];

export default function Tutores() {
  const [pendingDocuments, setPendingDocuments] = useState<TutorPendingDocument[]>(initialPending);
  const [reviewedDocuments, setReviewedDocuments] = useState<TutorReviewedDocument[]>(initialReviewed);
  const [filterCiclo, setFilterCiclo] = useState("all");
  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterTutor, setFilterTutor] = useState("all");
  const [filterApartado, setFilterApartado] = useState("all");
  const [activeSection, setActiveSection] = useState<ReviewSection>("all");
  const [previewDocument, setPreviewDocument] = useState<TutorDocumentItem | null>(null);

  const allDocuments = [...pendingDocuments, ...reviewedDocuments];
  const todayKey = new Date().toISOString().slice(0, 10);

  const matchesFilters = (doc: { ciclo: string; carrera: string; tutor: string; apartado: string }) => {
    const matchesCiclo = filterCiclo === "all" || doc.ciclo === filterCiclo;
    const matchesCarrera = filterCarrera === "all" || doc.carrera === filterCarrera;
    const matchesTutor = filterTutor === "all" || doc.tutor === filterTutor;
    const matchesApartado = filterApartado === "all" || doc.apartado === filterApartado;
    return matchesCiclo && matchesCarrera && matchesTutor && matchesApartado;
  };

  const filteredPending = pendingDocuments.filter(matchesFilters);
  const filteredReviewed = reviewedDocuments.filter(matchesFilters);
  const filteredAll = allDocuments.filter(matchesFilters);
  const reviewedToday = filteredReviewed.filter((doc) => doc.reviewedAt.startsWith(todayKey));

  const reviewedByDate = useMemo(() => {
    return filteredReviewed.reduce<Record<string, TutorReviewedDocument[]>>((groups, doc) => {
      const date = doc.reviewedAt.slice(0, 10);
      groups[date] = [...(groups[date] || []), doc];
      return groups;
    }, {});
  }, [filteredReviewed]);

  const ciclosDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.ciclo)));
  const tutoresDisponibles = Array.from(new Set(allDocuments.map((doc) => ("tutor" in doc ? doc.tutor : (doc as any).tutor))));
  const apartadosDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.apartado)));

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

    setPendingDocuments((current) => current.filter((d) => d.id !== documentId));
    setReviewedDocuments((current) => [
      {
        id: documentToReview.id,
        ciclo: documentToReview.ciclo,
        plan: documentToReview.plan,
        tutor: documentToReview.tutor,
        documento: documentToReview.documento,
        apartado: documentToReview.apartado,
        carrera: documentToReview.carrera,
        reviewedAt,
      },
      ...current,
    ]);
    toast.success("Documento de tutor marcado como revisado");
  };

  const handleReturnDocument = (documentId: number) => {
    setPendingDocuments((current) => current.map((d) => (d.id === documentId ? { ...d, returned: true } : d)));
    setReviewedDocuments((current) => current.map((d) => (d.id === documentId ? { ...d, returned: true } : d)));
    toast.success("Documento marcado como devuelto");
  };

  const handleShareToMessages = (doc: TutorDocumentItem) => {
    const recipientName = 'tutor' in doc ? doc.tutor : (doc as any).tutor;
    globalThis.dispatchEvent(new CustomEvent('openMessagesConversation', { detail: { recipientName, recipientRole: 'Tutor', document: { id: doc.id, title: doc.documento } } }));
  };

  const closePreview = () => setPreviewDocument(null);

  const previewChipClassName =
    "h-8 rounded-full border-border bg-background/90 px-3 text-xs font-medium text-foreground hover:bg-emerald-50 hover:text-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200";

  const previewCardOverlayClassName =
    "absolute inset-0 z-10 rounded-xl bg-transparent cursor-pointer";

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div>
        <h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-cyan-300">Gestión de Tutores</h1>
        <p className="text-muted-foreground">Revisa y administra los documentos enviados por tutores (separado de documentos docentes)</p>
      </div>

      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as ReviewSection)}>
        <TabsList className="bg-gradient-to-r from-emerald-100 via-emerald-50 to-sky-100 p-1 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <TabsTrigger value="all">
            Todos
            <Badge variant="outline" className="ml-2">{allDocuments.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pendientes">
            Pendientes
            <Badge variant="warning" className="ml-2">{filteredPending.length}</Badge>
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
                
                <Select value={filterTutor} onValueChange={setFilterTutor}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por tutor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tutoresDisponibles.map((tutor) => <SelectItem key={tutor} value={tutor}>{tutor}</SelectItem>)}
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
                {filteredAll.map((doc) => {
                  const isReviewed = "reviewedAt" in doc;
                  return (
                    <div
                      key={doc.id}
                      className="relative flex flex-col gap-2 rounded-xl border border-border/70 bg-background/80 p-4 lg:flex-row lg:items-center lg:justify-between shadow-sm hover:border-emerald-300/60 hover:bg-emerald-50/40 transition-colors dark:bg-slate-950/60 dark:hover:bg-slate-900/70"
                    >
                      <button
                        type="button"
                        aria-label={`Abrir vista previa de ${doc.documento}`}
                        onClick={() => setPreviewDocument(doc)}
                        className={previewCardOverlayClassName}
                      />
                      <div className="relative z-20 pointer-events-none">
                        <p className="font-medium">{doc.documento}</p>
                        <p className="text-sm text-muted-foreground">{"tutor" in doc ? doc.tutor : (doc as any).tutor} • {doc.carrera}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                            {doc.ciclo}
                          </Button>
                          <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                            {doc.apartado}
                          </Button>
                        </div>
                      </div>
                      <Badge variant={isReviewed ? "success" : "warning"} className="relative z-20 pointer-events-none">{isReviewed ? "Revisado" : "Pendiente"}</Badge>
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
                
                <Select value={filterTutor} onValueChange={setFilterTutor}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filtrar por tutor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tutoresDisponibles.map((tutor) => <SelectItem key={tutor} value={tutor}>{tutor}</SelectItem>)}
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
                {filteredPending.map((doc) => (
                  <div
                    key={doc.id}
                    className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <button
                      type="button"
                      aria-label={`Abrir vista previa de ${doc.documento}`}
                      onClick={() => setPreviewDocument(doc)}
                      className={previewCardOverlayClassName}
                    />
                    <div className="relative z-20 flex items-start gap-3 flex-1 pointer-events-none">
                      <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                        <p className="font-medium">{doc.documento}</p>
                        <p className="text-sm text-muted-foreground">{doc.tutor} • {doc.carrera}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                            {doc.materia}
                          </Button>
                          <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                            {doc.cuatrimestre}° Cuatri
                          </Button>
                          <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                            Grupo {doc.grupo}
                          </Button>
                          <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                            {doc.ciclo}
                          </Button>
                          <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                            {doc.apartado}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="relative z-20 flex items-center gap-2 pointer-events-auto">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}>
                        <Eye className="h-4 w-4 mr-1" />Ver PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleReviewDocument(doc.id); }}>
                        <Eye className="h-4 w-4 mr-1" />Revisar
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${'tutor' in doc ? doc.tutor : (doc as any).tutor}`}>
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
                        className="relative flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                      >
                        <button
                          type="button"
                          aria-label={`Abrir vista previa de ${doc.documento}`}
                          onClick={() => setPreviewDocument(doc)}
                          className={previewCardOverlayClassName}
                        />
                        <div className="relative z-20 pointer-events-none">
                          <p className="font-medium">{doc.documento}</p>
                          <p className="text-sm text-muted-foreground">{doc.tutor}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.carrera}
                            </Button>
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.ciclo}
                            </Button>
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.apartado}
                            </Button>
                          </div>
                        </div>
                        <Badge variant="success" className="relative z-20 pointer-events-none">Revisado</Badge>
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
                    <div
                      key={doc.id}
                      className="relative flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                    >
                        <button
                          type="button"
                          aria-label={`Abrir vista previa de ${doc.documento}`}
                          onClick={() => setPreviewDocument(doc)}
                          className={previewCardOverlayClassName}
                        />
                      <div className="relative z-20 pointer-events-none">
                        <p className="font-medium">{doc.documento}</p>
                        <p className="text-sm text-muted-foreground">{doc.tutor}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.carrera}
                            </Button>
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.ciclo}
                            </Button>
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.apartado}
                            </Button>
                        </div>
                      </div>
                      <Badge variant="success" className="relative z-20 pointer-events-none">{doc.reviewedAt}</Badge>
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
                <Badge variant="outline">{previewDocument.apartado}</Badge>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 md:p-6">
                <div className="mx-auto flex min-h-[70vh] w-full max-w-[1100px] flex-col justify-between rounded-lg border border-border bg-background p-6 md:p-10 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Documento PDF</p>
                      <h3 className="mt-2 text-2xl font-semibold md:text-3xl">{previewDocument.documento}</h3>
                      <p className="text-base text-muted-foreground">{"tutor" in previewDocument ? previewDocument.tutor : (previewDocument as any).tutor}</p>
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
