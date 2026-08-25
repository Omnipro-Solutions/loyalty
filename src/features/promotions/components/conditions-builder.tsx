"use client"

import { useWatch, type Control } from "react-hook-form"

import { countLeavesAndDepth } from "../lib/condition-tree"
import { ConditionTreeGroup } from "./condition-tree-group"
import type { ConditionOptions } from "../lib/queries"
import type { ConditionGroupValues, PromotionValues } from "../schemas"

type ConditionsBuilderProps = {
  control: Control<PromotionValues>
  onChange: (next: ConditionGroupValues) => void
  options: ConditionOptions
}

/**
 * Figma "Card · Condiciones (árbol)" (1395:68, dentro de "07.2 · Paso 2 ·
 * Condiciones · árbol" 1395:6) — header con el conteo estructural
 * ("CONDICIONES · N en M niveles", puro cálculo sobre la forma del árbol,
 * sin consultar datos reales) más el árbol recursivo de grupos Y/O.
 */
export function ConditionsBuilder({
  control,
  onChange,
  options,
}: ConditionsBuilderProps) {
  const tree = useWatch({ control, name: "conditions" })
  const { leaves, maxDepth } = countLeavesAndDepth(tree)

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-[9px] font-semibold tracking-[0.5px] text-muted-foreground uppercase">
        {leaves === 0
          ? "CONDICIONES"
          : `CONDICIONES  ·  ${leaves} en ${maxDepth} nivel${maxDepth > 1 ? "es" : ""}`}
      </p>
      <ConditionTreeGroup
        node={tree}
        depth={0}
        onChange={onChange}
        options={options}
      />
    </div>
  )
}
