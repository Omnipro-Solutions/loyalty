"use client"

import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { MultiConditionForm } from "./multi-condition-form"
import type { GraphVariable } from "./node-variables"

type BranchCondition = { combinator: string; rules: unknown[] }

type Branch = {
  id: string
  label: string
  /**
   * Condición propia de la rama — lo que decide si el socio sale por aquí.
   * Misma forma que `config.condiciones` de `condicion_multiple`, para que
   * el mismo editor sirva para las dos y no haya dos gramáticas de condición
   * en el producto.
   */
  condition?: BranchCondition
  /** Proporción estimada de la cohorte para Simular — ya no enruta. Ver `simulate.ts`. */
  shareEstimate?: number
  /** Campo anterior a la condición por rama; se sigue leyendo como respaldo de `shareEstimate`. */
  weight?: number
}

const EMPTY_CONDITION: BranchCondition = { combinator: "and", rules: [] }

/** Ramas de arranque de un bloque recién soltado — se muestran hasta que el usuario toque algo; nunca se mutan en sitio (cada `update` construye un array nuevo). */
const DEFAULT_BRANCHES: Branch[] = [
  { id: "rama_1", label: "Rama 1", shareEstimate: 50 },
  { id: "por_defecto", label: "Por defecto", shareEstimate: 50 },
]

/** La rama que se toma cuando ninguna otra condición se cumple: por definición no tiene condición propia. */
const FALLBACK_BRANCH_ID = "por_defecto"

/**
 * Pestaña "Ramas" para `ramificacion_valor`/`split_ab`.
 *
 * El cambio de fondo respecto a la versión anterior: en
 * `ramificacion_valor` las ramas ya **no se reparten por peso**. Repartir
 * por peso es simulación —tirar un dado y mandar al 30% por aquí—, no
 * enrutamiento: no había forma de decir "por esta rama salen los socios
 * Oro". Ahora cada rama lleva su propia condición y el motor toma la
 * primera que se cumple, en el orden en que están aquí; `por_defecto` es la
 * última y no lleva condición, porque es justamente la que recoge a quien no
 * cumplió ninguna.
 *
 * El porcentaje sigue existiendo, pero cambió de significado: es la
 * proporción ESTIMADA que se usa al Simular (este builder no evalúa socios
 * reales, ver `simulate.ts`), no el mecanismo de reparto. En `split_ab` sí
 * sigue siendo el mecanismo — ahí el reparto aleatorio es lo que el bloque
 * hace, así que ese modo no pide condiciones.
 */
