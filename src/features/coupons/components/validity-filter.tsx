"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { es } from "react-day-picker/locale"
import type { DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type ValidityFilterProps = {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** Figma "Vigencia" (699:324, misma familia visual que `FilterSelect`): filtra por `valid_from`/`valid_to` en vez de por una lista de opciones. */
export function ValidityFilter({ from, to, onChange }: ValidityFilterProps) {
  const [open, setOpen] = useState(false)
  const isApplied = Boolean(from || to)
  const selected: DateRange | undefined = isApplied
    ? { from: parseDate(from), to: parseDate(to) }
    : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-[7px] rounded-[10px] border py-[9px] pr-3 pl-3.5 text-xs leading-4",
          isApplied ? "border-primary bg-accent" : "border-border bg-background"
        )}
      >
        <span
          className={cn(
            "whitespace-nowrap",
            isApplied ? "font-medium text-primary-800" : "text-muted-foreground"
          )}
        >
          {isApplied
            ? `${from ? formatShortDate(from) : "…"} – ${to ? formatShortDate(to) : "…"}`
            : "Vigencia"}
        </span>
        <ChevronDown className="size-[11px] text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          locale={es}
          defaultMonth={selected?.from}
          selected={selected}
          onSelect={(range) =>
            onChange({
              from: range?.from ? toISODate(range.from) : undefined,
              to: range?.to ? toISODate(range.to) : undefined,
            })
          }
        />
        {isApplied && (
          <div className="flex justify-end border-t border-border p-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange({ from: undefined, to: undefined })
                setOpen(false)
              }}
            >
              Limpiar
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
