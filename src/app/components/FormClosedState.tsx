import React from "react";
import { ArrowLeft, CalendarClock, ShieldAlert } from "lucide-react";

import { Button } from "./ui/button";
import closedFormImage from "../../assets/Form_Not_Found.png";

interface FormClosedStateProps {
  title: string;
  message: string;
}

export function FormClosedState({ title, message }: Readonly<FormClosedStateProps>) {
  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-[2rem] border border-rose-200/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] dark:border-rose-900/50 dark:bg-slate-950">
      <div className="grid gap-0 md:grid-cols-[minmax(18rem,0.92fr)_minmax(0,1.08fr)]">
        <div className="relative flex items-center justify-center border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950/35 p-6 sm:p-8 md:border-b-0 md:border-r md:border-slate-200 dark:border-slate-800">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-sm">
            <img
              src={closedFormImage}
              alt="Formulario cerrado"
              className="mx-auto max-h-[16rem] w-auto select-none object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:max-h-[19rem]"
              draggable={false}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-6 px-6 py-7 sm:px-8 dark:bg-slate-950">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
              <ShieldAlert className="h-3.5 w-3.5" />
              Formulario cerrado
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {title}
              </h2>
              <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {message}
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CalendarClock className="h-4 w-4" />
              </div>
              <p>Verifica el calendario y confirma si el periodo sigue abierto.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-slate-200 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <p>Mientras tanto puedes regresar y continuar con otros apartados disponibles.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={() => window.history.back()} className="rounded-full px-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Solicita actualización al administrador si necesitas acceso.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}