import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Calendar, Check, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

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
  fechaInicio: string;
  fechaFin: string;
  status: CycleStatus;
};

type DocumentRecord = {
  id: number;
  ciclo: string;
  documento: string;
  docente: string;
  carrera: string;
};

const initialCycles: AcademicCycle[] = [
  {
    id: 1,
    nombre: "Cuatrimestre Enero-Abril 2026",
    anio: 2026,
    periodo: "Enero-Abril",
    fechaInicio: "2026-01-13",
    fechaFin: "2026-04-30",
    status: "activo",
  },
  {
    id: 2,
    nombre: "Cuatrimestre Septiembre-Diciembre 2025",
    anio: 2025,
    periodo: "Septiembre-Diciembre",
    fechaInicio: "2025-09-01",
    fechaFin: "2025-12-20",
    status: "cerrado",
  },
  {
    id: 3,
    nombre: "Cuatrimestre Mayo-Agosto 2025",
    anio: 2025,
    periodo: "Mayo-Agosto",
    fechaInicio: "2025-05-01",
    fechaFin: "2025-08-31",
    status: "cerrado",
  },
];

const initialDocuments: DocumentRecord[] = [
  { id: 1, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Planeación - Programación Web", docente: "Mtro. Juan Pérez", carrera: "Ingeniería en Sistemas" },
  { id: 2, ciclo: "Cuatrimestre Enero-Abril 2026", documento: "Instrumento 60% - Programación Web", docente: "Dra. María González", carrera: "Ingeniería en Sistemas" },
  { id: 3, ciclo: "Cuatrimestre Septiembre-Diciembre 2025", documento: "Lista Concentrada - Redes", docente: "Mtro. Carlos López", carrera: "Ingeniería en Redes" },
  { id: 4, ciclo: "Cuatrimestre Mayo-Agosto 2025", documento: "Instrumento 30% - Redes", docente: "Mtro. Carlos López", carrera: "Ingeniería en Redes" },
];

export function CiclosEscolares() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDocsDialog, setShowDocsDialog] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<AcademicCycle | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type?: "close" | "activate"; ciclo?: AcademicCycle }>({ open: false });
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [newCycleForm, setNewCycleForm] = useState<CycleFormState>({
    nombre: "",
    anio: "2026",
    periodo: "",
    fechaInicio: "",
    fechaFin: "",
    status: "activo",
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

  const cycleDocumentCount = useMemo(
    () => (cycleName: string) => documents.filter((document) => document.ciclo === cycleName).length,
    [documents]
  );

  const openDocsForCycle = (ciclo: AcademicCycle) => {
    setSelectedCycle(ciclo);
    setShowDocsDialog(true);
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

  const createCycle = () => {
    if (!newCycleForm.nombre.trim() || !newCycleForm.periodo.trim() || !newCycleForm.fechaInicio || !newCycleForm.fechaFin) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const anio = Number(newCycleForm.anio);
    if (Number.isNaN(anio)) {
      toast.error("El año debe ser numérico");
      return;
    }

    const newCycle: AcademicCycle = {
      id: Date.now(),
      nombre: newCycleForm.nombre.trim(),
      anio,
      periodo: newCycleForm.periodo.trim(),
      fechaInicio: newCycleForm.fechaInicio,
      fechaFin: newCycleForm.fechaFin,
      status: newCycleForm.status,
    };

    setCiclos((current) => [newCycle, ...current]);
    toast.success("Ciclo escolar creado correctamente");
    setNewCycleForm({ nombre: "", anio: "2026", periodo: "", fechaInicio: "", fechaFin: "", status: "activo" });
    setShowNewDialog(false);
  };

  const updateCycle = () => {
    if (!selectedCycle) return;

    if (!editCycleForm.nombre.trim() || !editCycleForm.periodo.trim() || !editCycleForm.fechaInicio || !editCycleForm.fechaFin) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const anio = Number(editCycleForm.anio);
    if (Number.isNaN(anio)) {
      toast.error("El año debe ser numérico");
      return;
    }

    const previousName = selectedCycle.nombre;
    const updatedName = editCycleForm.nombre.trim();

    setCiclos((current) =>
      current.map((cycle) =>
        cycle.id === selectedCycle.id
          ? {
              ...cycle,
              nombre: updatedName,
              anio,
              periodo: editCycleForm.periodo.trim(),
              fechaInicio: editCycleForm.fechaInicio,
              fechaFin: editCycleForm.fechaFin,
              status: editCycleForm.status,
            }
          : cycle
      )
    );

    setDocuments((current) => current.map((document) => (document.ciclo === previousName ? { ...document, ciclo: updatedName } : document)));
    toast.success("Ciclo escolar actualizado correctamente");
    setShowEditDialog(false);
  };

  const deleteCycle = () => {
    if (!selectedCycle) return;

    if (deleteConfirmationName.trim() !== selectedCycle.nombre) {
      toast.error("Escribe exactamente el nombre del ciclo para eliminarlo");
      return;
    }

    setCiclos((current) => current.filter((cycle) => cycle.id !== selectedCycle.id));
    setDocuments((current) => current.filter((document) => document.ciclo !== selectedCycle.nombre));
    toast.success(`Ciclo ${selectedCycle.nombre} eliminado correctamente`);
    setShowDeleteDialog(false);
    setSelectedCycle(null);
    setDeleteConfirmationName("");
  };

  const performConfirm = () => {
    if (!confirmDialog.ciclo || !confirmDialog.type) return;

    const ciclo = confirmDialog.ciclo;
    if (confirmDialog.type === "close") {
      setCiclos((current) => current.map((cycle) => (cycle.id === ciclo.id ? { ...cycle, status: "cerrado" } : cycle)));
      toast.success(`Ciclo ${ciclo.nombre} cerrado correctamente`);
    } else {
      setCiclos((current) => current.map((cycle) => (cycle.id === ciclo.id ? { ...cycle, status: "activo" } : cycle)));
      toast.success(`Ciclo ${ciclo.nombre} activado correctamente`);
    }
    setConfirmDialog({ open: false });
  };

  const closeDocs = () => {
    setShowDocsDialog(false);
    setSelectedCycle(null);
  };

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
          <h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-cyan-300">Ciclos Escolares</h1>
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
              className="overflow-hidden cursor-pointer border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/50 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/15 dark:to-cyan-950/20"
              tabIndex={0}
              onClick={() => openDocsForCycle(ciclo)}
              onKeyDown={(e) => {
                if ((e as React.KeyboardEvent).key === "Enter") openDocsForCycle(ciclo);
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{ciclo.nombre}</CardTitle>
                      <Badge variant={ciclo.status === "activo" ? "success" : "outline"}>{ciclo.status === "activo" ? "Activo" : "Cerrado"}</Badge>
                    </div>
                    <CardDescription>
                      {ciclo.fechaInicio} — {ciclo.fechaFin}
                    </CardDescription>
                  </div>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-6 text-sm">
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
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openDocsForCycle(ciclo); }}>
                      Ver Documentos
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditDialog(ciclo); }}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openDeleteDialog(ciclo); }}>
                      <Lock className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                    {ciclo.status === "activo" ? (
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); confirmAction("close", ciclo); }}>
                        <X className="h-4 w-4 mr-1" />
                        Cerrar Ciclo
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); confirmAction("activate", ciclo); }}>
                        <Check className="h-4 w-4 mr-1" />
                        Activar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-cyan-50/40 dark:border-emerald-900/50 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950/20">
          <DialogHeader>
            <DialogTitle>Nuevo Ciclo Escolar</DialogTitle>
            <DialogDescription>Crea un nuevo período académico en el sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Ciclo</Label>
              <Input
                placeholder="Cuatrimestre Mayo-Agosto 2026"
                value={newCycleForm.nombre}
                onChange={(e) => setNewCycleForm((current) => ({ ...current, nombre: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Año</Label>
                <Input type="number" value={newCycleForm.anio} onChange={(e) => setNewCycleForm((current) => ({ ...current, anio: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Input placeholder="Mayo-Agosto" value={newCycleForm.periodo} onChange={(e) => setNewCycleForm((current) => ({ ...current, periodo: e.target.value }))} />
              </div>
            </div>
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
        <DialogContent className="border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-cyan-50/40 dark:border-emerald-900/50 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950/20">
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
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
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

      <Dialog open={showDocsDialog} onOpenChange={(open) => { if (!open) closeDocs(); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Documentos - {selectedCycle?.nombre}</DialogTitle>
            <DialogDescription>Documentos asociados al ciclo seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCycle && (
              <div className="space-y-3">
                {documents.filter((document) => document.ciclo === selectedCycle.nombre).map((document) => (
                  <div key={document.id} className="rounded-xl border border-border/70 bg-background/80 p-4 flex items-center justify-between shadow-sm dark:bg-slate-950/60">
                    <div>
                      <p className="font-medium text-foreground">{document.documento}</p>
                      <p className="text-sm text-muted-foreground">{document.docente} • {document.carrera}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => toast("Abrir PDF - simulación")}>Ver PDF</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
