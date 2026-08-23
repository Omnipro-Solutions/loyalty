import { notFound } from "next/navigation"

import { AppTopbar } from "@/components/layout/app-topbar"
import {
  getWorkflowWithGraph,
  listTiers,
} from "@/features/builder/canvas/queries"
import { JourneyEditor } from "@/features/builder/canvas/journey-editor"

export default async function JourneyEditorPage({
  params,
}: PageProps<"/journeys/[id]">) {
  const { id } = await params
  const [workflow, tiers] = await Promise.all([
    getWorkflowWithGraph(id),
    listTiers(),
  ])
  if (!workflow) notFound()

  return (
    <>
      <AppTopbar
        breadcrumb="Comercial  ›  Loyalty Builder"
        titulo={workflow.nombre}
        className="shrink-0"
      />
      <JourneyEditor workflow={workflow} tiers={tiers} />
    </>
  )
}
