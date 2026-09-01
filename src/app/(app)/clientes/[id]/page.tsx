import { notFound } from "next/navigation"

import { getProgramParameters } from "@/lib/program-parameters"
import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { MemberAudiencesCard } from "@/features/members/components/member-audiences-card"
import { MemberConsentsCard } from "@/features/members/components/member-consents-card"
import { MemberHero } from "@/features/members/components/member-hero"
import { MemberCommercialKpis } from "@/features/members/components/member-commercial-kpis"
import { MemberLoyaltyKpis } from "@/features/members/components/member-loyalty-kpis"
import { MemberPromotionsCard } from "@/features/members/components/member-promotions-card"
import { MemberRedemptionsCard } from "@/features/members/components/member-redemptions-card"
import { MemberLoyaltyCard } from "@/features/members/components/member-loyalty-card"
import {
  getMemberProfilePermissions,
  hasPermission,
} from "@/features/members/lib/permissions"
import {
  getMemberById,
  getPurchaseBehavior,
  getMemberOrders,
  getLoyaltySummary,
  getProgramRedemptionRate,
  getCommercialValue,
  getRfmProfile,
  listActivePromotionsForMember,
  listMemberAudiences,
  listMemberConsents,
  listMemberRedemptions,
  listPromotionsForManualAssignment,
} from "@/features/members/lib/queries"

/**
 * Figma "05.3g · Perfil 360 · resumen v2" (1124:4478), pixel-perfect en
 * estructura y orden de bloques (Log de redenciones → Audiencias activas a
 * la izquierda; Promociones activas → Consentimientos a la derecha — el
 * propio Figma los tiene en ese orden). "Card · Comportamiento de compra"
 * está `hidden="true"` en el Figma: sus métricas reales viven ahora en el
 * hero (Frecuencia, Categoría dominante) y en su barra "Ver N atributos
 * más" (tienda habitual, ticket promedio, última compra, próxima
 * estimada), no en una tira aparte. Real donde el dato existe: identidad,
 * tarjeta de lealtad, programa de lealtad, valor comercial, audiencias
 * (`segment_members`) y promociones (`promociones` + elegibilidad real por
 * segmento/categoría de compra — ver `listActivePromotionsForMember`).
 */
export default async function MemberDetailPage({
  params,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params
  const member = await getMemberById(id)
  if (!member) notFound()

  const programParameters = await getProgramParameters()

  const [
    redemptions,
    summary,
    programRate,
    consents,
    memberOrders,
    rfm,
    audiences,
    promotionsForAssignment,
    profilePermissions,
  ] = await Promise.all([
    listMemberRedemptions(id),
    getLoyaltySummary(id, member.saldo_puntos, programParameters.valorPunto),
    getProgramRedemptionRate(),
    listMemberConsents(id),
    getMemberOrders(id),
    getRfmProfile(id),
    listMemberAudiences(id),
    listPromotionsForManualAssignment(id),
    getMemberProfilePermissions(),
  ])

  const canAssignPromotion = Boolean(
    profilePermissions &&
    hasPermission(profilePermissions.permissions, "promociones", "asignar")
  )
  const canApplyPointsRule = Boolean(
    profilePermissions &&
    hasPermission(profilePermissions.permissions, "puntos", "ajustar")
  )

  // Ya se sabe qué promociones están asignadas a mano por `promotionsForAssignment` — se reutiliza en vez de volver a consultar `member_promociones`.
  const manuallyAssignedIds = new Set(
    promotionsForAssignment.filter((p) => p.yaAsignada).map((p) => p.id)
  )

  // Las tres se derivan de la misma `memberOrders` (un solo fetch a `pedidos`).
  const [behavior, commercialValue, promotions] = await Promise.all([
    getPurchaseBehavior(memberOrders),
    getCommercialValue(memberOrders),
    listActivePromotionsForMember(id, memberOrders, manuallyAssignedIds),
  ])

  const fullName = `${member.nombre} ${member.apellido}`.trim()

  return (
    <AppPage
      breadcrumb={`Comercial  ›  Clientes  ›  ${fullName}`}
      title={fullName}
    >
      <BackLink href="/clientes">Volver a Clientes</BackLink>

      <div className="flex items-stretch gap-3.5">
        <div className="min-w-0 flex-1">
          <MemberHero
            member={member}
            behavior={behavior}
            rfm={rfm}
            promotionsForAssignment={promotionsForAssignment}
            canAssignPromotion={canAssignPromotion}
            canApplyPointsRule={canApplyPointsRule}
          />
        </div>
        <div className="w-[340px] shrink-0">
          <MemberLoyaltyCard member={member} />
        </div>
      </div>

      <div className="flex w-full flex-col gap-3.5">
        <MemberCommercialKpis commercialValue={commercialValue} />
        <MemberLoyaltyKpis
          member={member}
          summary={summary}
          programRate={programRate}
          pointValueUsd={programParameters.valorPunto}
        />
      </div>

      <div className="flex items-start gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <MemberRedemptionsCard entries={redemptions} />
          <MemberAudiencesCard audiences={audiences} />
        </div>
        <div className="flex w-[380px] shrink-0 flex-col gap-3.5">
          <MemberPromotionsCard promotions={promotions} behavior={behavior} />
          <MemberConsentsCard consents={consents} />
        </div>
      </div>
    </AppPage>
  )
}
