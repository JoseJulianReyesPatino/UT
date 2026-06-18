import React, { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, Clock2, Undo2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface DocumentHistoryCardProps {
  title: string;
  fileName: string;
  carrera?: string;
  subject?: string;
  submittedAt: string;
  status?: string;
  returnedComment?: string;
  onView: () => void;
  onEdit: () => void;
}

function getStatusInfo(status?: string) {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (normalized === "revisado") {
    return { text: "Revisado", variant: "success", Icon: CheckCircle2 };
  }

  if (normalized === "devuelto") {
    return { text: "Devuelto", variant: "destructive", Icon: Undo2 };
  }

  return { text: "Pendiente", variant: "warning", Icon: Clock2 };
}

export function DocumentHistoryCard({
  title,
  fileName,
  carrera,
  subject,
  submittedAt,
  status,
  returnedComment,
  onView,
  onEdit,
}: DocumentHistoryCardProps) {
  const [openMotivo, setOpenMotivo] = useState(false);
  const { text, variant, Icon } = getStatusInfo(status);
  const isDevuelto = String(status ?? "").trim().toLowerCase() === "devuelto";

  return (
    <>
      <div className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary sm:p-5">
        <div className="flex flex-col gap-4">
          {/* Fila 1: Fecha y Badge */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{submittedAt}</span>
            <Badge variant={variant} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs">
              <Icon className="h-3.5 w-3.5" />
              {text}
            </Badge>
          </div>

          {/* Fila 2: Título principal (nombre del PDF) */}
          <div>
            <p className="text-base font-semibold text-foreground break-words">
              {fileName}
            </p>
          </div>

          {/* Fila 3: Carrera */}
          {carrera ? (
            <div>
              <p className="text-sm text-foreground break-words">
                Carrera: {carrera}
              </p>
            </div>
          ) : null}

          {/* Fila 4: Materia */}
          {subject ? (
            <div>
              <p className="text-sm text-muted-foreground break-words">
                Materia: {subject}
              </p>
            </div>
          ) : null}

          {/* Botones */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="min-w-[5.5rem]" onClick={onView}>
              Ver
            </Button>
            <Button size="sm" variant="secondary" className="min-w-[5.5rem]" onClick={onEdit}>
              Editar
            </Button>
            {isDevuelto && returnedComment ? (
              <Button
                size="sm"
                variant="outline"
                className="min-w-[5.5rem]"
                onClick={() => setOpenMotivo(true)}
              >
                Motivo
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Diálogo de Motivo */}
      <Dialog open={openMotivo} onOpenChange={setOpenMotivo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Motivo de devolución</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {returnedComment}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
