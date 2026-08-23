import { Users } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { formatNumber } from "@/lib/format"

import { AudienciasBuscador } from "./audiencias-buscador"
import { AudienciasPaginacion } from "./audiencias-paginacion"
import { AudienciasTabla } from "./audiencias-tabla"
import { ExportarAudienciasButton } from "./exportar-audiencias-button"
import { AUDIENCIAS_PAGE_SIZE } from "../lib/queries"
import type { AudienciaListItem, AudienciasSort } from "../lib/queries"

type AudienciasCardProps = {
  audiencias: AudienciaListItem[]
  total: number
  hayFiltrosAplicados: boolean
  sort: AudienciasSort
  dir: "asc" | "desc"
}

/** Figma "11.1 · Audiencias · listado" (842:5955): título + conteo + buscador/exportar arriba, tabla, paginación. */
export function AudienciasCard({
  audiencias,
  total,
  hayFiltrosAplicados,
  sort,
  dir,
}: AudienciasCardProps) {
  const sinAudienciasAun = total === 0 && !hayFiltrosAplicados
  const sinResultadosDeFiltro = total === 0 && hayFiltrosAplicados

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-3 px-[22px] py-4">
        <div className="flex flex-1 items-center gap-2">
          <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
            Audiencias
          </p>
          <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
            {formatNumber(total)}
          </span>
        </div>
        <AudienciasBuscador />
        <ExportarAudienciasButton audiencias={audiencias} />
      </div>

      {sinAudienciasAun ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            titulo="Todavía no hay audiencias"
            descripcion="Las audiencias se definen desde el Loyalty Builder — en cuanto exista un segmento, aparece aquí."
          />
        </div>
      ) : sinResultadosDeFiltro ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            titulo="Sin resultados"
            descripcion="Ninguna audiencia coincide con la búsqueda aplicada."
          />
        </div>
      ) : (
        <>
          <AudienciasTabla audiencias={audiencias} sort={sort} dir={dir} />
          <AudienciasPaginacion total={total} pageSize={AUDIENCIAS_PAGE_SIZE} />
        </>
      )}
    </div>
  )
}
