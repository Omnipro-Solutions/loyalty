import { AppPage } from "@/components/layout/app-page"
import { ListCardSkeleton } from "@/components/feedback/list-card-skeleton"

const STORES_TABLE_COLUMNS = [220, 190, 210, 190, 90, 130, 44]

export default function StoresLoading() {
  return (
    <AppPage breadcrumb="Catálogo  ›  Tiendas" title="Tiendas">
      <ListCardSkeleton
        columns={STORES_TABLE_COLUMNS}
        leadingAvatar={false}
        cardHeaderClassName="px-4 py-3.5"
      />
    </AppPage>
  )
}
