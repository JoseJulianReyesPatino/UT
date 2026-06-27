import React from "react";
import { ArrowLeft, CalendarClock, ShieldAlert } from "lucide-react";

import { Button } from "./ui/button";
import closedFormImage from "../../assets/Form_Not_Found.png";

interface FormClosedStateProps {
  title: string;
  message: string;
}

export function FormClosedState({ title, message }: Omit<FormClosedStateProps, 'historyAction'>) {
  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-4xl border border-slate-200/20 backdrop-blur-xl dark:border-slate-700/20">
      {/* Fondo con gradiente sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-950/80 dark:to-slate-900/80" />
      
      {/* Elemento decorativo flotante */}
      <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-rose-200/20 blur-3xl dark:bg-rose-900/10" />
      <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-emerald-200/10 blur-3xl dark:bg-emerald-900/5" />

      {/* Contenido principal */}
      <div className="relative grid gap-8 px-6 py-12 sm:gap-12 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-16">
        {/* Sección izquierda - Contenido */}
        <div className="flex flex-col justify-center gap-8 lg:gap-10">
          {/* Superbadge */}
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 rounded-full bg-rose-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
              Formulario Cerrado
            </span>
          </div>

          {/* Heading principal */}
          <div className="space-y-3">
            <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-900 dark:text-white lg:text-6xl">
              {title}
            </h1>
            <div className="h-1 w-16 bg-gradient-to-r from-rose-500 to-rose-600" />
          </div>

          {/* Descripción */}
          <p className="max-w-sm text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            {message}
          </p>

          {/* Puntos de información */}
          <div className="space-y-4 pt-4">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100/50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                <span className="text-lg font-bold">→</span>
              </div>
              <div className="flex flex-col justify-center">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Contacta Administración</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Solicita acceso a este formulario</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección derecha - Imagen e ilustración */}
        <div className="relative flex items-center justify-center">
          <div className="relative h-96 w-full">
            {/* Card flotante para la imagen */}
            <div className="absolute inset-0 rounded-3xl border border-slate-200/50 bg-white/40 p-8 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/40">
              <div className="flex h-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
                <img
                  src={closedFormImage}
                  alt="Mascota institucional"
                  className="h-64 w-auto select-none object-contain drop-shadow-xl sm:h-72"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}