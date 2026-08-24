import { AppPage } from "@/components/layout/app-page"
import { Skeleton } from "@/components/feedback/skeleton"
import { ListCardSkeleton } from "@/components/feedback/list-card-skeleton"

const BATCHES_TABLE_COLUMNS = [260, 190, 150, 140, 110, 56]

export default function CouponsLoading() {
  return (
    <AppPage breadcrumb="Comercial  ›  Cupones" title="Cupones">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-2.5 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-[10px]" />
      </div>
      <ListCardSkeleton
        columns={BATCHES_TABLE_COLUMNS}
        leadingAvatar={false}
        cardHeaderClassName="px-4 py-3.5"
        tableHeaderClassName="bg-neutral-50"
      />
    </AppPage>
  )
}
