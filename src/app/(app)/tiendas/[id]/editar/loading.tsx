import { AppPage } from "@/components/layout/app-page"
import { FormSkeleton } from "@/components/feedback/form-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

export default function EditStoreLoading() {
  return (
    <AppPage
      breadcrumb="Catálogo  ›  Tiendas  ›  Cargando…"
      title="Cargando tienda…"
    >
      <Skeleton className="h-4 w-28" />
      <FormSkeleton sections={3} fieldsPerSection={3} />
    </AppPage>
  )
}
