import { TicketPercent } from "lucide-react"

import { formatNumber, formatPercent } from "@/lib/format"

import type { CouponFunnel } from "../lib/result-queries"

type Stage = { label: string; value: number; tone: string }

/**
 * "Rendimiento de cupones" (spec §20) — el embudo generados → entregados →
 * redimidos, con los vencidos como fuga.
 *
 * Cada tramo se dibuja proporcional al primero, así que la caída se ve antes
 * de leerse. El impacto económico se expresa en PUNTOS y no en dinero a
 * propósito: el valor real de un cupón porcentual depende del ticket contra
 * el que se canjeó, y sin tabla de transacciones sumar solo los de monto
 * fijo daría una cifra que parece el total y no lo es.
 */
export function PromotionsCouponFunnel({ funnel }: { funnel: CouponFunnel }) {
  const stages: Stage[] = [
    { label: "Generados", value: funnel.generated, tone: "bg-data-indigo" },
    { label: "Entregados", value: funnel.delivered, tone: "bg-data-teal" },
    { label: "Redimidos", value: funnel.redeemed, tone: "bg-success" },
  ]
  // El porcentaje es contra la PRIMERA etapa, no contra la mayor: así cada
  // fila se lee como "qué fracción de lo generado llegó hasta aquí", que es
  // la pregunta de un embudo. Vencidos y anulados van aparte, abajo: no son
  // un escalón del embudo sino dos formas de salirse de él.
  const base = stages[0].value || 1

  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[15px] leading-[21px] font-semibold text-foreground">
            Rendimiento de cupones
          </p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(funnel.batchCount)} emisión(es) enlazada(s) a estas
            promociones
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <TicketPercent className="size-3.5 text-muted-foreground" />
          <span className="text-[22px] leading-7 font-semibold text-foreground">
            {funnel.redemptionRate !== null
              ? formatPercent(funnel.redemptionRate)
              : "—"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            tasa de redención
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {stages.map((stage) => (
          <div key={stage.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-foreground">{stage.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="font-semibold text-foreground tabular-nums">
                  {formatNumber(stage.value)}
                </span>
                <span className="w-11 text-right text-[11px] text-muted-foreground tabular-nums">
                  {formatPercent(stage.value / base)}
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${stage.tone}`}
                style={{ width: `${(stage.value / base) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            Vencidos{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumber(funnel.expired)}
            </span>
          </span>
          <span>
            Anulados{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumber(funnel.cancelled)}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-3.5">
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] text-muted-foreground">Puntos redimidos</p>
          <p className="text-[15px] leading-[21px] font-semibold text-foreground">
            {formatNumber(funnel.pointsRedeemed)} pts
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] text-muted-foreground">
            Puntos comprometidos
          </p>
          <p className="text-[15px] leading-[21px] font-semibold text-foreground">
            {formatNumber(funnel.pointsCommitted)} pts
          </p>
          <p className="text-[10px] text-muted-foreground">
            en cupones vivos: lo serán si se canjean
          </p>
        </div>
      </div>
    </div>
  )
}
