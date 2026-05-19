import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";

interface PdfPreviewProps {
  readonly file: File | null;
  readonly title?: string;
}

export function PdfPreview({ file, title = "Vista previa del PDF" }: PdfPreviewProps) {
  const [isClosed, setIsClosed] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    setIsClosed(false);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!file || !previewUrl) {
    return null;
  }

  if (isClosed) {
    return (
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setIsClosed(false)}>
          Mostrar vista previa
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsClosed(true)}
          className="h-7 w-7"
          aria-label="Cerrar vista previa"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden bg-background">
        <iframe
          src={`${previewUrl}#toolbar=1&navpanes=0`}
          className="w-full h-[420px]"
          title={title}
        />
      </div>
      <a
        href={previewUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-primary hover:underline"
      >
        Abrir PDF en una pestana nueva
      </a>
    </div>
  );
}