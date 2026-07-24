import React from "react";
import gallosMascot from "../../assets/elementos/Form_Not_Found.webp";
// import accentLine from "../../assets/ut_imagen9.png"; // Ya no es necesario

interface FormClosedStateProps {
  title: string;
  message: string;
}

export function FormClosedState({ title, message }: FormClosedStateProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10 sm:min-h-[75vh] sm:pr-32 lg:pr-40">
      <div data-tour="docente-form-card" className="w-full max-w-3xl rounded-3xl border border-border/70 bg-card p-8 text-center shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60 sm:p-12">
        {/* Imagen del gallo - centrada */}
        <img
          src={gallosMascot}
          alt=""
          width={288}
          height={288}
          loading="eager"
          fetchPriority="high"
          className="h-60 w-60 select-none object-contain translate-x-2 sm:h-72 sm:w-72 sm:translate-x-45"
          draggable={false}
        />

        <span className="mt-2 inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          Formulario cerrado
        </span>

        {/* Layout de 3 columnas con línea más larga */}
        <div className="mt-3 flex items-center gap-3">
          {/* Línea decorativa izquierda - degradado CSS puro (más larga) */}
          <div className="hidden h-4 w-40 shrink-0 rounded-full bg-gradient-to-r from-white to-amber-500 sm:block sm:h-5 sm:w-48 dark:from-slate-950 dark:to-amber-400" />
          
          {/* Título centrado */}
          <h1 className="flex-1 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            {title}
          </h1>
          
          {/* Espaciador derecho invisible - mismo ancho que la línea */}
          <div className="hidden h-4 w-40 shrink-0 sm:block sm:w-48" />
        </div>

        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground dark:text-slate-400">
          {message}
        </p>
      </div>
    </div>
  );
}