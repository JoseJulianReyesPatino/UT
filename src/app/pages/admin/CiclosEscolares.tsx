import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { AlertTriangle, Calendar, Check, ChevronLeft, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "../../components/ui/scroll-area";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { apiFetch } from "../../lib/api";
import { fetchDocumentBlob } from "../../lib/documents";
import { carrieras } from "../../data/curricula";

type CycleStatus = "activo" | "cerrado";

type AcademicCycle = {
  id: number;
  nombre: string;
  anio: number;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  status: CycleStatus;
};

type CycleFormState = {
  nombre: string;
  anio: string;
  periodo: string;
  periodoInicio?: string;
  periodoFin?: string;
  fechaInicio: string;
  fechaFin: string;
  status: CycleStatus;
};

type ApiCycle = {
  id: number;
  name: string;
  year: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: CycleStatus;
};

const mapApiCycle = (cycle: ApiCycle): AcademicCycle => ({
  id: cycle.id,
  nombre: cycle.name,
  anio: cycle.year,
  periodo: cycle.period_name,
  fechaInicio: cycle.start_date,
  fechaFin: cycle.end_date,
  status: cycle.status,
});

const monthOptions = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 2024 + 1 + 5 }, (_, index) => String(2024 + index));

type DocumentRecord = {
  id: number;
  ciclo: string;
  documento: string;
  docente: string;
  carrera: string;
  plan: string;
  cuatrimestre: string;
  materia: string;
  parcial: string;
  grupo: string;
  tipo: "planeacion" | "instrumento-30" | "instrumento-40" | "instrumento-60" | "instrumento-70" | "lista-concentrada" | "asesoria" | "portafolio" | "acta-final";
  pdfUrl?: string;
};

type EstadiasDocumentType = "carta-presentacion" | "carta-aceptacion" | "carta-terminacion" | "estadias";

type EstadiasDocumentRecord = {
  id: number;
  ciclo: string;
  documento: string;
  docente: string;
  carrera: string;
  plan: string;
  grupo: string;
  tipo: EstadiasDocumentType;
  pdfUrl?: string;
};

type TutorDocumentRecord = {
  id: number;
  ciclo: string;
  documento: string;
  docente: string;
  tipo: "carga-academica" | "reporte-bajas" | "concentrado-asesorias" | "acta-asistencia" | "ficha-tecnica";
  cuatrimestre?: string;
  grupo?: string;
  parcial?: string;
  carrera?: string;
  plan?: string;
  pdfUrl?: string;
};

type TutorDocumentType = TutorDocumentRecord["tipo"];

type RemedialDocumentRecord = {
  id: number;
  ciclo: string;
  documento: string;
  docente: string;
  carrera: string;
  plan: string;
  cuatrimestre: string;
  grupo: string;
  parcial: string;
  tipo: string;
  pdfUrl?: string;
};

type ApiDocument = {
  id: number;
  form_id?: number;
  nombre?: string;
  title?: string;
  tipo?: string;
  form_code?: string;
  apartado_label?: string;
  materia?: string | null;
  parcial?: string | null;
  grupo?: string | null;
  group_code?: string | null;
  plan?: string | null;
  cuatrimestre?: string | null;
  carrera?: string | null;
  carrera_label?: string | null;
  docente?: string | null;
  uploaded_by_name?: string | null;
  fileUrl?: string | null;
  downloadUrl?: string | null;
  file_path?: string | null;
  partial?: string | null;
  parcial_label?: string | null;
  partial_label?: string | null;
};

const tutorDocumentTitles: Record<TutorDocumentType, string> = {
  "carga-academica": "Carga académica",
  "reporte-bajas": "Reporte de bajas",
  "concentrado-asesorias": "Concentrado de asesorías y bajas",
  "acta-asistencia": "Acta de asistencia grupal",
  "ficha-tecnica": "Ficha técnica",
};

const estadiasDocumentTitles: Record<EstadiasDocumentType, string> = {
  "carta-presentacion": "Carta de presentación",
  "carta-aceptacion": "Carta de aceptación",
  "carta-terminacion": "Carta de terminación",
  estadias: "Acta final",
};

const getDocumentsModalTitle = (selectedDocumentType: "docentes" | "estadias" | "tutores" | "remediales" | null, selectedDocumentCategory: DocumentRecord["tipo"] | null, selectedEstadiasCategory: EstadiasDocumentType | null, selectedTutorCategory: TutorDocumentType | null) => {
  if (selectedDocumentType === "remediales") {
    return "Documentos Remediales";
  }
  if (selectedDocumentType === "docentes") {
    let title = "Documentos de Docentes";
    if (selectedDocumentCategory) {
      const docLabels: Record<DocumentRecord["tipo"], string> = {
        "planeacion": "Planeación",
        "instrumento-30": "Instrumento 30%",
        "instrumento-40": "Instrumento 40%",
        "instrumento-60": "Instrumento 60%",
        "instrumento-70": "Instrumento 70%",
        "lista-concentrada": "Lista concentrada",
        "asesoria": "Asesoría",
        "portafolio": "Portafolio digital",
        "acta-final": "Acta final",
      };
      title = `${title} - ${docLabels[selectedDocumentCategory]}`;
    }
    return title;
  }

  if (selectedDocumentType === "estadias") {
    let title = "Documentos de Estadías";
    if (selectedEstadiasCategory) {
      title = `${title} - ${estadiasDocumentTitles[selectedEstadiasCategory]}`;
    }
    return title;
  }

  if (selectedTutorCategory) {
    return `Documentos de Tutores - ${tutorDocumentTitles[selectedTutorCategory]}`;
  }

  return "Documentos de Tutores";
};

type DocumentPreviewDialogProps = {
  open: boolean;
  document: DocumentRecord | TutorDocumentRecord | EstadiasDocumentRecord | RemedialDocumentRecord | null;
  onOpenChange: (open: boolean) => void;
  previewLoading: boolean;
  previewError: string | null;
  previewBlobUrl: string | null;
};