export function BranchesTab({
  config,
  tipo,
  graphVariables = [],
  onChange,
}: {
  config: Record<string, unknown>
  /** `split_ab` reparte por peso de verdad; `ramificacion_valor` enruta por condición. */
  tipo: "ramificacion_valor" | "split_ab"
  graphVariables?: GraphVariable[]
  onChange: (config: Record<string, unknown>) => void
}) {
  // Derivado de props, sin copia local — misma razón que en
  // `accumulate-points-form.tsx`: con `useState` las ramas del nodo que
  // estaba seleccionado al montar sobreviven al cambio de selección y se
  // escriben sobre el nodo siguiente.
  const branches: Branch[] = Array.isArray(config.branches)
    ? (config.branches as Branch[])
    : DEFAULT_BRANCHES

  const routesByCondition = tipo === "ramificacion_valor"
  const [openBranchId, setOpenBranchId] = useState<string | null>(null)

  function update(next: Branch[]) {
    onChange({ ...config, branches: next })
  }

  function patch(index: number, changes: Partial<Branch>) {
    const next = [...branches]
    next[index] = { ...next[index], ...changes }
    update(next)
  }

  function ruleCount(branch: Branch): number {
    return branch.condition?.rules.length ?? 0
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-4 text-muted-foreground">
        {routesByCondition ? (
          <>
            Cada rama es un puerto de salida conectable en el canvas. El motor
            toma <b>la primera cuya condición se cumple</b>, en este orden; «Por
            defecto» recoge a quien no cumplió ninguna. El porcentaje es solo la
            estimación que usa Simular.
          </>
        ) : (
          <>
            Cada variante es un puerto de salida conectable en el canvas. Aquí
            el peso <b>sí reparte</b>: el bloque asigna al azar según ese
            porcentaje.
          </>
        )}
      </p>

      <div className="flex items-center justify-between">
        <p className="text-[10px] leading-[13px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          {routesByCondition ? "Ramas de salida" : "Variantes"}
        </p>
        <button
          type="button"
          onClick={() => {
            const branch: Branch = {
              id: crypto.randomUUID(),
              label: `Rama ${String(branches.length + 1)}`,
              shareEstimate: 0,
              ...(routesByCondition ? { condition: EMPTY_CONDITION } : {}),
            }
            // Antes de `por_defecto`, no después: el orden de esta lista ES
            // el orden de evaluación, y una rama detrás del fallback nunca
            // se tomaría.
            const fallbackIndex = branches.findIndex(
              (b) => b.id === FALLBACK_BRANCH_ID
            )
            const next =
              fallbackIndex === -1
                ? [...branches, branch]
                : [
                    ...branches.slice(0, fallbackIndex),
                    branch,
                    ...branches.slice(fallbackIndex),
                  ]
            update(next)
            setOpenBranchId(branch.id)
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-primary"
        >
          <Plus className="size-3" />
          Agregar rama
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {branches.map((branch, i) => {
          const isFallback = branch.id === FALLBACK_BRANCH_ID
          const showsCondition = routesByCondition && !isFallback
          const open = openBranchId === branch.id
          const count = ruleCount(branch)

          return (
            <div
              key={branch.id}
              className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={branch.label}
                  onChange={(e) => patch(i, { label: e.target.value })}
                  className="h-8 flex-1 bg-background text-[13px]"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    aria-label={
                      routesByCondition
                        ? `${branch.label} · proporción estimada`
                        : `${branch.label} · peso`
                    }
                    value={branch.shareEstimate ?? branch.weight ?? ""}
                    onChange={(e) =>
                      patch(i, {
                        shareEstimate: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    className="h-8 w-14 bg-background text-right text-[13px]"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quitar rama"
                  disabled={branches.length <= 1}
                  onClick={() => update(branches.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>

              {showsCondition && (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenBranchId(open ? null : branch.id)}
                    aria-expanded={open}
                    className={cn(
                      "flex items-center gap-1.5 text-left text-[11px] font-medium",
                      // Una rama sin condición no es un detalle pendiente:
                      // el motor no sabría cuándo tomarla, y `validateGraph`
                      // bloquea Publicar por ello. Se marca como error, no
                      // como texto secundario.
                      count === 0 ? "text-destructive" : "text-primary"
                    )}
                  >
                    {open ? (
                      <ChevronDown className="size-3" />
                    ) : (
                      <ChevronRight className="size-3" />
                    )}
                    {count === 0
                      ? "Sin condición — esta rama nunca se tomaría"
                      : `Condición · ${String(count)} ${count === 1 ? "regla" : "reglas"}`}
                  </button>

                  {open && (
                    <div className="rounded-lg bg-background p-2.5">
                      <MultiConditionForm
                        compact
                        graphVariables={graphVariables}
                        config={{
                          condiciones: branch.condition ?? EMPTY_CONDITION,
                        }}
                        onChange={(next) =>
                          patch(i, {
                            condition: next.condiciones as BranchCondition,
                          })
                        }
                      />
                    </div>
                  )}
                </>
              )}

              {routesByCondition && isFallback && (
                <p className="text-[11px] text-muted-foreground">
                  Sin condición por definición: es la rama que se toma cuando
                  ninguna otra se cumple.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
