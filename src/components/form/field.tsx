import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type FieldProps = {
  label: string
  required?: boolean
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}

/**
 * Border/background/states shared by composite fields that can't use
 * `Input` directly (they bring their own prefix, buttons, or trigger):
 * CurrencyInput, PasswordInput, Stepper, Multiselect. Same visual treatment
 * as `ui/input.tsx`, so the class string isn't repeated in each one.
 */
export const FIELD_CHROME =
  "rounded-lg border border-input bg-background transition-colors has-[:disabled]:border-input has-[:disabled]:bg-muted has-[[aria-invalid=true]]:border-destructive"

/**
 * Field wrapper shared by all form controls (Figma "Form / Input" 708:313
 * and analogous): 12/17 label + optional red asterisk, the control, and
 * 11/15 help/error text below.
 */
export function Field({
  label,
  required,
  hint,
  error,
  htmlFor,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1">
        <Label
          htmlFor={htmlFor}
          className="text-[12px] leading-[17px] font-medium text-muted-foreground"
        >
          {label}
        </Label>
        {required && (
          <span className="text-[12px] leading-[17px] font-medium text-destructive">
            *
          </span>
        )}
      </div>
      {children}
      {(error ?? hint) && (
        <p
          className={cn(
            "text-[11px] leading-[15px]",
            error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
