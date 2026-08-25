import { AppPage } from "@/components/layout/app-page"
import { FormSkeleton } from "@/components/feedback/form-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

export default function NewCouponBatchLoading() {
  return (
    <AppPage
      breadcrumb="Comercial  ›  Cupones  ›  Nueva emisión"
      title="Cupones"
    >
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid grid-cols-[260px_1fr_320px] items-start gap-5">
        <Skeleton className="h-[420px] rounded-2xl" />
        <div className="min-w-0 rounded-2xl bg-background p-5 shadow-form-section">
          <FormSkeleton sections={2} fieldsPerSection={4} />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </AppPage>
  )
}
