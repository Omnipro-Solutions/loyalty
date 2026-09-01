import { Users } from "lucide-react"
import { notFound } from "next/navigation"

import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { EmptyState } from "@/components/feedback/empty-state"
import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { AudienceHero } from "@/features/audiences/components/audience-hero"
import { AudienceMetricsRow } from "@/features/audiences/components/audience-metrics-row"
import { AudienceMembersTable } from "@/features/audiences/components/audience-members-table"
import {
  tierDistribution,
  getAudienceById,
  getProgramComparison,
  getAudienceSize,
  listLinkedJourneys,
  listAudienceMembers,
} from "@/features/audiences/lib/queries"
import type { TierName } from "@/types/domain"

/** Figma "11.2 · Audiencia · detalle" (842:6209). */
export default async function AudienceDetailPage({
  params,
}: PageProps<"/audiencias/[id]">) {
  const { id } = await params
  const audience = await getAudienceById(id)
  if (!audience) notFound()

  const dominantTier = audience.nivel_dominante as TierName | null

  const [size, members, journeys, comparison, permissions] = await Promise.all([
    getAudienceSize(id, audience.conteo_estimado ?? 0),
    listAudienceMembers(id),
    listLinkedJourneys(id),
    getProgramComparison(dominantTier),
    getSessionPermissions(),
  ])

  const distribution = tierDistribution(
    audience.conteo_estimado ?? 0,
    dominantTier
  )

  return (
    <AppPage
      breadcrumb="Comercial  ›  Audiencias  ›  Detalle"
      title="Audiencia"
    >
      <BackLink href="/audiencias">Volver</BackLink>

      <AudienceHero
        audience={audience}
        members={members}
        canSync={allows(permissions, "clientes", "editar")}
      />

      <AudienceMetricsRow
        size={size}
        distribution={distribution}
        comparison={comparison}
        journeys={journeys}
      />

      <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin muestra de socios todavía"
            description="Esta audiencia no tiene socios de ejemplo asignados en `segment_members`."
          />
        ) : (
          <AudienceMembersTable members={members} />
        )}
      </div>
    </AppPage>
  )
}
