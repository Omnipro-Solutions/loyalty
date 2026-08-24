"use client"

import { Check } from "lucide-react"
import { Fragment } from "react"

import { cn } from "@/lib/utils"

import type { CouponStepId } from "../lib/steps"

type CouponStepperProps = {
  steps: { id: CouponStepId; label: string }[]
  current: CouponStepId
  onStepClick: (id: CouponStepId) => void
}

/**
 * Mismo patrón visual que `PromotionStepper` (círculo + etiqueta + conector,
 * horizontal, interactivo) — aquí por `id` en vez de índice porque la
 * secuencia de pasos depende del origen (`lib/steps.ts` `stepsForOrigin`),
 * no es una lista fija como en promociones.
 */
export function CouponStepper({
  steps,
  current,
  onStepClick,
}: CouponStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === current)

  return (
    <div className="flex w-full items-center rounded-[20px] bg-background px-[18px] py-3 shadow-form-section">
      {steps.map((step, index) => (
        <Fragment key={step.id}>
          <button
            type="button"
            onClick={() => onStepClick(step.id)}
            className="flex shrink-0 items-center gap-2.5"
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                index <= currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {index < currentIndex ? (
                <Check className="size-3.5" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "text-[13px] font-medium whitespace-nowrap",
                index <= currentIndex
                  ? "text-foreground"
                  : "text-muted-foreground",
                index === currentIndex && "font-semibold"
              )}
            >
              {step.label}
            </span>
          </button>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "mx-2.5 h-0.5 flex-1",
                index < currentIndex ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
