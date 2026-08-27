import { AppPage } from "@/components/layout/app-page"
import { PromotionEventsLog } from "@/features/promotions/components/promotion-events-log"
import { listPromotionEvents } from "@/features/promotions/lib/queries"

/**
 * Antes vivía como la pestaña "Logs" de `/panel-promociones` — movida a su
 * propio ítem de nivel superior bajo Configuración a pedido del usuario (ver
 * `config/navigation.ts`). Sin nodo Figma, igual que `/panel-promociones`.
 */
export default async function PromotionsLogsPage() {
  const events = await listPromotionEvents()

  return (
    <AppPage
      breadcrumb="Configuración  ›  Logs de promociones"
      title="Logs de promociones"
    >
      <PromotionEventsLog events={events} />
    </AppPage>
  )
}
