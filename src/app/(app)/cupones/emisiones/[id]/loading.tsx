import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"
import { AppPage } from "@/components/layout/app-page"

export default function CouponBatchDetailLoading() {
  return (
    <AppPage breadcrumb="Comercial  ›  Cupones  ›  …" title="Cupones">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-72" />
      </div>
      <KpiRowSkeleton variant="card" count={5} />
      <Skeleton className="h-64 rounded-2xl" />
    </AppPage>
  )
}
