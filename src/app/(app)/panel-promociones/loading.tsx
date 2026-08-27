import { AppPage } from "@/components/layout/app-page"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <Skeleton className="h-5 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}

export default function PromotionsDashboardLoading() {
  return (
    <AppPage
      breadcrumb="Principal  ›  Panel de promociones"
      title="Panel de promociones"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <Skeleton className="h-9 w-[168px] rounded-lg" />
        <Skeleton className="h-9 w-[132px] rounded-[10px]" />
        <Skeleton className="h-9 w-24 rounded-[10px]" />
        <Skeleton className="h-9 w-28 rounded-[10px]" />
        <Skeleton className="h-9 w-32 rounded-[10px]" />
        <Skeleton className="h-9 w-32 rounded-[10px]" />
      </div>
      <KpiRowSkeleton
        variant="card"
        count={6}
        className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3"
      />
      <div className="grid w-full grid-cols-1 items-start gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="flex w-full flex-col gap-4">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
        <div className="flex w-full flex-col gap-4">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
        </div>
      </div>
      <CardSkeleton rows={5} />
    </AppPage>
  )
}
