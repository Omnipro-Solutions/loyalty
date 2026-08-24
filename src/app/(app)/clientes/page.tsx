import { Suspense } from "react"

import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { MembersCard } from "@/features/members/components/members-card"
import {
  CountPillSkeleton,
  MembersCount,
} from "@/features/members/components/members-count"
import { MembersTableSection } from "@/features/members/components/members-table-section"
import {
  getMemberKpis,
  listMembers,
  listTiersOptions,
} from "@/features/members/lib/queries"
import { formatNumber, formatPercent } from "@/lib/format"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Igual al `size` de cada `ColumnDef` en `members-table.tsx`. */
const MEMBERS_TABLE_COLUMNS = [null, 140, 110, 110, 120, 100]

/** Figma "05.1 · Clientes · listado" (704:3012). */
export default async function MembersPage({
  searchParams,
}: PageProps<"/clientes">) {
  const params = await searchParams
  const search = firstValue(params.q)
  const tierId = firstValue(params.tier)
  const accountStatus = firstValue(params.estado)
  const page = Number(firstValue(params.page) ?? "1")

  // No dependen de los filtros — se quedan esperados aquí para que la fila
  // de KPIs y el encabezado nunca parpadeen al filtrar.
  const [kpis, tiers] = await Promise.all([getMemberKpis(), listTiersOptions()])

  // Sin `await`: la misma promesa alimenta el pill de conteo y la tabla —
  // una sola consulta, dos boundaries que resuelven en el mismo tick.
  const membersPromise = listMembers({ search, tierId, accountStatus, page })

  // El texto de búsqueda queda fuera de la key a propósito: ya tiene
  // debounce de 300ms, y remontar el boundary en cada tecleo se sentiría
  // más lento que esperar a que lleguen las filas nuevas. Sí remonta (y
  // por tanto muestra el skeleton) al cambiar de nivel/estado o de página.
  const dataKey = `${tierId ?? ""}|${accountStatus ?? ""}|${page}`

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
        tiers={tiers}
        count={
          <Suspense key={dataKey} fallback={<CountPillSkeleton />}>
            <MembersCount membersPromise={membersPromise} />
          </Suspense>
        }
      >
        <Suspense
          key={dataKey}
          fallback={
            <TableSkeleton columns={MEMBERS_TABLE_COLUMNS} paginationRow />
          }
        >
          <MembersTableSection
            membersPromise={membersPromise}
            hasFiltersApplied={!!(search || tierId || accountStatus)}
          />
        </Suspense>
      </MembersCard>
    </AppPage>
  )
}
