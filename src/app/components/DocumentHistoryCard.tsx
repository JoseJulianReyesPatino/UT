import React, { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, Clock2, Undo2, Eye, PencilLine, Trash2, StickyNote, RefreshCw, UploadCloud } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface DocumentHistoryCardProps {
  documents: Array<{ id: number; fileName: string; status?: string; returnedComment?: string }>;
  plan?: string;
  carrera?: string;
  cuatrimestre?: string;
  subject?: string;
  parcial?: string;
  grupo?: string;
  docente?: string;
  nota?: string;
  submittedAt: string;
  status?: string;
  returnedComment?: string;
  onViewDocument: (documentId: number) => void;
  onEdit: () => void;
  onDelete: (documentIds: number[]) => Promise<void>;
  onResubmit?: (docId: number, fileName: string, returnedComment?: string) => void;
  isDeleting?: boolean;
}

function getStatusInfo(status?: string) {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (normalized === "revisado") {
    return { text: "Revisado", variant: "success", Icon: CheckCircle2 };
  }

  if (normalized === "devuelto") {
    return { text: "Devuelto", variant: "destructive", Icon: Undo2 };
  }

  if (normalized === "reenviado") {
    return { text: "Reenviado", variant: "secondary", Icon: RefreshCw };
  }

  return { text: "Pendiente", variant: "warning", Icon: Clock2 };
}

function InfoChip({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 dark:border-slate-800/60 dark:bg-slate-900/40 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2">
      <div className="min-w-0 w-full">
        <p className="text-[9px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 sm:text-[11px]">
          {label}
        </p>
        <p className="text-xs font-medium leading-snug text-foreground break-words dark:text-slate-100 sm:text-sm">
          {value}
        </p>
      </div>
    </div>
  );
}

const devueltoDocForCard = (documents: Array<{ id: number; fileName: string; status?: string; returnedComment?: string }>) =>
  documents.find((d) => String(d.status ?? "").toLowerCase() === "devuelto");

