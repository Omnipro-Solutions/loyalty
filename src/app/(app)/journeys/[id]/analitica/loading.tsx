import { AppTopbar } from "@/components/layout/app-topbar"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

/** No usa `AppPage` — su propio wrapper `p-6` en vez de `px-8 py-6`. Breadcrumb dinámico (nombre del workflow) → placeholder de texto; el título real ("Analítica del workflow") sí es estático. */
export default function JourneyAnalyticsLoading() {
  return (
    <>
      <AppTopbar
        breadcrumb="Comercial  ›  Loyalty Builder  ›  Cargando…"
        title="Analítica del workflow"
      />
      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-2.5 w-56" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>

        <div className="flex items-start gap-5">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          </div>
          <div className="flex w-[300px] shrink-0 flex-col gap-5 rounded-2xl border border-border bg-background p-5">
            <Skeleton className="h-2.5 w-24" />
            <KpiRowSkeleton
              variant="widget"
              count={3}
              className="grid grid-cols-3 gap-2"
            />
            <div className="h-px w-full bg-border" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <div className="h-px w-full bg-border" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </>
  )
}
