import { Suspense } from "react"

import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { Skeleton } from "@/components/feedback/skeleton"
import { MembersCard } from "@/features/members/components/members-card"
import {
  CountPillSkeleton,
  MembersCount,
} from "@/features/members/components/members-count"
import { MembersExportSection } from "@/features/members/components/members-export-section"
import { MembersTableSection } from "@/features/members/components/members-table-section"
import {
  getMemberKpis,
  listMembers,
  listTiersOptions,
  MEMBERS_PAGE_SIZE,
} from "@/features/members/lib/queries"
import { formatNumber, formatPercent } from "@/lib/format"
import type { MemberSearchScope } from "@/types/domain"

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
  const searchScope = firstValue(params.campo) as MemberSearchScope | undefined
  const tierId = firstValue(params.tier)
  const accountStatus = firstValue(params.estado)
  const page = Number(firstValue(params.page) ?? "1")
  const pageSize = Number(firstValue(params.pageSize) ?? MEMBERS_PAGE_SIZE)

  // No dependen de los filtros — se quedan esperados aquí para que la fila
  // de KPIs y el encabezado nunca parpadeen al filtrar.
  const [kpis, tiers] = await Promise.all([getMemberKpis(), listTiersOptions()])

  // Sin `await`: la misma promesa alimenta el pill de conteo y la tabla —
  // una sola consulta, dos boundaries que resuelven en el mismo tick.
  const membersPromise = listMembers({
    search,
    searchScope,
    tierId,
    accountStatus,
    page,
    pageSize,
  })

  // `search` ya llega debounced (300ms) desde `MembersFiltersBar` antes de
  // tocar la URL, así que incluirla aquí no remonta por cada tecla — solo
  // una vez que la búsqueda se asienta, mostrando el skeleton igual que al
  // cambiar de nivel/estado o de página.
  const dataKey = `${search ?? ""}|${searchScope ?? ""}|${tierId ?? ""}|${accountStatus ?? ""}|${page}|${pageSize}`

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
        exportSlot={
          <Suspense fallback={<Skeleton className="h-9 w-24 rounded-[10px]" />}>
            <MembersExportSection membersPromise={membersPromise} />
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
