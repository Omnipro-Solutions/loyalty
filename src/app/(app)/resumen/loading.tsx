import { AppPage } from "@/components/layout/app-page"
import { ChartCardSkeleton } from "@/components/feedback/chart-card-skeleton"
import { DetailCardSkeleton } from "@/components/feedback/detail-card-skeleton"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

/** Aproximación de `AiCopilotHero`: no hay un componente de kit para el hero con gradiente — no merece uno propio para un único uso. */
function AiCopilotHeroSkeleton() {
  return (
    <div className="flex w-full flex-col items-start gap-[18px] rounded-[20px] bg-background px-8 py-7 shadow-form-section">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-[52px] w-full rounded-[14px]" />
      <div className="flex flex-wrap items-start gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
    </div>
  )
}

export default function ResumenLoading() {
  return (
    <AppPage breadcrumb="Principal  ›  Resumen" title="Resumen">
      <AiCopilotHeroSkeleton />

      <KpiRowSkeleton
        variant="widget"
        count={5}
        className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
      />

      <div className="flex w-full flex-col gap-4">
        <Skeleton className="h-2.5 w-24" />
        <div className="grid w-full grid-cols-1 items-stretch gap-4 lg:grid-cols-[3fr_2fr]">
          <ChartCardSkeleton className="min-w-0" />
          <DetailCardSkeleton
            rows={4}
            leadingIcon={false}
            className="min-w-0"
          />
        </div>
        <div className="grid w-full grid-cols-1 items-stretch gap-4 lg:grid-cols-[3fr_2fr]">
          <DetailCardSkeleton rows={4} className="min-w-0" />
          <DetailCardSkeleton
            rows={3}
            leadingIcon={false}
            className="min-w-0"
          />
        </div>
      </div>
    </AppPage>
  )
}
