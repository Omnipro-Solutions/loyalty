import { AppPage } from "@/components/layout/app-page"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { ListCardSkeleton } from "@/components/feedback/list-card-skeleton"

const MEMBERS_TABLE_COLUMNS = [null, 140, 110, 110, 120, 100]

export default function MembersLoading() {
  return (
    <AppPage breadcrumb="Comercial  ›  Clientes" title="Clientes">
      <KpiRowSkeleton variant="card" count={4} />
      <ListCardSkeleton columns={MEMBERS_TABLE_COLUMNS} />
    </AppPage>
  )
}
