export function UserCardSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando usuarios">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex flex-col gap-4 overflow-hidden rounded-xl border border-border/70 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="h-12 w-12 flex-shrink-0 rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-48 rounded-full bg-muted" />
              <div className="h-3 w-64 rounded-full bg-muted" />
              <div className="flex gap-4">
                <div className="h-3 w-32 rounded-full bg-muted" />
                <div className="h-3 w-24 rounded-full bg-muted" />
              </div>
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <div className="h-5 w-14 rounded-full bg-muted" />
            <div className="h-8 w-16 rounded-lg bg-muted" />
            <div className="h-8 w-24 rounded-lg bg-muted" />
            <div className="h-8 w-20 rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SupervisorRowSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando supervisores">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-border/70 bg-background/80 dark:bg-slate-950/60 flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 rounded-full bg-muted" />
            <div className="h-3 w-56 rounded-full bg-muted" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-3 w-16 rounded-full bg-muted" />
            <div className="h-4 w-4 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentCardSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando documentos">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4 flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 min-w-0 space-y-2 pt-1">
            <div className="h-4 w-2/3 rounded-full bg-muted" />
            <div className="h-3 w-2/5 rounded-full bg-muted" />
            <div className="mt-2 flex gap-2">
              <div className="h-5 w-16 rounded-full bg-muted" />
              <div className="h-5 w-20 rounded-full bg-muted" />
            </div>
            <div className="h-3 w-1/4 rounded-full bg-muted" />
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <div className="h-8 w-14 rounded-lg bg-muted" />
            <div className="h-8 w-14 rounded-lg bg-muted" />
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="h-8 w-20 rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CycleDocumentCardSkeleton() {
  return (
    <div className="space-y-3 py-4" aria-busy="true" aria-label="Cargando documentos">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4 flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 min-w-0 space-y-2 pt-1">
            <div className="h-4 w-2/3 rounded-full bg-muted" />
            <div className="h-3 w-2/5 rounded-full bg-muted" />
            <div className="mt-2 flex gap-2">
              <div className="h-5 w-16 rounded-full bg-muted" />
              <div className="h-5 w-20 rounded-full bg-muted" />
            </div>
            <div className="h-3 w-1/4 rounded-full bg-muted" />
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <div className="h-8 w-14 rounded-lg bg-muted" />
            <div className="h-8 w-16 rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CycleCardSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Cargando ciclos">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
          <div className="p-6 pb-3 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-56 rounded-full bg-muted" />
                  <div className="h-5 w-16 rounded-full bg-muted" />
                </div>
                <div className="h-3 w-40 rounded-full bg-muted" />
              </div>
              <div className="h-5 w-5 rounded bg-muted shrink-0" />
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-6">
                <div className="space-y-1.5">
                  <div className="h-3 w-10 rounded-full bg-muted" />
                  <div className="h-4 w-12 rounded-full bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-14 rounded-full bg-muted" />
                  <div className="h-4 w-24 rounded-full bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-20 rounded-full bg-muted" />
                  <div className="h-4 w-6 rounded-full bg-muted" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-9 rounded-lg bg-muted" />
                <div className="h-9 w-9 rounded-lg bg-muted" />
                <div className="h-9 w-9 rounded-lg bg-muted" />
                <div className="h-9 w-9 rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Cargando estadísticas">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
          <div className="h-1 bg-muted" />
          <div className="flex flex-col items-start gap-3 space-y-0 p-6 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-4 w-32 rounded-full bg-muted" />
            <div className="h-9 w-9 rounded-xl bg-muted sm:h-10 sm:w-10" />
          </div>
          <div className="px-6 pb-6 pt-0 space-y-2">
            <div className="h-8 w-12 rounded-lg bg-muted" />
            <div className="h-3 w-36 rounded-full bg-muted" />
            <div className="h-3 w-20 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PendingDocumentSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando documentos pendientes">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-2xl border border-border">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-3/5 rounded-full bg-muted" />
            <div className="h-3 w-2/5 rounded-full bg-muted" />
            <div className="mt-1 h-5 w-1/3 rounded-full bg-muted" />
          </div>
          <div className="h-8 w-16 shrink-0 rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando actividad reciente">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-start gap-3 p-3 rounded-2xl">
          <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/5 rounded-full bg-muted" />
            <div className="h-3 w-4/5 rounded-full bg-muted" />
          </div>
          <div className="h-3 w-16 shrink-0 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