export function DocumentHistoryCard({
  documents,
  plan,
  carrera,
  cuatrimestre,
  subject,
  parcial,
  grupo,
  docente,
  nota,
  submittedAt,
  status,
  returnedComment,
  onViewDocument,
  onEdit,
  onDelete,
  onResubmit,
  isDeleting = false,
}: DocumentHistoryCardProps) {
  const [openMotivo, setOpenMotivo] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);
  const { text, variant, Icon } = getStatusInfo(status);
  const isDevuelto = String(status ?? "").trim().toLowerCase() === "devuelto";
  const devueltoDoc = devueltoDocForCard(documents);

  // Solo permite editar si todos los documentos están pendientes (ninguno ha sido procesado por el admin)
  const canEdit = documents.every((d) => {
    const s = String(d.status ?? "").trim().toLowerCase();
    return !s || s === "pendiente";
  });

  const planLabel = plan
    ? (String(plan).toLowerCase().includes("nuevo") ? "Plan Nuevo Modelo" : "Plan Normal")
    : undefined;

  const handleDelete = async () => {
    if (isDeletingLocal || isDeleting) return;
    
    setIsDeletingLocal(true);
    try {
      const documentIds = documents.map(d => d.id);
      await onDelete(documentIds);
      setOpenDeleteDialog(false);
    } catch (error) {
      console.error("Error al eliminar documentos", error);
    } finally {
      setIsDeletingLocal(false);
    }
  };

  const isLoading = isDeletingLocal || isDeleting;

  return (
    <>
      <div className="group rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary dark:border-slate-800/70 dark:bg-slate-900/30 dark:hover:border-emerald-500/40 sm:rounded-2xl sm:p-5">
        <div className="flex flex-col gap-2.5 sm:gap-4">
          {/* Fila 1: Fecha y Badge de estado */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground dark:text-slate-500 sm:text-xs">{submittedAt}</span>
            <Badge variant={variant} className="inline-flex shrink-0 items-center gap-1 px-2 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-xs">
              <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {text}
            </Badge>
          </div>

          {/* Fila 2: Lista de archivos del envío */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-slate-500 sm:text-[11px]">
              {documents.length > 1 ? `${documents.length} documentos enviados` : "Documento"}
            </p>
            <div className="space-y-1">
              {documents.map((doc) => {
                const docStatus = String(doc.status ?? "").toLowerCase();
                const isDocDevuelto = docStatus === "devuelto";
                const isDocRevisado = docStatus === "revisado";
                const isDocReenviado = docStatus === "reenviado";
                return (
                  <div key={doc.id} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewDocument(doc.id)}
                      className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                        isDocDevuelto
                          ? "border-red-200/60 bg-red-50/30 hover:bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                          : isDocRevisado
                          ? "border-emerald-200/60 bg-emerald-50/20 hover:bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20"
                          : "border-border/50 bg-muted/20 hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-slate-800/50 dark:hover:border-emerald-500/30 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <span className="truncate text-xs font-semibold text-foreground dark:text-white sm:text-sm">{doc.fileName}</span>
                      <div className="ml-1 flex shrink-0 items-center gap-1.5">
                        {isDocDevuelto && <Undo2 className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />}
                        {isDocRevisado && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                        {isDocReenviado && <RefreshCw className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />}
                        <Eye className="h-3.5 w-3.5 text-muted-foreground dark:text-slate-500" />
                      </div>
                    </button>
                    {isDocDevuelto && onResubmit && (
                      <button
                        type="button"
                        onClick={() => onResubmit(doc.id, doc.fileName, doc.returnedComment)}
                        className="group/btn shrink-0 flex items-center gap-1.5 rounded-lg border-2 border-emerald-500 bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold leading-none text-white shadow-sm transition-all hover:border-emerald-600 hover:bg-emerald-600 hover:shadow-emerald-500/30 hover:shadow-md active:scale-95 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:border-emerald-400 dark:hover:bg-emerald-500"
                      >
                        <UploadCloud className="h-3.5 w-3.5 transition-transform group-hover/btn:-translate-y-0.5" />
                        Subir archivo
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fila 3: Grid de información en chips - SIN ICONOS */}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
            <InfoChip label="Plan" value={planLabel} />
            <InfoChip label="Carrera" value={carrera} />
            <InfoChip label="Materia" value={subject} />
            <InfoChip label="Grupo" value={grupo} />
            <InfoChip label="Cuatrimestre" value={cuatrimestre} />
            <InfoChip label="Parcial" value={parcial} />
          </div>

          {/* Fila 4: Nota, si existe */}
          {nota ? (
            <div className="flex items-start gap-1.5 rounded-lg border border-amber-200/70 bg-amber-50/60 px-2.5 py-1.5 dark:border-amber-900/40 dark:bg-amber-950/20 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2">
              <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-amber-700 dark:text-amber-400 sm:h-3.5 sm:w-3.5" />
              <div className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400 sm:text-[11px]">
                  Nota para administración
                </p>
                <p className="text-xs text-amber-900 break-words whitespace-pre-wrap dark:text-amber-100 sm:text-sm">
                  {nota}
                </p>
              </div>
            </div>
          ) : null}

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            {canEdit ? (
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none sm:min-w-[5.5rem]"
                onClick={onEdit}
                disabled={isLoading}
                title="Editar"
              >
                <PencilLine className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 sm:flex-none sm:min-w-[5.5rem]"
                    onClick={onEdit}
                    disabled={isLoading}
                    title="Editar"
                  >
                    <PencilLine className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] text-center text-xs">
                  Solo podrás actualizar los datos del formulario (plan, carrera, materia, etc.). Los archivos no se pueden cambiar.
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 sm:flex-none sm:min-w-[5.5rem]"
              onClick={() => setOpenDeleteDialog(true)}
              disabled={isLoading}
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{isLoading ? "Eliminando..." : "Eliminar"}</span>
            </Button>
            {isDevuelto && returnedComment ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none sm:min-w-[5.5rem]"
                onClick={() => setOpenMotivo(true)}
                disabled={isLoading}
                title="Ver motivo de devolución"
              >
                <StickyNote className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Motivo</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent className="dark:border-slate-800/70 dark:bg-slate-950/90 dark:backdrop-blur-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              ¿Eliminar {documents.length > 1 ? `${documents.length} documentos` : "documento"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              {documents.length > 1 
                ? `Se eliminarán ${documents.length} documentos de la base de datos. Esta acción no se puede deshacer.`
                : `Se eliminará "${documents[0]?.fileName}" de la base de datos. Esta acción no se puede deshacer.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              disabled={isLoading}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {isLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Motivo */}
      <Dialog open={openMotivo} onOpenChange={setOpenMotivo}>
        <DialogContent className="max-w-md dark:border-slate-800/70 dark:bg-slate-950/90 dark:backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Motivo de devolución</DialogTitle>
            {devueltoDoc && (
              <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground dark:text-slate-400">
                {devueltoDoc.fileName}
              </p>
            )}
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
            <p className="text-sm text-foreground whitespace-pre-wrap break-words dark:text-slate-200">
              {returnedComment}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}