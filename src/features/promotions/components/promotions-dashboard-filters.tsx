"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { RotateCcw } from "lucide-react"

import { FilterSelect } from "@/components/filters/select"
import { Segmented } from "@/components/filters/segmented"
import {
  BENEFIT_TYPES,
  CHANNEL_SCOPES,
  FINANCIADORES,
  PROMOTION_TYPES,
} from "@/types/domain"

import {
  DASHBOARD_VIGENCIA_RANGES,
  DEFAULT_VIGENCIA_RANGE,
  isVigenciaRange,
  resolveVigenciaWindow,
  toDateParam,
} from "../lib/dashboard-filters"
import {
  BENEFIT_TYPE_LABEL,
  CHANNEL_SCOPE_LABEL,
  FINANCIADOR_LABEL,
  PROMOTION_TYPE_LABEL,
} from "../lib/labels"
import type { PromotionOption } from "../lib/queries"
import { PromotionsDateRangePicker } from "./promotions-date-range-picker"

const RANGE_LABEL: Record<string, string> = {
  [DEFAULT_VIGENCIA_RANGE]: "Todo",
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  "12m": "12M",
}

const RANGE_OPTIONS = [
  DEFAULT_VIGENCIA_RANGE,
  ...DASHBOARD_VIGENCIA_RANGES,
].map((value) => ({ value, label: RANGE_LABEL[value] }))

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : []
}

function setListParam(
  params: URLSearchParams,
  key: string,
  value: string[]
): void {
  if (value.length > 0) params.set(key, value.join(","))
  else params.delete(key)
}

/**
 * Filtros de "Panel de promociones" — mismo lenguaje de "Analítica de
 * Loyalty.dc.html" (pills de periodo, chip de fechas, chips multiselect por
 * dimensión), pero sobre dimensiones reales de `promociones` (tipo, canal,
 * financiador) y vigencia (no eventos/conversión/audiencia: no existen).
 * Cada cambio actualiza los searchParams; la página server-side vuelve a
 * consultar los widgets con el mismo filtro (`applyDashboardFilters`).
 * "Promoción" deja aislar una o varias por nombre — útil para revisar el
 * detalle de una sola sin salir del panel.
 */
type PromotionsDashboardFiltersProps = {
  promotionOptions: PromotionOption[]
}

export function PromotionsDashboardFilters({
  promotionOptions,
}: PromotionsDashboardFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = useTransition()

  /**
   * `replace` y no `push`: cada toque de un filtro es un ajuste de la misma
   * vista, no un destino nuevo. Con `push`, volver atrás obligaba a deshacer
   * clic a clic todos los filtros tocados antes de salir de la pantalla.
   *
   * `scroll: false` por lo mismo: los filtros están arriba pero los
   * selectores de la gráfica y de la tabla están a media página, y saltar al
   * inicio en cada cambio hacía perder de vista justo el bloque que se
   * estaba ajustando. Mismo criterio que `PromotionsDimensionPicker`.
   */
  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  /** Todo lo que este componente sabe poner en la URL — y por tanto todo lo que "Limpiar" tiene que poder quitar. */
  const FILTER_PARAMS = [
    "rango",
    "desde",
    "hasta",
    "promocion",
    "mecanica",
    "tipo",
    "canal",
    "financiador",
  ]

  const rangoParam = searchParams.get("rango") ?? undefined
  const desde = searchParams.get("desde") ?? undefined
  const hasta = searchParams.get("hasta") ?? undefined
  const isCustomRange = Boolean(desde && hasta)
  const activeRange = isCustomRange
    ? ""
    : isVigenciaRange(rangoParam)
      ? rangoParam
      : DEFAULT_VIGENCIA_RANGE

  const window = resolveVigenciaWindow({ rango: rangoParam, desde, hasta })

  const tipos = parseList(searchParams.get("tipo"))
  const canales = parseList(searchParams.get("canal"))
  const financiadores = parseList(searchParams.get("financiador"))
  const promociones = parseList(searchParams.get("promocion"))
  const mecanicas = parseList(searchParams.get("mecanica"))

  const hasActiveFilters = FILTER_PARAMS.some((key) => searchParams.has(key))

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Segmented
        options={RANGE_OPTIONS}
        value={activeRange}
        onValueChange={(value) =>
          update((params) => {
            params.delete("desde")
            params.delete("hasta")
            if (value === DEFAULT_VIGENCIA_RANGE) params.delete("rango")
            else params.set("rango", value)
          })
        }
      />
      <PromotionsDateRangePicker
        from={window?.from}
        to={window?.to}
        onSelect={(range) =>
          update((params) => {
            params.delete("rango")
            params.set("desde", toDateParam(range.from))
            params.set("hasta", toDateParam(range.to))
          })
        }
      />
      <FilterSelect
        label="Promoción"
        multiple
        options={promotionOptions.map((promotion) => ({
          value: promotion.id,
          label: promotion.name,
        }))}
        value={promociones}
        onChange={(value) =>
          update((params) => setListParam(params, "promocion", value))
        }
      />
      <FilterSelect
        label="Mecánica"
        multiple
        options={BENEFIT_TYPES.map((mecanica) => ({
          value: mecanica,
          label: BENEFIT_TYPE_LABEL[mecanica],
        }))}
        value={mecanicas}
        onChange={(value) =>
          update((params) => setListParam(params, "mecanica", value))
        }
      />
      <FilterSelect
        label="Tipo"
        multiple
        options={PROMOTION_TYPES.map((tipo) => ({
          value: tipo,
          label: PROMOTION_TYPE_LABEL[tipo],
        }))}
        value={tipos}
        onChange={(value) =>
          update((params) => setListParam(params, "tipo", value))
        }
      />
      <FilterSelect
        label="Canal"
        multiple
        options={CHANNEL_SCOPES.map((canal) => ({
          value: canal,
          label: CHANNEL_SCOPE_LABEL[canal],
        }))}
        value={canales}
        onChange={(value) =>
          update((params) => setListParam(params, "canal", value))
        }
      />
      <FilterSelect
        label="Financiador"
        multiple
        options={FINANCIADORES.map((financiador) => ({
          value: financiador,
          label: FINANCIADOR_LABEL[financiador],
        }))}
        value={financiadores}
        onChange={(value) =>
          update((params) => setListParam(params, "financiador", value))
        }
      />
      {/* Deseleccionar de a uno es posible en cada desplegable, pero con seis
          filtros abiertos volver al estado inicial eran seis viajes. El botón
          se desactiva —no se esconde— cuando no hay nada que limpiar: que
          aparezca y desaparezca movería el resto de la barra. */}
      <button
        type="button"
        disabled={!hasActiveFilters}
        onClick={() =>
          update((params) => {
            for (const key of FILTER_PARAMS) params.delete(key)
          })
        }
        className="flex items-center gap-1.5 rounded-[10px] border border-border bg-background py-[9px] pr-3 pl-3.5 text-xs leading-4 text-muted-foreground transition-colors enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RotateCcw className="size-[11px]" />
        Limpiar filtros
      </button>
      {isPending && (
        <span className="text-[11px] text-muted-foreground">Actualizando…</span>
      )}
    </div>
  )
}
