import Link from "next/link"

import { formatShortDate, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import { ACCUMULATION_STATUS_LABEL } from "../lib/accumulation-labels"
import type { AccumulationStatus } from "../lib/accumulation-statuses"
import type { MemberAccumulationRow } from "../lib/queries"

/** Misma escala que la tarjeta de la ficha (`member-accumulations-card.tsx`):
 *  acumular es avance de marca, no un estado semántico, así que va en la
 *  gama del acento. Solo `por_reclamar` lleva el acento sólido — es el único
 *  que pide hacer algo. */
const STATUS_CLASS: Record<AccumulationStatus, string> = {
  por_reclamar: "bg-primary text-primary-foreground",
  por_vencer: "bg-warning-bg text-warning",
  en_curso: "bg-accent text-accent-foreground",
  completada: "bg-muted text-secondary-foreground",
  vencida: "bg-muted text-muted-foreground",
  interrumpida: "bg-muted text-muted-foreground",
  sin_presupuesto: "bg-destructive-bg text-destructive",
}

const GRID =
  "grid-cols-[minmax(170px,1.3fr)_minmax(150px,1.2fr)_minmax(140px,1fr)_86px_90px_130px_90px]"

/**
 * Las acumulaciones de toda la organización. Una fila por SKU acumulado y no
 * una por socio: agrupar después en una hoja de cálculo se puede, deshacer la
 * agrupación no — y para cruzar con inventario hace falta el SKU.
 */
export function AccumulationsTable({
  rows,
}: {
  rows: MemberAccumulationRow[]
}) {
  if (rows.length === 0) {
    return (
      <p className="px-1 py-10 text-center text-sm text-muted-foreground">
        Ninguna acumulación coincide con el filtro.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div
          className={cn(
            "grid items-center gap-2.5 bg-muted px-5 py-2.5 text-[10px] font-semibold tracking-[0.4px] text-muted-foreground uppercase",
            GRID
          )}
        >
          <span>Socio</span>
          <span>Promoción</span>
          <span>Producto</span>
          <span className="text-center">Compradas</span>
          <span className="text-center">Faltan</span>
          <span>Estado</span>
          <span className="text-right">Ahorro</span>
        </div>

        {rows.map((row) => (
          <div
            key={`${row.memberId}-${row.promocionId}-${row.productoId ?? "cat"}`}
            className={cn(
              "grid items-center gap-2.5 border-b border-border px-5 py-3 text-xs last:border-b-0",
              GRID
            )}
          >
            <Link
              href={`/clientes/${row.memberId}`}
              className="min-w-0 truncate font-medium text-foreground hover:underline"
            >
              {row.socioNombre}
              {row.socioCodigo && (
                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                  {row.socioCodigo}
                </span>
              )}
            </Link>

            <div className="min-w-0">
              <p className="truncate text-secondary-foreground">
                {row.promocionNombre}
              </p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {row.compraCantidad}x{row.pagaCantidad}
                {row.vigenteHasta
                  ? ` · hasta ${formatShortDate(row.vigenteHasta)}`
                  : " · permanente"}
              </p>
            </div>

            <div className="min-w-0">
              <p className="truncate text-secondary-foreground">{row.nombre}</p>
              {row.sku && (
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {row.sku}
                </p>
              )}
            </div>

            {/* Piezas que cuentan, no el avance del ciclo: "0/3" en una
                acumulación que YA cumplió el ciclo (y espera reclamo) se leía
                como que el socio no llevaba nada. Lo devuelto se dice aparte
                porque explica por qué el número bajó. */}
            <div className="text-center">
              <span className="text-foreground tabular-nums">
                {row.unidadesCompradas}
              </span>
              {row.unidadesDevueltas > 0 && (
                <span className="block text-[10px] text-muted-foreground tabular-nums">
                  −{row.unidadesDevueltas} dev.
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-center font-semibold tabular-nums",
                row.faltan === 0 ? "text-primary" : "text-foreground"
              )}
            >
              {row.faltan}
            </span>

            <span
              className={cn(
                "w-fit rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
                STATUS_CLASS[row.estado]
              )}
            >
              {ACCUMULATION_STATUS_LABEL[row.estado]}
            </span>

            <span
              className={cn(
                "text-right tabular-nums",
                row.ahorro > 0 ? "text-primary" : "text-muted-foreground"
              )}
            >
              {row.ahorro > 0 ? `+${formatUSD(row.ahorro)}` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
