import { formatCOP, formatNumero } from "@/lib/format"

import { ExportarPromocionesButton } from "./exportar-promociones-button"
import { PromocionesFiltrosBar } from "./promociones-filtros-bar"
import { PromocionesPaginacion } from "./promociones-paginacion"
import { PromocionesTabla } from "./promociones-tabla"
import type { Promocion, PromocionesResumen } from "../lib/queries"

type PromocionesCardProps = {
  promociones: Promocion[]
  total: number
  pageSize: number
  resumen: PromocionesResumen
  totalTiendas: number
  categoriaNombrePorId: Map<string, string>
  segmentoNombrePorId: Map<string, string>
}

/** Figma "Table" de 06.1 (706:2518): título + conteo + resumen, filtros, tabla, paginación. */
export function PromocionesCard({
  promociones,
  total,
  pageSize,
  resumen,
  totalTiendas,
  categoriaNombrePorId,
  segmentoNombrePorId,
}: PromocionesCardProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Promociones
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumero(resumen.total)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatNumero(resumen.activas)} activas ·{" "}
            {formatNumero(resumen.programadas)} programadas · presupuesto
            asignado {formatCOP(resumen.presupuestoAsignado)}
          </p>
        </div>
        <PromocionesFiltrosBar />
        <ExportarPromocionesButton promociones={promociones} />
      </div>
      <PromocionesTabla
        promociones={promociones}
        totalTiendas={totalTiendas}
        categoriaNombrePorId={categoriaNombrePorId}
        segmentoNombrePorId={segmentoNombrePorId}
      />
      <PromocionesPaginacion total={total} pageSize={pageSize} />
    </div>
  )
}
