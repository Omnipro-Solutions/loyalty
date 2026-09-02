"use client"

import { Download } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterSelect } from "@/components/filters/select"
import { Segmented } from "@/components/filters/segmented"
import { Button } from "@/components/ui/button"

import { DateRangePicker } from "./date-range-picker"
import {
  COMPARISON_LABEL,
  COMPARISON_MODES,
  DASHBOARD_RANGES,
  DEFAULT_COMPARISON,
  isComparisonMode,
  isDashboardRange,
  resolveWindow,
  toDateParam,
  type ComparisonMode,
} from "../lib/filters"
import type { SegmentOption } from "../lib/queries"

const QUICK_RANGES = DASHBOARD_RANGES.map((value) => ({
  value,
  label: value.toUpperCase(),
}))

const COMPARISON_OPTIONS = COMPARISON_MODES.map((value) => ({
  value,
  label: COMPARISON_LABEL[value],
}))

type DenseDashboardFiltersProps = { segments: SegmentOption[] }

/**
 * Figma "Filtros" (646:1161). Todos los controles son reales: cada cambio
 * actualiza `rango`/`desde`/`hasta`/`comparar`/`segmento` en la URL y
 * `analitica/page.tsx` vuelve a consultar Supabase — mismo patrón
 * `searchParams` → re-query server-side que las otras cinco barras de
 * filtros del repo (`router.push`, nunca `replace`; sin `page` que borrar
 * aquí, esta pantalla no pagina nada).
 *
 * Se eliminó el control "Tienda" del Figma: `points_ledger` no tiene
 * `tienda_id` y el reparto demo de `pedidos` entre tiendas es inservible
 * (49% en una sola tienda). "Exportar reporte" está deshabilitado y lo dice:
 * en el ambiente de demo no hay generación de reportes, y un botón que no
 * responde sin explicar por qué se lee como un fallo. Fuera
 * de alcance de este cambio, no es un control roto.
 */
export function DenseDashboardFilters({
  segments,
}: DenseDashboardFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    router.push(`${pathname}?${params.toString()}`)
  }

  const rangoParam = searchParams.get("rango") ?? undefined
  const desdeParam = searchParams.get("desde") ?? undefined
  const hastaParam = searchParams.get("hasta") ?? undefined
  const hasCustomDates = !!desdeParam && !!hastaParam
  const activeRange = hasCustomDates
    ? ""
    : isDashboardRange(rangoParam)
      ? rangoParam
      : "30d"

  const window = resolveWindow({
    rango: rangoParam,
    desde: desdeParam,
    hasta: hastaParam,
  })
  const displayTo = new Date(window.to.getTime() - 86_400_000) // último día inclusivo, para el picker

  const compararParam = searchParams.get("comparar") ?? undefined
  const comparar: ComparisonMode = isComparisonMode(compararParam)
    ? compararParam
    : DEFAULT_COMPARISON

  const segmentoId = searchParams.get("segmento")

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-[20px] bg-background px-4 py-3 shadow-form-section">
      <Segmented
        options={QUICK_RANGES}
        value={activeRange}
        onValueChange={(value) =>
          update((params) => {
            params.set("rango", value)
            params.delete("desde")
            params.delete("hasta")
          })
        }
      />

      <DateRangePicker
        from={window.from}
        to={displayTo}
        max={new Date()}
        onSelect={({ from, to }) =>
          update((params) => {
            params.set("desde", toDateParam(from))
            params.set("hasta", toDateParam(to))
            params.delete("rango")
          })
        }
      />

      <FilterSelect
        label="vs"
        options={COMPARISON_OPTIONS}
        value={[comparar]}
        onChange={(value) =>
          update((params) => {
            if (value[0] && value[0] !== DEFAULT_COMPARISON) {
              params.set("comparar", value[0])
            } else {
              params.delete("comparar")
            }
          })
        }
      />

      <FilterSelect
        label="Segmento"
        placeholder="Todos"
        options={segments.map((s) => ({ value: s.id, label: s.nombre }))}
        value={segmentoId ? [segmentoId] : []}
        onChange={(value) =>
          update((params) => {
            if (value[0]) params.set("segmento", value[0])
            else params.delete("segmento")
          })
        }
      />

      <div className="flex-1" />

      {/* El `title` va en el envoltorio y no en el botón: un elemento
          `disabled` no recibe eventos de puntero, así que su propio tooltip
          nunca llegaría a mostrarse. */}
      <span
        title="La exportación de reportes no está disponible en el ambiente de demo."
        className="shrink-0"
      >
        <Button
          variant="outline"
          disabled
          aria-describedby="export-demo-hint"
          className="h-auto gap-2 rounded-[9px] px-3.5 py-2 text-xs font-medium"
        >
          <Download className="size-3.5" />
          Exportar reporte
        </Button>
      </span>
      <span id="export-demo-hint" className="sr-only">
        La exportación de reportes no está disponible en el ambiente de demo.
      </span>
    </div>
  )
}
