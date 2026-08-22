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
 * Borde/fondo/estados compartidos por los campos compuestos que no pueden
 * usar `Input` directamente (traen prefijo, botones o un trigger propio):
 * CurrencyInput, PasswordInput, Stepper, Multiselect. Mismo tratamiento
 * visual que `ui/input.tsx`, para no repetir el string de clases en cada uno.
 */
export const FIELD_CHROME =
  "rounded-lg border border-input bg-background transition-colors has-[:disabled]:border-input has-[:disabled]:bg-muted has-[[aria-invalid=true]]:border-destructive"

/**
 * Envoltorio de campo compartido por todos los controles de formulario
 * (Figma "Form / Input" 708:313 y análogos): etiqueta 12/17 + asterisco
 * rojo opcional, el control, y texto de ayuda/error 11/15 debajo.
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
