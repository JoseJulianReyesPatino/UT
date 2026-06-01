import React, { useMemo, useState } from "react";
import { Eye, ExternalLink, FileText, X } from "lucide-react";
import { Button } from "./ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface PdfPreviewProps {
  readonly file: File | null;
  readonly title?: string;
  readonly onRemove?: () => void;
}

export function PdfPreview({ file, title = "Vista previa del PDF", onRemove }: PdfPreviewProps) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!file || !previewUrl) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="truncate text-xs text-muted-foreground">{title}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir en otra ventana
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Vista previa
          </Button>
          {onRemove ? (
            <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setRemoveOpen(true)}
                className="h-9 w-9 shrink-0"
                aria-label="Eliminar archivo"
              >
                <X className="h-4 w-4" />
              </Button>
              <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-[32rem] overflow-hidden p-4 sm:w-[min(92vw,32rem)] sm:p-6">
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar archivo</AlertDialogTitle>
                  <AlertDialogDescription className="break-words leading-6">
                    Esta acción quitará <span className="block break-all font-medium text-foreground">{file.name}</span> de la lista. No se podrá deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:flex-row">
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setRemoveOpen(false);
                      onRemove();
                    }}
                  >
                    Sí, eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden p-4 sm:h-[94vh] sm:w-[min(98vw,80rem)] sm:p-6">
          <DialogHeader className="min-w-0 space-y-1 pr-6 text-left">
            <DialogTitle className="break-words text-left">{file.name}</DialogTitle>
            <DialogDescription className="break-words">{title}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted/20">
            <iframe
              src={`${previewUrl}#toolbar=1&navpanes=0`}
              className="h-full w-full"
              title={title}
            />
          </div>

          <DialogFooter className="pt-1 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir en otra ventana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}