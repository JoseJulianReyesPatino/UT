import React from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, Clock2, Undo2 } from "lucide-react";

interface DocumentHistoryCardProps {
  title: string;
  fileName: string;
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
  subject,
  submittedAt,
  status,
  returnedComment,
  onView,
  onEdit,
}: DocumentHistoryCardProps) {
  const { text, variant, Icon } = getStatusInfo(status);
  const titleText = String(title ?? "").trim();
  const subjectText = String(subject ?? "").trim();
  const effectiveTitle = titleText || String(fileName ?? "");

  return (
    <div className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold text-foreground break-words whitespace-pre-wrap">
              {effectiveTitle}
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <Badge variant={variant} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs">
              <Icon className="h-3.5 w-3.5" />
              {text}
            </Badge>
            <span className="text-xs text-muted-foreground">{submittedAt}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {subjectText ? (
            <p className="text-sm font-medium text-foreground/80 break-words whitespace-pre-wrap">
              Materia: {subjectText}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">PDF: {fileName}</span>
          </div>
        </div>

        {returnedComment ? (
          <div className="w-full rounded-xl border border-border bg-muted/60 p-3 text-sm text-foreground shadow-sm dark:border-border dark:bg-slate-800/60 dark:text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-slate-300">
              Motivo de devolución
            </p>
            <p className="mt-1 max-h-24 overflow-auto text-sm leading-6 whitespace-pre-wrap break-words text-foreground dark:text-slate-100">
              {returnedComment}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="min-w-[5.5rem]" onClick={onView}>
            Ver
          </Button>
          <Button size="sm" variant="secondary" className="min-w-[5.5rem]" onClick={onEdit}>
            Editar
          </Button>
        </div>
      </div>
    </div>
  );
}
