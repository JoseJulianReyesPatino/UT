import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Eye, FileText, Check, MessageSquare, Undo2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import apiFetch from "../../lib/api";
import { getDocumentFileUrl } from "../../lib/documents";
import { formatGroupCode } from "../../../lib/utils";
import { useAuth } from "../../context/AuthContext";

type ReviewSection = "all" | "pendientes" | "revisados" | "hoy";

type EstadiaPendingDocument = {
  id: number;
  ciclo: string;
  plan: string;
  cuatrimestre: string;
  docente: string;
  documento: string;
  apartado: string;
  carrera: string;
  grupo: string;
  fecha: string;
  returned?: boolean;
  returnedAt?: string;
  resubmittedAt?: string;
};

type EstadiaReviewedDocument = {
  id: number;
  ciclo: string;
  plan: string;
  cuatrimestre: string;
  docente: string;
  documento: string;
  apartado: string;
  carrera: string;
  reviewedAt: string;
  fecha?: string;
  returned?: boolean;
  returnedAt?: string;
  resubmittedAt?: string;
};

type EstadiaDocumentItem = EstadiaPendingDocument | EstadiaReviewedDocument;

type ApiDocument = {
  id: number;
  nombre?: string;
  title?: string | null;
  tipo?: string | null;
  tipoLabel?: string | null;
  form_title?: string | null;
  apartado_label?: string | null;
  carrera_label?: string | null;
  uploaded_by_name?: string | null;
  materia?: string | null;
  parcial?: string | null;
  grupo?: string | null;
  group?: { group_code?: string | null } | null;
  group_code?: string | null;
  plan?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  returned_at?: string | null;
  resubmitted_at?: string | null;
  fileUrl?: string | null;
};

