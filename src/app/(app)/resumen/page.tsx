import { AppPage } from "@/components/layout/app-page"
import { RoutePlaceholder } from "@/components/layout/route-placeholder"

export default function ResumenPage() {
  return (
    <AppPage breadcrumb="Principal  ›  Resumen" title="Resumen">
      <RoutePlaceholder phase="Fase 5" />
    </AppPage>
  )
}
