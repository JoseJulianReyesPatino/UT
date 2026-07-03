import React, { useEffect, useMemo, useState } from "react";
import { Check, Eye, FileText, MessageCircleMore, MessageSquare, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { carrieras } from "../../data/curricula";
import apiFetch from "../../lib/api";
import { formatGroupCode } from "../../../lib/utils";
import { fetchDocumentBlob } from "../../lib/documents";
import ChargingImg from "../../../assets/Form_Not_Found.png";
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
	file_path?: string | null;
	returned?: boolean;
	returnedAt?: string;
	resubmittedAt?: string;
	nota?: string | null;
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
	file_path?: string | null;
	reviewedAt: string;
	fecha?: string;
	returned?: boolean;
	returnedAt?: string;
	resubmittedAt?: string;
	nota?: string | null;
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
	{ value: "Lista Concentrada", label: "Lista Concentrada" },
	{ value: "Asesoría", label: "Asesoría" },
	{ value: "Portafolio Digital Final", label: "Portafolio Digital Final" },
	{ value: "Acta Final", label: "Acta Final" },
];

const GENERAL_DOCUMENT_APARTADOS = apartadoFilterOptions.map((option) => option.label);

type ApiDocument = {
	id: number;
	title?: string | null;
	form_title?: string | null;
	apartado_label?: string | null;
	cycle_name?: string | null;
	carrera_label?: string | null;
	uploaded_by_name?: string | null;
	materia?: string | null;
	parcial?: string | null;
	cuatrimestre?: string | number | null;
	file_path?: string | null;
	group_code?: string | null;
	group?: { group_code?: string | null } | null;
	plan?: string | null;
	status?: string | null;
	submitted_at?: string | null;
	reviewed_at?: string | null;
	returned_at?: string | null;
	resubmitted_at?: string | null;
	fileUrl?: string | null;
	nota?: string | null;
};

const getCareerFilterOptions = (plan: string): CareerFilterOption[] => {
	const nuevoModelo = [...carrieras["nuevo-modelo"].tsu, ...carrieras["nuevo-modelo"].ingenieria].map((career) => ({ value: career.nombre, label: career.nombre }));
	const planNormal = carrieras["plan-normal"].ingenieria.map((career) => ({ value: career.nombre, label: career.nombre }));
	const normalizedPlan = normalizeText(plan);
	if (normalizedPlan.includes("nuevo")) return nuevoModelo;
	if (normalizedPlan.includes("plan normal") || normalizedPlan.includes("normal")) return planNormal;
	return [...nuevoModelo, ...planNormal];
};

const normalizeText = (value?: string | null) =>
	(value ?? "")
		.toString()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();

const normalizeApartadoKey = (value?: string | null) =>
	normalizeText(value)
		.replace(/[%]/g, "")
		.replace(/[_\s]+/g, "-")
		.replace(/-+/g, "-")
		.trim();

const isAllValue = (value?: string | null) => !value || normalizeText(value) === "all";

const matchesNormalized = (value: string | undefined | null, filter: string) => {
	if (isAllValue(filter)) return true;
	return normalizeText(value) === normalizeText(filter);
};

const canonicalApartado = (value?: string | null) => {
	const normalized = normalizeApartadoKey(value);
	switch (normalized) {
		case "planeacion":
			return "PLANEACIÓN";
		case "instrumento-30":
		case "instrumento-30-normal":
		case "instrumento-30-40":
			return "INSTRUMENTO 30%";
		case "instrumento-40":
			return "INSTRUMENTO 40%";
		case "instrumento-60":
		case "instrumento-60-70":
			return "INSTRUMENTO 60%";
		case "instrumento-70":
			return "INSTRUMENTO 70%";
		case "remedial":
			return "REMEDIAL";
		case "lista-concentrada":
			return "LISTA CONCENTRADA";
		case "asesoria":
			return "ASESORÍA";
		case "portafolio":
		case "portafolio-digital":
		case "portafolio-digital-final":
			return "PORTAFOLIO DIGITAL FINAL";
		case "acta-final":
			return "ACTA FINAL";
		case "acta-asistencia-grupal":
			return "TUTORÍAS";
		case "carga-academica":
		case "reporte-bajas":
		case "concentrado-asesorias":
		case "ficha-tecnica":
			return "TUTORÍAS";
		case "estadias":
		case "acta-final-estadias":
		case "carta-presentacion":
		case "carta-aceptacion":
		case "carta-terminacion":
			return "ESTADÍAS";
		default:
			return value ? value.toUpperCase() : "DOCUMENTO";
	}
};

