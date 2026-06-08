import React from "react";

import { Button } from "./ui/button";
import closedFormImage from "../../assets/Form_Not_Found.png";

interface FormClosedStateProps {
  title: string;
  message: string;
}

export function FormClosedState({ title, message }: Readonly<FormClosedStateProps>) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-dashed border-slate-200 bg-white/85 p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <img
          src={closedFormImage}
          alt="Formulario cerrado"
          className="mx-auto h-auto w-full max-w-sm select-none object-contain"
          draggable={false}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
          Formulario Cerrado
        </p>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {message}
        </p>
      </div>

      <Button variant="outline" onClick={() => window.history.back()}>
        Volver
      </Button>
    </div>
  );
}