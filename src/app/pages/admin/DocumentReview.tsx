import React, { useEffect, useMemo, useState } from "react";
import { Check, Eye, FileText, MessageSquare, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { carrieras } from "../../data/curricula";
import apiFetch from "../../lib/api";
import { formatGroupCode } from "../../../lib/utils";
import { useAuth } from "../../context/AuthContext";

type ReviewSection = "all" | "pendientes" | "revisados" | "hoy";

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
	parcial?: string;
	fecha: string;
	returned?: boolean;
	returnedAt?: string;
	resubmittedAt?: string;
};

type ReviewedDocument = {
	id: number;
	ciclo: string;
	plan: string;
	docente: string;
	documento: string;
	apartado: string;
	carrera: string;
	materia?: string;
	cuatrimestre?: string;
	grupo?: string;
	parcial?: string;
	reviewedAt: string;
	fecha?: string;
	returned?: boolean;
	returnedAt?: string;
	resubmittedAt?: string;
};

type DocumentItem = PendingDocument | ReviewedDocument;

type DocumentReviewProps = Readonly<{ initialSection?: ReviewSection; initialForm?: string }>;

type CareerFilterOption = { value: string; label: string };

const apartadoFilterOptions = [
	{ value: "Planeación", label: "Planeación" },
	{ value: "Instrumento 30%", label: "Instrumento 30%" },
	{ value: "Instrumento 40%", label: "Instrumento 40%" },
	{ value: "Instrumento 60%", label: "Instrumento 60%" },
	{ value: "Instrumento 70%", label: "Instrumento 70%" },
	{ value: "Remedial", label: "Remedial" },
	{ value: "Lista Concentrada", label: "Lista Concentrada" },
	{ value: "Asesoría", label: "Asesoría" },
	{ value: "Portafolio Digital Final", label: "Portafolio Digital Final" },
	{ value: "Acta de Asistencia Grupal", label: "Acta de Asistencia Grupal" },
];

type ApiDocument = {
	id: number;
	title?: string | null;
	form_title?: string | null;
	apartado_label?: string | null;
	carrera_label?: string | null;
	uploaded_by_name?: string | null;
	materia?: string | null;
	parcial?: string | null;
	group_code?: string | null;
	group?: { group_code?: string | null } | null;
	plan?: string | null;
	status?: string | null;
	submitted_at?: string | null;
	reviewed_at?: string | null;
	returned_at?: string | null;
	resubmitted_at?: string | null;
	fileUrl?: string | null;
};

const getCareerFilterOptions = (plan: string): CareerFilterOption[] => {
	const nuevoModelo = [...carrieras["nuevo-modelo"].tsu, ...carrieras["nuevo-modelo"].ingenieria].map((career) => ({ value: career.nombre, label: career.nombre }));
	const planNormal = carrieras["plan-normal"].ingenieria.map((career) => ({ value: career.nombre, label: career.nombre }));
	if (plan === "nuevo-modelo") return nuevoModelo;
	if (plan === "plan-normal") return planNormal;
	return [...nuevoModelo, ...planNormal];
};

const formatDateOnlyFromKey = (dateKey: string) => {
	try {
		const date = new Date(`${dateKey}T00:00:00`);
		if (Number.isNaN(date.getTime())) return dateKey;
		return date.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
	} catch {
		return dateKey;
	}
};

const formatSentFecha = (fecha?: string) => {
	if (!fecha) return "";
	try {
		const normalized = fecha.includes(" ") && !fecha.includes("T") ? fecha.replace(" ", "T") : fecha;
		const date = new Date(normalized);
		if (Number.isNaN(date.getTime())) return fecha;
		const datePart = date.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
		if (!fecha.includes("T") && !fecha.includes(" ")) return datePart;
		const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
		return `${datePart} ${timePart}`;
	} catch {
		return fecha;
	}
};

const formatDateTimeFromIso = (value?: string) => {
	if (!value) return "";
	try {
		const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
		const date = new Date(normalized);
		if (Number.isNaN(date.getTime())) return value;
		const datePart = date.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
		const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
		return `${datePart} ${timePart}`;
	} catch {
		return value;
	}
};

const getPreviewUrl = (documentId: number) => {
	const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");
	return `${baseUrl}/api/documents/${documentId}/file`;
};

