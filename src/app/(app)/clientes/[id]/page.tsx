import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { ClienteAudienciasCard } from "@/features/clientes/components/cliente-audiencias-card"
import { ClienteComportamientoCompra } from "@/features/clientes/components/cliente-comportamiento-compra"
import { ClienteConsentimientosCard } from "@/features/clientes/components/cliente-consentimientos-card"
import { ClienteHero } from "@/features/clientes/components/cliente-hero"
import { ClienteKpisComercial } from "@/features/clientes/components/cliente-kpis-comercial"
import { ClienteKpisLealtad } from "@/features/clientes/components/cliente-kpis-lealtad"
import { ClientePromocionesCard } from "@/features/clientes/components/cliente-promociones-card"
import { ClienteRedencionesCard } from "@/features/clientes/components/cliente-redenciones-card"
import { ClienteTarjetaLealtad } from "@/features/clientes/components/cliente-tarjeta-lealtad"
import {
  getClienteById,
  getComportamientoCompra,
  getPedidosSocio,
  getResumenLealtad,
  getTasaRedencionPrograma,
  getValorComercial,
  listConsentimientosPorMiembro,
  listRedencionesPorMiembro,
} from "@/features/clientes/lib/queries"

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
  const cliente = await getClienteById(id)
  if (!cliente) notFound()

  const [movimientos, resumen, tasaPrograma, consentimientos, pedidosSocio] =
    await Promise.all([
      listRedencionesPorMiembro(id),
      getResumenLealtad(id, cliente.saldo_puntos),
      getTasaRedencionPrograma(),
      listConsentimientosPorMiembro(id),
      getPedidosSocio(id),
    ])

  // Ambas se derivan de la misma `pedidosSocio` (un solo fetch a `pedidos`).
  const [comportamiento, valorComercial] = await Promise.all([
    getComportamientoCompra(pedidosSocio),
    getValorComercial(pedidosSocio),
  ])

  const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.trim()

  return (
    <AppPage
      breadcrumb={`Comercial  ›  Clientes  ›  ${nombreCompleto}`}
      titulo={nombreCompleto}
    >
      <BackLink href="/clientes">Volver a Clientes</BackLink>

      <div className="flex items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <ClienteHero cliente={cliente} />
        </div>
        <div className="w-[340px] shrink-0">
          <ClienteTarjetaLealtad cliente={cliente} />
        </div>
      </div>

      <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-muted/40 p-4">
        <ClienteKpisComercial valorComercial={valorComercial} />
        <ClienteKpisLealtad
          cliente={cliente}
          resumen={resumen}
          tasaPrograma={tasaPrograma}
        />
      </div>

      <ClienteComportamientoCompra comportamiento={comportamiento} />

      <div className="flex items-start gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <ClienteAudienciasCard />
          <ClienteRedencionesCard movimientos={movimientos} />
        </div>
        <div className="flex w-[380px] shrink-0 flex-col gap-3.5">
          <ClienteConsentimientosCard consentimientos={consentimientos} />
          <ClientePromocionesCard />
        </div>
      </div>
    </AppPage>
  )
}
