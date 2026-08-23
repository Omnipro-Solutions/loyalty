"use client"

import { Check } from "lucide-react"
import { Fragment } from "react"

import { cn } from "@/lib/utils"

type PromotionStepperProps = {
  steps: readonly string[]
  current: number
  onStepClick: (index: number) => void
}

/** Figma "Stepper" (633:798): 5 pasos, círculo + etiqueta + conector — interactivo (click salta al paso). */
export function PromotionStepper({
  steps,
  current,
  onStepClick,
}: PromotionStepperProps) {
  return (
    <div className="flex w-full items-center rounded-[20px] bg-background px-[18px] py-3 shadow-form-section">
      {steps.map((label, index) => (
        <Fragment key={label}>
          <button
            type="button"
            onClick={() => onStepClick(index)}
            className="flex shrink-0 items-center gap-2.5"
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                index <= current
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {index < current ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-[13px] font-medium whitespace-nowrap",
                index <= current ? "text-foreground" : "text-muted-foreground",
                index === current && "font-semibold"
              )}
            >
              {label}
            </span>
          </button>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "mx-2.5 h-0.5 flex-1",
                index < current ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
