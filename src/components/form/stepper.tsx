"use client"

import { cn } from "@/lib/utils"

type StepperProps = {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

/** Figma "Form / Stepper" (708:511): valor de solo lectura + botones −/+ sobre bg-subtle. */
export function Stepper({
  value,
  onValueChange,
  min = 1,
  max = 999,
  step = 1,
  disabled,
  className,
}: StepperProps) {
  return (
    <div
      className={cn(
        "flex items-center overflow-hidden rounded-lg border border-input bg-background pl-[13px] transition-colors focus-within:border-2 focus-within:border-ring",
        disabled && "border-input bg-muted",
        className
      )}
    >
      <span
        className={cn(
          "flex-1 py-2.5 text-[13px] leading-[19px] font-medium",
          disabled ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Disminuir"
        disabled={disabled || value <= min}
        onClick={() => onValueChange(Math.max(min, value - step))}
        className="flex items-center justify-center bg-muted px-3.5 py-[11px] text-sm leading-[18px] font-medium text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        −
      </button>
      <button
        type="button"
        aria-label="Aumentar"
        disabled={disabled || value >= max}
        onClick={() => onValueChange(Math.min(max, value + step))}
        className="flex items-center justify-center bg-muted px-3.5 py-[11px] text-sm leading-[18px] font-medium text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        +
      </button>
    </div>
  )
}
