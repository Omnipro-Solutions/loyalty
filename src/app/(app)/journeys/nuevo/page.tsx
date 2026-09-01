import { NoAccess } from "@/components/feedback/no-access"
import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { AppTopbar } from "@/components/layout/app-topbar"
import {
  listAudiences,
  listCouponBatchesForBuilder,
  listPromotionsForBuilder,
  listTiers,
  newWorkflowDraft,
} from "@/features/builder/canvas/queries"
import { JourneyEditor } from "@/features/builder/canvas/journey-editor"

/**
 * El editor de una regla que todavía no existe. Es una ruta aparte de
 * `/journeys/[id]` a propósito: el builder no autoguarda, así que tampoco
 * debe crear la fila por el mero hecho de abrir el canvas. El primer
 * "Guardar" la crea y redirige a `/journeys/{id}`.
 */
export default async function NewJourneyPage() {
  if (!allows(await getSessionPermissions(), "journeys", "crear")) {
    return <NoAccess action="crear" moduleLabel="Loyalty Builder" />
  }

  const [workflow, tiers, audiences, couponBatches, promotions] =
    await Promise.all([
      newWorkflowDraft(),
      listTiers(),
      listAudiences(),
      listCouponBatchesForBuilder(),
      listPromotionsForBuilder(),
    ])

  return (
    <div className="flex h-screen flex-col">
      <AppTopbar
        breadcrumb="Comercial  ›  Loyalty Builder"
        title="Nueva regla"
        className="shrink-0"
      />
      <JourneyEditor
        workflow={workflow}
        tiers={tiers}
        audiences={audiences}
        couponBatches={couponBatches}
        promotions={promotions}
        activity={[]}
      />
    </div>
  )
}