export default function Estadias() {
  const { isReady, isAuthenticated } = useAuth();
  const [pendingDocuments, setPendingDocuments] = useState<EstadiaPendingDocument[]>([]);
  const [reviewedDocuments, setReviewedDocuments] = useState<EstadiaReviewedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterCiclo, setFilterCiclo] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterCuatrimestre, setFilterCuatrimestre] = useState("all");
  const [filterDocente, setFilterDocente] = useState("all");
  const [filterApartado, setFilterApartado] = useState("all");
  const [filterReturned, setFilterReturned] = useState("all");
  const [activeSection, setActiveSection] = useState<ReviewSection>("all");
  const [previewDocument, setPreviewDocument] = useState<EstadiaDocumentItem | null>(null);
  const [reviewConfirmation, setReviewConfirmation] = useState<EstadiaPendingDocument | null>(null);
  const [returnConfirmation, setReturnConfirmation] = useState<{ type: "return" | "cancel-return"; document: EstadiaDocumentItem } | null>(null);

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
      const normalized = iso.includes(" ") && !iso.includes("T") ? iso.replace(" ", "T") : iso;
      const d = new Date(normalized);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    } catch {
      return iso;
    }
  };

  const formatSentFecha = (fecha?: string) => {
    if (!fecha) return "";
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
      const d = new Date(normalized);
      const date = d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
      const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
      return `${date} ${time}`;
    } catch {
      return value;
    }
  };

  const isEstadiasDocument = (doc: ApiDocument) => {
    const tipo = (doc.tipo ?? doc.tipoLabel ?? doc.form_title ?? "").toLowerCase();
    const label = (doc.tipoLabel ?? doc.apartado_label ?? doc.form_title ?? "").toLowerCase();
    return ["estadias", "carta-presentacion", "carta-aceptacion", "carta-terminacion", "acta-final"].some((value) => tipo.includes(value) || label.includes(value))
      || /estad[ií]a|carta de/i.test(label);
  };

  const mapApiDocument = (doc: ApiDocument, kind: "pending" | "reviewed"): EstadiaPendingDocument | EstadiaReviewedDocument => {
    const base = {
      id: Number(doc.id),
      ciclo: "Ciclo Escolar 2026",
      plan: doc.plan ?? "Plan Nuevo Modelo",
      cuatrimestre: doc.parcial ?? "-",
      docente: doc.uploaded_by_name ?? "Docente",
      documento: doc.title ?? doc.nombre ?? "Documento sin título",
      apartado: doc.apartado_label ?? doc.tipoLabel ?? doc.form_title ?? "Documento",
      carrera: doc.carrera_label ?? "Sin carrera",
      grupo: formatGroupCode(doc.group?.group_code ?? doc.group_code ?? "-"),
      fecha: doc.submitted_at ?? "",
      returned: doc.status === "devuelto",
      returnedAt: doc.returned_at ?? undefined,
      resubmittedAt: doc.resubmitted_at ?? undefined,
    };

    if (kind === "reviewed") {
      return {
        ...base,
        reviewedAt: doc.reviewed_at ?? doc.submitted_at ?? new Date().toISOString(),
      };
    }

    return base;
  };

  const emptyStateLegend = "Aún no hay documentos de estadías para mostrar en esta sección. Cuando un docente suba uno, aparecerá aquí automáticamente.";

  const previewChipClassName =
    "h-8 rounded-full border-border bg-background/90 px-3 text-xs font-medium text-foreground hover:bg-emerald-50 hover:text-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200";

  const previewCardOverlayClassName = "absolute inset-0 z-10 rounded-xl bg-transparent cursor-pointer";

  const sectionCardClassName =
    "overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/40 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-emerald-950/20";

  const documentRowClassName =
    "cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border border-border/70 bg-transparent shadow-sm transition-colors hover:bg-emerald-50/35 hover:border-emerald-300/60 dark:bg-transparent dark:hover:bg-slate-900/55 dark:hover:border-emerald-800/50";

  const getDocumentRowClassName = (isReturned: boolean) => (
    `relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border transition-colors ${isReturned
      ? "border-rose-300/70 bg-rose-50/70 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
      : "border-border hover:bg-accent/50"
    }`
  );

  const filtersGridClassName = "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5";
  const filterSelectTriggerClassName = "w-full text-[13px] leading-tight sm:text-sm";
  const filterSelectValueClassName = "truncate";

  const matchesFilters = (doc: { ciclo: string; plan: string; carrera: string; cuatrimestre: string; docente: string; apartado: string; returned?: boolean }) => {
    const matchesCiclo = filterCiclo === "all" || doc.ciclo === filterCiclo;
    const matchesPlan = filterPlan === "all" || doc.plan === filterPlan;
    const matchesCarrera = filterCarrera === "all" || doc.carrera === filterCarrera;
    const matchesCuatrimestre = filterCuatrimestre === "all" || doc.cuatrimestre === filterCuatrimestre;
    const matchesDocente = filterDocente === "all" || doc.docente === filterDocente;
    const matchesApartado = filterApartado === "all" || doc.apartado === filterApartado;
    const isReturned = Boolean(doc.returned);
    const matchesReturned =
      filterReturned === "all" ||
      (filterReturned === "returned" && isReturned) ||
      (filterReturned === "not-returned" && !isReturned);
    return matchesCiclo && matchesPlan && matchesCarrera && matchesCuatrimestre && matchesDocente && matchesApartado && matchesReturned;
  };

  const filteredPending = pendingDocuments.filter(matchesFilters);
  const filteredReviewed = reviewedDocuments.filter(matchesFilters);
  const filteredAll = allDocuments.filter(matchesFilters);
  const reviewedToday = filteredReviewed.filter((doc) => doc.reviewedAt.startsWith(todayKey));

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      setPendingDocuments([]);
      setReviewedDocuments([]);
      setLoadError("Inicia sesión para cargar los documentos de estadías.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadDocuments = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [pendingResponse, reviewedResponse, returnedResponse] = await Promise.all([
          apiFetch("/documents", { query: { status: "pendiente" } }),
          apiFetch("/documents", { query: { status: "revisado" } }),
          apiFetch("/documents", { query: { status: "devuelto" } }),
        ]);

        const pendingItems = ((pendingResponse?.data?.data ?? []) as ApiDocument[])
          .filter(isEstadiasDocument)
          .map((doc) => mapApiDocument(doc, "pending"));

        const reviewedItems = [
          ...((reviewedResponse?.data?.data ?? []) as ApiDocument[]).filter(isEstadiasDocument).map((doc) => mapApiDocument(doc, "reviewed")),
          ...((returnedResponse?.data?.data ?? []) as ApiDocument[]).filter(isEstadiasDocument).map((doc) => mapApiDocument(doc, "reviewed")),
        ];

        if (!isMounted) return;

        setPendingDocuments(pendingItems);
        setReviewedDocuments(reviewedItems);
      } catch {
        if (!isMounted) return;
        setLoadError("No fue posible cargar los documentos de estadías desde el backend");
        setPendingDocuments([]);
        setReviewedDocuments([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isReady]);

  const reviewedByDate = useMemo(() => {
    return filteredReviewed.reduce<Record<string, EstadiaReviewedDocument[]>>((groups, doc) => {
      const date = doc.reviewedAt ? doc.reviewedAt.slice(0, 10) : "";
      groups[date] = [...(groups[date] || []), doc];
      return groups;
    }, {});
  }, [filteredReviewed]);

  const ciclosDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.ciclo)));
  const planesDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.plan)));
  const carrerasDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.carrera)));
  const cuatrimestresDisponibles = useMemo(() => {
    if (filterPlan === "Plan Normal") {
      return ["6", "11"];
    }
    if (filterPlan === "Plan Nuevo Modelo") {
      return ["6", "10"];
    }
    return ["6", "10", "11"];
  }, [filterPlan]);
  const docentesDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.docente)));
  const apartadosDisponibles = ["Carta de Presentación", "Carta de Aceptación", "Carta de Terminación", "Acta Final"];

  React.useEffect(() => {
    if (filterCuatrimestre !== "all" && !cuatrimestresDisponibles.includes(filterCuatrimestre)) {
      setFilterCuatrimestre("all");
    }
  }, [filterCuatrimestre, cuatrimestresDisponibles]);

  const handleReviewDocument = async (documentId: number) => {
    try {
      await apiFetch(`/documents/${documentId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status: "revisado" }),
      });

      setPendingDocuments((current) => current.filter((doc) => doc.id !== documentId));
      setReviewedDocuments((current) => {
        const reviewedDoc = pendingDocuments.find((doc) => doc.id === documentId);
        if (!reviewedDoc) return current;

        return [
          {
            ...reviewedDoc,
            reviewedAt: new Date().toISOString(),
            returned: false,
          },
          ...current,
        ];
      });
      toast.success("Documento de estadías marcado como revisado");
    } catch {
      toast.error("No se pudo marcar el documento como revisado");
    }
  };

  const handleReturnDocument = async (documentId: number) => {
    try {
      await apiFetch(`/documents/${documentId}/return`, { method: "PATCH" });
      const returnedAt = new Date().toISOString();
      setPendingDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true, returnedAt, resubmittedAt: undefined } : doc)));
      setReviewedDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true, returnedAt, resubmittedAt: undefined } : doc)));
      toast.success("Documento marcado como devuelto");
    } catch {
      toast.error("No se pudo devolver el documento");
    }
  };

  const setDocumentReturnedState = (documentId: number, returned: boolean) => {
    const updatedAt = new Date().toISOString();

    setPendingDocuments((current) =>
      current.map((d) =>
        d.id === documentId
          ? { ...d, returned, returnedAt: returned ? updatedAt : d.returnedAt, resubmittedAt: returned ? d.resubmittedAt : updatedAt }
          : d
      )
    );
    setReviewedDocuments((current) =>
      current.map((d) =>
        d.id === documentId
          ? { ...d, returned, returnedAt: returned ? updatedAt : d.returnedAt, resubmittedAt: returned ? d.resubmittedAt : updatedAt }
          : d
      )
    );
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

  const handleConfirmReturnAction = () => {
    if (!returnConfirmation) return;
    if (returnConfirmation.type === "return") {
      void handleReturnDocument(returnConfirmation.document.id);
    } else {
      setDocumentReturnedState(returnConfirmation.document.id, false);
      toast.success("Devolución cancelada correctamente");
    }
    setReturnConfirmation(null);
  };

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div>
        <h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-emerald-300">
          Revisión de Estadías
        </h1>
        <p className="text-muted-foreground">Revisa y aprueba los documentos enviados por los docentes en el apartado de estadías</p>
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
          <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-emerald-50/50 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/15 dark:to-emerald-950/20">
            <CardHeader>
              <div className={filtersGridClassName}>
                  <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                    <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los planes</SelectItem>
                    {planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    {carrerasDisponibles.map((carrera) => <SelectItem key={carrera} value={carrera}>{carrera}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por cuatrimestre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los cuatrimestres</SelectItem>
                    {cuatrimestresDisponibles.map((cuatrimestre) => <SelectItem key={cuatrimestre} value={cuatrimestre}>{cuatrimestre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDocente} onValueChange={setFilterDocente}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Docente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los docentes</SelectItem>
                    {docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterApartado} onValueChange={setFilterApartado}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Apartado" /></SelectTrigger>
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
                {isLoading && <p className="text-sm text-muted-foreground">Cargando documentos reales del backend...</p>}
                {!isLoading && loadError && <p className="text-sm text-destructive">{loadError}</p>}
                {!isLoading && !loadError && filteredAll.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">{emptyStateLegend}</div>
                ) : !isLoading && !loadError && filteredAll.map((doc) => {
                  const isReviewed = "reviewedAt" in doc;
                  const isReturned = Boolean(doc.returned);

                  return (
                    <div key={doc.id} className={documentRowClassName}>
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
                          </div>
                          {('fecha' in doc && doc.fecha) && (
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
                      <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
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
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.docente}`}>
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Enviar</TooltipContent>
                        </Tooltip>

                        {isReturned ? <Badge variant="destructive">Devuelto</Badge> : <Badge variant={isReviewed ? "success" : "warning"}>{isReviewed ? "Revisado" : "Pendiente"}</Badge>}
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
              <div className={filtersGridClassName}>
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los planes</SelectItem>
                    {planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    {carrerasDisponibles.map((carrera) => <SelectItem key={carrera} value={carrera}>{carrera}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por cuatrimestre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los cuatrimestres</SelectItem>
                    {cuatrimestresDisponibles.map((cuatrimestre) => <SelectItem key={cuatrimestre} value={cuatrimestre}>{cuatrimestre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDocente} onValueChange={setFilterDocente}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por docente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los docentes</SelectItem>
                    {docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
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
                {isLoading && <p className="text-sm text-muted-foreground">Cargando documentos reales del backend...</p>}
                {!isLoading && loadError && <p className="text-sm text-destructive">{loadError}</p>}
                {!isLoading && !loadError && filteredPending.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">{emptyStateLegend}</div>
                ) : !isLoading && !loadError && filteredPending.map((doc) => (
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
                        {doc.fecha && (
                          <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatSentFecha(doc.fecha)} {doc.fecha && (doc.fecha.includes('T') || doc.fecha.includes(' ')) ? <span className="ml-2 text-xs text-muted-foreground">{formatTime12(doc.fecha)}</span> : null}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.docente}`}>
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
                              onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "cancel-return", document: doc }); }}
                              aria-label="Cancelar devolución"
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancelar devolución</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "return", document: doc }); }} aria-label="Devolver documento">
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Devolver</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisados" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader>
              <div className={filtersGridClassName}>
                <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los planes</SelectItem>
                    {planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    {carrerasDisponibles.map((carrera) => <SelectItem key={carrera} value={carrera}>{carrera}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por cuatrimestre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los cuatrimestres</SelectItem>
                    {cuatrimestresDisponibles.map((cuatrimestre) => <SelectItem key={cuatrimestre} value={cuatrimestre}>{cuatrimestre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDocente} onValueChange={setFilterDocente}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por docente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los docentes</SelectItem>
                    {docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
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
          </Card>
          <div className="space-y-4">
            {Object.entries(reviewedByDate).filter(([date]) => date).map(([date, docs]) => {
              return (
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
                          <button type="button" aria-label={`Abrir vista previa de ${doc.documento}`} onClick={() => setPreviewDocument(doc)} className={previewCardOverlayClassName} />
                          <div className="relative z-20 flex items-start gap-3 flex-1 pointer-events-none">
                            <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                              <p className="font-medium">{doc.documento}</p>
                              <p className="text-sm text-muted-foreground">{doc.docente}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                  {doc.carrera}
                                </Button>
                                <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                  {doc.ciclo}
                                </Button>
                                <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                  {doc.plan}
                                </Button>
                                <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                                  {doc.apartado}
                                </Button>
                              </div>
                              {'fecha' in doc && doc.fecha && (
                                <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatDateTimeFromIso(doc.fecha)}</p>
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
                          <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.docente}`}>
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Enviar</TooltipContent>
                            </Tooltip>

                            {doc.returned ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40" onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "cancel-return", document: doc }); }} aria-label="Cancelar devolución">
                                    <Undo2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancelar devolución</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setReturnConfirmation({ type: "return", document: doc }); }} aria-label="Devolver documento">
                                    <Undo2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Devolver</TooltipContent>
                              </Tooltip>
                            )}

                            {isReturned && <Badge variant="destructive">Devuelto</Badge>}
                            <Badge variant="success">Revisado</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="hoy" className="space-y-4 mt-6">
          <Card className={sectionCardClassName}>
            <CardHeader>
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
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los planes</SelectItem>
                    {planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por carrera" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las carreras</SelectItem>
                    {carrerasDisponibles.map((carrera) => <SelectItem key={carrera} value={carrera}>{carrera}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por cuatrimestre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los cuatrimestres</SelectItem>
                    {cuatrimestresDisponibles.map((cuatrimestre) => <SelectItem key={cuatrimestre} value={cuatrimestre}>{cuatrimestre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDocente} onValueChange={setFilterDocente}>
                  <SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por docente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los docentes</SelectItem>
                    {docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
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
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                    {emptyStateLegend}
                  </div>
                ) : (
                  reviewedToday.map((doc) => {
                    const isReturned = Boolean(doc.returned);
                    return (
                    <div key={doc.id} className={documentRowClassName}>
                        <button type="button" aria-label={`Abrir vista previa de ${doc.documento}`} onClick={() => setPreviewDocument(doc)} className={previewCardOverlayClassName} />
                      <div className="relative z-20 flex items-start gap-3 flex-1 pointer-events-none">
                        <div className="relative z-20 h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 pointer-events-none">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="relative z-20 flex-1 min-w-0 pointer-events-none">
                          <p className="font-medium">{doc.documento}</p>
                          <p className="text-sm text-muted-foreground">{doc.docente}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.carrera}
                            </Button>
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.ciclo}
                            </Button>
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.plan}
                            </Button>
                            <Button type="button" variant="outline" className={`${previewChipClassName} pointer-events-auto`} onClick={() => setPreviewDocument(doc)}>
                              {doc.apartado}
                            </Button>
                          </div>
                          {'reviewedAt' in doc && doc.reviewedAt && (
                            <p className="mt-1 text-xs text-muted-foreground">{formatTime12(doc.reviewedAt)}</p>
                          )}
                        </div>
                      </div>
                      <div className="relative z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
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
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} aria-label={`Enviar a mensajes ${doc.docente}`}>
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Enviar</TooltipContent>
                        </Tooltip>

                        {isReturned && <Badge variant="destructive">Devuelto</Badge>}
                        <Badge variant="success">Revisado</Badge>
                      </div>
                    </div>
                  )
                })
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
                <iframe
                  src={getDocumentFileUrl(previewDocument.id)}
                  className="h-[70vh] w-full rounded-lg border border-border bg-background"
                  title={previewDocument.documento}
                />
                <div className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Vista previa directa del PDF desde la API de archivos.
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setPreviewDocument(null)}>Cerrar</Button>
          </div>
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
              <p className="text-muted-foreground">{reviewConfirmation.docente}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewConfirmation(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!reviewConfirmation) return;
              handleReviewDocument(reviewConfirmation.id);
              setReviewConfirmation(null);
            }}>Sí, marcar como revisado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={returnConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) setReturnConfirmation(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{returnConfirmation?.type === "return" ? "Confirmar devolución" : "Cancelar devolución"}</DialogTitle>
            <DialogDescription>
              {returnConfirmation?.type === "return"
                ? "¿Seguro que quieres marcar este documento como devuelto?"
                : "¿Seguro que quieres cancelar la devolución de este documento?"}
            </DialogDescription>
          </DialogHeader>

          {returnConfirmation && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{returnConfirmation.document.documento}</p>
              <p className="text-muted-foreground">{'docente' in returnConfirmation.document ? returnConfirmation.document.docente : (returnConfirmation.document as any).docente}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnConfirmation(null)}>Cancelar</Button>
            <Button variant={returnConfirmation?.type === "return" ? "destructive" : "success"} onClick={handleConfirmReturnAction}>
              {returnConfirmation?.type === "return" ? "Sí, devolver" : "Sí, cancelar devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { EstadiaDocumentItem };