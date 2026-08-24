import { AppPage } from "@/components/layout/app-page"
import { FormSkeleton } from "@/components/feedback/form-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"

export default function NewMemberLoading() {
  return (
    <AppPage
      breadcrumb="Comercial  ›  Clientes  ›  Nuevo cliente"
      title="Nuevo cliente"
    >
      <Skeleton className="h-4 w-28" />
      <FormSkeleton sections={3} fieldsPerSection={4} />
    </AppPage>
  )
}
