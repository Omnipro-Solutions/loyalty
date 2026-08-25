import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"
import { AppPage } from "@/components/layout/app-page"

export default function CouponDetailLoading() {
  return (
    <AppPage breadcrumb="Comercial  ›  Cupones  ›  …" title="Cupones">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid grid-cols-[320px_1fr] items-start gap-5">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <KpiRowSkeleton variant="card" count={5} />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    </AppPage>
  )
}
