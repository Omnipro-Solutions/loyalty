import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { MemberAudiencesCard } from "@/features/members/components/member-audiences-card"
import { MemberPurchaseBehavior } from "@/features/members/components/member-purchase-behavior"
import { MemberConsentsCard } from "@/features/members/components/member-consents-card"
import { MemberHero } from "@/features/members/components/member-hero"
import { MemberCommercialKpis } from "@/features/members/components/member-commercial-kpis"
import { MemberLoyaltyKpis } from "@/features/members/components/member-loyalty-kpis"
import { MemberPromotionsCard } from "@/features/members/components/member-promotions-card"
import { MemberRedemptionsCard } from "@/features/members/components/member-redemptions-card"
import { MemberLoyaltyCard } from "@/features/members/components/member-loyalty-card"
import {
  getMemberById,
  getPurchaseBehavior,
  getMemberOrders,
  getLoyaltySummary,
  getProgramRedemptionRate,
  getCommercialValue,
  listMemberConsents,
  listMemberRedemptions,
} from "@/features/members/lib/queries"

/**
 * Figma "05.3g · Perfil 360 · resumen v2" (1124:4478), pixel-perfect en
 * estructura. Real donde el dato existe: identidad, tarjeta de lealtad,
 * programa de lealtad, log de redenciones, consentimientos, valor
 * comercial y comportamiento de compra (estos dos últimos vía `pedidos`/
 * `pedido_items`). Sigue en marcador temporal lo que necesita un motor de
 * audiencias o de elegibilidad de promociones, que este proyecto no tiene
 * todavía (audiencias activas, promociones activas).
 */
export default async function ClientePerfilPage({
  params,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params
  const member = await getMemberById(id)
  if (!member) notFound()

  const [redemptions, summary, programRate, consents, memberOrders] =
    await Promise.all([
      listMemberRedemptions(id),
      getLoyaltySummary(id, member.saldo_puntos),
      getProgramRedemptionRate(),
      listMemberConsents(id),
      getMemberOrders(id),
    ])

  // Ambas se derivan de la misma `memberOrders` (un solo fetch a `pedidos`).
  const [behavior, commercialValue] = await Promise.all([
    getPurchaseBehavior(memberOrders),
    getCommercialValue(memberOrders),
  ])

  const fullName = `${member.nombre} ${member.apellido}`.trim()

  return (
    <AppPage
      breadcrumb={`Comercial  ›  Clientes  ›  ${fullName}`}
      title={fullName}
    >
      <BackLink href="/clientes">Volver a Clientes</BackLink>

      <div className="flex items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <MemberHero member={member} />
        </div>
        <div className="w-[340px] shrink-0">
          <MemberLoyaltyCard member={member} />
        </div>
      </div>

      <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-muted/40 p-4">
        <MemberCommercialKpis commercialValue={commercialValue} />
        <MemberLoyaltyKpis
          member={member}
          summary={summary}
          programRate={programRate}
        />
      </div>

      <MemberPurchaseBehavior behavior={behavior} />

      <div className="flex items-start gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <MemberAudiencesCard />
          <MemberRedemptionsCard entries={redemptions} />
        </div>
        <div className="flex w-[380px] shrink-0 flex-col gap-3.5">
          <MemberConsentsCard consents={consents} />
          <MemberPromotionsCard />
        </div>
      </div>
    </AppPage>
  )
}
