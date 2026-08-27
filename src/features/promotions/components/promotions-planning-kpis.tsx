import {
  CalendarClock,
  CalendarX,
  CircleCheck,
  FileWarning,
  Layers,
  ListChecks,
  PieChart,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { formatCompactUSD, formatNumber, formatPercent } from "@/lib/format"
import { DonutChart } from "@/components/data/donut-chart"
import { cn } from "@/lib/utils"

import {
  BENEFIT_TYPE_LABEL,
  FINANCIADOR_LABEL,
  PROMOTION_STATUS_LABEL,
} from "../lib/labels"
import type {
  PromotionAttentionItem,
  PromotionsPlanningKpis as PlanningKpis,
} from "../lib/queries"

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

/**
 * Paleta de la mezcla: 4 posiciones fijas + "Otras" en gris. Es una
 * composición estática (ningún filtro la repinta), así que el color va por
 * posición en el ranking y no por tipo de mecánica — con 13 mecánicas
 * posibles, un color fijo por tipo obligaría a ciclar la paleta.
 */
const MIX_FILL = [
  "var(--color-data-indigo)",
  "var(--color-data-teal)",
  "var(--color-data-amber)",
  "var(--color-data-violet)",
]
const OTHERS_FILL = "var(--color-border-strong)"

/** Cuántos tipos se nombran antes de plegar el resto en "Otras". */
const MIX_VISIBLE = 4

type MixSlice = {
  key: string
  label: string
  count: number
  share: number
  color: string
}

function buildMix(
  slices: PlanningKpis["mechanics"]["slices"],
  total: number
): MixSlice[] {
  const top = slices.slice(0, MIX_VISIBLE).map((slice, index) => ({
    key: slice.benefitType,
    label: BENEFIT_TYPE_LABEL[slice.benefitType],
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
      key: "otras",
      label: `Otras ${slices.length - MIX_VISIBLE} mecánicas`,
      count: restCount,
      share: total > 0 ? restCount / total : 0,
      color: OTHERS_FILL,
    },
  ]
}

const ATTENTION_LABEL: Record<PromotionAttentionItem["id"], string> = {
  borradores: "sin publicar",
  por_vencer: "por vencer",
  vencidas_sin_cerrar: "vencidas sin cerrar",
  sin_grupo_exclusion: "sin grupo de exclusión",
  sin_aprobacion_rx: "sin aprobación regulatoria",
}

const ATTENTION_ICON: Record<PromotionAttentionItem["id"], LucideIcon> = {
  borradores: FileWarning,
  por_vencer: CalendarClock,
  vencidas_sin_cerrar: CalendarX,
  sin_grupo_exclusion: Layers,
  sin_aprobacion_rx: ShieldAlert,
}

const ATTENTION_TONE = {
  warning: "text-warning",
  destructive: "text-destructive",
  neutral: "text-muted-foreground",
}

/**
 * Celda de pendiente: conteo + etiqueta en una línea y el detalle debajo,
 * las dos truncadas. Van en rejilla de 2 columnas — en lista vertical, 4
 * pendientes hacían la tarjeta el doble de alta que las otras dos, y en una
 * fila de 3 la más alta estira a todas.
 */
function AttentionCell({ item }: { item: PromotionAttentionItem }) {
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

  // Solo enlaza lo que el listado sabe filtrar: un enlace que no acota nada
  // es peor que ninguno.
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

type PromotionsPlanningKpisProps = { kpis: PlanningKpis }

/**
 * Los 3 KPI de 06.1, en el orden en que se leen: RITMO → CARTERA →
 * PENDIENTES. Responden "cómo está el área, cómo viene cambiando y qué
 * tengo que resolver".
 *
 * Ninguno es de resultados (canjes, ROI, presupuesto consumido): esta es la
 * vista de crear y gestionar mecánicas, donde una recién creada todavía no
 * ha corrido. Todo sale de lo DECLARADO al configurarla; los resultados
 * viven en "Panel de promociones".
 */
export function PromotionsPlanningKpis({ kpis }: PromotionsPlanningKpisProps) {
  const { coverage, activity, funding, mechanics, attention } = kpis
  const inExecution = activity.active + activity.scheduled
  const categoryShare =
    coverage.totalCategories > 0
      ? coverage.categories / coverage.totalCategories
      : 0
  const mix = buildMix(mechanics.slices, mechanics.total)

  // Composición de la cartera: estados reales, cada uno con su etiqueta —
  // el color acompaña, nunca identifica solo.
  const portfolio = [
    { key: "activa" as const, count: activity.active, fill: "bg-success" },
    {
      key: "programada" as const,
      count: activity.scheduled,
      fill: "bg-warning",
    },
    {
      key: "borrador" as const,
      count: activity.drafts,
      fill: "bg-muted-foreground",
    },
  ].filter((slice) => slice.count > 0)
  const portfolioTotal = portfolio.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="flex w-full items-stretch gap-4">
      <KpiCard
        icon={PieChart}
        label="Mezcla de mecánicas"
        badge={`${formatNumber(mechanics.total)} creadas`}
      >
        {mechanics.dominant ? (
          <div className="flex items-center gap-4">
            <DonutChart
              slices={mix.map((slice) => ({
                key: slice.key,
                label: slice.label,
                share: slice.share,
                color: slice.color,
              }))}
              centerValue={formatPercent(mechanics.dominant.share)}
              centerLabel="domina"
            />
            {/* Los nombres al lado del anillo, no apilados debajo: es lo que baja el alto de la tarjeta. */}
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              {mix.map((slice) => (
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
            Todavía no hay mecánicas creadas.
          </p>
        )}
      </KpiCard>

      <KpiCard icon={Layers} label="Cartera promocional">
        <div className="flex items-end gap-2">
          <p className="text-2xl leading-7 font-semibold text-foreground">
            {formatNumber(inExecution)}
          </p>
          <span className="mb-1 text-[11px] text-muted-foreground">
            en ejecución
          </span>
        </div>

        {portfolioTotal > 0 && (
          <div className="flex flex-col gap-2">
            {/* `gap-[2px]`: los segmentos se separan con el fondo, no con un borde. */}
            <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full">
              {portfolio.map((slice) => (
                <div
                  key={slice.key}
                  className={cn("h-full rounded-full", slice.fill)}
                  style={{ width: `${(slice.count / portfolioTotal) * 100}%` }}
                  title={`${PROMOTION_STATUS_LABEL[slice.key]}: ${formatNumber(slice.count)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {portfolio.map((slice) => (
                <span
                  key={slice.key}
                  className="flex items-center gap-1.5 text-[11px] text-secondary-foreground"
                >
                  <span
                    className={cn("size-[7px] rounded-full", slice.fill)}
                    aria-hidden
                  />
                  {PROMOTION_STATUS_LABEL[slice.key]}{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatNumber(slice.count)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dos datos en rejilla en vez de un párrafo que se parte en dos líneas. */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] leading-[14px] text-muted-foreground">
              Cobertura
            </span>
            <span className="truncate text-xs leading-4 font-medium text-foreground">
              {formatPercent(categoryShare)} del catálogo
            </span>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] leading-[14px] text-muted-foreground">
              Comprometido
            </span>
            <span className="truncate text-xs leading-4 font-medium text-foreground">
              {formatCompactUSD(funding.total)}
              {funding.slices[0] && (
                <span className="font-normal text-muted-foreground">
                  {" · "}
                  {FINANCIADOR_LABEL[funding.slices[0].financiador]}{" "}
                  {formatPercent(funding.slices[0].share)}
                </span>
              )}
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
              — sin borradores, vencimientos ni reglas sin declarar.
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
