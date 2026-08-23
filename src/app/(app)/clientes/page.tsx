import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { ClientesCard } from "@/features/clientes/components/clientes-card"
import {
  getClientesKpis,
  listClientes,
  listTiersOptions,
} from "@/features/clientes/lib/queries"
import { formatNumber, formatPercent } from "@/lib/format"

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

/** Figma "05.1 · Clientes · listado" (704:3012). */
export default async function ClientesPage({
  searchParams,
}: PageProps<"/clientes">) {
  const params = await searchParams
  const busqueda = primerValor(params.q)
  const tierId = primerValor(params.tier)
  const estadoCuenta = primerValor(params.estado)
  const page = Number(primerValor(params.page) ?? "1")

  const [{ clientes, total }, kpis, tiers] = await Promise.all([
    listClientes({ busqueda, tierId, estadoCuenta, page }),
    getClientesKpis(),
    listTiersOptions(),
  ])

  return (
    <AppPage breadcrumb="Comercial  ›  Clientes" title="Clientes">
      <div className="flex items-start gap-4">
        <KpiCard
          label="Clientes activos"
          value={formatNumber(kpis.clientesActivos)}
          detail={`de ${formatNumber(kpis.totalClientes)} en total`}
        />
        <KpiCard
          label="Nuevos este mes"
          value={formatNumber(kpis.nuevosEsteMes)}
          detail="altas registradas"
        />
        <KpiCard
          label="Con consentimiento de marketing"
          value={
            kpis.totalClientes
              ? formatPercent(kpis.conConsentimiento / kpis.totalClientes)
              : "—"
          }
          detail={`${formatNumber(kpis.conConsentimiento)} clientes`}
        />
        <KpiCard
          label="Perfil completo"
          value={
            kpis.totalClientes
              ? formatPercent(kpis.perfilCompleto / kpis.totalClientes)
              : "—"
          }
          detail="80% o más de los campos"
        />
      </div>
      <ClientesCard
        clientes={clientes}
        total={total}
        tiers={tiers}
        hayFiltrosAplicados={!!(busqueda || tierId || estadoCuenta)}
      />
    </AppPage>
  )
}
