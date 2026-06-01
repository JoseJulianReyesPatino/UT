import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { FileText, Eye, MessageSquare, Check, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { carrieras } from "../../data/curricula";

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
  returnedAt?: string;
  resubmittedAt?: string;
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
  fecha?: string;
  returned?: boolean;
  returnedAt?: string;
  resubmittedAt?: string;
};

type TutorDocumentItem = TutorPendingDocument | TutorReviewedDocument;

type ReturnConfirmation = {
  type: "return" | "cancel-return";
  document: TutorDocumentItem;
};

type CareerOption = {
  value: string;
  label: string;
};

const careerOptions: CareerOption[] = Array.from(
  new Map(
    [
      ...carrieras["nuevo-modelo"].tsu,
      ...carrieras["nuevo-modelo"].ingenieria,
      ...carrieras["plan-normal"].ingenieria,
    ].map((career) => [career.nombre, { value: career.nombre, label: career.nombre }])
  ).values()
);

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
    fecha: "2026-05-17 08:20",
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
    fecha: "2026-05-16 09:05",
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
    fecha: "2026-05-15 11:40",
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
    fecha: "2026-05-14 12:10",
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
    fecha: "2026-05-13 07:55",
    returned: false,
    returnedAt: "2026-05-18 10:00",
    resubmittedAt: "2026-05-18 11:35",
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
    fecha: "2026-05-17 08:25",
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
  const [filterReturned, setFilterReturned] = useState("all");
  const [activeSection, setActiveSection] = useState<ReviewSection>("all");
  const [previewDocument, setPreviewDocument] = useState<TutorDocumentItem | null>(null);
  const [returnConfirmation, setReturnConfirmation] = useState<ReturnConfirmation | null>(null);
  const [reviewConfirmation, setReviewConfirmation] = useState<TutorPendingDocument | null>(null);

  const allDocuments = [...pendingDocuments, ...reviewedDocuments];
  const todayKey = new Date().toISOString().slice(0, 10);

  const formatDateOnlyFromKey = (dateKey: string) => {
    try {
      const d = new Date(dateKey + "T00:00:00");
      return d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return dateKey;
    }
  };

  const formatTime12 = (iso?: string) => {
    if (!iso) return "";
    try {
      // Accept both ISO and 'YYYY-MM-DD HH:MM' by replacing space with 'T'
      const normalized = iso.includes(" ") && !iso.includes("T") ? iso.replace(" ", "T") : iso;
      const d = new Date(normalized);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    } catch {
      return iso;
    }
  };

  const formatSentFecha = (fecha?: string) => {
    if (!fecha) return "";
    // if contains time
    if (fecha.includes("T") || fecha.includes(" ")) {
      try {
        const d = new Date(fecha);
        const date = d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
        const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
        return `${date} ${time}`;
      } catch {
        return fecha;
      }
    }
    // assume YYYY-MM-DD
    try {
      const d = new Date(fecha + "T00:00:00");
      return d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return fecha;
    }
  };

  const formatDateTimeFromIso = (value?: string) => {
    if (!value) return "";
    try {
      const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
      const date = new Date(normalized);
      const datePart = date.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
      const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
      return `${datePart} ${timePart}`;
    } catch {
      return value;
    }
  };

  const matchesFilters = (doc: { ciclo: string; carrera: string; tutor: string; apartado: string; returned?: boolean }) => {
    const matchesCiclo = filterCiclo === "all" || doc.ciclo === filterCiclo;
    const matchesCarrera = filterCarrera === "all" || doc.carrera === filterCarrera;
    const matchesTutor = filterTutor === "all" || doc.tutor === filterTutor;
    const matchesApartado = filterApartado === "all" || doc.apartado === filterApartado;
    const isReturned = Boolean(doc.returned);
    const matchesReturned =
      filterReturned === "all"
      || (filterReturned === "returned" && isReturned)
      || (filterReturned === "not-returned" && !isReturned);

    return matchesCiclo && matchesCarrera && matchesTutor && matchesApartado && matchesReturned;
  };

  const filteredPending = pendingDocuments.filter(matchesFilters);
  const filteredReviewed = reviewedDocuments.filter(matchesFilters);
  const filteredAll = allDocuments.filter(matchesFilters);
  const reviewedToday = filteredReviewed.filter((doc) => doc.reviewedAt && doc.reviewedAt.startsWith(todayKey));

  const getDocumentStatusLabel = (doc: TutorDocumentItem) => {
    if ("resubmittedAt" in doc && doc.resubmittedAt) return "Reenviado";
    if (doc.returned) return "Devuelto";
    if ("reviewedAt" in doc) return "Revisado";
    return "Pendiente";
  };

  const reviewedByDate = useMemo(() => {
    return filteredReviewed.reduce<Record<string, TutorReviewedDocument[]>>((groups, doc) => {
      const date = doc.reviewedAt ? doc.reviewedAt.slice(0, 10) : "";
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

    // store full ISO so we can format date/time as needed
    const reviewedAt = new Date().toISOString();

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
        fecha: documentToReview.fecha,
        returnedAt: documentToReview.returnedAt,
      },
      ...current,
    ]);
    toast.success("Documento de tutor marcado como revisado");
  };

  const setDocumentReturnedState = (documentId: number, returned: boolean) => {
    const returnedAt = returned ? new Date().toISOString() : undefined;

    setPendingDocuments((current) => current.map((d) => (d.id === documentId ? { ...d, returned, returnedAt } : d)));
    setReviewedDocuments((current) => current.map((d) => (d.id === documentId ? { ...d, returned, returnedAt } : d)));
  };

  const handleConfirmReturnAction = () => {
    if (!returnConfirmation) return;

    if (returnConfirmation.type === "return") {
      setDocumentReturnedState(returnConfirmation.document.id, true);
      toast.success("Documento marcado como devuelto");
    } else {
      setDocumentReturnedState(returnConfirmation.document.id, false);
      toast.success("Devolución cancelada correctamente");
    }

    setReturnConfirmation(null);
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

  const sectionCardClassName =
    "overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/40 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-emerald-950/20";

  const filtersGridClassName = "grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-5";
  const filterSelectTriggerClassName = "w-full text-[13px] leading-tight sm:text-sm";
  const filterSelectValueClassName = "truncate";

  const getDocumentRowClassName = (isReturned: boolean) => (
    `relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border transition-colors ${isReturned
      ? "border-rose-300/70 bg-rose-50/70 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
      : "border-border hover:bg-accent/50"
    }`
  );

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div>
        <h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-emerald-300">Gestión de Tutores</h1>
        <p className="text-muted-foreground">Revisa y administra los documentos enviados por tutores (separado de documentos docentes)</p>
      </div>

      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as ReviewSection)}>
        <div className="sm:hidden mb-3">
          <Select value={activeSection} onValueChange={(v) => setActiveSection(v as ReviewSection)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Sección" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendientes">Pendientes</SelectItem>
              <SelectItem value="revisados">Revisados</SelectItem>
              <SelectItem value="hoy">Revisados hoy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsList className="hidden sm:flex w-full gap-2 p-1 px-2 bg-gradient-to-r from-emerald-100 via-emerald-50 to-emerald-50 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex-wrap">
          <TabsTrigger value="all" className="px-3 py-2 text-sm">
            Todos
            <Badge variant="outline" className="ml-2">{allDocuments.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pendientes" className="px-3 py-2 text-sm">
            Pendientes
            <Badge variant="warning" className="ml-2">{filteredPending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="revisados" className="px-3 py-2 text-sm">Revisados</TabsTrigger>
          <TabsTrigger value="hoy" className="px-3 py-2 text-sm">Revisados hoy</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              <div className={filtersGridClassName}>
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <Select value={filterTutor} onValueChange={setFilterTutor}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por tutor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tutores</SelectItem>
                    {tutoresDisponibles.map((tutor) => <SelectItem key={tutor} value={tutor}>{tutor}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    {careerOptions.map((career) => (
                      <SelectItem key={career.value} value={career.value}>{career.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterApartado} onValueChange={setFilterApartado}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por apartado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los apartados</SelectItem>
                    {apartadosDisponibles.map((apartado) => <SelectItem key={apartado} value={apartado}>{apartado}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="col-span-2 sm:col-span-1">
                  <Select value={filterReturned} onValueChange={setFilterReturned}>
                    <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los documentos</SelectItem>
                      <SelectItem value="returned">Solo devueltos</SelectItem>
                      <SelectItem value="not-returned">No devueltos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAll.map((doc) => {
                  const isReviewed = "reviewedAt" in doc;
                  const isReturned = Boolean(doc.returned);
                  return (
                    <div key={doc.id} className={getDocumentRowClassName(isReturned)}>
                      <button
                        type="button"
                        aria-label={`Abrir vista previa de ${doc.documento}`}
                        onClick={() => setPreviewDocument(doc)}
                        className={previewCardOverlayClassName}
                      />
                      <div className="relative z-20 flex items-start gap-3 flex-1 min-w-0 pointer-events-none">
                        <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                          <p className="font-medium break-words text-sm sm:text-base">{doc.documento}</p>
                          <p className="text-sm text-muted-foreground">{"tutor" in doc ? doc.tutor : (doc as any).tutor} • {doc.carrera}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                            {"materia" in doc && doc.materia && doc.materia.trim() !== "-" && (
                              <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                {doc.materia}
                              </Button>
                            )}
                            {"cuatrimestre" in doc && doc.cuatrimestre && (
                              <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                {doc.cuatrimestre}° Cuatri
                              </Button>
                            )}
                            {"grupo" in doc && doc.grupo && (
                              <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                Grupo {doc.grupo}
                              </Button>
                            )}
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.ciclo}
                            </Button>
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.apartado}
                            </Button>
                          </div>
                            {('fecha' in doc && doc.fecha) && (
                              <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatSentFecha(('fecha' in doc ? doc.fecha : ''))} {('fecha' in doc && doc.fecha && (doc.fecha.includes('T') || doc.fecha.includes(' '))) ? <span className="ml-2 text-xs text-muted-foreground">{formatTime12(doc.fecha)}</span> : null}</p>
                            )}
                            {'reviewedAt' in doc && doc.reviewedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>
                            )}
                            {'returnedAt' in doc && doc.returnedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                            )}
                            {'resubmittedAt' in doc && doc.resubmittedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>
                            )}
                        </div>
                      </div>
                      <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto sm:justify-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                        <ResponsiveActionButton
                          variant="outline"
                          size="sm"
                          label="Ver"
                          title="Ver PDF"
                          onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }}
                          icon={<Eye className="h-4 w-4" />}
                        />

                        {!isReviewed && (
                        <ResponsiveActionButton
                          variant="outline"
                          size="sm"
                          label="Revisar"
                          title="Revisar documento"
                          onClick={(e) => { e.stopPropagation(); setReviewConfirmation(doc as TutorPendingDocument); }}
                          icon={<Check className="h-4 w-4" />}
                        />
                        )}

                        <ResponsiveActionButton
                          variant="ghost"
                          size="sm"
                          label="Enviar"
                          title={`Enviar a mensajes ${'tutor' in doc ? doc.tutor : (doc as any).tutor}`}
                          onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }}
                          icon={<MessageSquare className="h-4 w-4" />}
                        />

                        {doc.returned ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <ResponsiveActionButton
                                  variant="outline"
                                  size="sm"
                                  label="Cancelar"
                                  title="Cancelar devolución"
                                  className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReturnConfirmation({ type: "cancel-return", document: doc });
                                  }}
                                  icon={<Undo2 className="h-4 w-4" />}
                                />
                            </TooltipTrigger>
                            <TooltipContent>Cancelar devolución</TooltipContent>
                          </Tooltip>
                        ) : (
                            <ResponsiveActionButton
                              variant="destructive"
                              size="sm"
                              label="Devolver"
                              title="Devolver documento"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReturnConfirmation({ type: "return", document: doc });
                              }}
                              icon={<Undo2 className="h-4 w-4" />}
                            />
                        )}

                        <Badge variant={getDocumentStatusLabel(doc) === "Devuelto" ? "destructive" : "warning"}>
                          {getDocumentStatusLabel(doc)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendientes" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              <div className={filtersGridClassName}>
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <Select value={filterTutor} onValueChange={setFilterTutor}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por tutor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tutores</SelectItem>
                    {tutoresDisponibles.map((tutor) => <SelectItem key={tutor} value={tutor}>{tutor}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    {careerOptions.map((career) => (
                      <SelectItem key={career.value} value={career.value}>{career.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterApartado} onValueChange={setFilterApartado}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por apartado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los apartados</SelectItem>
                    {apartadosDisponibles.map((apartado) => <SelectItem key={apartado} value={apartado}>{apartado}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="col-span-2 sm:col-span-1">
                  <Select value={filterReturned} onValueChange={setFilterReturned}>
                    <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los documentos</SelectItem>
                      <SelectItem value="returned">Solo devueltos</SelectItem>
                      <SelectItem value="not-returned">No devueltos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPending.map((doc) => {
                  const isReturned = Boolean(doc.returned);
                  return (
                  <div key={doc.id} className={getDocumentRowClassName(isReturned)}>
                    <button
                      type="button"
                      aria-label={`Abrir vista previa de ${doc.documento}`}
                      onClick={() => setPreviewDocument(doc)}
                      className={previewCardOverlayClassName}
                    />
                    <div className="relative z-20 flex items-start gap-3 flex-1 min-w-0 pointer-events-none">
                      <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                        <p className="break-words text-sm font-medium leading-snug sm:text-base">{doc.documento}</p>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">{doc.tutor} • {doc.carrera}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          {doc.materia && doc.materia.trim() !== "-" && (
                            <Button type="button" variant="outline" className={`${previewChipClassName} w-full justify-center pointer-events-auto sm:w-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.materia}
                            </Button>
                          )}
                          <Button type="button" variant="outline" className={`${previewChipClassName} w-full justify-center pointer-events-auto sm:w-auto`} onClick={() => setPreviewDocument(doc)}>
                            {doc.cuatrimestre}° Cuatri
                          </Button>
                          <Button type="button" variant="outline" className={`${previewChipClassName} w-full justify-center pointer-events-auto sm:w-auto`} onClick={() => setPreviewDocument(doc)}>
                            Grupo {doc.grupo}
                          </Button>
                          <Button type="button" variant="outline" className={`${previewChipClassName} w-full justify-center pointer-events-auto sm:w-auto`} onClick={() => setPreviewDocument(doc)}>
                            {doc.ciclo}
                          </Button>
                          <Button type="button" variant="outline" className={`${previewChipClassName} col-span-2 w-full justify-center pointer-events-auto sm:col-span-1 sm:w-auto`} onClick={() => setPreviewDocument(doc)}>
                            {doc.apartado}
                          </Button>
                        </div>
                        {doc.fecha && (
                          <p className="mt-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">Enviado: {formatSentFecha(doc.fecha)} {doc.fecha && (doc.fecha.includes('T') || doc.fecha.includes(' ')) ? <span className="ml-2 text-[11px] text-muted-foreground sm:text-xs">{formatTime12(doc.fecha)}</span> : null}</p>
                        )}
                        {'returnedAt' in doc && doc.returnedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                        )}
                        {'resubmittedAt' in doc && doc.resubmittedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>
                        )}
                      </div>
                    </div>
                    <div className="relative z-20 grid grid-cols-2 gap-2 pointer-events-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                      {isReturned && <Badge variant="destructive" className="col-span-2 justify-self-end sm:col-span-1">Devuelto</Badge>}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} aria-label="Ver PDF">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver PDF</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setReviewConfirmation(doc); }} aria-label="Revisar documento">
                            <Check className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Revisar</TooltipContent>
                      </Tooltip>

                        <ResponsiveActionButton
                          variant="ghost"
                          size="sm"
                          label="Enviar"
                          title={`Enviar a mensajes ${'tutor' in doc ? doc.tutor : (doc as any).tutor}`}
                          onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }}
                          icon={<MessageSquare className="h-4 w-4" />}
                        />

                      {doc.returned ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ResponsiveActionButton
                              variant="outline"
                              size="sm"
                              label="Cancelar"
                              title="Cancelar devolución"
                              className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReturnConfirmation({ type: "cancel-return", document: doc });
                              }}
                              icon={<Undo2 className="h-4 w-4" />}
                            />
                          </TooltipTrigger>
                          <TooltipContent>Cancelar devolución</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReturnConfirmation({ type: "return", document: doc });
                              }}
                              aria-label="Devolver documento"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Devolver</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisados" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              <div className={filtersGridClassName}>
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterTutor} onValueChange={setFilterTutor}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por tutor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tutores</SelectItem>
                    {tutoresDisponibles.map((tutor) => <SelectItem key={tutor} value={tutor}>{tutor}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    {careerOptions.map((career) => (
                      <SelectItem key={career.value} value={career.value}>{career.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterApartado} onValueChange={setFilterApartado}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por apartado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los apartados</SelectItem>
                    {apartadosDisponibles.map((apartado) => <SelectItem key={apartado} value={apartado}>{apartado}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="col-span-2 sm:col-span-1">
                  <Select value={filterReturned} onValueChange={setFilterReturned}>
                    <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los documentos</SelectItem>
                      <SelectItem value="returned">Solo devueltos</SelectItem>
                      <SelectItem value="not-returned">No devueltos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>
          <div className="space-y-4">
            {Object.entries(reviewedByDate).filter(([date]) => date).map(([date, docs]) => (
              <Card key={date} className={sectionCardClassName}>
                <CardHeader>
                  <CardTitle>{formatDateOnlyFromKey(date)}</CardTitle>
                  <CardDescription>{docs.length} documentos revisados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {docs.map((doc) => {
                      const isReturned = Boolean(doc.returned);
                      return (
                      <div key={doc.id} className={getDocumentRowClassName(isReturned)}>
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
                            <p className="font-medium break-words text-sm sm:text-base">{doc.documento}</p>
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
                            {'reviewedAt' in doc && doc.reviewedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>
                            )}
                            {'returnedAt' in doc && doc.returnedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                            )}
                          </div>
                        </div>
                        <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto sm:justify-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} aria-label="Ver PDF">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver PDF</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.tutor}`}>
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Enviar</TooltipContent>
                          </Tooltip>

                          {doc.returned ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReturnConfirmation({ type: "cancel-return", document: doc });
                                  }}
                                  aria-label="Cancelar devolución"
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar devolución</TooltipContent>
                            </Tooltip>
                          ) : (
                            <ResponsiveActionButton
                              variant="destructive"
                              size="sm"
                              label="Devolver"
                              title="Devolver documento"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReturnConfirmation({ type: "return", document: doc });
                              }}
                              icon={<Undo2 className="h-4 w-4" />}
                            />
                          )}

                          <Badge variant={getDocumentStatusLabel(doc) === "Devuelto" ? "destructive" : "warning"}>{getDocumentStatusLabel(doc)}</Badge>
                        </div>
                      </div>
                    )})}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="hoy" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader className="pb-4">
              <CardTitle>Revisados hoy</CardTitle>
              <CardDescription>Documentos abiertos por administración en el día</CardDescription>
              <div className={filtersGridClassName}>
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterTutor} onValueChange={setFilterTutor}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por tutor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tutores</SelectItem>
                    {tutoresDisponibles.map((tutor) => <SelectItem key={tutor} value={tutor}>{tutor}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    {careerOptions.map((career) => (
                      <SelectItem key={career.value} value={career.value}>{career.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterApartado} onValueChange={setFilterApartado}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por apartado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los apartados</SelectItem>
                    {apartadosDisponibles.map((apartado) => <SelectItem key={apartado} value={apartado}>{apartado}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterReturned} onValueChange={setFilterReturned}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los documentos</SelectItem>
                    <SelectItem value="returned">Solo devueltos</SelectItem>
                    <SelectItem value="not-returned">No devueltos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reviewedToday.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-background/70 p-8 text-center text-muted-foreground dark:bg-slate-950/40">
                    No hay documentos revisados hoy.
                  </div>
                ) : (
                  reviewedToday.map((doc) => {
                    const isReturned = Boolean(doc.returned);
                    return (
                    <div key={doc.id} className={getDocumentRowClassName(isReturned)}>
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
                            {doc.fecha && (
                              <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatSentFecha(doc.fecha)} {doc.fecha && (doc.fecha.includes('T') || doc.fecha.includes(' ')) ? <span className="ml-2 text-xs text-muted-foreground">{formatTime12(doc.fecha)}</span> : null}</p>
                            )}
                            {'returnedAt' in doc && doc.returnedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>
                            )}
                            {'resubmittedAt' in doc && doc.resubmittedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>
                            )}
                          {'reviewedAt' in doc && doc.reviewedAt && (
                            <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>
                          )}
                        </div>
                      </div>
                      <div className="relative z-20 flex flex-wrap items-center justify-end gap-2 pointer-events-auto">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} aria-label="Ver PDF">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver PDF</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.tutor}`}>
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Enviar</TooltipContent>
                        </Tooltip>

                        <Badge variant={getDocumentStatusLabel(doc) === "Devuelto" ? "destructive" : "warning"}>{getDocumentStatusLabel(doc)}</Badge>
                      </div>
                    </div>
                  )})
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
                {"resubmittedAt" in previewDocument && previewDocument.resubmittedAt ? (
                  <Badge variant="warning">Reenviado</Badge>
                ) : Boolean(previewDocument.returned) && <Badge variant="destructive">Devuelto</Badge>}
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

      <Dialog
        open={returnConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReturnConfirmation(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {returnConfirmation?.type === "return" ? "Confirmar devolución" : "Cancelar devolución"}
            </DialogTitle>
            <DialogDescription>
              {returnConfirmation?.type === "return"
                ? "¿Seguro que quieres marcar este documento como devuelto?"
                : "¿Seguro que quieres cancelar la devolución de este documento?"}
            </DialogDescription>
          </DialogHeader>

          {returnConfirmation && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{returnConfirmation.document.documento}</p>
              <p className="text-muted-foreground">{returnConfirmation.document.tutor}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnConfirmation(null)}>
              Cancelar
            </Button>
            <Button
              variant={returnConfirmation?.type === "return" ? "destructive" : "success"}
              onClick={handleConfirmReturnAction}
            >
              {returnConfirmation?.type === "return" ? "Sí, devolver" : "Sí, cancelar devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reviewConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) setReviewConfirmation(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar revisión</DialogTitle>
            <DialogDescription>¿Seguro que quieres marcar este documento como revisado?</DialogDescription>
          </DialogHeader>

          {reviewConfirmation && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{reviewConfirmation.documento}</p>
              <p className="text-muted-foreground">{reviewConfirmation.tutor}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewConfirmation(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!reviewConfirmation) return;
                handleReviewDocument(reviewConfirmation.id);
                setReviewConfirmation(null);
              }}
            >
              Sí, marcar como revisado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