const friendlyApartado = (value?: string | null) => {
	const normalized = normalizeApartadoKey(value);
	switch (normalized) {
		case "planeacion":
			return "Planeación";
		case "instrumento-30":
		case "instrumento-30-normal":
		case "instrumento-30-40":
			return "Instrumento 30%";
		case "instrumento-40":
			return "Instrumento 40%";
		case "instrumento-60":
		case "instrumento-60-70":
			return "Instrumento 60%";
		case "instrumento-70":
			return "Instrumento 70%";
		case "remedial":
			return "Remedial";
		case "lista-concentrada":
			return "Lista Concentrada";
		case "asesoria":
			return "Asesoría";
		case "portafolio":
		case "portafolio-digital":
		case "portafolio-digital-final":
			return "Portafolio Digital Final";
		case "acta-final":
			return "Acta Final";
		case "acta-asistencia-grupal":
		case "carga-academica":
		case "reporte-bajas":
		case "concentrado-asesorias":
		case "ficha-tecnica":
			return "Tutorías";
		case "estadias":
		case "acta-final-estadias":
		case "carta-presentacion":
		case "carta-aceptacion":
		case "carta-terminacion":
			return "Estadías";
		default:
			return value ?? "Documento";
	}
};

const formatPlanLabel = (value?: string | null, career?: string | null) => {
	const normalized = normalizeText(value);
	const normalizedCareer = normalizeText(career);

	const nuevoModeloCareers = [...carrieras["nuevo-modelo"].tsu, ...carrieras["nuevo-modelo"].ingenieria];
	const planNormalCareers = [...carrieras["plan-normal"].ingenieria];

	const careerMatchesCatalog = (catalogCareer: { codigo: string; nombre: string }) => {
		const code = normalizeText(catalogCareer.codigo);
		const name = normalizeText(catalogCareer.nombre);
		return (
			normalizedCareer === code
			|| normalizedCareer.includes(`(${code})`)
			|| normalizedCareer.includes(` ${code}`)
			|| normalizedCareer === name
			|| normalizedCareer.includes(name)
		);
	};

	const isNuevoModeloByCatalog = nuevoModeloCareers.some(careerItem => careerMatchesCatalog(careerItem));
	const isPlanNormalByCatalog = planNormalCareers.some(careerItem => careerMatchesCatalog(careerItem));

	if (normalized.includes("nuevo") || normalizedCareer.includes("nuevo") || isNuevoModeloByCatalog) return "Nuevo Modelo";
	if (normalized.includes("plan normal") || normalized.includes("normal") || normalized === "plan" || normalizedCareer.includes("pn") || isPlanNormalByCatalog) return "Plan Normal";
	return value ? value : "Plan";
};

const getDocumentFileName = (doc: ApiDocument) => {
	const path = String(doc.file_path ?? "");
	if (!path) return doc.title ?? "Documento";
	const rawName = path.split("/").pop() ?? path;
	return rawName.replace(/^doc_[^_]+_/, "");
};

const extractPreviewFileName = (documento: string) => {
	const lastSep = documento.lastIndexOf(" - ");
	const raw = lastSep !== -1 && documento.substring(lastSep + 3).trim()
		? documento.substring(lastSep + 3).trim()
		: documento;
	return raw.toLowerCase().endsWith(".pdf") ? raw : `${raw}.pdf`;
};

const getDocumentCuatrimestre = (doc: ApiDocument) => {
	const value = doc.cuatrimestre !== null && doc.cuatrimestre !== undefined
		? String(doc.cuatrimestre).trim()
		: "";
	if (value && value !== "-" && /^\d+$/.test(value)) return value;
	return "-";
};

const PARCIAL_FILTER_OPTIONS = [
	{ value: "1", label: "Parcial 1" },
	{ value: "2", label: "Parcial 2" },
	{ value: "3", label: "Parcial 3" },
] as const;

const getParcialFilterValue = (value?: string | null): "1" | "2" | "3" | null => {
	const raw = value?.trim() || "";
	if (!raw) return null;
	const match = raw.match(/\b([123])\b/);
	if (!match) return null;
	return match[1] as "1" | "2" | "3";
};

