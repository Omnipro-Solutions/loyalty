import { AppPage } from "@/components/layout/app-page"
import { FormSkeleton } from "@/components/feedback/form-skeleton"

export default function ProgramParametersLoading() {
  return (
    <AppPage
      breadcrumb="Configuración  ›  Parámetros del programa"
      title="Parámetros del programa"
    >
      <FormSkeleton sections={2} fieldsPerSection={2} />
    </AppPage>
  )
}
