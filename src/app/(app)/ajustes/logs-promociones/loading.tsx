import { AppPage } from "@/components/layout/app-page"
import { Skeleton } from "@/components/feedback/skeleton"
import { TableSkeleton } from "@/components/feedback/table-skeleton"

/** Igual a las columnas de `PromotionEventsLog` (`GRID` en `promotion-events-log.tsx`). */
const LOG_TABLE_COLUMNS = [132, 130, null, 90, 130, null, 28]

export default function PromotionsLogsLoading() {
  return (
    <AppPage
      breadcrumb="Configuración  ›  Logs de promociones"
      title="Logs de promociones"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <Skeleton className="h-9 min-w-[260px] flex-1 rounded-[10px]" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="w-full overflow-hidden rounded-[20px] bg-background shadow-form-section">
        <TableSkeleton
          columns={LOG_TABLE_COLUMNS}
          leadingAvatar={false}
          headerClassName="bg-muted"
        />
      </div>
    </AppPage>
  )
}
