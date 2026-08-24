"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { PROMOTION_MECHANICS, type PromotionMechanic } from "@/types/domain"

import { MECHANIC_EXAMPLE, MECHANIC_LABEL } from "../lib/mechanics"
import { PROMOTION_MECHANIC_ICON } from "../lib/type-icon"

type MechanicPickerProps = {
  value: PromotionMechanic
  onChange: (mechanic: PromotionMechanic) => void
}

/** Paso 1 del wizard: la mecánica elegida define qué campos pide "Recompensa" más adelante. */
export function MechanicPicker({ value, onChange }: MechanicPickerProps) {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PROMOTION_MECHANICS.map((mechanic) => {
        const Icon = PROMOTION_MECHANIC_ICON[mechanic]
        const selected = mechanic === value
        return (
          <button
            key={mechanic}
            type="button"
            onClick={() => onChange(mechanic)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-[14px] border px-4 py-3.5 text-left transition-colors",
              selected
                ? "border-primary bg-brand-subtle"
                : "border-border bg-background hover:border-border-strong"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
              </div>
              {selected && <Check className="size-4 text-primary" />}
            </div>
            <p className="text-[13px] font-semibold text-foreground">
              {MECHANIC_LABEL[mechanic]}
            </p>
            <p className="text-xs leading-[16px] text-muted-foreground">
              {MECHANIC_EXAMPLE[mechanic]}
            </p>
          </button>
        )
      })}
    </div>
  )
}
