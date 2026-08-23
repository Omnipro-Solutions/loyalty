import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { MembersCard } from "@/features/members/components/members-card"
import {
  getMemberKpis,
  listMembers,
  listTiersOptions,
} from "@/features/members/lib/queries"
import { formatNumber, formatPercent } from "@/lib/format"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Figma "05.1 · Clientes · listado" (704:3012). */
export default async function MembersPage({
  searchParams,
}: PageProps<"/clientes">) {
  const params = await searchParams
  const search = firstValue(params.q)
  const tierId = firstValue(params.tier)
  const accountStatus = firstValue(params.estado)
  const page = Number(firstValue(params.page) ?? "1")

  const [{ members, total }, kpis, tiers] = await Promise.all([
    listMembers({ search, tierId, accountStatus, page }),
    getMemberKpis(),
    listTiersOptions(),
  ])

  return (
    <AppPage breadcrumb="Comercial  ›  Clientes" title="Clientes">
      <div className="flex items-start gap-4">
        <KpiCard
          label="Clientes activos"
          value={formatNumber(kpis.activeMembers)}
          detail={`de ${formatNumber(kpis.totalMembers)} en total`}
        />
        <KpiCard
          label="Nuevos este mes"
          value={formatNumber(kpis.newThisMonth)}
          detail="altas registradas"
        />
        <KpiCard
          label="Con consentimiento de marketing"
          value={
            kpis.totalMembers
              ? formatPercent(kpis.withConsent / kpis.totalMembers)
              : "—"
          }
          detail={`${formatNumber(kpis.withConsent)} clientes`}
        />
        <KpiCard
          label="Perfil completo"
          value={
            kpis.totalMembers
              ? formatPercent(kpis.profileComplete / kpis.totalMembers)
              : "—"
          }
          detail="80% o más de los campos"
        />
      </div>
      <MembersCard
        members={members}
        total={total}
        tiers={tiers}
        hasFiltersApplied={!!(search || tierId || accountStatus)}
      />
    </AppPage>
  )
}
