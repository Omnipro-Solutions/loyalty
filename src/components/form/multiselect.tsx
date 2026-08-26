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
  /**
   * "default" = campo de formulario normal (Figma 709:370). "chip" = misma
   * densidad que `CHIP_TRIGGER` (condition-leaf-row.tsx) — para cuando el
   * multiselect vive dentro de una fila de chips (campo/operador/valor) en
   * vez de un `Field` propio; sin esto, el control se ve como una caja de
   * formulario de tamaño completo al lado de chips diminutos.
   */
  size?: "default" | "chip"
}

/**
 * Figma "Form / Multiselect" (709:370): chips in bg-accent/text-accent-foreground,
 * line wrap, and "+N más" when they don't fit. Selection via Command in a Popover.
 */
export function Multiselect({
  options,
  value,
  onValueChange,
  placeholder = "Selecciona…",
  className,
  size = "default",
}: MultiselectProps) {
  const selected = options.filter((o) => value.includes(o.value))
  const visibleItems = selected.slice(0, 3)
  const remaining = selected.length - visibleItems.length
  const isChip = size === "chip"

  function remove(v: string) {
    onValueChange(value.filter((x) => x !== v))
  }

  function add(v: string) {
    onValueChange(
      value.includes(v) ? value.filter((x) => x !== v) : [...value, v]
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          FIELD_CHROME,
          isChip
            ? "flex w-fit flex-wrap items-center gap-1 rounded-[7px] border-border py-[3px] pr-2 pl-2 text-left data-[popup-open]:border-2 data-[popup-open]:border-ring data-[popup-open]:py-[2px] data-[popup-open]:pr-[7px] data-[popup-open]:pl-[7px]"
            : "flex w-full flex-wrap items-center gap-1.5 py-2 pr-[11px] pl-2.5 text-left data-[popup-open]:border-2 data-[popup-open]:border-ring data-[popup-open]:py-[7px] data-[popup-open]:pr-[9px] data-[popup-open]:pl-2",
          className
        )}
      >
        {visibleItems.map((o) => (
          <span
            key={o.value}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full bg-accent font-medium text-accent-foreground",
              isChip
                ? "gap-1 py-px pr-1.5 pl-2 text-[9.5px] leading-[13px]"
                : "py-1 pr-2 pl-2.5 text-[11px] leading-[15px]"
            )}
          >
            {o.label}
            <X
              className="size-2.5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                remove(o.value)
              }}
            />
          </span>
        ))}
        {remaining > 0 && (
          <span
            className={cn(
              "shrink-0 text-muted-foreground",
              isChip ? "text-[9.5px] leading-[15px]" : "text-xs leading-[18px]"
            )}
          >
            + {remaining} más
          </span>
        )}
        {selected.length === 0 && (
          <span
            className={cn(
              "min-w-0 flex-1 text-muted-foreground",
              isChip
                ? "text-[10.5px] leading-[15px] whitespace-nowrap"
                : "text-[13px] leading-[19px]"
            )}
          >
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
                  onSelect={() => add(o.value)}
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
