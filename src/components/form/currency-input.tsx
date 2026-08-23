import * as React from "react"

import { FIELD_CHROME } from "@/components/form/field"
import { cn } from "@/lib/utils"

type CurrencyInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  currency?: string
}

/**
 * Figma "Form / Input · Moneda" (708:471): fixed prefix ("COP $") over
 * bg-subtle + numeric value. Border/states live on the container and react
 * to the real input via `:has()`/`:focus-within` — no duplicated state of
 * its own.
 */
export function CurrencyInput({
  className,
  currency = "COP $",
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
        {currency}
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
