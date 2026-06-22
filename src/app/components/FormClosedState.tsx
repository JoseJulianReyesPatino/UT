import React from "react";
import { ArrowLeft, CalendarClock, ShieldAlert } from "lucide-react";

import { Button } from "./ui/button";
import closedFormImage from "../../assets/Form_Not_Found.png";

interface FormClosedStateProps {
  title: string;
  message: string;
  historyAction?: React.ReactNode;
}

export function FormClosedState({ title, message, historyAction }: Readonly<FormClosedStateProps>) {
  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-emerald-50 shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10">
      {historyAction ? (
        <div className="relative z-10 flex justify-end px-4 pt-4 sm:absolute sm:right-6 sm:top-6 sm:px-0 sm:pt-0">
          {historyAction}
        </div>
      ) : null}

      <div className="grid gap-0 lg:grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative flex items-center justify-center overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-50 via-emerald-50 to-emerald-100 p-6 sm:p-8 lg:border-b-0 lg:border-r dark:border-slate-800 dark:from-slate-950 dark:via-emerald-950 dark:to-emerald-900">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:18px_18px] dark:opacity-20" />
          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex w-full max-w-sm items-center justify-center rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-4 shadow-xl shadow-emerald-500/10 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-2xl dark:shadow-black/20">
            <img
              src={closedFormImage}
              alt="Mascota institucional"
              className="mx-auto max-h-[16rem] w-auto select-none object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.38)] sm:max-h-[19rem]"
              draggable={false}
            />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-6 bg-white/80 px-6 py-8 sm:px-8 sm:py-10 dark:bg-slate-950">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
              <ShieldAlert className="h-3.5 w-3.5" />
              Formulario cerrado
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {message}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            <div className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Si necesitas acceso, contacta al administrador.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}