const getDocumentParcial = (doc: ApiDocument) => {
	const parcial = getParcialFilterValue(doc.parcial);
	if (!parcial) return "-";
	return `Parcial ${parcial}`;
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


const normalizeInitialApartadoFilter = (value?: string) => {
	if (!value) return "all";
	const normalized = normalizeText(value);
	if (normalized === "all") return "all";
	const found = apartadoFilterOptions.find((option) => normalizeText(option.value) === normalized || normalizeText(option.label) === normalized);
	return found?.label ?? "all";
};

const getForcedApartadoForRoute = (value?: string): string | null => {
	const normalized = normalizeText(value);
	if (normalized === "remedial" || normalized === "remediales") return "Remedial";
	return null;
};

const extractApiDocuments = (payload: unknown): ApiDocument[] => {
	if (Array.isArray(payload)) return payload as ApiDocument[];
	if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
		return (payload as { data: ApiDocument[] }).data;
	}
	return [];
};

export default function DocumentReview({ initialSection = "all", initialForm }: DocumentReviewProps) {
	const { isReady, isAuthenticated } = useAuth();
	const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
	const [reviewedDocuments, setReviewedDocuments] = useState<ReviewedDocument[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [filterPlan, setFilterPlan] = useState("all");
	const [filterCarrera, setFilterCarrera] = useState("all");
	const [filterCuatrimestre, setFilterCuatrimestre] = useState("all");
	const [filterMateria, setFilterMateria] = useState("all");
	const [filterGrupo, setFilterGrupo] = useState("all");
	const [filterDocente, setFilterDocente] = useState("all");
	const [filterParcial, setFilterParcial] = useState("all");
	const [filterApartado, setFilterApartado] = useState(() => normalizeInitialApartadoFilter(initialForm));
	const [activeSection, setActiveSection] = useState<ReviewSection>(initialSection);
	const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);
	const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState<{ type: "review" | "send" | "return"; document: DocumentItem } | null>(null);
	const [returnComment, setReturnComment] = useState("");
	const [noteDialog, setNoteDialog] = useState<{ nota: string; docente: string } | null>(null);

	const allDocuments = [...pendingDocuments, ...reviewedDocuments];
	const todayKey = new Date().toISOString().slice(0, 10);
	const defaultApartadoFilter = normalizeInitialApartadoFilter(initialForm);
	const forcedApartado = getForcedApartadoForRoute(initialForm);
	const forcedApartadoNormalized = forcedApartado ? normalizeText(forcedApartado) : null;

	const headingText = (() => {
		if (initialForm) {
			const nf = initialForm.toString().toLowerCase().trim();
			if (nf === "remedial" || nf === "remediales") return "Revisión de Remediales";
			return `Revisión de ${initialForm}`;
		}
		return "Revisión de Documentos";
	})();

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
				const statuses = ["pendiente", "revisado", "devuelto"] as const;
				const responses = await Promise.allSettled(
					statuses.map((status) => apiFetch("/documents", {
						query: {
							status,
							...(forcedApartado ? { apartado_label: forcedApartado } : {}),
						},
					}))
				);

				if (!isMounted) return;

				const pendingPayload = responses[0].status === "fulfilled" ? responses[0].value : null;
				const reviewedPayload = responses[1].status === "fulfilled" ? responses[1].value : null;
				const returnedPayload = responses[2].status === "fulfilled" ? responses[2].value : null;

				const pendingItems = extractApiDocuments(pendingPayload).map((doc) => mapApiDocument(doc, "pending"));
				const reviewedItems = [
					...extractApiDocuments(reviewedPayload).map((doc) => mapApiDocument(doc, "reviewed")),
					...extractApiDocuments(returnedPayload).map((doc) => mapApiDocument(doc, "reviewed")),
				];

				const isCoreGeneralDocument = (document: DocumentItem) => {
					const normalizedApartado = normalizeText(friendlyApartado(document.apartado));
					return GENERAL_DOCUMENT_APARTADOS.some((apartado) => normalizeText(apartado) === normalizedApartado);
				};

				const visiblePendingItems = forcedApartado ? pendingItems : pendingItems.filter(isCoreGeneralDocument);
				const visibleReviewedItems = forcedApartado ? reviewedItems : reviewedItems.filter(isCoreGeneralDocument);

				setPendingDocuments(visiblePendingItems);
				setReviewedDocuments(visibleReviewedItems);

				const failedStatuses = responses
					.map((result, index) => (result.status === "rejected" ? statuses[index] : null))
					.filter((status): status is (typeof statuses)[number] => Boolean(status));

				if (failedStatuses.length > 0) {
					setLoadError(`No fue posible cargar: ${failedStatuses.join(", ")}. Se muestran los documentos disponibles.`);
					console.warn("DocumentReview: fallaron consultas de estado", { failedStatuses });
				} else if (visiblePendingItems.length === 0 && visibleReviewedItems.length === 0) {
					setLoadError("No se encontraron documentos para el ciclo visible actual.");
				}
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
	}, [forcedApartado, isAuthenticated, isReady]);

	useEffect(() => {
		let isMounted = true;

		const loadPreview = async () => {
			if (!previewDocument) {
				setPreviewBlobUrl(null);
				setPreviewLoading(false);
				setPreviewError(null);
				return;
			}

			setPreviewLoading(true);
			setPreviewError(null);
			setPreviewBlobUrl(null);

			try {
				const blob = await fetchDocumentBlob(previewDocument.id);
				if (!isMounted) return;
				const pdfBlob = new Blob([blob], { type: "application/pdf" });
				setPreviewBlobUrl(URL.createObjectURL(pdfBlob));
			} catch (error) {
				if (!isMounted) return;
				setPreviewError(error instanceof Error ? error.message : "No fue posible abrir el PDF");
			} finally {
				if (isMounted) setPreviewLoading(false);
			}
		};

		void loadPreview();

		return () => {
			isMounted = false;
		};
	}, [previewDocument]);

	useEffect(() => {
		return () => {
			if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
		};
	}, [previewBlobUrl]);

	const filtersGridClassName = "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5";
	const filterSelectTriggerClassName = "w-full text-[13px] leading-tight sm:text-sm";
	const filterSelectValueClassName = "truncate";
	const sectionCardClassName = "overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/40 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/10 dark:to-emerald-950/20";
	const documentRowClassName = "relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-lg border border-border transition-colors hover:bg-accent/50";

	const docsByPlan = useMemo(() => allDocuments.filter((doc) => matchesNormalized(doc.plan, filterPlan)), [allDocuments, filterPlan]);
	const docsByCarrera = useMemo(() => docsByPlan.filter((doc) => matchesNormalized(doc.carrera, filterCarrera)), [docsByPlan, filterCarrera]);
	const docsByCuatrimestre = useMemo(() => docsByCarrera.filter((doc) => matchesNormalized(getDocumentCuatrimestre(doc), filterCuatrimestre)), [docsByCarrera, filterCuatrimestre]);
	const docsByMateria = useMemo(() => docsByCuatrimestre.filter((doc) => matchesNormalized(doc.materia, filterMateria)), [docsByCuatrimestre, filterMateria]);
	const docsByGrupo = useMemo(() => docsByMateria.filter((doc) => matchesNormalized(doc.grupo, filterGrupo)), [docsByMateria, filterGrupo]);
	const docsByDocente = useMemo(() => docsByGrupo.filter((doc) => matchesNormalized(doc.docente, filterDocente)), [docsByGrupo, filterDocente]);
	const docsByParcial = useMemo(() => docsByDocente.filter((doc) => filterParcial === "all" || getParcialFilterValue(doc.parcial) === filterParcial), [docsByDocente, filterParcial]);

	const planesDisponibles = Array.from(new Set(allDocuments.map((doc) => formatPlanLabel(doc.plan, doc.carrera)).filter((value): value is string => Boolean(value))));
	const carrerasDisponibles = useMemo(() => getCareerFilterOptions(filterPlan), [filterPlan]);
	const cuatrimestresDisponibles = Array.from(new Set(docsByCarrera.map((doc) => getDocumentCuatrimestre(doc)).filter((value): value is string => Boolean(value) && value !== "-")));
	const materiasDisponibles = Array.from(new Set(docsByCuatrimestre.map((doc) => doc.materia).filter((value): value is string => Boolean(value) && normalizeText(value) !== "sin materia")));
	const gruposDisponibles = Array.from(new Set(docsByMateria.map((doc) => doc.grupo).filter((value): value is string => Boolean(value) && normalizeText(value) !== "grupo -" && normalizeText(value) !== "-")));
	const docentesDisponibles = Array.from(new Set(docsByGrupo.map((doc) => doc.docente).filter((value): value is string => Boolean(value))));
	const parcialesDisponibles = PARCIAL_FILTER_OPTIONS;
	const apartadosDisponibles = forcedApartado
		? Array.from(new Set(docsByParcial.map((doc) => friendlyApartado(doc.apartado)).filter((value): value is string => Boolean(value))))
		: GENERAL_DOCUMENT_APARTADOS;

	useEffect(() => {
		if (filterCarrera !== "all" && !carrerasDisponibles.some((carrera) => carrera.value === filterCarrera)) {
			setFilterCarrera("all");
		}
	}, [carrerasDisponibles, filterCarrera]);

	useEffect(() => {
		setFilterCarrera("all");
		setFilterCuatrimestre("all");
		setFilterMateria("all");
		setFilterGrupo("all");
		setFilterDocente("all");
		setFilterParcial("all");
		setFilterApartado(defaultApartadoFilter);
	}, [filterPlan]);

	useEffect(() => {
		setFilterCuatrimestre("all");
		setFilterMateria("all");
		setFilterGrupo("all");
		setFilterDocente("all");
		setFilterParcial("all");
		setFilterApartado(defaultApartadoFilter);
	}, [filterCarrera]);

	useEffect(() => {
		setFilterMateria("all");
		setFilterGrupo("all");
		setFilterDocente("all");
		setFilterParcial("all");
		setFilterApartado(defaultApartadoFilter);
	}, [filterCuatrimestre]);

	useEffect(() => {
		setFilterGrupo("all");
		setFilterDocente("all");
		setFilterParcial("all");
		setFilterApartado(defaultApartadoFilter);
	}, [filterMateria]);

	useEffect(() => {
		setFilterDocente("all");
		setFilterParcial("all");
		setFilterApartado(defaultApartadoFilter);
	}, [filterGrupo]);

	useEffect(() => {
		setFilterParcial("all");
		setFilterApartado(defaultApartadoFilter);
	}, [filterDocente]);

	useEffect(() => {
		setFilterApartado(defaultApartadoFilter);
	}, [filterParcial]);

	const matchesFilters = (doc: DocumentItem) => {
		const base = doc;
		return (
			(!forcedApartadoNormalized || normalizeText(friendlyApartado(base.apartado)) === forcedApartadoNormalized) &&
			matchesNormalized(base.plan, filterPlan) &&
			matchesNormalized(base.carrera, filterCarrera) &&
			matchesNormalized(getDocumentCuatrimestre(base), filterCuatrimestre) &&
			matchesNormalized(base.materia, filterMateria) &&
			matchesNormalized(base.grupo, filterGrupo) &&
			matchesNormalized(base.docente, filterDocente) &&
			(filterParcial === "all" || getParcialFilterValue(base.parcial) === filterParcial) &&
			matchesNormalized(friendlyApartado(base.apartado), filterApartado)
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

	const handleReturnDocument = async (documentId: number, comment: string) => {
		try {
			await apiFetch(`/documents/${documentId}/return`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notes: comment.trim() }),
			});
			setPendingDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true, returnedAt: new Date().toISOString(), resubmittedAt: undefined } : doc)));
			setReviewedDocuments((current) => current.map((doc) => (doc.id === documentId ? { ...doc, returned: true, returnedAt: new Date().toISOString(), resubmittedAt: undefined } : doc)));
			toast.success("Documento marcado como devuelto");
		} catch {
			toast.error("No se pudo devolver el documento");
		}
	};

	const handleShareToMessages = (doc: DocumentItem) => {
		const lastSep = doc.documento.lastIndexOf(" - ");
		const cleanTitle = lastSep !== -1 && doc.documento.substring(lastSep + 3).trim()
			? doc.documento.substring(lastSep + 3).trim()
			: doc.documento;
		globalThis.dispatchEvent(new CustomEvent("openMessagesConversation", { detail: { recipientName: doc.docente, recipientRole: "Docente", document: { id: doc.id, title: cleanTitle, filePath: doc.file_path ?? "" } } }));
	};

	const confirmPendingAction = () => {
		if (!pendingAction) return;
		const { type, document } = pendingAction;

		if (type === "review") {
			setPendingAction(null);
			void handleReviewDocument(document.id);
			return;
		}

		if (type === "send") {
			setPendingAction(null);
			handleShareToMessages(document);
			toast.success("Documento enviado a mensajes");
			return;
		}

		const trimmedComment = returnComment.trim();
		if (!trimmedComment) {
			toast.error("Agrega un comentario para devolver el documento");
			return;
		}

		setPendingAction(null);
		setReturnComment("");
		void handleReturnDocument(document.id, trimmedComment);
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
		if (pendingAction.type === "send") {
			const doc = pendingAction.document as any;
			const recipientRole = doc.tutor ? 'tutor' : 'docente';
			const recipientName = doc.tutor ?? doc.docente ?? '';
			return `Vas a compartirle el documento ${pendingAction.document.documento} al ${recipientRole} ${recipientName}`;
		}
		return `Vas a devolver: ${pendingAction.document.documento}`;
	})();

	const EmptyState = ({ text }: { text: string }) => (
		<div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
			<div className="flex flex-col items-center gap-4">
				<img src={ChargingImg} alt="No forms" className="h-72 w-auto mx-auto" />
				<p>{text}</p>
			</div>
		</div>
	);

	const renderListState = (content: React.ReactNode) => {
			if (isLoading) {
					return (
						<div className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground">
							<p>Cargando...</p>
						</div>
					);
			}

		if (loadError) {
			return <p className="text-sm text-destructive">{loadError}</p>;
		}

		return content;
	};

	const renderFilters = () => (
		<div className={filtersGridClassName}>
			<Select value={filterPlan} onValueChange={setFilterPlan}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Plan" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los planes</SelectItem>{planesDisponibles.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}</SelectContent></Select>
			<Select value={filterCarrera} onValueChange={setFilterCarrera}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Carrera" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las carreras</SelectItem>{carrerasDisponibles.map((carrera) => <SelectItem key={carrera.value} value={carrera.value}>{carrera.label}</SelectItem>)}</SelectContent></Select>
			<Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Cuatrimestre" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los cuatrimestres</SelectItem>{cuatrimestresDisponibles.map((cuatrimestre) => <SelectItem key={cuatrimestre} value={cuatrimestre}>{`Cuatrimestre ${cuatrimestre}`}</SelectItem>)}</SelectContent></Select>
			<Select value={filterMateria} onValueChange={setFilterMateria}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Materia" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las materias</SelectItem>{materiasDisponibles.map((materia) => <SelectItem key={materia} value={materia}>{materia}</SelectItem>)}</SelectContent></Select>
			<Select value={filterGrupo} onValueChange={setFilterGrupo}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Grupo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los grupos</SelectItem>{gruposDisponibles.map((grupo) => <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>)}</SelectContent></Select>
			<Select value={filterDocente} onValueChange={setFilterDocente}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Docente" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los docentes</SelectItem>{docentesDisponibles.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}</SelectContent></Select>
			<Select value={filterParcial} onValueChange={setFilterParcial}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Parcial" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los parciales</SelectItem>{parcialesDisponibles.map((parcial) => <SelectItem key={parcial.value} value={parcial.value}>{parcial.label}</SelectItem>)}</SelectContent></Select>
			{!forcedApartado && <Select value={filterApartado} onValueChange={setFilterApartado}><SelectTrigger className={filterSelectTriggerClassName}><SelectValue className={filterSelectValueClassName} placeholder="Apartado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los apartados</SelectItem>{apartadosDisponibles.map((apartado) => <SelectItem key={apartado} value={apartado}>{apartado}</SelectItem>)}</SelectContent></Select>}
		</div>
	);

	const mapApiDocument = (doc: ApiDocument, kind: "pending" | "reviewed"): PendingDocument | ReviewedDocument => {
		const base = {
			id: Number(doc.id),
			ciclo: doc.cycle_name?.trim() || "Sin ciclo",
			plan: formatPlanLabel(doc.plan, doc.carrera_label),
			docente: doc.uploaded_by_name ?? "Docente",
			documento: doc.title ?? "Documento sin título",
			apartado: friendlyApartado(doc.apartado_label ?? doc.form_title ?? "Documento"),
			carrera: doc.carrera_label ?? "Sin carrera",
			materia: doc.materia ?? "Sin materia",
			cuatrimestre: getDocumentCuatrimestre(doc),
			grupo: formatGroupCode(doc.group?.group_code ?? doc.group_code ?? "-"),
			parcial: doc.parcial ?? "-",
			file_path: doc.file_path ?? null,
			fecha: doc.submitted_at ?? "",
			returned: doc.status === "devuelto",
			returnedAt: doc.returned_at ?? undefined,
			resubmittedAt: doc.resubmitted_at ?? undefined,
			nota: doc.nota ?? null,
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
		const lastSep = doc.documento.lastIndexOf(" - ");
		const rawName = lastSep !== -1 && doc.documento.substring(lastSep + 3).trim()
			? doc.documento.substring(lastSep + 3).trim()
			: getDocumentFileName(doc as ApiDocument);
		const fileName = rawName.toUpperCase().endsWith(".PDF") ? rawName : `${rawName}.PDF`;
		const apartadoTitle = canonicalApartado(doc.apartado);
		const cuatrimestreLabel = `Cuatrimestre ${getDocumentCuatrimestre(doc as ApiDocument)}`;
		const parcialLabel = getDocumentParcial(doc as ApiDocument);

		return (
			<div key={doc.id} className={documentRowClassName}>
				<div className="flex items-start gap-3 flex-1">
					<div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0"><FileText className="h-6 w-6 text-muted-foreground" /></div>
					<div className="flex-1 min-w-0">
						<p className="font-semibold uppercase tracking-wide text-foreground">{apartadoTitle} - {fileName}</p>
						<p className="text-xs text-muted-foreground">{doc.docente} • {doc.carrera}</p>
						<div className="mt-2 flex flex-wrap gap-2">
							{!forcedApartado && <Badge variant="outline" className="text-xs">{doc.ciclo}</Badge>}
							<Badge variant="outline" className="text-xs">{doc.plan}</Badge>
							{!forcedApartado && <Badge variant="outline" className="text-xs">{doc.apartado}</Badge>}
							{doc.cuatrimestre !== "-" && <Badge variant="outline" className="text-xs">{cuatrimestreLabel}</Badge>}
							{doc.grupo && <Badge variant="outline" className="text-xs">{`Grupo ${doc.grupo}`}</Badge>}
							<Badge variant="outline" className="text-xs">{parcialLabel}</Badge>
						</div>
						{fecha && <p className="mt-1 text-xs text-muted-foreground">Enviado: {formatSentFecha(fecha)}</p>}
						{"returnedAt" in doc && doc.returnedAt && <p className="mt-1 text-xs text-muted-foreground">Devuelto: {formatDateTimeFromIso(doc.returnedAt)}</p>}
						{"resubmittedAt" in doc && doc.resubmittedAt && <p className="mt-1 text-xs text-muted-foreground">Reenviado: {formatDateTimeFromIso(doc.resubmittedAt)}</p>}
						{"reviewedAt" in doc && doc.reviewedAt && <p className="mt-1 text-xs text-muted-foreground">Revisado: {formatDateTimeFromIso(doc.reviewedAt)}</p>}
					</div>
				</div>
				<div className="flex items-center gap-2 pointer-events-auto">
					<Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewDocument(doc); }} aria-label="Ver PDF"><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Ver PDF</TooltipContent></Tooltip>

					{isReviewed ? (
						null
					) : (
						<ResponsiveActionButton variant="outline" size="sm" className="h-8" label="Revisar" title="Revisar documento" onClick={(e) => { e.stopPropagation(); setPendingAction({ type: "review", document: doc }); }} icon={<Check className="h-4 w-4" />} />
					)}

					  <Badge variant={statusVariant}>{statusLabel}</Badge>

					{doc.nota && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40" onClick={(e) => { e.stopPropagation(); setNoteDialog({ nota: doc.nota!, docente: doc.docente }); }} aria-label="Ver nota del docente"><MessageCircleMore className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Nota del docente</TooltipContent></Tooltip>}
				<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPendingAction({ type: "send", document: doc }); }} aria-label={`Enviar a mensajes ${doc.docente}`}><MessageSquare className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Enviar</TooltipContent></Tooltip>
					{doc.returned ? (
						<Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40" onClick={(e) => { e.stopPropagation(); setPendingAction({ type: "return", document: doc }); }} aria-label="Cancelar devolución"><Undo2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Cancelar devolución</TooltipContent></Tooltip>
					) : (
						<Tooltip><TooltipTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPendingAction({ type: "return", document: doc }); }} aria-label="Devolver documento"><Undo2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Devolver</TooltipContent></Tooltip>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="relative space-y-6 overflow-hidden">
				<div className="relative space-y-6">
					<div>
						<h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-emerald-300">{headingText}</h1>
						<p className="text-muted-foreground">Revisa y aprueba los documentos enviados por los docentes</p>
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
					<TabsList className="hidden sm:flex w-full gap-2 p-1 bg-white dark:bg-slate-950 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 flex-wrap">
						<TabsTrigger value="all" className="px-3 py-2 text-sm">Todos <Badge variant="outline" className="ml-2">{filteredAllDocuments.length}</Badge></TabsTrigger>
						<TabsTrigger value="pendientes" className="px-3 py-2 text-sm">Pendientes <Badge variant="warning" className="ml-2">{filteredPendingDocuments.length}</Badge></TabsTrigger>
						<TabsTrigger value="revisados" className="px-3 py-2 text-sm">Revisados <Badge variant="outline" className="ml-2">{filteredReviewedDocuments.length}</Badge></TabsTrigger>
						<TabsTrigger value="hoy" className="px-3 py-2 text-sm">Revisados hoy <Badge variant="outline" className="ml-2">{reviewedTodayDocuments.length}</Badge></TabsTrigger>
					</TabsList>

					<TabsContent value="all" className="space-y-4 mt-6">
						<Card className={sectionCardClassName}>
							<CardHeader className="pb-4">{renderFilters()}</CardHeader>
							<CardContent>
								{renderListState(<div className="space-y-3">{filteredAllDocuments.length === 0 ? <EmptyState text="No hay documentos en esta sección." /> : filteredAllDocuments.map(renderDocumentRow)}</div>)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="pendientes" className="space-y-4 mt-6">
						<Card className={sectionCardClassName}>
							<CardHeader className="pb-4">{renderFilters()}</CardHeader>
							<CardContent>{renderListState(<div className="space-y-3">{filteredPendingDocuments.length === 0 ? <EmptyState text="No hay documentos pendientes." /> : filteredPendingDocuments.map(renderDocumentRow)}</div>)}</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="revisados" className="space-y-4 mt-6">
						<Card className={sectionCardClassName}>
							<CardHeader className="pb-4">{renderFilters()}</CardHeader>
							<CardContent>
								{renderListState(
									Object.entries(reviewedByDate).length === 0
										? <EmptyState text="No hay documentos revisados." />
										: <div className="space-y-6">
											{Object.entries(reviewedByDate).map(([date, docs]) => (
												<div key={date}>
													<div className="mb-3">
														<p className="font-semibold text-sm text-foreground">{formatDateOnlyFromKey(date)}</p>
														<p className="text-xs text-muted-foreground">{docs.length} documentos revisados</p>
													</div>
													<div className="space-y-3">{docs.map(renderDocumentRow)}</div>
												</div>
											))}
										</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="hoy" className="space-y-4 mt-6">
						<Card className={sectionCardClassName}>
							<CardHeader className="pb-4">{renderFilters()}</CardHeader>
							<CardContent>{renderListState(<div className="space-y-3">{reviewedTodayDocuments.length === 0 ? <EmptyState text="No hay documentos revisados hoy." /> : reviewedTodayDocuments.map(renderDocumentRow)}</div>)}</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>

			<Dialog open={previewDocument !== null} onOpenChange={(open) => { if (!open) setPreviewDocument(null); }}>
				<DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
					<DialogHeader>
						<DialogTitle>{previewDocument ? extractPreviewFileName(previewDocument.documento) : ""}</DialogTitle>
						{previewDocument && <DialogDescription>{previewDocument.docente} · {previewDocument.carrera}</DialogDescription>}
					</DialogHeader>
					{previewDocument && (
						<div className="flex-1 min-h-0">
							{previewLoading ? (
								<div className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
									<p>Cargando...</p>
								</div>
							) : previewError ? (
								<div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
									{previewError}
								</div>
							) : previewBlobUrl ? (
								<iframe src={previewBlobUrl} className="h-[82vh] w-full rounded-lg border border-border" title={previewDocument.documento} />
							) : null}
						</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={pendingAction !== null} onOpenChange={(open) => { if (!open) { setPendingAction(null); setReturnComment(""); } }}>
				<DialogContent>
					  <DialogHeader><DialogTitle>¿Estás seguro?</DialogTitle><DialogDescription>{pendingActionDescription}</DialogDescription></DialogHeader>
					{pendingAction?.type === "return" && (
						<div className="space-y-2">
							<p className="text-sm font-medium">Comentario para el docente</p>
							<Textarea
								value={returnComment}
								onChange={(event) => setReturnComment(event.target.value)}
								placeholder="Escribe la razón de devolución del documento"
							/>
						</div>
					)}
					<DialogFooter><Button variant="outline" onClick={() => { setPendingAction(null); setReturnComment(""); }}>Cancelar</Button><Button variant={pendingAction?.type === "return" ? "destructive" : "default"} onClick={confirmPendingAction} disabled={!pendingAction}>Confirmar</Button></DialogFooter>
				</DialogContent>
			</Dialog>

		<Dialog open={noteDialog !== null} onOpenChange={(open) => { if (!open) setNoteDialog(null); }}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2"><MessageCircleMore className="h-5 w-5 text-blue-500" />Nota del docente</DialogTitle>
					<DialogDescription>{noteDialog?.docente}</DialogDescription>
				</DialogHeader>
				<div className="rounded-lg border border-border bg-muted/40 p-4 text-sm whitespace-pre-wrap">{noteDialog?.nota}</div>
				<DialogFooter><Button variant="outline" onClick={() => setNoteDialog(null)}>Cerrar</Button></DialogFooter>
			</DialogContent>
		</Dialog>
		</div>
	);
}
