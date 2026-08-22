"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"

import { cn } from "@/lib/utils"

type RadioCardProps = RadioPrimitive.Root.Props & {
  titulo: string
  descripcion: string
}

/** Figma "Form / Radio card" (709:327): 220px, rounded-xl, estado On = borde 2px + bg-accent. */
export function RadioCard({
  titulo,
  descripcion,
  className,
  ...props
}: RadioCardProps) {
  return (
    <RadioPrimitive.Root
      className={cn(
        "group/radio-card flex w-[220px] flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3.5 text-left data-checked:border-2 data-checked:border-primary data-checked:bg-accent",
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center gap-2.5">
        <span className="relative size-[18px] shrink-0 rounded-full border-[1.5px] border-border-strong bg-background group-data-checked/radio-card:border-[5.5px] group-data-checked/radio-card:border-primary" />
        <p className="min-w-0 flex-1 text-[13px] leading-[18px] font-semibold text-foreground">
          {titulo}
        </p>
      </div>
      <p className="w-full text-[11px] leading-4 text-muted-foreground">
        {descripcion}
      </p>
    </RadioPrimitive.Root>
  )
}
