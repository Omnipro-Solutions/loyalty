import { Users } from "lucide-react"
import { notFound } from "next/navigation"

import { EmptyState } from "@/components/feedback/empty-state"
import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { AudienciaHero } from "@/features/audiencias/components/audiencia-hero"
import { AudienciaMetricasRow } from "@/features/audiencias/components/audiencia-metricas-row"
import { AudienciaMiembrosTabla } from "@/features/audiencias/components/audiencia-miembros-tabla"
import {
  distribucionPorNivel,
  getAudienciaById,
  getComparacionPrograma,
  getTamanoAudiencia,
  listJourneysVinculados,
  listMiembrosAudiencia,
} from "@/features/audiencias/lib/queries"
import type { TierName } from "@/types/domain"

/** Figma "11.2 · Audiencia · detalle" (842:6209). */
export default async function AudienciaDetallePage({
  params,
}: PageProps<"/audiencias/[id]">) {
  const { id } = await params
  const audiencia = await getAudienciaById(id)
  if (!audiencia) notFound()

  const nivelDominante = audiencia.nivel_dominante as TierName | null

  const [tamano, miembros, journeys, comparacion] = await Promise.all([
    getTamanoAudiencia(id, audiencia.conteo_estimado ?? 0),
    listMiembrosAudiencia(id),
    listJourneysVinculados(id),
    getComparacionPrograma(nivelDominante),
  ])

  const distribucion = distribucionPorNivel(
    audiencia.conteo_estimado ?? 0,
    nivelDominante
  )

  return (
    <AppPage
      breadcrumb="Comercial  ›  Audiencias  ›  Detalle"
      titulo="Audiencia"
    >
      <BackLink href="/audiencias">Volver</BackLink>

      <AudienciaHero audiencia={audiencia} miembros={miembros} />

      <AudienciaMetricasRow
        tamano={tamano}
        distribucion={distribucion}
        comparacion={comparacion}
        journeys={journeys}
      />

      <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
        {miembros.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo="Sin muestra de socios todavía"
            descripcion="Esta audiencia no tiene socios de ejemplo asignados en `segment_members`."
          />
        ) : (
          <AudienciaMiembrosTabla miembros={miembros} />
        )}
      </div>
    </AppPage>
  )
}
