"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { FilterSelect } from "@/components/filters/select"
import { formatNumber, formatPercent, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import { BENEFIT_TYPE_LABEL } from "../lib/labels"
import {
  PERFORMANCE_SORTS,
  type PerformanceSort,
} from "../lib/result-analytics"
import type { PerformanceTable } from "../lib/result-queries"

const SORT_LABEL: Record<PerformanceSort, string> = {
  resultado: "Resultado",
  utilizacion: "Utilización",
  usos: "Usos",
  clientes: "Clientes",
  costo: "Costo",
}

/**
 * Cifra con su barra debajo. La barra no añade información —el número ya
 * está—, pero permite comparar tres filas de un vistazo sin leerlas: es la
 * diferencia entre una tabla que se escanea y una que se lee.
 */
function MiniBar({
  text,
  ratio,
  tone,
}: {
  text: string
  ratio: number
  tone: string
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span>{text}</span>
      <div className="h-1 w-full max-w-[56px] overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
        />
      </div>
    </div>
  )
}

/**
 * "Desempeño de promociones" (spec §10) — comparar el portafolio.
 *
 * No es la tabla administrativa de `/promociones`: aquí no hay estado,
 * vigencia ni acciones. Solo las cinco columnas que permiten decidir cuál
 * revisar, con microbarras para que el orden se vea antes de leerse y la
 * primera fila destacada, que es la pregunta que trae comercial ("¿cuál está
 * funcionando mejor?").
 */
export function PromotionsPerformanceTable({
  table,
}: {
  table: PerformanceTable
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = useTransition()

  /** Mismo criterio que la gráfica: `replace`, sin saltar al inicio, y sin escribir el valor por defecto. */
  function setSort(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "resultado") params.delete("orden")
    else params.set("orden", value)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  // La barra se escala contra el máximo de la columna que ORDENA, para que
  // la longitud coincida con el orden que el usuario está viendo.
  const values = table.rows
    .map((row) => {
      switch (table.sort) {
        case "resultado":
          return row.resultado
        case "utilizacion":
          return row.utilizacion
        case "usos":
          return row.usos
        case "clientes":
          return row.clientes
        case "costo":
          return row.costo
      }
    })
    .filter((v): v is number => v !== null)
  const max = values.length > 0 ? Math.max(...values) : 0
  // El ROI no tiene techo natural, así que la barra se escala contra el
  // mayor de la tabla — un 5,2× no es "el 520 % de algo".
  const roiValues = table.rows
    .map((row) => row.resultado)
    .filter((v): v is number => v !== null)
  const maxRoi = roiValues.length > 0 ? Math.max(...roiValues) : 0

  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[15px] leading-[21px] font-semibold text-foreground">
            Desempeño de promociones
          </p>
          <p className="text-xs text-muted-foreground">
            Solo las que tuvieron uso en el período
            {isPending && " · actualizando…"}
          </p>
        </div>
        <FilterSelect
          label="Ordenar por"
          value={[table.sort]}
          options={PERFORMANCE_SORTS.map((s) => ({
            value: s,
            label: SORT_LABEL[s],
          }))}
          onChange={([next]) => next && setSort(next)}
        />
      </div>

      {table.rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Ninguna promoción del filtro registra canjes en el período.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                <th className="py-2 pr-3 text-left font-semibold">Promoción</th>
                <th className="px-3 py-2 text-right font-semibold">Usos</th>
                <th className="px-3 py-2 text-right font-semibold">
                  Utilización
                </th>
                <th className="py-2 pl-3 text-right font-semibold">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="max-w-[260px] py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      {/* El puesto, explícito. Con la tabla ordenable por
                          cinco criterios distintos, "la primera fila" deja
                          de ser evidente en cuanto se cambia el orden. */}
                      <span
                        className={cn(
                          "flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                          index === 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </span>
                      <Link
                        href={`/promociones/${row.id}`}
                        className={cn(
                          "min-w-0 truncate text-xs text-foreground hover:underline",
                          index === 0 && "font-semibold"
                        )}
                      >
                        {row.nombre}
                      </Link>
                    </div>
                    {/* Clientes vive aquí y no en su propia columna: en
                        media pantalla, cinco columnas numéricas dejaban la
                        tabla en scroll horizontal permanente. */}
                    <p className="truncate pl-[26px] text-[10px] text-muted-foreground">
                      {BENEFIT_TYPE_LABEL[row.mecanica]} ·{" "}
                      {formatNumber(row.clientes)} clientes
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-foreground tabular-nums">
                    {formatNumber(row.usos)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-foreground tabular-nums">
                    {row.utilizacion !== null ? (
                      <MiniBar
                        text={formatPercent(row.utilizacion)}
                        ratio={row.utilizacion}
                        tone="bg-data-indigo"
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-xs font-semibold text-foreground tabular-nums">
                    {row.resultado !== null ? (
                      <MiniBar
                        text={`${formatNumber(row.resultado)} ×`}
                        ratio={maxRoi > 0 ? row.resultado / maxRoi : 0}
                        tone="bg-success"
                      />
                    ) : (
                      <span className="font-normal text-muted-foreground">
                        —
                      </span>
                    )}
                    <p className="text-[10px] font-normal text-muted-foreground">
                      {formatUSD(row.costo)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {max > 0 && (
        <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
          Ordenado por {SORT_LABEL[table.sort].toLowerCase()}. Las promociones
          sin ese dato quedan al final: no tener ROI registrado no es tener ROI
          cero.
        </p>
      )}
    </div>
  )
}
