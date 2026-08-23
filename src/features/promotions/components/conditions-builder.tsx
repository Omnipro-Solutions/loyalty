"use client"

import { Plus } from "lucide-react"
import { useFieldArray, useWatch, type Control } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CONDITION_COMBINATORS } from "@/types/domain"
import type { ConditionCombinator } from "@/types/domain"

import { ConditionRow } from "./condition-row"
import { CONDITION_COMBINATOR_LABEL } from "../lib/labels"
import type {
  ConditionCategory,
  ConditionCity,
  ConditionSegment,
} from "../lib/queries"
import type { PromotionValues } from "../schemas"

type ConditionsBuilderProps = {
  control: Control<PromotionValues>
  onCombinatorChange: (value: ConditionCombinator) => void
  categories: ConditionCategory[]
  cities: ConditionCity[]
  segments: ConditionSegment[]
}

/** Figma "Card · Condiciones (SI)" (633:851): combinador AND/OR + filas dinámicas + "Agregar condición". */
export function ConditionsBuilder({
  control,
  onCombinatorChange,
  categories,
  cities,
  segments,
}: ConditionsBuilderProps) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "conditions",
  })
  const combinator = useWatch({ control, name: "conditionCombinator" })

  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex items-center gap-2">
        {CONDITION_COMBINATORS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onCombinatorChange(value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
              combinator === value
                ? "border-primary bg-brand-subtle text-primary-800"
                : "border-border bg-background text-secondary-foreground"
            )}
          >
            {CONDITION_COMBINATOR_LABEL[value]}
          </button>
        ))}
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sin condiciones: la promoción aplica a todos los clientes.
        </p>
      )}

      {fields.map((field, index) => (
        <ConditionRow
          key={field.id}
          rowNumber={index + 1}
          condition={field}
          categories={categories}
          cities={cities}
          segments={segments}
          onChange={(next) => update(index, next)}
          onRemove={() => remove(index)}
        />
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => append({ campo: "categoria", valor: [] })}
        className="w-fit"
      >
        <Plus className="size-3.5" />
        Agregar condición
      </Button>
    </div>
  )
}
