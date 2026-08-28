import { AppPage } from "@/components/layout/app-page"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { PromotionsTabContentSkeleton } from "@/components/feedback/promotions-tab-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

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
      <PromotionsTabContentSkeleton />
    </AppPage>
  )
}
