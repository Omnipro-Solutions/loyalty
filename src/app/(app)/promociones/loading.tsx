import { AppPage } from "@/components/layout/app-page"
import { Skeleton } from "@/components/feedback/skeleton"
import { ListCardSkeleton } from "@/components/feedback/list-card-skeleton"

const PROMOTIONS_TABLE_COLUMNS = [40, 240, 130, 90, 130, 88, 120, 110, 56]

/** Espeja `PromotionsPlanningKpis`: ícono + título + insignia, cifra grande, barra y pie. */
function PlanningKpiCardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-2xl bg-background px-[18px] py-4 shadow-form-section">
      <div className="flex items-center gap-2">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-7 w-24" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-2.5 w-44" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <Skeleton className="h-2.5 w-full" />
    </div>
  )
}

export default function PromotionsLoading() {
  return (
    <AppPage breadcrumb="Comercial  ›  Promociones" title="Promociones">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-2.5 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-[10px]" />
      </div>
      <div className="flex w-full items-stretch gap-4">
        <PlanningKpiCardSkeleton />
        <PlanningKpiCardSkeleton />
        <PlanningKpiCardSkeleton />
      </div>
      <ListCardSkeleton
        columns={PROMOTIONS_TABLE_COLUMNS}
        leadingAvatar={false}
        cardHeaderClassName="px-4 py-3.5"
        tableHeaderClassName="bg-neutral-50"
      />
    </AppPage>
  )
}
