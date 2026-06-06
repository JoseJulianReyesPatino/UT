import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Calendar, Check, ChevronLeft, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "../../components/ui/scroll-area";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { apiFetch } from "../../lib/api";

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
  tipo: "planeacion" | "instrumento-30" | "instrumento-40" | "instrumento-60" | "instrumento-70" | "instrumento-30-40" | "instrumento-60-70" | "lista-concentrada" | "asesoria" | "portafolio" | "acta-final";
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
};

type TutorDocumentType = TutorDocumentRecord["tipo"];

const tutorDocumentTitles: Record<TutorDocumentType, string> = {
  "carga-academica": "Carga académica",
  "reporte-bajas": "Reporte de bajas",
  "concentrado-asesorias": "Concentrado de asesorías y bajas",
  "acta-asistencia": "Acta de asistencia grupal",
  "ficha-tecnica": "Ficha técnica",
};

const getDocumentsModalTitle = (selectedDocumentType: "docentes" | "tutores" | null, selectedDocumentCategory: DocumentRecord["tipo"] | null, selectedTutorCategory: TutorDocumentType | null) => {
  if (selectedDocumentType === "docentes") {
    let title = "Documentos de Docentes";
    if (selectedDocumentCategory) {
      title = `${title} - ${selectedDocumentCategory}`;
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
  document: DocumentRecord | TutorDocumentRecord | null;
  onOpenChange: (open: boolean) => void;
  onOpenPdf: () => void;
};

function DocumentPreviewDialog({ open, document, onOpenChange, onOpenPdf }: Readonly<DocumentPreviewDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vista previa del documento</DialogTitle>
          <DialogDescription>
            Simulación de lectura del archivo PDF del documento seleccionado.
          </DialogDescription>
        </DialogHeader>
        {document && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{document.ciclo}</Badge>
              {"plan" in document && <Badge variant="outline">{document.plan}</Badge>}
              {"tipo" in document && <Badge variant="outline">{document.tipo.replaceAll("-", " ")}</Badge>}
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4 md:p-6">
              <div className="mx-auto flex min-h-[70vh] w-full max-w-[1100px] flex-col justify-between rounded-lg border border-border bg-background p-6 md:p-10 shadow-sm">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Documento PDF</p>
                    <h3 className="mt-2 text-2xl font-semibold md:text-3xl">{document.documento}</h3>
                    <p className="text-base text-muted-foreground">{document.docente}</p>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-2 md:gap-4">
                    <p><span className="font-medium">Ciclo:</span> {document.ciclo}</p>
                    <p><span className="font-medium">Carrera:</span> {"carrera" in document ? document.carrera : "N/D"}</p>
                    <p><span className="font-medium">Plan:</span> {"plan" in document ? document.plan : "N/D"}</p>
                    <p><span className="font-medium">Tipo:</span> {"tipo" in document ? document.tipo.replaceAll("-", " ") : "N/D"}</p>
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
          <Button variant="outline" onClick={onOpenPdf}>Abrir PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const initialCycles: AcademicCycle[] = [];

const initialDocuments: DocumentRecord[] = [
  { id: 1, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Planeación - Programación Web", docente: "Mtro. Juan Pérez", carrera: "Ingeniería en Sistemas", plan: "Plan Nuevo Modelo", cuatrimestre: "5", materia: "Programación Web", parcial: "Parcial 1", grupo: "ITIID-8", tipo: "planeacion" },
  { id: 2, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Instrumento 60% - Programación Web", docente: "Dra. María González", carrera: "Ingeniería en Sistemas", plan: "Plan Nuevo Modelo", cuatrimestre: "8", materia: "Programación Web", parcial: "Parcial 2", grupo: "ITIID-8", tipo: "instrumento-60" },
  { id: 3, ciclo: "Cuatrimestre Septiembre-Diciembre 2025", documento: "Lista Concentrada - Redes", docente: "Mtro. Carlos López", carrera: "Ingeniería en Redes", plan: "Plan Normal", cuatrimestre: "9", materia: "Redes de Computadoras", parcial: "Parcial 1", grupo: "ILI-9", tipo: "lista-concentrada" },
  { id: 4, ciclo: "Cuatrimestre Mayo-Agosto 2025", documento: "Instrumento 30% - Redes", docente: "Mtro. Carlos López", carrera: "Ingeniería en Redes", plan: "Plan Normal", cuatrimestre: "7", materia: "Infraestructura", parcial: "Parcial 3", grupo: "IME-7", tipo: "instrumento-30" },
  { id: 5, ciclo: "Cuatrimestre Mayo-Agosto 2025", documento: "Instrumento 40% - Bases", docente: "Dra. Ana Martínez", carrera: "TSU Desarrollo Software", plan: "Plan Nuevo Modelo", cuatrimestre: "4", materia: "Bases de Datos", parcial: "Parcial 2", grupo: "DSM-4", tipo: "instrumento-40" },
  { id: 6, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Asesoría - Métodos de Investigación", docente: "Dra. Ana Martínez", carrera: "TSU Desarrollo Software", plan: "Plan Nuevo Modelo", cuatrimestre: "3", materia: "Métodos de Investigación", parcial: "Parcial 1", grupo: "DSM-3", tipo: "asesoria" },
  { id: 7, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Instrumento 70% - Redes", docente: "Mtro. Juan Pérez", carrera: "Ingeniería en Redes", plan: "Plan Normal", cuatrimestre: "8", materia: "Redes de Computadoras", parcial: "Parcial 3", grupo: "IRE-8", tipo: "instrumento-70" },
  { id: 8, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Portafolio Digital - Programación", docente: "Mtro. Roberto Silva", carrera: "TSU Automatización", plan: "Plan Nuevo Modelo", cuatrimestre: "5", materia: "Programación Estructurada", parcial: "Final", grupo: "AUT-5", tipo: "portafolio" },
];

const initialTutorDocuments: TutorDocumentRecord[] = [
  { id: 101, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Carga Académica Q1 2026", docente: "Mtro. Juan Pérez", tipo: "carga-academica", cuatrimestre: "1", grupo: "A", parcial: "Parcial 1" },
  { id: 102, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Reporte de Bajas Enero 2026", docente: "Dra. María González", tipo: "reporte-bajas", cuatrimestre: "1", grupo: "B", parcial: "Parcial 1" },
  { id: 103, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Concentrado Asesorías y Bajas", docente: "Mtro. Carlos López", tipo: "concentrado-asesorias", cuatrimestre: "1", grupo: "C", parcial: "Parcial 2" },
  { id: 104, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Acta Asistencia Grupal - Turno Matutino", docente: "Dra. Ana Martínez", tipo: "acta-asistencia", cuatrimestre: "1", grupo: "A", parcial: "Parcial 1" },
  { id: 105, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Ficha Técnica Tutoría Virtual", docente: "Mtro. Roberto Silva", tipo: "ficha-tecnica", cuatrimestre: "1", grupo: "D", parcial: "Final" },
];

export function CiclosEscolares() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDocTypeDialog, setShowDocTypeDialog] = useState(false);
  const [showDocumentTypeSelector, setShowDocumentTypeSelector] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<AcademicCycle | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<"docentes" | "tutores" | null>(null);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState<DocumentRecord["tipo"] | null>(null);
  const [selectedTutorCategory, setSelectedTutorCategory] = useState<TutorDocumentType | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | TutorDocumentRecord | null>(null);
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
  const [tutorDocuments] = useState<TutorDocumentRecord[]>(initialTutorDocuments);

  useEffect(() => {
    let cancelled = false;

    const loadCycles = async () => {
      try {
        const response = await apiFetch("/cycles", { method: "GET" });
        if (cancelled) return;
        setCiclos(response.data.map(mapApiCycle));
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
  const [filterTutorDocente, setFilterTutorDocente] = useState("all");

  const cycleDocumentCount = useMemo(
    () => (cycleName: string) => documents.filter((document) => document.ciclo === cycleName).length + tutorDocuments.filter((document) => document.ciclo === cycleName).length,
    [documents, tutorDocuments]
  );

  const getActiveCycle = () => ciclos.find((cycle) => cycle.status === "activo");

  const openDocsForCycle = (ciclo: AcademicCycle) => {
    setSelectedCycle(ciclo);
    setSelectedDocumentType(null);
    setSelectedDocumentCategory(null);
    setSelectedTutorCategory(null);
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
    setSelectedTutorCategory(null);
    setSelectedCycle(null);
  };

  const handleSelectDocType = (type: "docentes" | "tutores") => {
    setSelectedDocumentType(type);
    setShowDocTypeDialog(false);
    if (type === "docentes") {
      setShowDocumentTypeSelector(true);
      return;
    }

    setSelectedTutorCategory(null);
    setShowDocumentTypeSelector(true);
  };

  const handleSelectDocumentCategory = (category: DocumentRecord["tipo"]) => {
    setSelectedDocumentCategory(category);
    setShowDocumentTypeSelector(false);
    setShowDocumentsModal(true);
    setFilterPlan("all");
    setFilterCarrera("all");
    setFilterCuatrimestre("all");
  };

  const handleSelectTutorCategory = (category: TutorDocumentType) => {
    setSelectedTutorCategory(category);
    setShowDocumentTypeSelector(false);
    setShowDocumentsModal(true);
    setFilterTutorDocente("all");
  };

  const closeDocumentsModal = () => {
    setShowDocumentsModal(false);
    setSelectedDocumentType(null);
    setSelectedDocumentCategory(null);
  };

  const openDocumentPreview = (document: DocumentRecord | TutorDocumentRecord) => {
    setPreviewDocument(document);
  };

  const closeDocumentPreview = () => {
    setPreviewDocument(null);
  };

  const plansAvailable = Array.from(new Set(documents.map((document) => document.plan)));
  const carrerasAvailable = Array.from(new Set(documents.map((document) => document.carrera)));
  const cuatrimestresAvailable = useMemo(() => {
    if (filterPlan === "Plan Normal") {
      return ["6", "11"];
    }
    if (filterPlan === "Plan Nuevo Modelo") {
      return ["6", "10"];
    }
    return ["6", "10", "11"];
  }, [filterPlan]);
  const tutorDocentesAvailable = Array.from(new Set(tutorDocuments.map((document) => document.docente)));

  React.useEffect(() => {
    if (filterCuatrimestre !== "all" && !cuatrimestresAvailable.includes(filterCuatrimestre)) {
      setFilterCuatrimestre("all");
    }
  }, [filterCuatrimestre, cuatrimestresAvailable]);

  const filteredDocuments = useMemo(
    () => documents.filter((document) => (
      (filterPlan === "all" || document.plan === filterPlan)
      && (filterCarrera === "all" || document.carrera === filterCarrera)
      && (filterCuatrimestre === "all" || document.cuatrimestre === filterCuatrimestre)
    )),
    [documents, filterPlan, filterCarrera, filterCuatrimestre]
  );

  const filteredTutorDocuments = useMemo(
    () => tutorDocuments.filter((document) => (
      (selectedTutorCategory === null || document.tipo === selectedTutorCategory)
      && (filterTutorDocente === "all" || document.docente === filterTutorDocente)
    )),
    [tutorDocuments, selectedTutorCategory, filterTutorDocente]
  );

  const documentsModalTitle = getDocumentsModalTitle(selectedDocumentType, selectedDocumentCategory, selectedTutorCategory);

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 right-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute top-28 left-6 h-px w-36 rotate-12 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute bottom-16 right-24 h-2 w-2 rounded-full bg-emerald-500/40" />
        <div className="absolute top-36 left-1/2 grid grid-cols-4 gap-2 opacity-30">
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className="h-1.5 w-1.5 rounded-full bg-emerald-400/50" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-emerald-300">Ciclos Escolares</h1>
          <p className="text-muted-foreground">Administra los períodos académicos del sistema</p>
        </div>
        <Button variant="success" onClick={() => setShowNewDialog(true)} className="shadow-md shadow-emerald-500/20">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ciclo
        </Button>
      </div>

      <div className="grid gap-4">
        {ciclos.map((ciclo) => {
          const documentsCount = cycleDocumentCount(ciclo.nombre);

          return (
            <Card
              key={ciclo.id}
              className="overflow-hidden cursor-pointer border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-emerald-50/50 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/15 dark:to-emerald-950/20"
              tabIndex={0}
              onClick={() => openDocsForCycle(ciclo)}
              onKeyDown={(e) => {
                if ((e as React.KeyboardEvent).key === "Enter") openDocsForCycle(ciclo);
              }}
            >
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
              <strong>Documentos asociados:</strong> {selectedCycle ? cycleDocumentCount(selectedCycle.nombre) : 0}
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
            <DialogDescription className="text-base mt-2">¿Qué documentos deseas revisar para {selectedCycle?.nombre}?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 mt-6">
            <Button
              onClick={() => handleSelectDocType("docentes")}
              className="justify-start h-28 text-left flex flex-col items-start p-5 border-2 rounded-lg transition-all hover:shadow-lg"
              variant="outline"
            >
              <FileText className="h-6 w-6 mb-3" />
              <span className="font-semibold text-lg">Documentos Docentes</span>
              <span className="text-sm text-muted-foreground">Planeación, instrumentos, listas, asesorías y más.</span>
            </Button>
            <Button
              onClick={() => handleSelectDocType("tutores")}
              className="justify-start h-28 text-left flex flex-col items-start p-5 border-2 rounded-lg transition-all hover:shadow-lg"
              variant="outline"
            >
              <FileText className="h-6 w-6 mb-3" />
              <span className="font-semibold text-lg">Documentos Tutores</span>
              <span className="text-sm text-muted-foreground">Carga académica, reportes, concentrados y fichas.</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDocumentTypeSelector} onOpenChange={(open) => { if (!open) closeDocs(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3 mb-2">
              <Button
                onClick={() => {
                  setShowDocumentTypeSelector(false);
                  setShowDocTypeDialog(true);
                }}
                variant="ghost"
                size="sm"
                className="h-8 w-auto"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />Atrás
              </Button>
              <DialogTitle className="text-2xl">{selectedDocumentType === "tutores" ? "Seleccionar Tipo de Tutoría" : "Seleccionar Tipo de Documento"}</DialogTitle>
            </div>
            <DialogDescription className="text-base ml-11">{selectedDocumentType === "tutores" ? "Elige el apartado de tutorías que deseas revisar" : "Elige el documento que deseas revisar"}</DialogDescription>
          </DialogHeader>
          {selectedDocumentType === "tutores" ? (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              <Button onClick={() => handleSelectTutorCategory("carga-academica")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Carga académica</Button>
              <Button onClick={() => handleSelectTutorCategory("reporte-bajas")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Reporte de bajas</Button>
              <Button onClick={() => handleSelectTutorCategory("concentrado-asesorias")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Concentrado de asesorías y bajas</Button>
              <Button onClick={() => handleSelectTutorCategory("acta-asistencia")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Acta de asistencia grupal</Button>
              <Button onClick={() => handleSelectTutorCategory("ficha-tecnica")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Ficha técnica</Button>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              <Button onClick={() => handleSelectDocumentCategory("planeacion")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Planeación</Button>
              <Button onClick={() => handleSelectDocumentCategory("instrumento-30")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Instrumento 30%</Button>
              <Button onClick={() => handleSelectDocumentCategory("instrumento-40")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Instrumento 40%</Button>
              <Button onClick={() => handleSelectDocumentCategory("instrumento-60")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Instrumento 60%</Button>
              <Button onClick={() => handleSelectDocumentCategory("instrumento-70")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Instrumento 70%</Button>
              <Button onClick={() => handleSelectDocumentCategory("instrumento-30-40")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Instrumento 30/40% (legacy)</Button>
              <Button onClick={() => handleSelectDocumentCategory("instrumento-60-70")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Instrumento 60/70% (legacy)</Button>
              <Button onClick={() => handleSelectDocumentCategory("lista-concentrada")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Lista Concentrada</Button>
              <Button onClick={() => handleSelectDocumentCategory("asesoria")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Asesoría</Button>
              <Button onClick={() => handleSelectDocumentCategory("portafolio")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Portafolio Digital</Button>
              <Button onClick={() => handleSelectDocumentCategory("acta-final")} className="justify-center h-24 font-semibold border-2 hover:bg-accent" variant="outline">Acta Final</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDocumentsModal} onOpenChange={(open) => { if (!open) closeDocumentsModal(); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3 mb-2">
              <Button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setShowDocumentTypeSelector(true);
                }}
                variant="ghost"
                size="sm"
                className="h-8 w-auto"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />Atrás
              </Button>
              <div>
                <DialogTitle className="text-2xl">{documentsModalTitle}</DialogTitle>
                <DialogDescription className="text-base mt-1">{selectedCycle?.nombre}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {selectedDocumentType === "docentes" ? (
              <>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 py-4 border-b">
                  <Select value={filterPlan} onValueChange={setFilterPlan}>
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
                      {carrerasAvailable.map((carrera) => <SelectItem key={carrera} value={carrera}>{carrera}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterCuatrimestre} onValueChange={setFilterCuatrimestre}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cuatrimestre" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cuatrimestres</SelectItem>
                      {cuatrimestresAvailable.map((cuatrimestre) => <SelectItem key={cuatrimestre} value={cuatrimestre}>{cuatrimestre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-4 pb-4">
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
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">{doc.plan}</Badge>
                              <Badge variant="outline" className="text-xs">Q{doc.cuatrimestre}</Badge>
                              <Badge variant="outline" className="text-xs">{doc.grupo}</Badge>
                              <Badge variant="outline" className="text-xs">{doc.parcial}</Badge>
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
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 py-4 border-b">
                  <Select value={filterTutorDocente} onValueChange={setFilterTutorDocente}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Docente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los docentes</SelectItem>
                      {tutorDocentesAvailable.map((docente) => <SelectItem key={docente} value={docente}>{docente}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-4 pb-4">
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
                              {doc.parcial && <Badge variant="outline" className="text-xs">{doc.parcial}</Badge>}
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
        onOpenPdf={() => toast("Abrir PDF - simulación")}
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
