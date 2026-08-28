import { formatNumber, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { PromotionDimension } from "../lib/dashboard-filters"
import type { DimensionSlice } from "../lib/queries"
import { PromotionsDimensionPicker } from "./promotions-dimension-picker"

const DIMENSION_TITLE: Record<PromotionDimension, string> = {
  segmento: "Resultados por segmento",
  categoria: "Resultados por categoría",
  socio_nivel: "Resultados por nivel del socio",
  mecanica: "Resultados por mecánica",
  tipo: "Resultados por tipo de promoción",
  financiador: "Resultados por financiador",
}

/**
 * Los 7 tonos de datos de `globals.css`, en orden. Se recorren por índice
 * dentro de cada corte, no por promoción global: cada financiador empieza
 * de nuevo en el primero, porque el color aquí solo tiene que distinguir
 * las barras de UNA fila entre sí, no identificar una promoción a través
 * de toda la pantalla.
 */
const SERIES_CLASS = [
  "bg-data-indigo",
  "bg-data-teal",
  "bg-data-amber",
  "bg-data-coral",
  "bg-data-violet",
  "bg-data-navy",
  "bg-data-gold",
]

/**
 * Un corte simple: una barra por valor, proporcional a los canjes. Es la
 * lectura correcta cuando el valor agrupa muchas promociones parecidas
 * (un segmento, una categoría) y lo que importa es comparar valores entre sí.
 */
function SimpleSlice({ item, max }: { item: DimensionSlice; max: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-xs font-medium text-foreground">
          {item.label}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatNumber(item.canjes)} canjes · {item.promociones.length}{" "}
          {item.promociones.length === 1 ? "promoción" : "promociones"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(item.canjes / max) * 100}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-3 text-[11px] text-muted-foreground">
        <span>Inversión {formatUSD(item.inversion)}</span>
        <span>Venta asociada {formatUSD(item.ventaAsociada)}</span>
      </div>
    </div>
  )
}

/**
 * El corte abierto: la barra se parte por promoción, proporcional a la
 * inversión de cada una dentro del financiador. Contra la barra simple,
 * contesta la pregunta que siempre viene después de "¿cuánto puso el
 * laboratorio?" — en qué lo puso, y si está repartido o concentrado en una
 * sola promoción.
 *
 * Se apila por inversión y no por canjes a propósito: en el eje de
 * financiador la unidad de la conversación es el dinero, que es lo que se
 * negocia y lo que se liquida.
 */
function StackedSlice({ item, max }: { item: DimensionSlice; max: number }) {
  const total = item.promociones.reduce((a, p) => a + p.inversion, 0)
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border px-3.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-xs font-semibold text-foreground">
          {item.label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {formatUSD(item.inversion)} · {formatNumber(item.canjes)} canjes ·
          venta asociada {formatUSD(item.ventaAsociada)}
        </span>
      </div>

      {/* El ancho total de la fila es proporcional al financiador que más
          invierte, no al 100 % del contenedor: sin eso, un financiador con
          una décima parte de la inversión se vería igual de ancho que el
          mayor y el corte dejaría de comparar nada. */}
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-muted"
        style={{ width: `${max > 0 ? (item.inversion / max) * 100 : 0}%` }}
      >
        {item.promociones.map((promo, i) => (
          <div
            key={promo.id}
            title={`${promo.nombre} · ${formatUSD(promo.inversion)}`}
            className={cn("h-full", SERIES_CLASS[i % SERIES_CLASS.length])}
            style={{
              width: `${total > 0 ? (promo.inversion / total) * 100 : 0}%`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {item.promociones.map((promo, i) => (
          <div
            key={promo.id}
            className="flex items-baseline justify-between gap-3 text-[11px]"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  SERIES_CLASS[i % SERIES_CLASS.length]
                )}
              />
              <span className="min-w-0 truncate text-foreground">
                {promo.nombre}
              </span>
            </span>
            <span className="shrink-0 text-muted-foreground">
              {formatUSD(promo.inversion)}
              {total > 0 &&
                ` · ${Math.round((promo.inversion / total) * 100)} %`}
              {` · ${formatNumber(promo.canjes)} canjes`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Los atributos de la regla —a quién apunta, sobre qué categoría, con qué
 * mecánica— no son solo filtros: son el eje que cambia el enfoque de todo
 * lo demás. Esta es la tarjeta que los usa como tal.
 *
 * Se muestran los tres números juntos a propósito. Canjes sin inversión
 * premia al segmento más grande; inversión sin venta asociada parece puro
 * costo. Solo los tres a la vez dejan ver qué eje devuelve más por lo que
 * consume, que es la pregunta que trae comercial.
 */
export function PromotionsDimensionBreakdown({
  dimension,
  items,
}: {
  dimension: PromotionDimension
  items: DimensionSlice[]
}) {
  // El financiador se abre por promoción: son pocos valores y cada uno es
  // una negociación concreta, así que el detalle cabe y hace falta. Los
  // demás ejes agrupan demasiadas promociones para que apilarlas sea legible.
  const stacked = dimension === "financiador"
  const maxCanjes = Math.max(...items.map((i) => i.canjes), 1)
  const maxInversion = Math.max(...items.map((i) => i.inversion), 1)
  const multiValue = dimension === "segmento" || dimension === "categoria"

  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">
            {DIMENSION_TITLE[dimension]}
          </p>
          <p className="text-xs text-muted-foreground">
            {stacked
              ? "Cada barra abierta por las promociones que la componen, proporcional a la inversión"
              : "Canjes, inversión y venta asociada del mismo universo, agrupados por el atributo de la regla"}
          </p>
        </div>
        <PromotionsDimensionPicker value={dimension} />
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Ninguna promoción del filtro actual tiene actividad para agrupar.
        </p>
      ) : (
        <div className={cn("flex flex-col", stacked ? "gap-2.5" : "gap-3")}>
          {items.map((item) =>
            stacked ? (
              <StackedSlice key={item.key} item={item} max={maxInversion} />
            ) : (
              <SimpleSlice key={item.key} item={item} max={maxCanjes} />
            )
          )}
        </div>
      )}

      {multiValue && items.length > 0 && (
        /* Sin esta línea alguien suma las barras, no le da el total del
           panel y concluye que faltan canjes. Una promoción dirigida a dos
           segmentos suma en los dos: es reparto, no doble conteo. */
        <p className="text-[11px] text-muted-foreground">
          Una promoción dirigida a varios valores suma en cada uno — las barras
          no suman el total del panel.
        </p>
      )}
    </div>
  )
}
