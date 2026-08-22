import * as React from "react"

import { FIELD_CHROME } from "@/components/form/field"
import { cn } from "@/lib/utils"

type CurrencyInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  moneda?: string
}

/**
 * Figma "Form / Input · Moneda" (708:471): prefijo fijo ("COP $") sobre
 * bg-subtle + valor numérico. El borde/estados viven en el contenedor y
 * reaccionan al input real vía `:has()`/`:focus-within`, no hay estado
 * propio duplicado.
 */
export function CurrencyInput({
  className,
  moneda = "COP $",
  ...props
}: CurrencyInputProps) {
  return (
    <div
      className={cn(
        FIELD_CHROME,
        "flex w-full items-stretch overflow-hidden focus-within:border-2 focus-within:border-ring",
        className
      )}
    >
      <span className="flex shrink-0 items-center bg-muted px-[13px] py-2.5 text-[13px] leading-[19px] font-medium text-muted-foreground">
        {moneda}
      </span>
      <input
        type="number"
        inputMode="decimal"
        className="min-w-0 flex-1 [appearance:textfield] bg-transparent py-2.5 pr-[13px] pl-3 text-[13px] leading-[19px] text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...props}
      />
    </div>
  )
}
