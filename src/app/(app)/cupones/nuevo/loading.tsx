import { AppPage } from "@/components/layout/app-page"
import { FormSkeleton } from "@/components/feedback/form-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

export default function NewCouponBatchLoading() {
  return (
    <AppPage
      breadcrumb="Comercial  ›  Cupones  ›  Nueva emisión"
      title="Emitir cupones"
    >
      <Skeleton className="h-4 w-32" />
      <div className="flex w-full items-start gap-5">
        <Skeleton className="h-[420px] w-[240px] shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <FormSkeleton sections={2} fieldsPerSection={4} />
        </div>
      </div>
    </AppPage>
  )
}
