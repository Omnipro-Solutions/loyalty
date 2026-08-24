import { AppPage } from "@/components/layout/app-page"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"
import { TableSkeleton } from "@/components/feedback/table-skeleton"

/** Igual al `size` de cada `ColumnDef` en `journeys-table.tsx`. */
const JOURNEYS_TABLE_COLUMNS = [44, null, 118, 120, 140, 92, 88, 120]

export default function JourneysLoading() {
  return (
    <AppPage breadcrumb="Comercial  ›  Loyalty Builder" title="Loyalty Builder">
      <KpiRowSkeleton variant="widget" count={4} />
      <div className="w-full rounded-[20px] bg-background shadow-form-section">
        <div className="px-[22px] pt-[18px] pb-4">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <TableSkeleton columns={JOURNEYS_TABLE_COLUMNS} paginationRow />
      </div>
    </AppPage>
  )
}