export default function DocumentReview({ initialSection = "all", initialForm }: DocumentReviewProps) {
	const { isReady, isAuthenticated } = useAuth();
	const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
	const [reviewedDocuments, setReviewedDocuments] = useState<ReviewedDocument[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [filterCiclo, setFilterCiclo] = useState("all");
	const [filterPlan, setFilterPlan] = useState("all");
	const [filterCarrera, setFilterCarrera] = useState("all");
	const [filterDocente, setFilterDocente] = useState("all");
	const [filterApartado, setFilterApartado] = useState(initialForm ?? "all");
	const [filterCuatrimestre, setFilterCuatrimestre] = useState("all");
	const [filterGrupo, setFilterGrupo] = useState("all");
	const [filterParcial, setFilterParcial] = useState("all");
	const [activeSection, setActiveSection] = useState<ReviewSection>(initialSection);
	const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);
	const [pendingAction, setPendingAction] = useState<{ type: "review" | "send" | "return"; document: DocumentItem } | null>(null);

	const allDocuments = [...pendingDocuments, ...reviewedDocuments];
	const todayKey = new Date().toISOString().slice(0, 10);

	useEffect(() => {
		if (!isReady) return;
		if (!isAuthenticated) {
			setPendingDocuments([]);
			setReviewedDocuments([]);
			setLoadError("Inicia sesión para cargar los documentos.");
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

				const pendingItems = ((pendingResponse?.data?.data ?? []) as ApiDocument[]).map((doc) => mapApiDocument(doc, "pending"));
				const reviewedItems = [
					...((reviewedResponse?.data?.data ?? []) as ApiDocument[]).map((doc) => mapApiDocument(doc, "reviewed")),
					...((returnedResponse?.data?.data ?? []) as ApiDocument[]).map((doc) => mapApiDocument(doc, "reviewed")),
				];

				if (!isMounted) return;

				setPendingDocuments(pendingItems);
				setReviewedDocuments(reviewedItems);
			} catch {
				if (!isMounted) return;
				setLoadError("No fue posible cargar los documentos desde el backend");
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

	const filtersGridClassName = "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5";
	const filterSelectTriggerClassName = "w-full text-[13px] leading-tight sm:text-sm";
	const filterSelectValueClassName = "truncate";
	const sectionCardClassName = "overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/40 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-emerald-950/20";
	const documentRowClassName = "cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border border-border/70 bg-transparent shadow-sm transition-colors hover:bg-emerald-50/35 hover:border-emerald-300/60 dark:bg-transparent dark:hover:bg-slate-900/55 dark:hover:border-emerald-800/50";

	const ciclosDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.ciclo)));
	const planesDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.plan)));
	const docentesDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.docente)));
	const cuatrimestresDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.cuatrimestre).filter((value): value is string => Boolean(value))));
	const gruposDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.grupo).filter((value): value is string => Boolean(value))));
	const parcialesDisponibles = Array.from(new Set(allDocuments.map((doc) => doc.parcial).filter((value): value is string => Boolean(value))));
	const carrerasDisponibles = useMemo(() => getCareerFilterOptions(filterPlan), [filterPlan]);

	useEffect(() => {
		if (filterCarrera !== "all" && !carrerasDisponibles.some((carrera) => carrera.value === filterCarrera)) {
			setFilterCarrera("all");
		}
	}, [carrerasDisponibles, filterCarrera]);

	const matchesFilters = (doc: DocumentItem) => {
		const base = doc as DocumentFilterTarget;
		return (
			(filterCiclo === "all" || base.ciclo === filterCiclo) &&
			(filterPlan === "all" || base.plan === filterPlan) &&
			(filterCarrera === "all" || base.carrera === filterCarrera) &&
			(filterDocente === "all" || base.docente === filterDocente) &&
			(filterApartado === "all" || base.apartado === filterApartado) &&
			(filterCuatrimestre === "all" || base.cuatrimestre === filterCuatrimestre) &&
			(filterGrupo === "all" || base.grupo === filterGrupo) &&
			(filterParcial === "all" || base.parcial === filterParcial)
		);
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

	const handleReviewDocument = async (documentId: number) => {
		try {
			await apiFetch(`/documents/${documentId}/review`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "revisado" }),
			});

			setPendingDocuments((currentDocuments) => currentDocuments.filter((doc) => doc.id !== documentId));
			setReviewedDocuments((currentDocuments) => {
				const reviewedDoc = pendingDocuments.find((doc) => doc.id === documentId);
				if (!reviewedDoc) return currentDocuments;

				return [
					{
						...reviewedDoc,
						reviewedAt: new Date().toISOString(),
						returned: false,
					},
					...currentDocuments,
				];
			});
			toast.success("Documento marcado como revisado");
		} catch {
			toast.error("No se pudo marcar el documento como revisado");
		}
	};

	const handleReturnDocument = async (documentId: number) => {
		try {
			await apiFetch(`/documents/${documentId}/return`, { method: "PATCH" });
			setPendingDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true, returnedAt: new Date().toISOString(), resubmittedAt: undefined } : doc)));
			setReviewedDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true, returnedAt: new Date().toISOString(), resubmittedAt: undefined } : doc)));
			toast.success("Documento marcado como devuelto");
		} catch {
			toast.error("No se pudo devolver el documento");
		}
	};

	const handleShareToMessages = (doc: DocumentItem) => {
		globalThis.dispatchEvent(new CustomEvent("openMessagesConversation", { detail: { recipientName: doc.docente, recipientRole: "Docente", document: { id: doc.id, title: doc.documento } } }));
	};

	const confirmPendingAction = () => {
		if (!pendingAction) return;
		const { type, document } = pendingAction;
		setPendingAction(null);

		if (type === "review") {
			void handleReviewDocument(document.id);
			return;
		}

		if (type === "send") {
			handleShareToMessages(document);
			toast.success("Documento enviado a mensajes");
			return;
		}

		void handleReturnDocument(document.id);
	};

	const getStatusVariant = (doc: DocumentItem) => {
		if (doc.returned) return "destructive";
		if ("reviewedAt" in doc) return "success";
		return "warning";
	};

	const getStatusLabel = (doc: DocumentItem) => {
		if (doc.returned) return "Devuelto";
		if ("reviewedAt" in doc) return "Revisado";
		return "Pendiente";
	};

	const pendingActionDescription = (() => {
		if (!pendingAction) return "";
		if (pendingAction.type === "review") return `Vas a marcar como revisado: ${pendingAction.document.documento}`;
		if (pendingAction.type === "send") return `Vas a enviar a mensajes: ${pendingAction.document.documento}`;
		return `Vas a devolver: ${pendingAction.document.documento}`;
	})();

	const renderListState = (content: React.ReactNode) => {
		if (isLoading) {
			return <p className="text-sm text-muted-foreground">Cargando documentos reales del backend...</p>;
		}

		if (loadError) {
			return <p className="text-sm text-destructive">{loadError}</p>;
		}

		return content;
	};

	const renderFilters = () => (
		<div className={filtersGridClassName}>
			<Select value={filterCiclo} onValueChange={setFilterCiclo}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por ciclo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los ciclos</SelectItem>{ciclosDisponibles.map((ciclo) => <SelectItem key={ciclo} value={ciclo}>{ciclo}</SelectItem>)}</SelectContent></Select>
			<Select value={filterPlan} onValueChange={(value) => { setFilterPlan(value); setFilterCarrera("all"); }}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Filtrar por plan" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los planes</SelectItem>{planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}</SelectContent></Select>
			<Select value={filterDocente} onValueChange={setFilterDocente}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Docente" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los docentes</SelectItem>{docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}</SelectContent></Select>
			<Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Cuatrimestre" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los cuatrimestres</SelectItem>{cuatrimestresDisponibles.map((cuatrimestre) => <SelectItem key={cuatrimestre} value={cuatrimestre}>{cuatrimestre}</SelectItem>)}</SelectContent></Select>
			<Select value={filterGrupo} onValueChange={setFilterGrupo}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Grupo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los grupos</SelectItem>{gruposDisponibles.map((grupo) => <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>)}</SelectContent></Select>
			<Select value={filterParcial} onValueChange={setFilterParcial}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Parcial" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los parciales</SelectItem>{parcialesDisponibles.map((parcial) => <SelectItem key={parcial} value={parcial}>{parcial}</SelectItem>)}</SelectContent></Select>
			<Select value={filterCarrera} onValueChange={setFilterCarrera}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="carrera" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las carreras</SelectItem>{carrerasDisponibles.map((carrera) => <SelectItem key={carrera.value} value={carrera.value}>{carrera.label}</SelectItem>)}</SelectContent></Select>
			<Select value={filterApartado} onValueChange={setFilterApartado}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Apartado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los apartados</SelectItem>{apartadoFilterOptions.map((apartado) => <SelectItem key={apartado.value} value={apartado.value}>{apartado.label}</SelectItem>)}</SelectContent></Select>
		</div>
	);

	const mapApiDocument = (doc: ApiDocument, kind: "pending" | "reviewed"): PendingDocument | ReviewedDocument => {
		const base = {
			id: Number(doc.id),
			ciclo: "Ciclo Escolar 2026",
			plan: doc.plan ?? "Plan Nuevo Modelo",
			docente: doc.uploaded_by_name ?? "Docente",
			documento: doc.title ?? "Documento sin título",
			apartado: doc.apartado_label ?? doc.form_title ?? "Documento",
			carrera: doc.carrera_label ?? "Sin carrera",
			materia: doc.materia ?? "Sin materia",
			cuatrimestre: "-",
			grupo: formatGroupCode(doc.group?.group_code ?? doc.group_code ?? "-"),
			parcial: doc.parcial ?? "-",
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

	const renderDocumentRow = (doc: DocumentItem) => {
		const isReviewed = "reviewedAt" in doc;
		const statusVariant = getStatusVariant(doc);
		const statusLabel = getStatusLabel(doc);
		const fecha = typeof doc.fecha === "string" ? doc.fecha : "";
		const sentTime = fecha && (fecha.includes("T") || fecha.includes(" ")) ? formatDateTimeFromIso(fecha) : "";

		return (
			<div key={doc.id} className={documentRowClassName}>
				<div className="flex items-start gap-3 flex-1">
					<div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0"><FileText className="h-6 w-6 text-muted-foreground" /></div>
					<div className="flex-1 min-w-0">
						<p className="font-medium">{doc.documento}</p>
						<p className="text-sm text-muted-foreground">{doc.docente} • {doc.carrera}</p>
						<div className="mt-2 flex flex-wrap gap-2">
							<Badge variant="outline" className="text-xs">{doc.ciclo}</Badge>
							<Badge variant="outline" className="text-xs">{doc.plan}</Badge>
							<Badge variant="outline" className="text-xs">{doc.apartado}</Badge>
							{doc.cuatrimestre && <Badge variant="outline" className="text-xs">{doc.cuatrimestre}</Badge>}
							{doc.grupo && <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>}
							{doc.parcial && <Badge variant="outline" className="text-xs">{doc.parcial}</Badge>}
						</div>
						{fecha && <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatSentFecha(fecha)}{sentTime ? <span className="ml-2 text-xs text-muted-foreground">{sentTime}</span> : null}</p>}
						{"returnedAt" in doc && doc.returnedAt && <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>}
						{"resubmittedAt" in doc && doc.resubmittedAt && <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>}
						{"reviewedAt" in doc && doc.reviewedAt && <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>}
					</div>
				</div>
				<div className="flex items-center gap-2 pointer-events-auto">
					<Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} aria-label="Ver PDF"><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Ver PDF</TooltipContent></Tooltip>

					{isReviewed ? (
						<ResponsiveActionButton variant="ghost" size="sm" className="h-8" label="Enviar" title={`Enviar a mensajes ${doc.docente}`} onClick={(e) => { e.stopPropagation(); handleShareToMessages(doc); }} icon={<MessageSquare className="h-4 w-4" />} />
					) : (
						<ResponsiveActionButton variant="outline" size="sm" className="h-8" label="Revisar" title="Revisar documento" onClick={(e) => { e.stopPropagation(); setPendingAction({ type: "review", document: doc }); }} icon={<Check className="h-4 w-4" />} />
					)}

					  <Badge variant={statusVariant}>{statusLabel}</Badge>

					{isReviewed && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPendingAction({ type: "send", document: doc }); }} aria-label={`Enviar a mensajes ${doc.docente}`}><MessageSquare className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Enviar</TooltipContent></Tooltip>}
					{doc.returned && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40" onClick={(e) => { e.stopPropagation(); setPendingAction({ type: "return", document: doc }); }} aria-label="Cancelar devolución"><Undo2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Cancelar devolución</TooltipContent></Tooltip>}
				</div>
			</div>
		);
	};

	return (
		<div className="relative space-y-6 overflow-hidden bg-gradient-to-br from-emerald-50 via-background to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
			<div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_30%)] dark:opacity-40" />
				<div className="relative z-10 space-y-6">
					<div>
						<h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-emerald-300">Revisión de Documentos</h1>
						<p className="text-muted-foreground">Revisa y aprueba los documentos enviados por los docentes</p>
					</div>

					<Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as ReviewSection)}>
					<TabsList className="bg-gradient-to-r from-emerald-100 via-emerald-50 to-emerald-50 p-1 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex-wrap">
						<TabsTrigger value="all">Todos <Badge variant="outline" className="ml-2">{allDocuments.length}</Badge></TabsTrigger>
						<TabsTrigger value="pendientes">Pendientes <Badge variant="warning" className="ml-2">{filteredPendingDocuments.length}</Badge></TabsTrigger>
						<TabsTrigger value="revisados">Revisados <Badge variant="outline" className="ml-2">{filteredReviewedDocuments.length}</Badge></TabsTrigger>
						<TabsTrigger value="hoy">Revisados hoy <Badge variant="outline" className="ml-2">{reviewedTodayDocuments.length}</Badge></TabsTrigger>
					</TabsList>

					<TabsContent value="all" className="space-y-4 mt-6">
						<Card className={sectionCardClassName}>
							<CardHeader>{renderFilters()}</CardHeader>
							<CardContent>
								{renderListState(<div className="space-y-3">{filteredAllDocuments.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No hay documentos en esta sección.</div> : filteredAllDocuments.map(renderDocumentRow)}</div>)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="pendientes" className="space-y-4 mt-6">
						<Card className={sectionCardClassName}>
							<CardHeader>{renderFilters()}</CardHeader>
							<CardContent>{renderListState(<div className="space-y-3">{filteredPendingDocuments.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No hay documentos pendientes.</div> : filteredPendingDocuments.map(renderDocumentRow)}</div>)}</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="revisados" className="space-y-4 mt-6">
						<Card className={sectionCardClassName}>
							<CardHeader>{renderFilters()}</CardHeader>
						</Card>
						<div className="space-y-4">
							{Object.entries(reviewedByDate).map(([date, docs]) => (
								<Card key={date} className={sectionCardClassName}>
									<CardHeader><CardTitle>{formatDateOnlyFromKey(date)}</CardTitle><CardDescription>{docs.length} documentos revisados</CardDescription></CardHeader>
									<CardContent>{renderListState(<div className="space-y-3">{docs.map(renderDocumentRow)}</div>)}</CardContent>
								</Card>
							))}
						</div>
					</TabsContent>

					<TabsContent value="hoy" className="space-y-4 mt-6">
						<Card className={sectionCardClassName}>
							<CardHeader>
								<CardTitle>Revisados hoy</CardTitle>
								<CardDescription>Documentos abiertos por administración en el día</CardDescription>
								{renderFilters()}
							</CardHeader>
							<CardContent>{renderListState(<div className="space-y-3">{reviewedTodayDocuments.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No hay documentos revisados hoy.</div> : reviewedTodayDocuments.map(renderDocumentRow)}</div>)}</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>

			<Dialog open={previewDocument !== null} onOpenChange={(open) => { if (!open) setPreviewDocument(null); }}>
				<DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] overflow-y-auto">
					<DialogHeader><DialogTitle>Vista previa del documento</DialogTitle><DialogDescription>Visualiza el PDF real asociado al documento seleccionado.</DialogDescription></DialogHeader>
					{previewDocument && (
						<div className="space-y-4">
							<div className="flex flex-wrap gap-2"><Badge variant="outline">{previewDocument.ciclo}</Badge><Badge variant="outline">{previewDocument.plan}</Badge><Badge variant="outline">{previewDocument.apartado}</Badge></div>
							<div className="rounded-lg border border-border bg-muted/30 p-4 md:p-6">
								<iframe src={getPreviewUrl(previewDocument.id)} className="h-[70vh] w-full rounded-lg border border-border" title={previewDocument.documento} />
								<div className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">Vista previa directa del documento desde la API de archivos.</div>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={pendingAction !== null} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
				<DialogContent>
					  <DialogHeader><DialogTitle>¿Estás seguro?</DialogTitle><DialogDescription>{pendingActionDescription}</DialogDescription></DialogHeader>
					<DialogFooter><Button variant="outline" onClick={() => setPendingAction(null)}>Cancelar</Button><Button variant={pendingAction?.type === "return" ? "destructive" : "default"} onClick={confirmPendingAction} disabled={!pendingAction}>Confirmar</Button></DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
