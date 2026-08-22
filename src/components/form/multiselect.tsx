"use client"

import { X } from "lucide-react"

import { FIELD_CHROME } from "@/components/form/field"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type MultiselectOption = { value: string; label: string }

type MultiselectProps = {
  options: MultiselectOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

/**
 * Figma "Form / Multiselect" (709:370): chips en bg-accent/text-accent-foreground,
 * ajuste de línea, y "+N más" cuando no caben. Selección vía Command en un Popover.
 */
export function Multiselect({
  options,
  value,
  onValueChange,
  placeholder = "Selecciona…",
  className,
}: MultiselectProps) {
  const seleccionadas = options.filter((o) => value.includes(o.value))
  const visibles = seleccionadas.slice(0, 3)
  const restantes = seleccionadas.length - visibles.length

  function quitar(v: string) {
    onValueChange(value.filter((x) => x !== v))
  }

  function agregar(v: string) {
    onValueChange(
      value.includes(v) ? value.filter((x) => x !== v) : [...value, v]
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          FIELD_CHROME,
          "flex w-full flex-wrap items-center gap-1.5 py-2 pr-[11px] pl-2.5 text-left data-[popup-open]:border-2 data-[popup-open]:border-ring data-[popup-open]:py-[7px] data-[popup-open]:pr-[9px] data-[popup-open]:pl-2",
          className
        )}
      >
        {visibles.map((o) => (
          <span
            key={o.value}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent py-1 pr-2 pl-2.5 text-[11px] leading-[15px] font-medium text-accent-foreground"
          >
            {o.label}
            <X
              className="size-2.5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                quitar(o.value)
              }}
            />
          </span>
        ))}
        {restantes > 0 && (
          <span className="shrink-0 text-xs leading-[18px] text-muted-foreground">
            + {restantes} más
          </span>
        )}
        {seleccionadas.length === 0 && (
          <span className="min-w-0 flex-1 text-[13px] leading-[19px] text-muted-foreground">
            {placeholder}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Buscar…" />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => agregar(o.value)}
                >
                  <span
                    className={cn(
                      value.includes(o.value) && "font-medium text-primary"
                    )}
                  >
                    {o.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
