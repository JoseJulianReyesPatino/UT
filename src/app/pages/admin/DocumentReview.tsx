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

type DocumentReviewProps = Readonly<{ initialSection?: ReviewSection }>;

type CareerFilterOption = { value: string; label: string };

const apartadoFilterOptions = [
	{ value: "Planeación", label: "Planeación" },
	{ value: "Instrumento 30%", label: "Instrumento 30%" },
	{ value: "Instrumento 40%", label: "Instrumento 40%" },
	{ value: "Instrumento 60%", label: "Instrumento 60%" },
	{ value: "Instrumento 70%", label: "Instrumento 70%" },
	{ value: "Lista Concentrada", label: "Lista Concentrada" },
	{ value: "Asesoría", label: "Asesoría" },
	{ value: "Portafolio Digital Final", label: "Portafolio Digital Final" },
	{ value: "Acta de Asistencia Grupal", label: "Acta de Asistencia Grupal" },
];

const initialPendingDocuments: PendingDocument[] = [
	{ id: 1, ciclo: "Ciclo Escolar 2026", plan: "Plan Nuevo Modelo", docente: "Mtro. Juan Pérez", documento: "Planeación - Programación Web", apartado: "Planeación", carrera: "Ingeniería en Sistemas", materia: "Programación Web", cuatrimestre: "5", grupo: "A", parcial: "Parcial 1", fecha: "2026-05-17" },
	{ id: 2, ciclo: "Ciclo Escolar 2026", plan: "Plan Nuevo Modelo", docente: "Dra. Ana Martínez", documento: "Instrumento 30% - Base de Datos", apartado: "Instrumento 30%", carrera: "TSU Desarrollo Software", materia: "Base de Datos", cuatrimestre: "3", grupo: "B", parcial: "Parcial 2", fecha: "2026-05-16" },
	{ id: 3, ciclo: "Ciclo Escolar 2025", plan: "Plan Normal", docente: "Mtro. Carlos López", documento: "Lista Concentrada - Redes", apartado: "Lista Concentrada", carrera: "Ingeniería en Redes", materia: "Redes de Computadoras", cuatrimestre: "7", grupo: "A", parcial: "Parcial 1", fecha: "2026-05-15" },
	{ id: 4, ciclo: "Ciclo Escolar 2026", plan: "Plan Nuevo Modelo", docente: "Dra. María González", documento: "Asesoría - Tutoría Grupal", apartado: "Asesoría", carrera: "Ingeniería en Sistemas", materia: "Tutorías BIS", cuatrimestre: "5", grupo: "C", parcial: "Parcial 2", fecha: "2026-05-14", returned: false },
	{ id: 5, ciclo: "Ciclo Escolar 2026", plan: "Plan Nuevo Modelo", docente: "Dra. María González", documento: "Instrumento 40% - Programación Web", apartado: "Instrumento 40%", carrera: "Ingeniería en Sistemas", materia: "Programación Web", cuatrimestre: "5", grupo: "C", parcial: "Parcial 2", fecha: "2026-05-14", returned: false },
];

const initialReviewedDocuments: ReviewedDocument[] = [
	{ id: 101, ciclo: "Ciclo Escolar 2026", plan: "Plan Nuevo Modelo", docente: "Dra. María González", documento: "Instrumento 60% - Programación Web", apartado: "Instrumento 60%", carrera: "Ingeniería en Sistemas", cuatrimestre: "5", grupo: "C", parcial: "Parcial 2", fecha: "2026-05-17 08:20", returnedAt: "2026-05-17 08:55", resubmittedAt: "2026-05-17 09:05", reviewedAt: "2026-05-17 09:15" },
	{ id: 102, ciclo: "Ciclo Escolar 2025", plan: "Plan Normal", docente: "Mtro. Roberto Silva", documento: "Planeación - Redes", apartado: "Planeación", carrera: "Ingeniería en Redes", cuatrimestre: "7", grupo: "A", parcial: "Parcial 1", reviewedAt: "2026-05-17 10:05" },
	{ id: 103, ciclo: "Ciclo Escolar 2026", plan: "Plan Nuevo Modelo", docente: "Dra. Ana Martínez", documento: "Lista Concentrada - Base de Datos", apartado: "Lista Concentrada", carrera: "TSU Desarrollo Software", cuatrimestre: "3", grupo: "B", parcial: "Parcial 1", reviewedAt: "2026-05-16 16:40" },
	{ id: 104, ciclo: "Ciclo Escolar 2026", plan: "Plan Normal", docente: "Mtro. Carlos López", documento: "Instrumento 70% - Redes", apartado: "Instrumento 70%", carrera: "Ingeniería en Redes", cuatrimestre: "8", grupo: "A", parcial: "Parcial 3", reviewedAt: "2026-05-15 11:25" },
	{ id: 105, ciclo: "Ciclo Escolar 2026", plan: "Plan Nuevo Modelo", docente: "Dra. Laura Gómez", documento: "Ficha Técnica - Tutorías", apartado: "Tutorías", carrera: "TSU Infraestructura", cuatrimestre: "3", grupo: "D", parcial: "Final", reviewedAt: "2026-05-15 13:10", returned: false },
];

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

