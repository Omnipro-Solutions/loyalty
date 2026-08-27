"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"

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

export type SearchableSelectOption = {
  value: string
  label: string
  /** Segunda línea de la fila y texto extra por el que también se busca (email, SKU, referencia…). */
  hint?: string
}

type SearchableSelectProps = {
  options: SearchableSelectOption[]
  value: string | undefined
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  id?: string
  className?: string
  /** "chip" = densidad de los controles embebidos en una frase (constructor de condiciones), igual que en `Multiselect`. */
  size?: "default" | "chip"
}

/**
 * Selector de UN valor con el buscador DENTRO del desplegable: misma
 * composición `Popover` + `Command` que ya usa `Multiselect` (mismo aspecto,
 * mismo teclado), en modo single.
 *
 * Es el escalón intermedio de `OptionPicker` — lista corta de más para un
 * `Select` a ciegas, corta de menos para justificar un modal a pantalla
 * completa. Este componente no decide cuándo se usa: los umbrales viven en
 * `option-picker.tsx`, para que sean los mismos en toda la app.
 */
export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecciona…",
  searchPlaceholder = "Buscar…",
  emptyLabel = "Sin resultados.",
  id,
  className,
  size = "default",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)
  const isChip = size === "chip"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        className={cn(
          FIELD_CHROME,
          isChip
            ? "flex w-fit items-center gap-1 rounded-[7px] border-border py-[3px] pr-2 pl-2 text-left data-[popup-open]:border-2 data-[popup-open]:border-ring data-[popup-open]:py-[2px] data-[popup-open]:pr-[7px] data-[popup-open]:pl-[7px]"
            : "flex w-full items-center gap-1.5 py-2 pr-[11px] pl-2.5 text-left data-[popup-open]:border-2 data-[popup-open]:border-ring data-[popup-open]:py-[7px] data-[popup-open]:pr-[9px] data-[popup-open]:pl-2",
          className
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            isChip
              ? "text-[10.5px] leading-[15px] font-semibold whitespace-nowrap"
              : "text-[13px] leading-[19px]",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "shrink-0 text-muted-foreground",
            isChip ? "size-3" : "size-4"
          )}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = option.value === value
                return (
                  <CommandItem
                    key={option.value}
                    // `cmdk` filtra por este texto: incluir la pista deja
                    // que buscar por email (o SKU, o referencia) encuentre
                    // la fila, no solo por la etiqueta visible.
                    value={`${option.label} ${option.hint ?? ""}`}
                    data-checked={isSelected}
                    onSelect={() => {
                      onValueChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={cn(
                          "truncate",
                          isSelected && "font-medium text-primary"
                        )}
                      >
                        {option.label}
                      </span>
                      {option.hint && (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {option.hint}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
