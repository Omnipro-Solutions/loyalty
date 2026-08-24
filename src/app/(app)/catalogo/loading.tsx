import { AppPage } from "@/components/layout/app-page"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { ListCardSkeleton } from "@/components/feedback/list-card-skeleton"

const PRODUCTS_TABLE_COLUMNS = [44, 260, 96, 130, 100, 140, 90, 100, 56]

export default function CatalogLoading() {
  return (
    <AppPage breadcrumb="Catálogo  ›  Productos" title="Catálogo de productos">
      <KpiRowSkeleton variant="card" count={4} />
      <ListCardSkeleton
        columns={PRODUCTS_TABLE_COLUMNS}
        leadingAvatar={false}
      />
    </AppPage>
  )
}
