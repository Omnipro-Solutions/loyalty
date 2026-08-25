"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import type { CouponStepId } from "../lib/steps"

type StepperItem = { id: CouponStepId; label: string; summary?: string }

type CouponStepperProps = {
  steps: StepperItem[]
  current: CouponStepId
  onStepClick: (id: CouponStepId) => void
}

/**
 * Riel vertical (Figma 13.3 "Rail · pasos") — a diferencia del horizontal
 * de promociones, aquí cada paso lleva un resumen dinámico de lo elegido
 * ("aud_vip_inact_60 · dinámica · 1.240"), así que necesita alto variable y
 * no cabe en una fila. Geometría de riel vertical igual a la que ya resolvió
 * `product-history-card.tsx` (columna de círculos + conector).
 */
export function CouponStepper({
  steps,
  current,
  onStepClick,
}: CouponStepperProps) {
  // `current` siempre es uno de los `steps` — `coupon-batch-form.tsx` ya
  // normaliza a "origin" antes de pasarlo, así que `findIndex` nunca da -1.
  const currentIndex = steps.findIndex((s) => s.id === current)

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl bg-background p-4 shadow-form-section">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Progreso
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            {currentIndex} de {steps.length}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(currentIndex / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col">
        {steps.map((step, index) => {
          const isDone = index < currentIndex
          const isActive = index === currentIndex
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg px-2 py-2 text-left",
                isActive && "bg-accent"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isDone
                    ? "bg-success text-success-foreground"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-[13px] font-medium",
                    isActive || isDone
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.summary && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {step.summary}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
