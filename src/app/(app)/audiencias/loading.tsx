import { AppPage } from "@/components/layout/app-page"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { ListCardSkeleton } from "@/components/feedback/list-card-skeleton"

const AUDIENCES_TABLE_COLUMNS = [44, null, 130, 96, 150, 110, 110, 80]

export default function AudiencesLoading() {
  return (
    <AppPage breadcrumb="Comercial  ›  Audiencias" title="Audiencias">
      <KpiRowSkeleton
        variant="widget"
        count={4}
        className="flex w-full items-start gap-5"
      />
      <ListCardSkeleton
        columns={AUDIENCES_TABLE_COLUMNS}
        leadingAvatar={false}
        tableHeaderClassName="bg-neutral-50"
      />
    </AppPage>
  )
}
