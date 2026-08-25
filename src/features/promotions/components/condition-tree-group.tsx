"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CONDITION_COMBINATORS, type ConditionCombinator } from "@/types/domain"

import { ConditionLeafRow } from "./condition-leaf-row"
import {
  isConditionGroup,
  withChildRemoved,
  withChildReplaced,
  withConditionAdded,
  withGroupAdded,
} from "../lib/condition-tree"
import {
  CONDITION_COMBINATOR_CONNECTOR_LABEL,
  CONDITION_COMBINATOR_LABEL,
} from "../lib/labels"
import type {
  ConditionCategory,
  ConditionCity,
  ConditionSegment,
  CouponBatchOption,
} from "../lib/queries"
import type { ConditionGroupValues, ConditionNodeValues } from "../schemas"

const COMBINATOR_TRIGGER =
  "w-fit gap-1 rounded-[7px] border-primary bg-background px-2 py-[3px] text-[10.5px] font-semibold text-primary leading-[15px] whitespace-nowrap"

type ConditionTreeGroupProps = {
  node: ConditionGroupValues
  depth: number
  onChange: (next: ConditionGroupValues) => void
  onRemove?: () => void
  categories: ConditionCategory[]
  cities: ConditionCity[]
  segments: ConditionSegment[]
  couponBatches: CouponBatchOption[]
}

/**
 * Renderer recursivo de un grupo Y/O — Figma "Grupo · AND"/"Grupo · OR"
 * (1396:211 / 1396:278, dentro de "07.2 · Paso 2 · Condiciones · árbol"
 * 1395:6). Cada nivel recibe `onChange(nextGroup)` de su padre y usa los
 * helpers inmutables de `lib/condition-tree.ts` para producir el
 * siguiente estado antes de llamar a su propio `onChange` — burbujea
 * hasta la raíz (`ConditionsBuilder`), la única que hace
 * `setValue("conditions", next)`. Sin tope de profundidad: cada grupo,
 * root o anidado, tiene las mismas 2 acciones ("+ Condición"/
 * "+ Subgrupo") para poder seguir anidando — el mock del Figma solo
 * dibuja "+ Condición en este subgrupo" en su único subgrupo de ejemplo,
 * pero el alcance elegido para esta implementación fue "sin límite", así
 * que aquí no hay un tope de 2 niveles.
 */
export function ConditionTreeGroup({
  node,
  depth,
  onChange,
  onRemove,
  categories,
  cities,
  segments,
  couponBatches,
}: ConditionTreeGroupProps) {
  const isRoot = depth === 0

  function updateChild(index: number, next: ConditionNodeValues) {
    onChange(withChildReplaced(node, index, next))
  }
  function removeChild(index: number) {
    onChange(withChildRemoved(node, index))
  }
  function toggleCombinador() {
    onChange({
      ...node,
      combinador: node.combinador === "todas" ? "alguna" : "todas",
    })
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 rounded-xl px-[11px] py-3",
        isRoot
          ? "border border-border bg-neutral-50"
          : "border border-l-[3px] border-primary-200 bg-background"
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[10.5px] leading-4 whitespace-nowrap text-secondary-foreground">
            {isRoot
              ? "La promoción aplica si el carrito cumple"
              : "Dentro de este grupo, si cumple"}
          </p>
          <Select
            value={node.combinador}
            onValueChange={(v) =>
              onChange({ ...node, combinador: v as ConditionCombinator })
            }
          >
            <SelectTrigger className={COMBINATOR_TRIGGER}>
              <SelectValue>
                {(v: ConditionCombinator) => CONDITION_COMBINATOR_LABEL[v]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CONDITION_COMBINATORS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CONDITION_COMBINATOR_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-fit shrink-0 rounded-full bg-primary-200 px-1.5 py-px text-[8.5px] font-medium text-primary-800">
            {isRoot ? "Grupo principal" : `Subgrupo · nivel ${depth + 1}`}
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-[10px] font-medium text-muted-foreground hover:text-destructive"
            >
              Eliminar subgrupo
            </button>
          )}
        </div>
      </div>

      {node.condiciones.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Sin condiciones en este grupo.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {node.condiciones.map((child, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              {index > 0 && (
                <div className="flex items-center gap-2 py-px">
                  <button
                    type="button"
                    onClick={toggleCombinador}
                    className="flex shrink-0 items-center gap-1 rounded-full border border-primary-200 bg-background px-2 py-0.5 text-[9.5px] font-semibold text-primary"
                  >
                    {CONDITION_COMBINATOR_CONNECTOR_LABEL[node.combinador]}
                  </button>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              {isConditionGroup(child) ? (
                <ConditionTreeGroup
                  node={child}
                  depth={depth + 1}
                  onChange={(next) => updateChild(index, next)}
                  onRemove={() => removeChild(index)}
                  categories={categories}
                  cities={cities}
                  segments={segments}
                  couponBatches={couponBatches}
                />
              ) : (
                <ConditionLeafRow
                  condition={child}
                  categories={categories}
                  cities={cities}
                  segments={segments}
                  couponBatches={couponBatches}
                  onChange={(next) => updateChild(index, next)}
                  onRemove={() => removeChild(index)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange(withConditionAdded(node))}
          className="flex flex-1 items-center justify-center rounded-lg border border-primary bg-background py-[7px] text-[10.5px] font-semibold text-primary"
        >
          + Condición
        </button>
        <button
          type="button"
          onClick={() => onChange(withGroupAdded(node))}
          className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-background py-[7px] text-[10.5px] font-semibold text-secondary-foreground"
        >
          + Subgrupo
        </button>
      </div>
    </div>
  )
}
