import React from "react";
import gallosMascot from "../../assets/Form_Not_Found.png";

interface FormClosedStateProps {
  title: string;
  message: string;
}

export function FormClosedState({ title, message }: FormClosedStateProps) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60 sm:p-10">
      {/* Imagen del gallo - Más grande y más abajo */}
      <div className="relative -mt-8 sm:-mt-12">
        <img
          src={gallosMascot}
          alt=""
          className="mx-auto h-56 w-56 select-none object-contain sm:h-64 sm:w-64"
          draggable={false}
        />
      </div>

      <span className="mt-2 inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
        Formulario cerrado
      </span>

      <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
        {title}
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground dark:text-slate-400">
        {message}
      </p>
    </div>
  );
}