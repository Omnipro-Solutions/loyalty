"use client"

import { ChevronDown } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type FilterOption = { value: string; label: string }

type FilterSelectProps = {
  label: string
  options: FilterOption[]
  value: string[]
  onChange: (value: string[]) => void
  multiple?: boolean
  placeholder?: string
  className?: string
}

/**
 * Figma "Filtro / Select" (699:324): State=Default (bg-white) cuando no hay
 * selección, State=Aplicado (bg-brand-subtle, borde brand) en cuanto hay una.
 * Un solo componente cubre tanto el multiselect de Categoría como el select
 * simple de Estado — la diferencia es `multiple`.
 */
export function FilterSelect({
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = "Todos",
  className,
}: FilterSelectProps) {
  const aplicado = value.length > 0
  const valorTexto = !aplicado
    ? placeholder
    : value.length === 1
      ? (options.find((o) => o.value === value[0])?.label ?? placeholder)
      : `${value.length} seleccionadas`

  function toggle(optionValue: string) {
    if (!multiple) {
      onChange(value.includes(optionValue) ? [] : [optionValue])
      return
    }
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue]
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-[7px] rounded-[10px] border py-[9px] pr-3 pl-3.5 text-xs leading-4",
          aplicado ? "border-primary bg-accent" : "border-border bg-background",
          className
        )}
      >
        <span
          className={aplicado ? "text-primary-700" : "text-muted-foreground"}
        >
          {label}:
        </span>
        <span
          className={cn(
            "font-medium",
            aplicado ? "text-primary-800" : "text-foreground"
          )}
        >
          {valorTexto}
        </span>
        <ChevronDown className="size-[11px] text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-0 p-1.5">
        {options.map((option) => {
          const selected = value.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
            >
              {multiple ? (
                <Checkbox checked={selected} tabIndex={-1} />
              ) : (
                <span
                  className={cn(
                    "size-[7px] rounded-full",
                    selected ? "bg-primary" : "bg-transparent"
                  )}
                />
              )}
              <span className="flex-1 truncate text-foreground">
                {option.label}
              </span>
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
