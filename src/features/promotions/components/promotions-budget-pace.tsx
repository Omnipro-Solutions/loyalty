import { ChevronRight } from "lucide-react"

import { formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { BudgetPaceItem } from "../lib/queries"

type PromotionsBudgetPaceProps = { items: BudgetPaceItem[] }

/**
 * Cuántas se ven sin desplegar. Seis filas + la cabecera dejan la tarjeta a
 * la altura de la que tiene al lado en el panel ("Rendimiento de cupones"),
 * que es la más baja de las dos: con catorce promociones activas esta
 * estiraba la fila al doble y dejaba media pantalla en blanco a la derecha.
 *
 * Cortar aquí es seguro porque la lista llega ORDENADA por días de
 * presupuesto restante (`getPromotionsBudgetPace`): las seis primeras son
 * siempre las que se agotan antes, que es justo lo que esta tarjeta existe
 * para avisar. Lo que queda detrás del desplegable es lo que aún tiene
 * meses.
 */
const VISIBLE_LIMIT = 6

/**
 * Sin nodo Figma — nueva a pedido del usuario. Ritmo de consumo proyectado
 * (`getPromotionsBudgetPace`): a diferencia de "En alerta" (que solo mira
 * el % consumido hoy), esto proyecta el gasto diario observado y avisa
 * cuándo el presupuesto se agotará antes de que termine la vigencia.
 */
export function PromotionsBudgetPace({ items }: PromotionsBudgetPaceProps) {
  return (
    <div className="flex h-full w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">
          Ritmo de consumo
        </p>
        <p className="text-xs text-muted-foreground">
          Proyección de agotamiento al ritmo diario observado
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Ninguna promoción activa tiene consumo real que proyectar.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.slice(0, VISIBLE_LIMIT).map((item) => (
            <PaceRow key={item.id} item={item} />
          ))}

          {/* `<details>` nativo: la tarjeta sigue siendo Server Component y
              el resto de la lista no necesita estado ni JS para abrirse. */}
          {items.length > VISIBLE_LIMIT && (
            <details className="group">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-3 shrink-0 transition-transform group-open:rotate-90" />
                <span className="group-open:hidden">
                  Ver las {items.length - VISIBLE_LIMIT} restantes
                </span>
                <span className="hidden group-open:inline">Ver menos</span>
              </summary>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {items.slice(VISIBLE_LIMIT).map((item) => (
                  <PaceRow key={item.id} item={item} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

/** Una promoción de la lista: nombre y días de presupuesto arriba, el detalle debajo. */
function PaceRow({ item }: { item: BudgetPaceItem }) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-foreground">{item.nombre}</span>
        <span
          className={cn(
            "shrink-0 font-medium",
            item.seAgotaAntesDeVigencia
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          {item.diasRestantesPresupuesto === 0
            ? "Se agota hoy"
            : `${formatNumber(item.diasRestantesPresupuesto)} d. de presupuesto`}
        </span>
      </div>
      <p className="text-[10.5px] text-muted-foreground">
        {formatPercent(item.consumedPct)} consumido
        {item.seAgotaAntesDeVigencia
          ? " · se agota antes de que termine la vigencia"
          : item.diasRestantesVigencia !== null
            ? ` · vigencia termina en ${formatNumber(item.diasRestantesVigencia)} d.`
            : ""}
      </p>
    </div>
  )
}
