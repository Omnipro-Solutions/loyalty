import { AppPage } from "@/components/layout/app-page"
import { RoutePlaceholder } from "@/components/layout/route-placeholder"

export default function ReglasPage() {
  return (
    <AppPage
      breadcrumb="Comercial  ›  Reglas de descuento"
      titulo="Reglas de descuento"
    >
      <RoutePlaceholder fase="Fase 5" />
    </AppPage>
  )
}