export default function DocumentReview({ initialSection = "all" }: DocumentReviewProps) {
	const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>(initialPendingDocuments);
	const [reviewedDocuments, setReviewedDocuments] = useState<ReviewedDocument[]>(initialReviewedDocuments);
	const [filterCiclo, setFilterCiclo] = useState("all");
	const [filterPlan, setFilterPlan] = useState("all");
	const [filterCarrera, setFilterCarrera] = useState("all");
	const [filterDocente, setFilterDocente] = useState("all");
	const [filterApartado, setFilterApartado] = useState("all");
	const [filterCuatrimestre, setFilterCuatrimestre] = useState("all");
	const [filterGrupo, setFilterGrupo] = useState("all");
	const [filterParcial, setFilterParcial] = useState("all");
	const [activeSection, setActiveSection] = useState<ReviewSection>(initialSection);
	const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);
	const [pendingAction, setPendingAction] = useState<{ type: "review" | "send" | "return"; document: DocumentItem } | null>(null);

	const allDocuments = [...pendingDocuments, ...reviewedDocuments];
	const todayKey = new Date().toISOString().slice(0, 10);

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

	const handleReviewDocument = (documentId: number) => {
		const documentToReview = pendingDocuments.find((doc) => doc.id === documentId);
		if (!documentToReview) return;

		const reviewedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
		const resubmittedAt = documentToReview.resubmittedAt ?? (documentToReview.returned ? reviewedAt : undefined);

		setPendingDocuments((currentDocuments) => currentDocuments.filter((doc) => doc.id !== documentId));
		setReviewedDocuments((currentDocuments) => [
			{ ...documentToReview, reviewedAt, fecha: documentToReview.fecha, returnedAt: documentToReview.returnedAt, resubmittedAt },
			...currentDocuments,
		]);
		toast.success("Documento marcado como revisado");
	};

	const handleReturnDocument = (documentId: number) => {
		const returnedAt = new Date().toISOString();
		setPendingDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true, returnedAt, resubmittedAt: undefined } : doc)));
		setReviewedDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true, returnedAt, resubmittedAt: undefined } : doc)));
		toast.success("Documento marcado como devuelto");
	};

	const handleShareToMessages = (doc: DocumentItem) => {
		globalThis.dispatchEvent(new CustomEvent("openMessagesConversation", { detail: { recipientName: doc.docente, recipientRole: "Docente", document: { id: doc.id, title: doc.documento } } }));
	};

	const confirmPendingAction = () => {
		if (!pendingAction) return;
		const { type, document } = pendingAction;
		setPendingAction(null);

		if (type === "review") {
			handleReviewDocument(document.id);
			return;
		}

		if (type === "send") {
			handleShareToMessages(document);
			toast.success("Documento enviado a mensajes");
			return;
		}

		handleReturnDocument(document.id);
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
							<CardContent><div className="space-y-3">{filteredAllDocuments.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No hay documentos en esta sección.</div> : filteredAllDocuments.map(renderDocumentRow)}</div></CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="pendientes" className="space-y-4 mt-6">
						<Card className={sectionCardClassName}>
							<CardHeader>{renderFilters()}</CardHeader>
							<CardContent><div className="space-y-3">{filteredPendingDocuments.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No hay documentos pendientes.</div> : filteredPendingDocuments.map(renderDocumentRow)}</div></CardContent>
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
									<CardContent><div className="space-y-3">{docs.map(renderDocumentRow)}</div></CardContent>
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
							<CardContent><div className="space-y-3">{reviewedTodayDocuments.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No hay documentos revisados hoy.</div> : reviewedTodayDocuments.map(renderDocumentRow)}</div></CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>

			<Dialog open={previewDocument !== null} onOpenChange={(open) => { if (!open) setPreviewDocument(null); }}>
				<DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] overflow-y-auto">
					<DialogHeader><DialogTitle>Vista previa del documento</DialogTitle><DialogDescription>Simulación de lectura del archivo PDF del documento seleccionado.</DialogDescription></DialogHeader>
					{previewDocument && (
						<div className="space-y-4">
							<div className="flex flex-wrap gap-2"><Badge variant="outline">{previewDocument.ciclo}</Badge><Badge variant="outline">{previewDocument.plan}</Badge><Badge variant="outline">{previewDocument.apartado}</Badge></div>
							<div className="rounded-lg border border-border bg-muted/30 p-4 md:p-6">
								<div className="mx-auto flex min-h-[70vh] w-full max-w-[1100px] flex-col justify-between rounded-lg border border-border bg-background p-6 md:p-10 shadow-sm">
									<div className="space-y-4">
										<div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Documento PDF</p><h3 className="mt-2 text-2xl font-semibold md:text-3xl">{previewDocument.documento}</h3><p className="text-base text-muted-foreground">{previewDocument.docente}</p></div>
										<div className="grid gap-3 text-sm md:grid-cols-2 md:gap-4"><p><span className="font-medium">Carrera:</span> {previewDocument.carrera}</p><p><span className="font-medium">Materia:</span> {"materia" in previewDocument ? previewDocument.materia : "N/D"}</p><p><span className="font-medium">Cuatrimestre:</span> {"cuatrimestre" in previewDocument ? previewDocument.cuatrimestre : "N/D"}</p><p><span className="font-medium">Grupo:</span> {"grupo" in previewDocument ? previewDocument.grupo : "N/D"}</p></div>
									</div>
									<div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">Esta es una vista previa simulada del PDF asociado al documento.</div>
								</div>
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
