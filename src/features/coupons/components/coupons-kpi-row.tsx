import {
  CalendarClock,
  CalendarX,
  CircleCheck,
  Coins,
  FileWarning,
  Hourglass,
  ListChecks,
  LoaderCircle,
  PieChart,
  Stamp,
  Ticket,
  UserRoundX,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { formatNumber, formatPercent } from "@/lib/format"
import { DonutChart } from "@/components/data/donut-chart"
import { cn } from "@/lib/utils"

import { COUPON_DISPLAY_STATUS_LABEL, COUPON_ORIGIN_LABEL } from "../lib/labels"
import type { CouponAttentionItem, CouponCommercialKpis } from "../lib/queries"

function KpiCard({
  icon: Icon,
  label,
  badge,
  children,
}: {
  icon: LucideIcon
  label: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-2xl bg-background px-[18px] py-4 shadow-form-section">
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
        <p className="flex-1 truncate text-[13px] font-semibold text-foreground">
          {label}
        </p>
        {badge && (
          <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/** Mismo criterio que la mezcla de Promociones: 4 posiciones fijas + "Otros" en gris, composición estática que ningún filtro repinta. */
const MIX_FILL = [
  "var(--color-data-indigo)",
  "var(--color-data-teal)",
  "var(--color-data-amber)",
  "var(--color-data-violet)",
]
const OTHERS_FILL = "var(--color-border-strong)"
const MIX_VISIBLE = 4

type MixSlice = {
  key: string
  label: string
  count: number
  share: number
  color: string
}

function buildMix(
  slices: CouponCommercialKpis["mix"]["slices"],
  total: number
): MixSlice[] {
  const top = slices.slice(0, MIX_VISIBLE).map((slice, index) => ({
    key: slice.origin,
    label: COUPON_ORIGIN_LABEL[slice.origin],
    count: slice.count,
    share: slice.share,
    color: MIX_FILL[index],
  }))
  const restCount = slices
    .slice(MIX_VISIBLE)
    .reduce((sum, slice) => sum + slice.count, 0)
  if (restCount === 0) return top
  return [
    ...top,
    {
      key: "otros",
      label: `Otros ${slices.length - MIX_VISIBLE} orígenes`,
      count: restCount,
      share: total > 0 ? restCount / total : 0,
      color: OTHERS_FILL,
    },
  ]
}

const ATTENTION_LABEL: Record<CouponAttentionItem["id"], string> = {
  por_vencer: "por vencer",
  pendientes_aprobacion: "pendientes de aprobación",
  emisiones_borrador: "emisiones en borrador",
  emisiones_generando: "emisiones generando",
  vencidos_sin_cerrar: "vencidos sin canjear",
  activos_sin_canjear: "activos sin canjear",
  sin_titular: "sin persona asignada",
  puntos_sin_devolver: "puntos sin devolver",
}

const ATTENTION_ICON: Record<CouponAttentionItem["id"], LucideIcon> = {
  por_vencer: CalendarClock,
  pendientes_aprobacion: Stamp,
  emisiones_borrador: FileWarning,
  emisiones_generando: LoaderCircle,
  vencidos_sin_cerrar: CalendarX,
  activos_sin_canjear: Hourglass,
  sin_titular: UserRoundX,
  puntos_sin_devolver: Coins,
}

const ATTENTION_TONE = {
  warning: "text-warning",
  destructive: "text-destructive",
  neutral: "text-muted-foreground",
}

/** Celda de pendiente en rejilla de 2 columnas — mismo criterio que en Promociones: en lista vertical la tarjeta estira a toda la fila. */
function AttentionCell({ item }: { item: CouponAttentionItem }) {
  const Icon = ATTENTION_ICON[item.id]
  const content = (
    <>
      <Icon
        className={cn("mt-[3px] size-3.5 shrink-0", ATTENTION_TONE[item.tone])}
      />
      <span className="flex min-w-0 flex-col">
        <span className="min-w-0 truncate text-xs leading-4">
          <span className="font-semibold text-foreground tabular-nums">
            {formatNumber(item.count)}
          </span>{" "}
          <span className="text-secondary-foreground">
            {ATTENTION_LABEL[item.id]}
          </span>
        </span>
        {item.detail && (
          <span className="min-w-0 truncate text-[10px] leading-[14px] text-muted-foreground">
            {item.detail}
          </span>
        )}
      </span>
    </>
  )

  return item.href ? (
    <Link
      href={item.href}
      title={`${item.count} ${ATTENTION_LABEL[item.id]}`}
      className="flex min-w-0 items-start gap-1.5 rounded-lg px-1.5 py-1 hover:bg-muted"
    >
      {content}
    </Link>
  ) : (
    <div
      title={`${item.count} ${ATTENTION_LABEL[item.id]}`}
      className="flex min-w-0 items-start gap-1.5 px-1.5 py-1"
    >
      {content}
    </div>
  )
}

type CouponsKpiRowProps = { kpis: CouponCommercialKpis }

/**
 * Los 3 KPI del listado de cupones, con el mismo enfoque que los de
 * Promociones: MEZCLA → CARTERA → PENDIENTES.
 *
 * A diferencia de Promociones, aquí la cartera SÍ puede hablar de canje: un
 * cupón entregado ya pasó por el cliente, así que la tasa de canje es
 * estado de la cartera, no un resultado de una etapa posterior.
 */
export function CouponsKpiRow({ kpis }: CouponsKpiRowProps) {
  const { mix, portfolio, attention } = kpis
  const slices = buildMix(mix.slices, mix.total)

  // Composición de la cartera entregada: cada estado con su etiqueta — el
  // color acompaña, nunca identifica solo.
  const portfolioSlices = [
    {
      key: "redeemed" as const,
      count: portfolio.redeemed,
      fill: "bg-success",
    },
    { key: "issued" as const, count: portfolio.issued, fill: "bg-primary" },
    {
      key: "assigned" as const,
      count: portfolio.assigned,
      fill: "bg-data-teal",
    },
    {
      key: "expired" as const,
      count: portfolio.expired,
      fill: "bg-border-strong",
    },
  ].filter((slice) => slice.count > 0)

  return (
    <div className="flex w-full items-stretch gap-4">
      <KpiCard
        icon={PieChart}
        label="Mezcla por origen"
        badge={`${formatNumber(mix.total)} cupones`}
      >
        {mix.dominant ? (
          <div className="flex items-center gap-4">
            <DonutChart
              slices={slices.map((slice) => ({
                key: slice.key,
                label: slice.label,
                share: slice.share,
                color: slice.color,
              }))}
              centerValue={formatPercent(mix.dominant.share)}
              centerLabel="domina"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              {slices.map((slice) => (
                <span
                  key={slice.key}
                  className="flex items-center gap-1.5 text-[11px] leading-4"
                >
                  <span
                    className="size-[7px] shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-secondary-foreground">
                    {slice.label}
                  </span>
                  <span className="shrink-0 font-medium text-foreground tabular-nums">
                    {formatPercent(slice.share)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Todavía no hay cupones emitidos.
          </p>
        )}
      </KpiCard>

      <KpiCard icon={Ticket} label="Cartera entregada">
        <div className="flex items-end gap-2">
          <p className="text-2xl leading-7 font-semibold text-foreground">
            {formatPercent(portfolio.redemptionRate)}
          </p>
          <span className="mb-1 text-[11px] text-muted-foreground">
            de canje
          </span>
        </div>

        {portfolio.delivered > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full">
              {portfolioSlices.map((slice) => (
                <div
                  key={slice.key}
                  className={cn("h-full rounded-full", slice.fill)}
                  style={{
                    width: `${(slice.count / portfolio.delivered) * 100}%`,
                  }}
                  title={`${COUPON_DISPLAY_STATUS_LABEL[slice.key]}: ${formatNumber(slice.count)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {portfolioSlices.map((slice) => (
                <span
                  key={slice.key}
                  className="flex items-center gap-1.5 text-[11px] text-secondary-foreground"
                >
                  <span
                    className={cn("size-[7px] rounded-full", slice.fill)}
                    aria-hidden
                  />
                  {COUPON_DISPLAY_STATUS_LABEL[slice.key]}{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatNumber(slice.count)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] leading-[14px] text-muted-foreground">
              Entregados
            </span>
            <span className="truncate text-xs leading-4 font-medium text-foreground tabular-nums">
              {formatNumber(portfolio.delivered)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] leading-[14px] text-muted-foreground">
              Puntos canjeados
            </span>
            <span className="truncate text-xs leading-4 font-medium text-foreground tabular-nums">
              {formatNumber(portfolio.pointsRedeemed)}
              <span className="font-normal text-muted-foreground">
                {" · "}
                {formatNumber(portfolio.pointsCommitted)} comprom.
              </span>
            </span>
          </div>
        </div>
      </KpiCard>

      <KpiCard
        icon={ListChecks}
        label="Requiere tu atención"
        badge={
          attention.length > 0
            ? `${formatNumber(attention.reduce((sum, item) => sum + item.count, 0))} en ${attention.length}`
            : undefined
        }
      >
        {attention.length === 0 ? (
          <div className="flex flex-1 items-center gap-2">
            <CircleCheck className="size-5 shrink-0 text-success" />
            <p className="text-xs leading-4 text-muted-foreground">
              <span className="font-medium text-foreground">
                Nada pendiente
              </span>{" "}
              — sin vencimientos, aprobaciones ni emisiones a medias.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {attention.map((item) => (
              <AttentionCell key={item.id} item={item} />
            ))}
          </div>
        )}
      </KpiCard>
    </div>
  )
}
