import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import type { CouponStepId } from "../lib/steps"

type CouponStepperProps = {
  steps: { id: CouponStepId; label: string }[]
  current: CouponStepId
  recap: Partial<Record<CouponStepId, string>>
  onStepClick: (id: CouponStepId) => void
}

/**
 * Rail LATERAL (el de promociones es horizontal) — geometría de riel
 * vertical calcada de `product-history-card.tsx` (columna `w-3` con dos
 * divs `w-[1.5px] bg-border`, punto `size-3 ring-[3px] ring-background`):
 * mismo riel, distinto contenido.
 */
export function CouponStepper({
  steps,
  current,
  recap,
  onStepClick,
}: CouponStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === current)

  return (
    <div className="flex w-[240px] shrink-0 flex-col gap-0 rounded-2xl bg-background p-4 shadow-form-section">
      {steps.map((step, index) => {
        const isFirst = index === 0
        const isLast = index === steps.length - 1
        const done = index < currentIndex
        const active = index === currentIndex

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick(step.id)}
            className="flex w-full items-start gap-3 py-1.5 text-left"
          >
            <div className="relative flex w-3 shrink-0 flex-col items-center self-stretch">
              {!isFirst && (
                <div className="absolute top-0 h-1/2 w-[1.5px] bg-border" />
              )}
              <span
                className={cn(
                  "z-10 mt-1 flex size-3 shrink-0 items-center justify-center rounded-full ring-[3px] ring-background",
                  done && "bg-primary",
                  active && "bg-primary",
                  !done && !active && "bg-muted-foreground/40"
                )}
              >
                {done && <Check className="size-2 text-primary-foreground" />}
              </span>
              {!isLast && (
                <div className="absolute bottom-0 h-1/2 w-[1.5px] bg-border" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-3">
              <p
                className={cn(
                  "text-[13px] leading-[18px] font-medium",
                  active
                    ? "font-semibold text-foreground"
                    : done
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {recap[step.id] && (
                <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
                  {recap[step.id]}
                </p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
