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
    <AppPage breadcrumb="Comercial  ›  Clientes" titulo="Clientes">
      <div className="flex items-start gap-4">
        <KpiCard
          etiqueta="Clientes activos"
          valor={formatNumber(kpis.clientesActivos)}
          detalle={`de ${formatNumber(kpis.totalClientes)} en total`}
        />
        <KpiCard
          etiqueta="Nuevos este mes"
          valor={formatNumber(kpis.nuevosEsteMes)}
          detalle="altas registradas"
        />
        <KpiCard
          etiqueta="Con consentimiento de marketing"
          valor={
            kpis.totalClientes
              ? formatPercent(kpis.conConsentimiento / kpis.totalClientes)
              : "—"
          }
          detalle={`${formatNumber(kpis.conConsentimiento)} clientes`}
        />
        <KpiCard
          etiqueta="Perfil completo"
          valor={
            kpis.totalClientes
              ? formatPercent(kpis.perfilCompleto / kpis.totalClientes)
              : "—"
          }
          detalle="80% o más de los campos"
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
