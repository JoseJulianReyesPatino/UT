import React, { useMemo, useRef, useState } from "react";
import { Eye, ExternalLink, FileText, RefreshCw, X } from "lucide-react";
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
  readonly onReplace?: (newFile: File) => void;
}

export function PdfPreview({ file, title = "Vista previa del PDF", onRemove, onReplace }: PdfPreviewProps) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

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
     <div className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm dark:border-slate-700 dark:bg-slate-900">
  <object data={previewUrl} type="application/pdf" className="h-44 w-full sm:h-52">
    <div className="flex h-44 items-center justify-center px-3 text-center text-xs text-muted-foreground sm:h-52 dark:bg-slate-900 dark:text-slate-400">
      <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline dark:text-emerald-400">
        Vista previa no disponible aquí, ábrelo en una pestaña nueva
      </a>
    </div>
  </object>

  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/20 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
    <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground dark:text-slate-300">
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate text-xs font-medium">{file.name}</span>
    </div>

          <div className="flex flex-wrap items-center gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Abrir en otra ventana
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Ampliar
            </Button>
            {onReplace && (
              <>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onReplace(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                  onClick={() => replaceInputRef.current?.click()}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Reemplazar
                </Button>
              </>
            )}
            {onRemove ? (
              <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRemoveOpen(true)}
                  className="h-7 w-7 shrink-0"
                  aria-label="Eliminar archivo"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
<AlertDialogContent
  className="w-[calc(100vw-1rem)] max-w-[32rem] overflow-hidden p-4 dark:border-slate-800/70 dark:bg-slate-950/90 dark:backdrop-blur-md sm:w-[min(92vw,32rem)] sm:p-6"
  overlayClassName="bg-black/30 dark:bg-black/20 backdrop-blur-[2px]"
>  <AlertDialogHeader>
    <AlertDialogTitle className="dark:text-white">Eliminar archivo</AlertDialogTitle>
    <AlertDialogDescription className="text-justify break-words leading-6 dark:text-slate-400">
  Esta acción quitará <span className="break-all font-medium text-foreground dark:text-slate-200">{file.name}</span> de la lista. No se podrá deshacer.
</AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter className="sm:flex-row">
    <AlertDialogCancel className="dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800">Cancelar</AlertDialogCancel>
    <AlertDialogAction
      onClick={() => {
        setRemoveOpen(false);
        onRemove();
      }}
      className="dark:bg-rose-600 dark:text-white dark:hover:bg-rose-700"
    >
      Sí, eliminar
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </div>
      </div>

     <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <DialogContent
    className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden p-4 dark:border-slate-800/70 dark:bg-slate-950/90 dark:backdrop-blur-md sm:h-[94vh] sm:w-[min(98vw,80rem)] sm:p-6"
    overlayClassName="bg-black/30 dark:bg-black/20 backdrop-blur-[2px]"
  >
    <DialogHeader className="min-w-0 space-y-1 pr-6 text-left">
      <DialogTitle className="break-words text-left dark:text-white">{file.name}</DialogTitle>
      <DialogDescription className="break-words dark:text-slate-400">{title}</DialogDescription>
    </DialogHeader>

          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted/20">
            <object data={previewUrl} type="application/pdf" className="h-full w-full">
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Tu navegador no puede mostrar el PDF aquí. Ábrelo en una nueva pestaña.
                </a>
              </div>
            </object>
          </div>

          <DialogFooter className="pt-1 sm:flex-row">
            <Button type="button" variant="outline" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir en otra ventana
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}