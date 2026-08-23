import { Plus } from "lucide-react"
import Link from "next/link"

import { formatNumero } from "@/lib/format"

import { ExportarTiendasButton } from "./exportar-tiendas-button"
import { TiendasFiltrosBar } from "./tiendas-filtros-bar"
import { TiendasPaginacion } from "./tiendas-paginacion"
import { TiendasTabla } from "./tiendas-tabla"
import type { Tienda, TiendasResumen } from "../lib/queries"

type TiendasCardProps = {
  tiendas: Tienda[]
  ciudades: string[]
  total: number
  pageSize: number
  resumen: TiendasResumen
}

/** Figma "Table" (707:2518): título + conteo + resumen arriba, filtros, tabla, paginación. */
export function TiendasCard({
  tiendas,
  ciudades,
  total,
  pageSize,
  resumen,
}: TiendasCardProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Tiendas
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumero(resumen.total)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatNumero(resumen.total)} tiendas ·{" "}
            {formatNumero(resumen.operando)} operando ·{" "}
            {formatNumero(resumen.enApertura)} en apertura ·{" "}
            {formatNumero(resumen.conIncidencias)} con incidencias
          </p>
        </div>
        <TiendasFiltrosBar ciudades={ciudades} />
        <ExportarTiendasButton tiendas={tiendas} />
        <Link
          href="/tiendas/nueva"
          className="flex items-center gap-[7px] rounded-[10px] bg-primary py-[9px] pr-3.5 pl-3 text-xs font-medium text-primary-foreground"
        >
          <Plus className="size-3.5" />
          Nueva tienda
        </Link>
      </div>
      <TiendasTabla tiendas={tiendas} />
      <TiendasPaginacion total={total} pageSize={pageSize} />
    </div>
  )
}
