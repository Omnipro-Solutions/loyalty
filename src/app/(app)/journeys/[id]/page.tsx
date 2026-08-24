import { notFound } from "next/navigation"

import { AppTopbar } from "@/components/layout/app-topbar"
import {
  getWorkflowWithGraph,
  listAudiences,
  listCouponBatchesForBuilder,
  listTiers,
} from "@/features/builder/canvas/queries"
import { JourneyEditor } from "@/features/builder/canvas/journey-editor"

export default async function JourneyEditorPage({
  params,
}: PageProps<"/journeys/[id]">) {
  const { id } = await params
  const [workflow, tiers, audiences, couponBatches] = await Promise.all([
    getWorkflowWithGraph(id),
    listTiers(),
    listAudiences(),
    listCouponBatchesForBuilder(),
  ])
  if (!workflow) notFound()

  return (
    <div className="flex h-screen flex-col">
      <AppTopbar
        breadcrumb="Comercial  ›  Loyalty Builder"
        title={workflow.nombre}
        className="shrink-0"
      />
      <JourneyEditor
        workflow={workflow}
        tiers={tiers}
        audiences={audiences}
        couponBatches={couponBatches}
      />
    </div>
  )
}
