import { Users } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { formatNumero } from "@/lib/format"

import { ClientesFiltrosBar } from "./clientes-filtros-bar"
import { ClientesPaginacion } from "./clientes-paginacion"
import { ClientesTabla } from "./clientes-tabla"
import { CLIENTES_PAGE_SIZE } from "../lib/queries"
import type { Member, TierOption } from "../lib/queries"

type ClientesCardProps = {
  clientes: Member[]
  total: number
  tiers: TierOption[]
  hayFiltrosAplicados: boolean
}

/** Figma "05.1 · Clientes · listado" (704:3012): título + conteo + filtros arriba, tabla, paginación. */
export function ClientesCard({
  clientes,
  total,
  tiers,
  hayFiltrosAplicados,
}: ClientesCardProps) {
  const sinClientesAun = total === 0 && !hayFiltrosAplicados
  const sinResultadosDeFiltro = total === 0 && hayFiltrosAplicados

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Clientes
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumero(total)}
            </span>
          </div>
        </div>
        <ClientesFiltrosBar tiers={tiers} />
      </div>

      {sinClientesAun ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            titulo="Todavía no hay clientes"
            descripcion="Los clientes aparecerán aquí cuando se inscriban en el programa de lealtad."
          />
        </div>
      ) : sinResultadosDeFiltro ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            titulo="Sin resultados"
            descripcion="Ningún cliente coincide con la búsqueda o el filtro aplicado."
          />
        </div>
      ) : (
        <>
          <ClientesTabla clientes={clientes} />
          <ClientesPaginacion total={total} pageSize={CLIENTES_PAGE_SIZE} />
        </>
      )}
    </div>
  )
}