function DocumentPreviewDialog({ open, document, onOpenChange, previewLoading, previewError, previewBlobUrl }: Readonly<DocumentPreviewDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{document?.documento ?? ""}</DialogTitle>
          {document && (
            <DialogDescription>
              {document.docente}{"carrera" in document && document.carrera ? ` · ${document.carrera}` : ""}
            </DialogDescription>
          )}
        </DialogHeader>
        {document && (
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
              <object data={previewBlobUrl} type="application/pdf" className="h-[82vh] w-full rounded-lg border border-border">
                <a href={previewBlobUrl} target="_blank" rel="noopener noreferrer" className="flex h-[82vh] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-primary underline">
                  Abrir documento en nueva pestaña
                </a>
              </object>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const initialCycles: AcademicCycle[] = [];

const initialDocuments: DocumentRecord[] = [];
const initialTutorDocuments: TutorDocumentRecord[] = [];

export function CiclosEscolares() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDocTypeDialog, setShowDocTypeDialog] = useState(false);
  const [showDocumentTypeSelector, setShowDocumentTypeSelector] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<AcademicCycle | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<"docentes" | "estadias" | "tutores" | "remediales" | null>(null);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState<DocumentRecord["tipo"] | null>(null);
  const [selectedEstadiasCategory, setSelectedEstadiasCategory] = useState<EstadiasDocumentType | null>(null);
  const [selectedTutorCategory, setSelectedTutorCategory] = useState<TutorDocumentType | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | TutorDocumentRecord | EstadiasDocumentRecord | RemedialDocumentRecord | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type?: "close" | "activate"; ciclo?: AcademicCycle }>({ open: false });
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [newCycleForm, setNewCycleForm] = useState<CycleFormState>({
    nombre: "",
    anio: String(currentYear),
    periodo: "",
    periodoInicio: "",
    periodoFin: "",
    fechaInicio: "",
    fechaFin: "",
    status: "cerrado",
  });
  const [editCycleForm, setEditCycleForm] = useState<CycleFormState>({
    nombre: "",
    anio: "",
    periodo: "",
    fechaInicio: "",
    fechaFin: "",
    status: "activo",
  });

  const [ciclos, setCiclos] = useState<AcademicCycle[]>(initialCycles);
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [estadiasDocuments, setEstadiasDocuments] = useState<EstadiasDocumentRecord[]>([]);
  const [tutorDocuments, setTutorDocuments] = useState<TutorDocumentRecord[]>(initialTutorDocuments);
  const [remedialDocuments, setRemedialDocuments] = useState<RemedialDocumentRecord[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentCountByCycleId, setDocumentCountByCycleId] = useState<Record<number, number>>({});

  const docenteTypes: DocumentRecord["tipo"][] = [
    "planeacion",
    "instrumento-30",
    "instrumento-40",
    "instrumento-60",
    "instrumento-70",
    "lista-concentrada",
    "asesoria",
    "portafolio",
    "acta-final",
  ];

  const estadiasTypes: EstadiasDocumentType[] = [
    "carta-presentacion",
    "carta-aceptacion",
    "carta-terminacion",
    "estadias",
  ];

  const tutorTypes: TutorDocumentType[] = [
    "carga-academica",
    "reporte-bajas",
    "concentrado-asesorias",
    "acta-asistencia",
    "ficha-tecnica",
  ];

  const normalizeTipo = (tipo: string | null | undefined): string => {
    if (!tipo) return "";

    return tipo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("_", "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .trim();
  };

  const isRemedialTipo = (tipo: string): boolean =>
    tipo.includes("remedial") || tipo.includes("recuperacion");

  const normalizeText = (value?: string | null) =>
    (value ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const resolveEstadiasTipo = (row: ApiDocument): EstadiasDocumentType | null => {
    const formId = Number(row.form_id ?? 0);
    if (formId === 13) return "carta-presentacion";
    if (formId === 14) return "carta-aceptacion";
    if (formId === 15) return "carta-terminacion";
    if (formId === 16) return "estadias";
    return null;
  };

  const resolveRowTipo = (row: ApiDocument): string => {
    const estadiasTipo = resolveEstadiasTipo(row);
    if (estadiasTipo) {
      return estadiasTipo;
    }

    const normalized = normalizeTipo(row.tipo ?? row.form_code ?? row.apartado_label);

    // Canonicalize historical variants so counters and filters remain consistent.
    const aliasMap: Record<string, string> = {
      "portafolio-digital": "portafolio",
      "acta-asistencia-grupal": "acta-asistencia",
      "acta-final-estadias": "estadias",
      "instrumento-30-normal": "instrumento-30",
      "instrumento-40-nuevo": "instrumento-40",
      "instrumento-60-nuevo": "instrumento-60",
      "instrumento-70-normal": "instrumento-70",
    };

    return aliasMap[normalized] ?? normalized;
  };

  const formatPlanLabel = (plan?: string | null, carrera?: string | null): string => {
    const normalizedPlan = normalizeText(plan);
    const normalizedCareer = normalizeText(carrera);

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

    // PN in career → Plan Normal
    const hasPnInCareer = /(^|[^a-z0-9])pn([^a-z0-9]|$)/.test(normalizedCareer);
    // NM in career or career starts with TSU → Plan Nuevo Modelo
    const hasNmOrTsuInCareer =
      /(^|[^a-z0-9])nm([^a-z0-9]|$)/.test(normalizedCareer) ||
      normalizedCareer.startsWith("tsu ") ||
      normalizedCareer.includes(" tsu ") ||
      normalizedCareer.includes("(tsu)");
    if (normalizedPlan.includes("nuevo") || normalizedCareer.includes("nuevo") || hasNmOrTsuInCareer || isNuevoModeloByCatalog) return "Plan Nuevo Modelo";
    if (normalizedPlan.includes("plan normal") || normalizedPlan.includes("normal") || normalizedPlan === "plan" || hasPnInCareer || isPlanNormalByCatalog) return "Plan Normal";
    return plan && plan.trim() ? plan : "Plan";
  };

  const getCuatrimestreFromRow = (row: ApiDocument): string => {
    const value = (row.cuatrimestre ?? "").toString().trim();
    if (value && value !== "-") return value;
    return (row.parcial ?? "").toString().trim() || "-";
  };

  const PARCIAL_FILTER_OPTIONS = [
    { value: "1", label: "Parcial 1" },
    { value: "2", label: "Parcial 2" },
    { value: "3", label: "Parcial 3" },
  ] as const;

  const getParcialFilterValue = (value: string | null | undefined): "1" | "2" | "3" | null => {
    const raw = (value ?? "").toString().trim();
    if (!raw) return null;
    const match = raw.match(/\b([123])\b/);
    if (!match) return null;
    return match[1] as "1" | "2" | "3";
  };

  const getRawParcialFromRow = (row: ApiDocument): string => {
    const directCandidates = [
      row.parcial,
      row.partial,
      row.parcial_label,
      row.partial_label,
    ];

    for (const candidate of directCandidates) {
      const value = (candidate ?? "").toString().trim();
      if (value && value !== "-") {
        return value;
      }
    }

    const cuatrimestreCandidate = (row.cuatrimestre ?? "").toString().trim();
    if (getParcialFilterValue(cuatrimestreCandidate)) {
      return cuatrimestreCandidate;
    }

    return "";
  };

  const getParcialFromRow = (row: ApiDocument): string => {
    const partial = getParcialFilterValue(getRawParcialFromRow(row));
    if (!partial) return "-";
    return `Parcial ${partial}`;
  };

  const getTipoBadgeLabel = (tipo: DocumentRecord["tipo"]): string => {
    switch (tipo) {
      case "planeacion":
        return "Planeación";
      case "instrumento-30":
        return "Instrumento 30%";
      case "instrumento-40":
        return "Instrumento 40%";
      case "instrumento-60":
        return "Instrumento 60%";
      case "instrumento-70":
        return "Instrumento 70%";
      case "lista-concentrada":
        return "Lista Concentrada";
      case "asesoria":
        return "Asesoría";
      case "portafolio":
        return "Portafolio Digital";
      case "acta-final":
        return "Acta Final";
      case "carta-presentacion":
        return "Carta de presentación";
      case "carta-aceptacion":
        return "Carta de aceptación";
      case "carta-terminacion":
        return "Carta de terminación";
      case "estadias":
        return "Acta final de estadías";
      default:
        return "Documento";
    }
  };

  const getCuatrimestresForPlanCarrera = (plan: string, carrera: string): string[] => {
    const isNuevo = plan === "Plan Nuevo Modelo";
    const isNormal = plan === "Plan Normal";
    const carreraNorm = carrera.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isTSU = carreraNorm.includes("tsu") || (isNuevo && !carreraNorm.includes("ingenieria") && !carreraNorm.includes("ing."));

    if (isNuevo && isTSU) return ["1", "2", "3", "4", "5", "6"];
    if (isNuevo && !isTSU) return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    if (isNormal) return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
    // All if no plan/carrera selected
    return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
  };

  const canonicalApartadoForDisplay = (tipo: string | null | undefined): string => {
    const norm = (tipo ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("-", " ").trim();
    switch (norm) {
      case "planeacion": return "PLANEACIÓN";
      case "instrumento 30%": return "INSTRUMENTO 30%";
      case "instrumento 40%": return "INSTRUMENTO 40%";
      case "instrumento 60%": return "INSTRUMENTO 60%";
      case "instrumento 70%": return "INSTRUMENTO 70%";
      case "lista concentrada": return "LISTA CONCENTRADA";
      case "asesoria": return "ASESORÍA";
      case "portafolio": return "PORTAFOLIO DIGITAL";
      case "acta final": return "ACTA FINAL";
      case "carta presentacion": return "CARTA DE PRESENTACION";
      case "carta aceptacion": return "CARTA DE ACEPTACION";
      case "carta terminacion": return "CARTA DE TERMINACION";
      case "estadias": return "ACTA FINAL DE ESTADIAS";
      default: return (tipo ?? "DOCUMENTO").toUpperCase();
    }
  };

  const getDocumentTitle = (row: ApiDocument, tipo: string): string => {
    const apartadoLabel = canonicalApartadoForDisplay(tipo);

    const rawTitle = (row.title ?? row.nombre ?? "").trim();
    if (rawTitle && !/^doc_/i.test(rawTitle)) {
      // Si el título viene con metadata separada por " - ", tomar solo el último segmento
      const lastSep = rawTitle.lastIndexOf(" - ");
      const fileName = lastSep !== -1 ? rawTitle.substring(lastSep + 3).trim() : rawTitle;
      if (fileName) {
        const withExt = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
        return `${apartadoLabel} - ${withExt}`;
      }
    }

    const path = (row.file_path ?? "").toString();
    if (path) {
      const rawName = (path.split("/").pop() ?? path).replace(/^doc_[^_]+_/, "");
      if (rawName && !/^doc_/i.test(rawName)) {
        const withExt = rawName.toLowerCase().endsWith(".pdf") ? rawName : `${rawName}.pdf`;
        return `${apartadoLabel} - ${withExt}`;
      }
    }

    return apartadoLabel;
  };

  const getCareerFilterOptions = (plan: string) => {
    const nuevoModelo = [
      ...carrieras["nuevo-modelo"].tsu,
      ...carrieras["nuevo-modelo"].ingenieria,
    ].map((career) => ({ value: career.nombre, label: career.nombre }));
    const planNormal = carrieras["plan-normal"].ingenieria.map((career) => ({
      value: career.nombre,
      label: career.nombre,
    }));
    if (plan === "Plan Nuevo Modelo") return nuevoModelo;
    if (plan === "Plan Normal") return planNormal;
    return [...nuevoModelo, ...planNormal];
  };

  const inferCuatrimestre = (parcial: string | null | undefined): string => {
    if (!parcial) return "-";
    const match = parcial.match(/\d+/);
    return match ? match[0] : "-";
  };

  const getDocumentsTotalFromResponse = (response: any, fallbackLength: number): number => {
    if (typeof response?.meta?.total === "number") {
      return response.meta.total;
    }

    if (typeof response?.data?.total === "number") {
      return response.data.total;
    }

    if (typeof response?.total === "number") {
      return response.total;
    }

    if (Array.isArray(response?.data)) {
      return response.data.length;
    }

    if (Array.isArray(response)) {
      return response.length;
    }

    return fallbackLength;
  };

  const loadCycleDocumentCounts = async (cycleList: AcademicCycle[]) => {
    if (cycleList.length === 0) {
      setDocumentCountByCycleId({});
      return;
    }

    const results = await Promise.allSettled(
      cycleList.map(async (cycle) => {
        const response = await apiFetch(`/documents?cycle_id=${cycle.id}&per_page=1`, { method: "GET" });
        const total = getDocumentsTotalFromResponse(response, 0);
        return { cycleId: cycle.id, total };
      })
    );

    const nextCounts: Record<number, number> = {};
    for (const result of results) {
      if (result.status === "fulfilled") {
        nextCounts[result.value.cycleId] = result.value.total;
      }
    }

    setDocumentCountByCycleId(nextCounts);
  };

  const loadDocumentsForCycle = async (cycle: AcademicCycle): Promise<void> => {
    setIsLoadingDocuments(true);
    try {
      const response = await apiFetch(`/documents?cycle_id=${cycle.id}&per_page=200`, { method: "GET" });
      const rows = ((response.data?.data ?? response.data) as ApiDocument[]) ?? [];
      const totalInCycle = getDocumentsTotalFromResponse(response, rows.length);
      setDocumentCountByCycleId((current) => ({ ...current, [cycle.id]: totalInCycle }));

      const docentes: DocumentRecord[] = rows
        .filter((row) => docenteTypes.includes(resolveRowTipo(row) as DocumentRecord["tipo"]))
        .map((row) => {
          const tipo = resolveRowTipo(row) as DocumentRecord["tipo"];
          return {
            id: row.id,
            ciclo: cycle.nombre,
            documento: getDocumentTitle(row, tipo),
            docente: row.docente ?? row.uploaded_by_name ?? "Sin docente",
            carrera: row.carrera ?? row.carrera_label ?? "Sin carrera",
            plan: formatPlanLabel(row.plan, row.carrera ?? row.carrera_label),
            cuatrimestre: getCuatrimestreFromRow(row),
            materia: row.materia ?? "Sin materia",
            parcial: getParcialFromRow(row),
            grupo: row.grupo ?? row.group_code ?? "-",
            tipo,
            pdfUrl: row.downloadUrl ?? row.fileUrl ?? `/documents/${row.id}/file`,
          };
        });

      const estadiasDocs: EstadiasDocumentRecord[] = rows
        .filter((row) => estadiasTypes.includes(resolveRowTipo(row) as EstadiasDocumentType))
        .map((row) => {
          const tipo = resolveRowTipo(row) as EstadiasDocumentType;
          return {
            id: row.id,
            ciclo: cycle.nombre,
            documento: getDocumentTitle(row, tipo),
            docente: row.docente ?? row.uploaded_by_name ?? "Sin docente",
            carrera: row.carrera ?? row.carrera_label ?? "Sin carrera",
            plan: formatPlanLabel(row.plan, row.carrera ?? row.carrera_label),
            grupo: row.grupo ?? row.group_code ?? "-",
            tipo,
            pdfUrl: row.downloadUrl ?? row.fileUrl ?? `/documents/${row.id}/file`,
          };
        });

      const tutores: TutorDocumentRecord[] = rows
        .filter((row) => tutorTypes.includes(resolveRowTipo(row) as TutorDocumentType))
        .map((row) => ({
          id: row.id,
          ciclo: cycle.nombre,
          documento: getDocumentTitle(row, resolveRowTipo(row)),
          docente: row.docente ?? row.uploaded_by_name ?? "Sin docente",
          tipo: resolveRowTipo(row) as TutorDocumentType,
          cuatrimestre: getCuatrimestreFromRow(row),
          grupo: row.grupo ?? row.group_code ?? "-",
          parcial: getParcialFromRow(row),
          carrera: row.carrera ?? row.carrera_label ?? undefined,
          plan: formatPlanLabel(row.plan, row.carrera ?? row.carrera_label),
          pdfUrl: row.downloadUrl ?? row.fileUrl ?? `/documents/${row.id}/file`,
        }));

      const remediales: RemedialDocumentRecord[] = rows
        .filter((row) => isRemedialTipo(resolveRowTipo(row)))
        .map((row) => ({
          id: row.id,
          ciclo: cycle.nombre,
          documento: getDocumentTitle(row, resolveRowTipo(row)),
          docente: row.docente ?? row.uploaded_by_name ?? "Sin docente",
          carrera: row.carrera ?? row.carrera_label ?? "Sin carrera",
          plan: formatPlanLabel(row.plan, row.carrera ?? row.carrera_label),
          cuatrimestre: getCuatrimestreFromRow(row),
          grupo: row.grupo ?? row.group_code ?? "-",
          parcial: getParcialFromRow(row),
          tipo: resolveRowTipo(row),
          pdfUrl: row.downloadUrl ?? row.fileUrl ?? `/documents/${row.id}/file`,
        }));

      const classifiedIds = new Set([
        ...docentes.map((d) => d.id),
        ...estadiasDocs.map((d) => d.id),
        ...tutores.map((d) => d.id),
        ...remediales.map((d) => d.id),
      ]);
      const unclassified = rows.filter((row) => !classifiedIds.has(row.id));
      if (unclassified.length > 0) {
        console.warn(
          `[CiclosEscolares] ${unclassified.length} documento(s) sin clasificar en ciclo "${cycle.nombre}":`,
          unclassified.map((r) => ({ id: r.id, form_code: r.form_code, tipo: r.tipo, apartado_label: r.apartado_label }))
        );
      }

      const classifiedTotal = docentes.length + estadiasDocs.length + tutores.length + remediales.length;
      setDocumentCountByCycleId((current) => ({ ...current, [cycle.id]: classifiedTotal }));

      setDocuments(docentes);
      setEstadiasDocuments(estadiasDocs);
      setTutorDocuments(tutores);
      setRemedialDocuments(remediales);
    } catch (error) {
      setDocuments([]);
      setEstadiasDocuments([]);
      setTutorDocuments([]);
      setRemedialDocuments([]);
      toast.error("No fue posible cargar los documentos del ciclo");
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadCycles = async () => {
      try {
        const response = await apiFetch("/cycles", { method: "GET" });
        if (cancelled) return;
        const mappedCycles = response.data.map(mapApiCycle);
        setCiclos(mappedCycles);
        void loadCycleDocumentCounts(mappedCycles);
      } catch (error) {
        toast.error("No fue posible cargar los ciclos escolares");
      }
    };

    loadCycles();

    return () => {
      cancelled = true;
    };
  }, []);

  const [filterPlan, setFilterPlan] = useState("all");
  const [filterCarrera, setFilterCarrera] = useState("all");
  const [filterCuatrimestre, setFilterCuatrimestre] = useState("all");
  const [filterMateria, setFilterMateria] = useState("all");
  const [filterDocente, setFilterDocente] = useState("all");
  const [filterParcial, setFilterParcial] = useState("all");
  const [filterEstadiasPlan, setFilterEstadiasPlan] = useState("all");
  const [filterEstadiasCarrera, setFilterEstadiasCarrera] = useState("all");
  const [filterEstadiasGrupo, setFilterEstadiasGrupo] = useState("all");
  const [filterEstadiasDocente, setFilterEstadiasDocente] = useState("all");
  const [filterTutorDocente, setFilterTutorDocente] = useState("all");
  const [filterTutorPlan, setFilterTutorPlan] = useState("all");
  const [filterTutorCarrera, setFilterTutorCarrera] = useState("all");
  const [filterTutorCuatrimestre, setFilterTutorCuatrimestre] = useState("all");
  const [filterTutorParcial, setFilterTutorParcial] = useState("all");
  const [filterRemedialPlan, setFilterRemedialPlan] = useState("all");
  const [filterRemedialCarrera, setFilterRemedialCarrera] = useState("all");
  const [filterRemedialDocente, setFilterRemedialDocente] = useState("all");
  const [filterRemedialGrupo, setFilterRemedialGrupo] = useState("all");

  const resetDocenteFilters = () => {
    setFilterPlan("all");
    setFilterCarrera("all");
    setFilterCuatrimestre("all");
    setFilterMateria("all");
    setFilterDocente("all");
    setFilterParcial("all");
  };

  const resetTutorFilters = () => {
    setFilterTutorDocente("all");
    setFilterTutorPlan("all");
    setFilterTutorCarrera("all");
    setFilterTutorCuatrimestre("all");
    setFilterTutorParcial("all");
  };

  const resetEstadiasFilters = () => {
    setFilterEstadiasPlan("all");
    setFilterEstadiasCarrera("all");
    setFilterEstadiasGrupo("all");
    setFilterEstadiasDocente("all");
  };

  const resetRemedialFilters = () => {
    setFilterRemedialPlan("all");
    setFilterRemedialCarrera("all");
    setFilterRemedialDocente("all");
    setFilterRemedialGrupo("all");
  };

  const cycleDocumentCount = useMemo(
    () => (cycle: AcademicCycle) => {
      const countFromApi = documentCountByCycleId[cycle.id];
      if (typeof countFromApi === "number") {
        return countFromApi;
      }

      return documents.filter((document) => document.ciclo === cycle.nombre).length
        + estadiasDocuments.filter((document) => document.ciclo === cycle.nombre).length
        + tutorDocuments.filter((document) => document.ciclo === cycle.nombre).length
        + remedialDocuments.filter((document) => document.ciclo === cycle.nombre).length;
    },
    [documentCountByCycleId, documents, estadiasDocuments, tutorDocuments, remedialDocuments]
  );

  const getActiveCycle = () => ciclos.find((cycle) => cycle.status === "activo");

  const openDocsForCycle = (ciclo: AcademicCycle) => {
    setSelectedCycle(ciclo);
    setSelectedDocumentType(null);
    setSelectedDocumentCategory(null);
    setSelectedEstadiasCategory(null);
    setSelectedTutorCategory(null);
    void loadDocumentsForCycle(ciclo);
    setShowDocTypeDialog(true);
  };

  const openEditDialog = (ciclo: AcademicCycle) => {
    setSelectedCycle(ciclo);
    setEditCycleForm({
      nombre: ciclo.nombre,
      anio: String(ciclo.anio),
      periodo: ciclo.periodo,
      fechaInicio: ciclo.fechaInicio,
      fechaFin: ciclo.fechaFin,
      status: ciclo.status,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (ciclo: AcademicCycle) => {
    setSelectedCycle(ciclo);
    setDeleteConfirmationName("");
    setShowDeleteDialog(true);
  };

  const confirmAction = (type: "close" | "activate", ciclo: AcademicCycle) => {
    setConfirmDialog({ open: true, type, ciclo });
  };

  const createCycle = async () => {
    const startMonth = monthOptions.find((option) => option.value === newCycleForm.periodoInicio);
    const endMonth = monthOptions.find((option) => option.value === newCycleForm.periodoFin);
    const periodLabel = startMonth && endMonth ? `${startMonth.label}-${endMonth.label}` : "";
    const cycleName = periodLabel && newCycleForm.anio ? `Cuatrimestre ${periodLabel} ${newCycleForm.anio}` : "";

    if (!newCycleForm.anio.trim() || !newCycleForm.periodoInicio || !newCycleForm.periodoFin || !newCycleForm.fechaInicio || !newCycleForm.fechaFin || !cycleName) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const year = Number(newCycleForm.anio);
    if (Number.isNaN(year) || year < 2024) {
      toast.error("El año debe ser 2024 o posterior");
      return;
    }

    const startIndex = monthOptions.findIndex((option) => option.value === newCycleForm.periodoInicio);
    const endIndex = monthOptions.findIndex((option) => option.value === newCycleForm.periodoFin);
    if (startIndex > endIndex) {
      toast.error("El mes de inicio debe ser anterior o igual al mes de fin");
      return;
    }

    try {
      const response = await apiFetch("/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cycleName,
          year,
          period_name: periodLabel,
          start_date: newCycleForm.fechaInicio,
          end_date: newCycleForm.fechaFin,
          status: "cerrado",
        }),
      });

      const nextCycle: ApiCycle = response.data;
      setCiclos((current) => [mapApiCycle(nextCycle), ...current]);
      setDocumentCountByCycleId((current) => ({ ...current, [nextCycle.id]: 0 }));
      toast.success("Ciclo escolar creado correctamente");
      setNewCycleForm({
        nombre: "",
        anio: String(currentYear),
        periodo: "",
        periodoInicio: "",
        periodoFin: "",
        fechaInicio: "",
        fechaFin: "",
        status: "cerrado",
      });
      setShowNewDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear el ciclo");
    }
  };

  const updateCycle = async () => {
    if (!selectedCycle) return;

    if (!editCycleForm.nombre.trim() || !editCycleForm.periodo.trim() || !editCycleForm.fechaInicio || !editCycleForm.fechaFin) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const year = Number(editCycleForm.anio);
    if (Number.isNaN(year)) {
      toast.error("El año debe ser numérico");
      return;
    }

    const updatedName = editCycleForm.nombre.trim();
    const requestedStatus: CycleStatus = editCycleForm.status;

      if (requestedStatus === "activo") {
        const activeCycle = getActiveCycle();
        if (activeCycle && activeCycle.id !== selectedCycle.id) {
          toast.error(`Solo puede haber un ciclo activo. Primero cierra ${activeCycle.nombre}.`);
          return;
        }
      }

    try {
      const response = await apiFetch(`/cycles/${selectedCycle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updatedName,
          year,
          period_name: editCycleForm.periodo.trim(),
          start_date: editCycleForm.fechaInicio,
          end_date: editCycleForm.fechaFin,
          status: requestedStatus,
        }),
      });

      const updatedCycle: ApiCycle = response.data;
      const mappedCycle = mapApiCycle(updatedCycle);
      setCiclos((current) => current.map((cycle) => {
        if (cycle.id === selectedCycle.id) {
          return mappedCycle;
        }
        if (mappedCycle.status === "activo") {
          return { ...cycle, status: "cerrado" };
        }
        return cycle;
      }));
      toast.success("Ciclo escolar actualizado correctamente");
      setShowEditDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar el ciclo");
    }

  };

  const deleteCycle = async () => {
    if (!selectedCycle) return;

    if (deleteConfirmationName.trim() !== selectedCycle.nombre) {
      toast.error("Escribe exactamente el nombre del ciclo para eliminarlo");
      return;
    }
    try {
      await apiFetch(`/cycles/${selectedCycle.id}`, {
        method: "DELETE",
      });
      setCiclos((current) => current.filter((cycle) => cycle.id !== selectedCycle.id));
      setDocumentCountByCycleId((current) => {
        const next = { ...current };
        delete next[selectedCycle.id];
        return next;
      });
      setDocuments((current) => current.filter((document) => document.ciclo !== selectedCycle.nombre));
      toast.success(`Ciclo ${selectedCycle.nombre} eliminado correctamente`);
      setShowDeleteDialog(false);
      setSelectedCycle(null);
      setDeleteConfirmationName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar el ciclo");
    }
  };

  const performConfirm = async () => {
    if (!confirmDialog.ciclo || !confirmDialog.type) return;

    const ciclo = confirmDialog.ciclo;
    if (confirmDialog.type === "close") {
      try {
        const response = await apiFetch(`/cycles/${ciclo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cerrado" }),
        });
        setCiclos((current) => current.map((cycle) => (cycle.id === ciclo.id ? mapApiCycle(response.data) : cycle)));
        toast.success(`Ciclo ${ciclo.nombre} cerrado correctamente`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al cerrar el ciclo");
      }
    } else {
      try {
        const response = await apiFetch(`/cycles/${ciclo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "activo" }),
        });
        const updatedCycle = mapApiCycle(response.data);
        setCiclos((current) => current.map((cycle) => {
          if (cycle.id === ciclo.id) {
            return updatedCycle;
          }
          if (updatedCycle.status === "activo") {
            return { ...cycle, status: "cerrado" };
          }
          return cycle;
        }));
        toast.success(`Ciclo ${ciclo.nombre} activado correctamente`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al activar el ciclo");
      }
    }
    setConfirmDialog({ open: false });
  };

  const closeDocs = () => {
    setShowDocTypeDialog(false);
    setShowDocumentTypeSelector(false);
    setShowDocumentsModal(false);
    setSelectedDocumentType(null);
    setSelectedDocumentCategory(null);
    setSelectedEstadiasCategory(null);
    setSelectedTutorCategory(null);
    setSelectedCycle(null);
  };

  const handleSelectDocType = (type: "docentes" | "estadias" | "tutores" | "remediales") => {
    setSelectedDocumentType(type);
    setShowDocTypeDialog(false);
    if (type === "remediales") {
      resetRemedialFilters();
      setShowDocumentsModal(true);
      return;
    }
    if (type === "docentes" || type === "estadias") {
      setShowDocumentTypeSelector(true);
      return;
    }

    setSelectedTutorCategory(null);
    setShowDocumentTypeSelector(true);
  };

  const handleSelectDocumentCategory = (category: DocumentRecord["tipo"]) => {
    setSelectedDocumentCategory(category);
    setSelectedEstadiasCategory(null);
    setSelectedTutorCategory(null);
    setShowDocumentTypeSelector(false);
    setShowDocumentsModal(true);
    resetDocenteFilters();
  };

  const handleSelectEstadiasCategory = (category: EstadiasDocumentType) => {
    setSelectedEstadiasCategory(category);
    setSelectedDocumentCategory(null);
    setSelectedTutorCategory(null);
    setShowDocumentTypeSelector(false);
    setShowDocumentsModal(true);
    resetEstadiasFilters();
  };

  const handleSelectTutorCategory = (category: TutorDocumentType) => {
    setSelectedTutorCategory(category);
    setSelectedDocumentCategory(null);
    setSelectedEstadiasCategory(null);
    setShowDocumentTypeSelector(false);
    setShowDocumentsModal(true);
    resetTutorFilters();
  };

  const closeDocumentsModal = () => {
    setShowDocumentsModal(false);
    setSelectedDocumentType(null);
    setSelectedDocumentCategory(null);
    setSelectedEstadiasCategory(null);
    setSelectedTutorCategory(null);
    resetDocenteFilters();
    resetEstadiasFilters();
    resetTutorFilters();
    resetRemedialFilters();
  };

  useEffect(() => {
    if (!showDocumentsModal) return;
    if (selectedDocumentType === "docentes") {
      resetDocenteFilters();
      return;
    }
    if (selectedDocumentType === "estadias") {
      resetEstadiasFilters();
      return;
    }
    if (selectedDocumentType === "tutores") {
      resetTutorFilters();
      return;
    }
    if (selectedDocumentType === "remediales") {
      resetRemedialFilters();
    }
  }, [showDocumentsModal, selectedDocumentType, selectedCycle?.id]);

  const openDocumentPreview = (document: DocumentRecord | TutorDocumentRecord | EstadiasDocumentRecord | RemedialDocumentRecord) => {
    setPreviewDocument(document);
  };

  const closeDocumentPreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setPreviewDocument(null);
  };

  useEffect(() => {
    if (!previewDocument) {
      return;
    }

    let isMounted = true;

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const blob = await fetchDocumentBlob(previewDocument.id);
        if (!isMounted) return;
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(pdfBlob);
        if (previewBlobUrl) {
          URL.revokeObjectURL(previewBlobUrl);
        }
        setPreviewBlobUrl(blobUrl);
      } catch (error) {
        if (!isMounted) return;
        setPreviewError(error instanceof Error ? error.message : "No se pudo cargar la vista previa del PDF.");
        setPreviewBlobUrl(null);
      } finally {
        if (isMounted) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [previewDocument]);

  const plansAvailable = useMemo(
    () => {
      const plans = Array.from(new Set(documents.map((document) => document.plan).filter((value): value is string => Boolean(value))));
      return plans.length > 0 ? plans : ["Plan Nuevo Modelo", "Plan Normal", "Plan"];
    },
    [documents]
  );

  // Carreras depend on the selected plan, same pattern as DocumentReview
  const carrerasAvailable = useMemo(
    () => getCareerFilterOptions(filterPlan),
    [filterPlan]
  );

  const cuatrimestresAvailable = useMemo(
    () => {
      const fromCatalog = getCuatrimestresForPlanCarrera(filterPlan, filterCarrera);
      const fromDocs = Array.from(new Set(documents
        .filter((document) => (selectedDocumentCategory === null || document.tipo === selectedDocumentCategory)
          && (filterPlan === "all" || document.plan === filterPlan)
          && (filterCarrera === "all" || document.carrera === filterCarrera))
        .map((document) => document.cuatrimestre)))
        .filter((value) => value !== "-");
      // Merge catalog (all possible) with what's actually uploaded, keeping catalog order
      const merged = [...fromCatalog];
      for (const c of fromDocs) {
        if (!merged.includes(c)) merged.push(c);
      }
      return merged;
    },
    [documents, selectedDocumentCategory, filterPlan, filterCarrera]
  );

  const docentesAvailable = useMemo(
    () => Array.from(new Set(documents
      .filter((document) => (selectedDocumentCategory === null || document.tipo === selectedDocumentCategory)
        && (filterPlan === "all" || document.plan === filterPlan)
        && (filterCarrera === "all" || document.carrera === filterCarrera)
        && (filterCuatrimestre === "all" || document.cuatrimestre === filterCuatrimestre)
        && (filterMateria === "all" || document.materia === filterMateria))
      .map((document) => document.docente))),
    [documents, selectedDocumentCategory, filterPlan, filterCarrera, filterCuatrimestre, filterMateria]
  );

  const materiasAvailable = useMemo(
    () => Array.from(new Set(documents
      .filter((document) => (selectedDocumentCategory === null || document.tipo === selectedDocumentCategory)
        && (filterPlan === "all" || document.plan === filterPlan)
        && (filterCarrera === "all" || document.carrera === filterCarrera)
        && (filterCuatrimestre === "all" || document.cuatrimestre === filterCuatrimestre))
      .map((document) => document.materia)))
      .filter((value) => Boolean(value) && value !== "Sin materia"),
    [documents, selectedDocumentCategory, filterPlan, filterCarrera, filterCuatrimestre]
  );

  const parcialesAvailable = PARCIAL_FILTER_OPTIONS;

  // Tutor plans also static
  const tutorPlansAvailable = ["Plan Nuevo Modelo", "Plan Normal"];

  // Tutor carreras depend on selected tutor plan
  const tutorCarrerasAvailable = useMemo(
    () => getCareerFilterOptions(filterTutorPlan),
    [filterTutorPlan]
  );

  const tutorCuatrimestresAvailable = useMemo(
    () => {
      const fromCatalog = getCuatrimestresForPlanCarrera(filterTutorPlan, filterTutorCarrera);
      const fromDocs = Array.from(new Set(tutorDocuments
        .filter((document) => (selectedTutorCategory === null || document.tipo === selectedTutorCategory)
          && (filterTutorPlan === "all" || (document.plan ?? "Plan") === filterTutorPlan)
          && (filterTutorCarrera === "all" || (document.carrera ?? "Sin carrera") === filterTutorCarrera))
        .map((document) => document.cuatrimestre ?? "-")))
        .filter((value) => value !== "-");
      const merged = [...fromCatalog];
      for (const c of fromDocs) {
        if (!merged.includes(c)) merged.push(c);
      }
      return merged;
    },
    [tutorDocuments, selectedTutorCategory, filterTutorPlan, filterTutorCarrera]
  );

  const tutorDocentesAvailable = useMemo(
    () => Array.from(new Set(tutorDocuments
      .filter((document) => (selectedTutorCategory === null || document.tipo === selectedTutorCategory)
        && (filterTutorPlan === "all" || (document.plan ?? "Plan") === filterTutorPlan)
        && (filterTutorCarrera === "all" || (document.carrera ?? "Sin carrera") === filterTutorCarrera)
        && (filterTutorCuatrimestre === "all" || (document.cuatrimestre ?? "-") === filterTutorCuatrimestre))
      .map((document) => document.docente))),
    [tutorDocuments, selectedTutorCategory, filterTutorPlan, filterTutorCarrera, filterTutorCuatrimestre]
  );

  const tutorParcialesAvailable = PARCIAL_FILTER_OPTIONS;

  React.useEffect(() => {
    if (filterCuatrimestre !== "all" && !cuatrimestresAvailable.includes(filterCuatrimestre)) {
      setFilterCuatrimestre("all");
    }
  }, [filterCuatrimestre, cuatrimestresAvailable]);

  React.useEffect(() => {
    if (filterCarrera !== "all" && !carrerasAvailable.some((c) => c.value === filterCarrera)) {
      setFilterCarrera("all");
    }
  }, [filterCarrera, carrerasAvailable]);

  React.useEffect(() => {
    if (filterMateria !== "all" && !materiasAvailable.includes(filterMateria)) {
      setFilterMateria("all");
    }
  }, [filterMateria, materiasAvailable]);

  React.useEffect(() => {
    if (filterDocente !== "all" && !docentesAvailable.includes(filterDocente)) {
      setFilterDocente("all");
    }
  }, [filterDocente, docentesAvailable]);

  React.useEffect(() => {
    if (filterParcial !== "all" && !parcialesAvailable.some((option) => option.value === filterParcial)) {
      setFilterParcial("all");
    }
  }, [filterParcial, parcialesAvailable]);

  React.useEffect(() => {
    if (filterTutorCarrera !== "all" && !tutorCarrerasAvailable.some((c) => c.value === filterTutorCarrera)) {
      setFilterTutorCarrera("all");
    }
  }, [filterTutorCarrera, tutorCarrerasAvailable]);

  React.useEffect(() => {
    if (filterTutorCuatrimestre !== "all" && !tutorCuatrimestresAvailable.includes(filterTutorCuatrimestre)) {
      setFilterTutorCuatrimestre("all");
    }
  }, [filterTutorCuatrimestre, tutorCuatrimestresAvailable]);

  React.useEffect(() => {
    if (filterTutorDocente !== "all" && !tutorDocentesAvailable.includes(filterTutorDocente)) {
      setFilterTutorDocente("all");
    }
  }, [filterTutorDocente, tutorDocentesAvailable]);

  React.useEffect(() => {
    if (filterTutorParcial !== "all" && !tutorParcialesAvailable.some((option) => option.value === filterTutorParcial)) {
      setFilterTutorParcial("all");
    }
  }, [filterTutorParcial, tutorParcialesAvailable]);

  const filteredDocuments = useMemo(
    () => documents.filter((document) => (
      (selectedDocumentCategory === null || document.tipo === selectedDocumentCategory)
      &&
      (filterPlan === "all" || document.plan === filterPlan)
      && (filterCarrera === "all" || document.carrera === filterCarrera)
      && (filterCuatrimestre === "all" || document.cuatrimestre === filterCuatrimestre)
      && (filterMateria === "all" || document.materia === filterMateria)
      && (filterDocente === "all" || document.docente === filterDocente)
      && (filterParcial === "all" || getParcialFilterValue(document.parcial) === filterParcial)
    )),
    [documents, selectedDocumentCategory, filterPlan, filterCarrera, filterCuatrimestre, filterMateria, filterDocente, filterParcial]
  );

  const filteredTutorDocuments = useMemo(
    () => tutorDocuments.filter((document) => (
      (selectedTutorCategory === null || document.tipo === selectedTutorCategory)
      && (filterTutorPlan === "all" || (document.plan ?? "Plan") === filterTutorPlan)
      && (filterTutorCarrera === "all" || (document.carrera ?? "Sin carrera") === filterTutorCarrera)
      && (filterTutorCuatrimestre === "all" || (document.cuatrimestre ?? "-") === filterTutorCuatrimestre)
      && (filterTutorDocente === "all" || document.docente === filterTutorDocente)
      && (filterTutorParcial === "all" || getParcialFilterValue(document.parcial) === filterTutorParcial)
    )),
    [tutorDocuments, selectedTutorCategory, filterTutorPlan, filterTutorCarrera, filterTutorCuatrimestre, filterTutorDocente, filterTutorParcial]
  );

  const filteredEstadiasDocuments = useMemo(
    () => estadiasDocuments.filter((document) => (
      (selectedEstadiasCategory === null || document.tipo === selectedEstadiasCategory)
      && (filterEstadiasPlan === "all" || document.plan === filterEstadiasPlan)
      && (filterEstadiasCarrera === "all" || document.carrera === filterEstadiasCarrera)
      && (filterEstadiasGrupo === "all" || document.grupo === filterEstadiasGrupo)
      && (filterEstadiasDocente === "all" || document.docente === filterEstadiasDocente)
    )),
    [estadiasDocuments, selectedEstadiasCategory, filterEstadiasPlan, filterEstadiasCarrera, filterEstadiasGrupo, filterEstadiasDocente]
  );

  const filteredRemedialDocuments = useMemo(
    () => remedialDocuments.filter((document) => (
      (filterRemedialPlan === "all" || document.plan === filterRemedialPlan)
      && (filterRemedialCarrera === "all" || document.carrera === filterRemedialCarrera)
      && (filterRemedialDocente === "all" || document.docente === filterRemedialDocente)
      && (filterRemedialGrupo === "all" || document.grupo === filterRemedialGrupo)
    )),
    [remedialDocuments, filterRemedialPlan, filterRemedialCarrera, filterRemedialDocente, filterRemedialGrupo]
  );

  const docenteCountByType = useMemo(() => {
    return documents.reduce<Record<DocumentRecord["tipo"], number>>((acc, document) => {
      acc[document.tipo] = (acc[document.tipo] ?? 0) + 1;
      return acc;
    }, {
      "planeacion": 0,
      "instrumento-30": 0,
      "instrumento-40": 0,
      "instrumento-60": 0,
      "instrumento-70": 0,
      "lista-concentrada": 0,
      "asesoria": 0,
      "portafolio": 0,
      "acta-final": 0,
    });
  }, [documents]);

  const estadiasCountByType = useMemo(() => {
    return estadiasDocuments.reduce<Record<EstadiasDocumentType, number>>((acc, document) => {
      acc[document.tipo] = (acc[document.tipo] ?? 0) + 1;
      return acc;
    }, {
      "carta-presentacion": 0,
      "carta-aceptacion": 0,
      "carta-terminacion": 0,
      estadias: 0,
    });
  }, [estadiasDocuments]);

  const tutorCountByType = useMemo(() => {
    return tutorDocuments.reduce<Record<TutorDocumentType, number>>((acc, document) => {
      acc[document.tipo] = (acc[document.tipo] ?? 0) + 1;
      return acc;
    }, {
      "carga-academica": 0,
      "reporte-bajas": 0,
      "concentrado-asesorias": 0,
      "acta-asistencia": 0,
      "ficha-tecnica": 0,
    });
  }, [tutorDocuments]);

  const totalDocenteDocuments = documents.length;
  const totalEstadiasDocuments = estadiasDocuments.length;
  const totalTutorDocuments = tutorDocuments.length;
  const totalRemedialDocuments = remedialDocuments.length;
  const totalSelectedDocenteCategory = selectedDocumentCategory
    ? (docenteCountByType[selectedDocumentCategory] ?? 0)
    : totalDocenteDocuments;
  const totalSelectedEstadiasCategory = selectedEstadiasCategory
    ? (estadiasCountByType[selectedEstadiasCategory] ?? 0)
    : totalEstadiasDocuments;
  const totalSelectedTutorCategory = selectedTutorCategory
    ? (tutorCountByType[selectedTutorCategory] ?? 0)
    : totalTutorDocuments;

  const loadedDocsTotal = totalDocenteDocuments + totalEstadiasDocuments + totalTutorDocuments + totalRemedialDocuments;
  const apiDocsTotal = selectedCycle ? (documentCountByCycleId[selectedCycle.id] ?? loadedDocsTotal) : loadedDocsTotal;
  const isDocsTruncated = !isLoadingDocuments && apiDocsTotal > loadedDocsTotal;

  const documentsModalTitle = getDocumentsModalTitle(selectedDocumentType, selectedDocumentCategory, selectedEstadiasCategory, selectedTutorCategory);

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Ciclos Escolares</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Administra los períodos académicos del sistema.</p>
          </div>
          <Button variant="success" onClick={() => setShowNewDialog(true)} className="self-start sm:self-auto shadow-md shadow-emerald-500/20">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Ciclo
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {ciclos.map((ciclo) => {
          const documentsCount = cycleDocumentCount(ciclo);

          return (
            <Card
              key={ciclo.id}
              className="overflow-hidden rounded-[22px] border border-border bg-card shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
              tabIndex={0}
              onClick={() => openDocsForCycle(ciclo)}
              onKeyDown={(e) => {
                if ((e as React.KeyboardEvent).key === "Enter") openDocsForCycle(ciclo);
              }}
            >
              {ciclo.status === "activo" && (
                <div className="h-1 bg-gradient-to-r from-emerald-400/80 via-emerald-300/50 to-transparent" />
              )}
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="break-words">{ciclo.nombre}</CardTitle>
                      <Badge variant={ciclo.status === "activo" ? "success" : "outline"} className="shrink-0">{ciclo.status === "activo" ? "Activo" : "Cerrado"}</Badge>
                    </div>
                    <CardDescription>
                      {ciclo.fechaInicio} — {ciclo.fechaFin}
                    </CardDescription>
                  </div>
                  <Calendar className="h-5 w-5 text-muted-foreground self-start" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-6 text-sm min-w-0">
                    <div>
                      <p className="text-muted-foreground">Año</p>
                      <p className="font-medium">{ciclo.anio}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Período</p>
                      <p className="font-medium">{ciclo.periodo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Documentos</p>
                      <p className="font-medium">{documentsCount}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); openDocsForCycle(ciclo); }} aria-label="Ver documentos">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver documentos</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); openEditDialog(ciclo); }} aria-label="Editar ciclo">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); openDeleteDialog(ciclo); }} aria-label="Eliminar ciclo">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar</TooltipContent>
                    </Tooltip>
                    {ciclo.status === "activo" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); confirmAction("close", ciclo); }} aria-label="Cerrar ciclo">
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cerrar ciclo</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); confirmAction("activate", ciclo); }} aria-label="Activar ciclo">
                            <Check className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Activar</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="border-emerald-200/70 bg-white dark:border-emerald-900/50 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle>Nuevo Ciclo Escolar</DialogTitle>
            <DialogDescription>Crea un nuevo período académico en el sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Ciclo</Label>
              <Input
                disabled
                placeholder="Se genera automáticamente"
                value={newCycleForm.periodoInicio && newCycleForm.periodoFin ? `Cuatrimestre ${monthOptions.find((m) => m.value === newCycleForm.periodoInicio)?.label}-${monthOptions.find((m) => m.value === newCycleForm.periodoFin)?.label} ${newCycleForm.anio}` : ""}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Año</Label>
                <Select value={newCycleForm.anio} onValueChange={(value) => setNewCycleForm((current) => ({ ...current, anio: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona año" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mes de inicio</Label>
                <Select value={newCycleForm.periodoInicio} onValueChange={(value) => setNewCycleForm((current) => ({ ...current, periodoInicio: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Inicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mes de fin</Label>
                <Select value={newCycleForm.periodoFin} onValueChange={(value) => setNewCycleForm((current) => ({ ...current, periodoFin: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Fin" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newCycleForm.periodoInicio && newCycleForm.periodoFin && monthOptions.findIndex((m) => m.value === newCycleForm.periodoInicio) > monthOptions.findIndex((m) => m.value === newCycleForm.periodoFin) && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                El mes de inicio debe ser anterior o igual al mes de fin.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input type="date" value={newCycleForm.fechaInicio} onChange={(e) => setNewCycleForm((current) => ({ ...current, fechaInicio: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Fin</Label>
                <Input type="date" value={newCycleForm.fechaFin} onChange={(e) => setNewCycleForm((current) => ({ ...current, fechaFin: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={createCycle}>
              Crear Ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="border-emerald-200/70 bg-white dark:border-emerald-900/50 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle>Editar Ciclo Escolar</DialogTitle>
            <DialogDescription>Actualiza la información del ciclo seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Ciclo</Label>
              <Input value={editCycleForm.nombre} onChange={(e) => setEditCycleForm((current) => ({ ...current, nombre: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Año</Label>
                <Input type="number" value={editCycleForm.anio} onChange={(e) => setEditCycleForm((current) => ({ ...current, anio: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Input value={editCycleForm.periodo} onChange={(e) => setEditCycleForm((current) => ({ ...current, periodo: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input type="date" value={editCycleForm.fechaInicio} onChange={(e) => setEditCycleForm((current) => ({ ...current, fechaInicio: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Fin</Label>
                <Input type="date" value={editCycleForm.fechaFin} onChange={(e) => setEditCycleForm((current) => ({ ...current, fechaFin: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={updateCycle}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Ciclo Escolar</DialogTitle>
            <DialogDescription>
              Esta acción eliminará de forma permanente el ciclo y los documentos asociados. Escribe exactamente el nombre del ciclo para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100">
              <strong>Ciclo:</strong> {selectedCycle?.nombre}
              <br />
              <strong>Documentos asociados:</strong> {selectedCycle ? cycleDocumentCount(selectedCycle) : 0}
            </div>
            <div className="space-y-2">
              <Label>Escribe el nombre exacto del ciclo</Label>
              <Input value={deleteConfirmationName} onChange={(e) => setDeleteConfirmationName(e.target.value)} placeholder={selectedCycle?.nombre} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteCycle} disabled={deleteConfirmationName.trim() !== selectedCycle?.nombre}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDocTypeDialog} onOpenChange={(open) => { if (!open) closeDocs(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Seleccionar Tipo de Documentos</DialogTitle>
            <DialogDescription className="text-base mt-2">
              {isLoadingDocuments
                ? "Cargando documentos del ciclo..."
                : `¿Qué documentos deseas revisar para ${selectedCycle?.nombre}?`}
            </DialogDescription>
          </DialogHeader>
          {isDocsTruncated && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Solo se cargaron {loadedDocsTotal} de {apiDocsTotal} documentos. Algunos pueden no aparecer en la lista.</span>
            </div>
          )}
          <div className="grid gap-4 mt-2">
            <Button
              onClick={() => handleSelectDocType("docentes")}
              className="justify-start h-28 text-left flex flex-col items-start p-5 border-2 rounded-lg transition-all hover:shadow-lg"
              variant="outline"
              disabled={isLoadingDocuments || totalDocenteDocuments === 0}
            >
              <FileText className="h-6 w-6 mb-3" />
              <span className="font-semibold text-lg">Documentos Docentes {isLoadingDocuments ? "" : `(${totalDocenteDocuments})`}</span>
              <span className="text-sm text-muted-foreground">Planeación, instrumentos, listas, asesorías y portafolio.</span>
            </Button>
            <Button
              onClick={() => handleSelectDocType("estadias")}
              className="justify-start h-28 text-left flex flex-col items-start p-5 border-2 rounded-lg transition-all hover:shadow-lg"
              variant="outline"
              disabled={isLoadingDocuments || totalEstadiasDocuments === 0}
            >
              <FileText className="h-6 w-6 mb-3" />
              <span className="font-semibold text-lg">Documentos de Estadías {isLoadingDocuments ? "" : `(${totalEstadiasDocuments})`}</span>
              <span className="text-sm text-muted-foreground">Cartas, aceptación, terminación y acta final.</span>
            </Button>
            <Button
              onClick={() => handleSelectDocType("tutores")}
              className="justify-start h-28 text-left flex flex-col items-start p-5 border-2 rounded-lg transition-all hover:shadow-lg"
              variant="outline"
              disabled={isLoadingDocuments || totalTutorDocuments === 0}
            >
              <FileText className="h-6 w-6 mb-3" />
              <span className="font-semibold text-lg">Documentos Tutores {isLoadingDocuments ? "" : `(${totalTutorDocuments})`}</span>
              <span className="text-sm text-muted-foreground">Carga académica, reportes, concentrados y fichas.</span>
            </Button>
            <Button
              onClick={() => handleSelectDocType("remediales")}
              className="justify-start h-28 text-left flex flex-col items-start p-5 border-2 rounded-lg transition-all hover:shadow-lg"
              variant="outline"
              disabled={isLoadingDocuments || totalRemedialDocuments === 0}
            >
              <FileText className="h-6 w-6 mb-3" />
              <span className="font-semibold text-lg">Documentos Remediales {isLoadingDocuments ? "" : `(${totalRemedialDocuments})`}</span>
              <span className="text-sm text-muted-foreground">Actividades y actas de recuperación académica.</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDocumentTypeSelector} onOpenChange={(open) => { if (!open) closeDocs(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <Button
                onClick={() => {
                  setShowDocumentTypeSelector(false);
                  setShowDocTypeDialog(true);
                }}
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Atrás"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <DialogTitle className="text-2xl">{selectedDocumentType === "tutores" ? "Seleccionar Tipo de Tutoría" : selectedDocumentType === "estadias" ? "Seleccionar Tipo de Estadías" : "Seleccionar Tipo de Documento"}</DialogTitle>
                <DialogDescription className="text-base mt-0.5">{selectedDocumentType === "tutores" ? "Elige el apartado de tutorías que deseas revisar" : selectedDocumentType === "estadias" ? "Elige el apartado de estadías que deseas revisar" : "Elige el documento que deseas revisar"}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedDocumentType === "tutores" ? (
            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Button disabled={tutorCountByType["carga-academica"] === 0} onClick={() => handleSelectTutorCategory("carga-academica")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Carga académica ({tutorCountByType["carga-academica"]})</Button>
              <Button disabled={tutorCountByType["reporte-bajas"] === 0} onClick={() => handleSelectTutorCategory("reporte-bajas")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Reporte de bajas ({tutorCountByType["reporte-bajas"]})</Button>
              <Button disabled={tutorCountByType["concentrado-asesorias"] === 0} onClick={() => handleSelectTutorCategory("concentrado-asesorias")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Concentrado de asesorías y bajas ({tutorCountByType["concentrado-asesorias"]})</Button>
              <Button disabled={tutorCountByType["acta-asistencia"] === 0} onClick={() => handleSelectTutorCategory("acta-asistencia")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Acta de asistencia grupal ({tutorCountByType["acta-asistencia"]})</Button>
              <Button disabled={tutorCountByType["ficha-tecnica"] === 0} onClick={() => handleSelectTutorCategory("ficha-tecnica")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Ficha técnica ({tutorCountByType["ficha-tecnica"]})</Button>
              </div>
            </div>
          ) : selectedDocumentType === "estadias" ? (
            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <Button disabled={estadiasCountByType["carta-presentacion"] === 0} onClick={() => handleSelectEstadiasCategory("carta-presentacion")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Carta de presentación ({estadiasCountByType["carta-presentacion"]})</Button>
              <Button disabled={estadiasCountByType["carta-aceptacion"] === 0} onClick={() => handleSelectEstadiasCategory("carta-aceptacion")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Carta de aceptación ({estadiasCountByType["carta-aceptacion"]})</Button>
              <Button disabled={estadiasCountByType["carta-terminacion"] === 0} onClick={() => handleSelectEstadiasCategory("carta-terminacion")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Carta de terminación ({estadiasCountByType["carta-terminacion"]})</Button>
              <Button disabled={estadiasCountByType["estadias"] === 0} onClick={() => handleSelectEstadiasCategory("estadias")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Acta final de estadías ({estadiasCountByType["estadias"]})</Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Button disabled={docenteCountByType["planeacion"] === 0} onClick={() => handleSelectDocumentCategory("planeacion")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Planeación ({docenteCountByType["planeacion"]})</Button>
              <Button disabled={docenteCountByType["instrumento-30"] === 0} onClick={() => handleSelectDocumentCategory("instrumento-30")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Instrumento 30% ({docenteCountByType["instrumento-30"]})</Button>
              <Button disabled={docenteCountByType["instrumento-40"] === 0} onClick={() => handleSelectDocumentCategory("instrumento-40")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Instrumento 40% ({docenteCountByType["instrumento-40"]})</Button>
              <Button disabled={docenteCountByType["instrumento-60"] === 0} onClick={() => handleSelectDocumentCategory("instrumento-60")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Instrumento 60% ({docenteCountByType["instrumento-60"]})</Button>
              <Button disabled={docenteCountByType["instrumento-70"] === 0} onClick={() => handleSelectDocumentCategory("instrumento-70")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Instrumento 70% ({docenteCountByType["instrumento-70"]})</Button>

              <Button disabled={docenteCountByType["lista-concentrada"] === 0} onClick={() => handleSelectDocumentCategory("lista-concentrada")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Lista Concentrada ({docenteCountByType["lista-concentrada"]})</Button>
              <Button disabled={docenteCountByType["asesoria"] === 0} onClick={() => handleSelectDocumentCategory("asesoria")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Asesoría ({docenteCountByType["asesoria"]})</Button>
              <Button disabled={docenteCountByType["portafolio"] === 0} onClick={() => handleSelectDocumentCategory("portafolio")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Portafolio Digital ({docenteCountByType["portafolio"]})</Button>
              <Button disabled={docenteCountByType["acta-final"] === 0} onClick={() => handleSelectDocumentCategory("acta-final")} className="justify-center h-24 font-semibold border-2 hover:bg-accent whitespace-normal text-center leading-snug px-3" variant="outline">Acta Final ({docenteCountByType["acta-final"]})</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDocumentsModal} onOpenChange={(open) => { if (!open) closeDocumentsModal(); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <Button
                onClick={() => {
                  setShowDocumentsModal(false);
                  if (selectedDocumentType === "remediales") {
                    setShowDocTypeDialog(true);
                  } else {
                    setShowDocumentTypeSelector(true);
                  }
                }}
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Atrás"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <DialogTitle className="text-2xl">{documentsModalTitle}</DialogTitle>
                <DialogDescription className="text-base mt-0.5">{selectedCycle?.nombre}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {isLoadingDocuments ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Cargando documentos del ciclo...
              </div>
            ) : selectedDocumentType === "docentes" ? (
              <>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 py-4 border-b">
                  <Select value={filterPlan} onValueChange={(v) => { setFilterPlan(v); setFilterCarrera("all"); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los planes</SelectItem>
                      {plansAvailable.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Carrera" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las carreras</SelectItem>
                      {carrerasAvailable.map((carrera) => <SelectItem key={carrera.value} value={carrera.value}>{carrera.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cuatrimestre" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cuatrimestres</SelectItem>
                      {cuatrimestresAvailable.map((cuatrimestre) => <SelectItem key={cuatrimestre} value={cuatrimestre}>{cuatrimestre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterMateria} onValueChange={setFilterMateria}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Materia" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las materias</SelectItem>
                      {materiasAvailable.map((materia) => <SelectItem key={materia} value={materia}>{materia}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterDocente} onValueChange={setFilterDocente}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Docente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los docentes</SelectItem>
                      {docentesAvailable.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterParcial} onValueChange={setFilterParcial}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Parcial" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los parciales</SelectItem>
                      {parcialesAvailable.map((parcial) => <SelectItem key={parcial.value} value={parcial.value}>{parcial.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-4 pb-4 max-h-[52vh] overflow-y-auto pr-1">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {filteredDocuments.length} de {totalSelectedDocenteCategory} documentos.
                  </p>
                  {filteredDocuments.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">No hay documentos que coincidan con los filtros</div>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        tabIndex={0}
                        onClick={() => openDocumentPreview(doc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDocumentPreview(doc);
                          }
                        }}
                        className="cursor-pointer p-3 border border-border/70 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.documento}</p>
                            <p className="text-xs text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                            <p className="text-xs text-muted-foreground">Materia: {doc.materia}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                              <Badge variant="outline" className="text-xs">Cuatrimestre {doc.cuatrimestre}</Badge>
                              <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>
                              {doc.parcial !== "-" && <Badge variant="outline" className="text-xs">{doc.parcial}</Badge>}
                            </div>
                          </div>
                          <ResponsiveActionButton
                            variant="outline"
                            size="sm"
                            label="Ver PDF"
                            title="Ver documento"
                            className="shrink-0"
                            onClick={(e) => { e.stopPropagation(); openDocumentPreview(doc); }}
                            icon={<FileText className="h-4 w-4" />}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : selectedDocumentType === "remediales" ? (
              <>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 py-4 border-b">
                  <Select value={filterRemedialPlan} onValueChange={(v) => { setFilterRemedialPlan(v); setFilterRemedialCarrera("all"); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los planes</SelectItem>
                      {Array.from(new Set(remedialDocuments.map((d) => d.plan).filter(Boolean))).map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterRemedialCarrera} onValueChange={setFilterRemedialCarrera}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Carrera" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las carreras</SelectItem>
                      {Array.from(new Set(remedialDocuments.filter((d) => filterRemedialPlan === "all" || d.plan === filterRemedialPlan).map((d) => d.carrera).filter(Boolean))).map((carrera) => <SelectItem key={carrera} value={carrera}>{carrera}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterRemedialDocente} onValueChange={setFilterRemedialDocente}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Docente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los docentes</SelectItem>
                      {Array.from(new Set(remedialDocuments.map((d) => d.docente).filter(Boolean))).map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterRemedialGrupo} onValueChange={setFilterRemedialGrupo}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Grupo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los grupos</SelectItem>
                      {Array.from(new Set(remedialDocuments.map((d) => d.grupo).filter((v): v is string => Boolean(v) && v !== "-"))).map((grupo) => <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-4 pb-4 max-h-[52vh] overflow-y-auto pr-1">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {filteredRemedialDocuments.length} de {totalRemedialDocuments} documentos.
                  </p>
                  {filteredRemedialDocuments.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">No hay documentos remediales que coincidan con los filtros</div>
                  ) : (
                    filteredRemedialDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        tabIndex={0}
                        onClick={() => openDocumentPreview(doc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDocumentPreview(doc);
                          }
                        }}
                        className="cursor-pointer p-3 border border-border/70 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.documento}</p>
                            <p className="text-xs text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                              {doc.grupo !== "-" && <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>}
                              {doc.cuatrimestre !== "-" && <Badge variant="outline" className="text-xs">Cuatrimestre {doc.cuatrimestre}</Badge>}
                              <Badge variant="outline" className="text-xs">{doc.tipo.replaceAll("-", " ")}</Badge>
                            </div>
                          </div>
                          <ResponsiveActionButton
                            variant="outline"
                            size="sm"
                            label="Ver PDF"
                            title="Ver documento"
                            className="shrink-0"
                            onClick={(e) => { e.stopPropagation(); openDocumentPreview(doc); }}
                            icon={<FileText className="h-4 w-4" />}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : selectedDocumentType === "estadias" ? (
              <>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 py-4 border-b">
                  <Select value={filterEstadiasPlan} onValueChange={(v) => { setFilterEstadiasPlan(v); setFilterEstadiasCarrera("all"); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los planes</SelectItem>
                      {tutorPlansAvailable.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterEstadiasCarrera} onValueChange={setFilterEstadiasCarrera}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Carrera" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las carreras</SelectItem>
                      {tutorCarrerasAvailable.map((carrera) => <SelectItem key={carrera.value} value={carrera.value}>{carrera.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterEstadiasGrupo} onValueChange={setFilterEstadiasGrupo}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Grupo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los grupos</SelectItem>
                      {Array.from(new Set(estadiasDocuments.map((document) => document.grupo).filter((value): value is string => Boolean(value) && value !== "-"))).map((grupo) => <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterEstadiasDocente} onValueChange={setFilterEstadiasDocente}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Docente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los docentes</SelectItem>
                      {Array.from(new Set(estadiasDocuments.map((document) => document.docente))).map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-4 pb-4 max-h-[52vh] overflow-y-auto pr-1">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {filteredEstadiasDocuments.length} de {totalSelectedEstadiasCategory} documentos.
                  </p>
                  {filteredEstadiasDocuments.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">No hay documentos de estadías que coincidan con los filtros</div>
                  ) : (
                    filteredEstadiasDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        tabIndex={0}
                        onClick={() => openDocumentPreview(doc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDocumentPreview(doc);
                          }
                        }}
                        className="cursor-pointer p-3 border border-border/70 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.documento}</p>
                            <p className="text-xs text-muted-foreground">{doc.docente} • {doc.carrera}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                              {doc.grupo !== "-" && <Badge variant="outline" className="text-xs">Grupo {doc.grupo}</Badge>}
                              <Badge variant="outline" className="text-xs">{estadiasDocumentTitles[doc.tipo]}</Badge>
                            </div>
                          </div>
                          <ResponsiveActionButton
                            variant="outline"
                            size="sm"
                            label="Ver PDF"
                            title="Ver documento"
                            className="shrink-0"
                            onClick={(e) => { e.stopPropagation(); openDocumentPreview(doc); }}
                            icon={<FileText className="h-4 w-4" />}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 py-4 border-b">
                  <Select value={filterTutorPlan} onValueChange={(v) => { setFilterTutorPlan(v); setFilterTutorCarrera("all"); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los planes</SelectItem>
                      {tutorPlansAvailable.map((plan) => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterTutorCarrera} onValueChange={setFilterTutorCarrera}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Carrera" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las carreras</SelectItem>
                      {tutorCarrerasAvailable.map((carrera) => <SelectItem key={carrera.value} value={carrera.value}>{carrera.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterTutorCuatrimestre} onValueChange={setFilterTutorCuatrimestre}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cuatrimestre" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cuatrimestres</SelectItem>
                      {tutorCuatrimestresAvailable.map((cuatrimestre) => <SelectItem key={cuatrimestre} value={cuatrimestre}>{cuatrimestre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterTutorDocente} onValueChange={setFilterTutorDocente}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Docente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los docentes</SelectItem>
                      {tutorDocentesAvailable.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterTutorParcial} onValueChange={setFilterTutorParcial}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Parcial" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los parciales</SelectItem>
                      {tutorParcialesAvailable.map((parcial) => <SelectItem key={parcial.value} value={parcial.value}>{parcial.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-4 pb-4 max-h-[52vh] overflow-y-auto pr-1">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {filteredTutorDocuments.length} de {totalSelectedTutorCategory} documentos.
                  </p>
                  {filteredTutorDocuments.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">No hay documentos de tutores</div>
                  ) : (
                    filteredTutorDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        tabIndex={0}
                        onClick={() => openDocumentPreview(doc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDocumentPreview(doc);
                          }
                        }}
                        className="cursor-pointer p-3 border border-border/70 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{doc.documento}</p>
                            <p className="text-xs text-muted-foreground">{doc.docente}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {doc.cuatrimestre && <Badge variant="outline" className="text-xs">Q{doc.cuatrimestre}</Badge>}
                              {doc.grupo && <Badge variant="outline" className="text-xs">{doc.grupo}</Badge>}
                              {doc.parcial && doc.parcial !== "-" && <Badge variant="outline" className="text-xs">{doc.parcial}</Badge>}
                              <Badge variant="outline" className="text-xs">{doc.tipo.replaceAll("-", " ")}</Badge>
                            </div>
                          </div>
                          <ResponsiveActionButton
                            variant="outline"
                            size="sm"
                            label="Ver PDF"
                            title="Ver documento"
                            className="shrink-0"
                            onClick={(e) => { e.stopPropagation(); openDocumentPreview(doc); }}
                            icon={<FileText className="h-4 w-4" />}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={closeDocumentsModal}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        open={Boolean(previewDocument)}
        document={previewDocument}
        onOpenChange={(open) => {
          if (!open) {
            closeDocumentPreview();
          }
        }}
        previewLoading={previewLoading}
        previewError={previewError}
        previewBlobUrl={previewBlobUrl}
      />

      <Dialog open={confirmDialog.open} onOpenChange={(open) => { if (!open) setConfirmDialog({ open: false }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.type === "close" ? "Cerrar Ciclo" : "Activar Ciclo"}</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de {confirmDialog.type === "close" ? "cerrar" : "activar"} el ciclo <strong>{confirmDialog.ciclo?.nombre}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false })}>Cancelar</Button>
            <Button variant="destructive" onClick={performConfirm}>{confirmDialog.type === "close" ? "Cerrar Ciclo" : "Activar Ciclo"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CiclosEscolares;
