import { AppPage } from "@/components/layout/app-page"
import { ChartCardSkeleton } from "@/components/feedback/chart-card-skeleton"
import { DetailCardSkeleton } from "@/components/feedback/detail-card-skeleton"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

/** Aproximación de `KpiFeaturedWidget` (superficie neutra + barra de progreso) — un solo uso, no merece un componente de kit propio. */
function KpiFeaturedSkeleton() {
  return (
    <div className="flex w-full flex-col items-start gap-2.5 rounded-[20px] bg-background p-[18px] shadow-form-section">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-[7px] w-full rounded-full" />
      <Skeleton className="h-2 w-32" />
    </div>
  )
}

export default function AnaliticaLoading() {
  return (
    <AppPage breadcrumb="Principal  ›  Analítica" title="Analítica">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex w-full items-center gap-2.5 rounded-[20px] bg-background px-4 py-3 shadow-form-section">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>

      <KpiRowSkeleton
        variant="dense"
        count={6}
        className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      />

      <div className="flex w-full flex-col items-stretch gap-4 xl:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-4 xl:w-[724px] xl:shrink-0">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <DetailCardSkeleton rows={4} leadingIcon={false} />
          <KpiFeaturedSkeleton />
          <DetailCardSkeleton rows={3} />
        </div>
      </div>
    </AppPage>
  )
}
