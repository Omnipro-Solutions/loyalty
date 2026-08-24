"use client"

import { addDays } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { useState } from "react"
import { es } from "react-day-picker/locale"
import type { DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { formatWindowLabel } from "../lib/filters"

type DateRangePickerProps = {
  /** Rango inclusivo (el último día seleccionado, no el `to` semiabierto que usa `lib/filters.ts`). */
  from: Date
  to: Date
  onSelect: (range: { from: Date; to: Date }) => void
  /** Último día seleccionable — no hay datos futuros. */
  max?: Date
  className?: string
}

/**
 * Figma "Filtros" (646:1161), chip de fechas: mismo trigger pixel-perfect que
 * antes (`bg-brand-subtle`, icono + texto + chevron), ahora con un popover
 * real detrás. Primer uso de `src/components/ui/calendar.tsx` en el repo —
 * hasta ahora era código muerto.
 */
export function DateRangePicker({
  from,
  to,
  onSelect,
  max,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>({ from, to })

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft({ from, to })
      }}
    >
      <PopoverTrigger
        className={cn(
          "flex items-center gap-2 rounded-[9px] bg-brand-subtle px-3 py-2",
          className
        )}
      >
        <CalendarIcon className="size-3.5 text-primary-800" />
        <span className="text-xs leading-4 font-medium whitespace-nowrap text-primary-800">
          {formatWindowLabel({ from, to: addDays(to, 1) })}
        </span>
        <ChevronDown className="size-2.5 text-primary-800" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          locale={es}
          defaultMonth={from}
          selected={draft}
          onSelect={(range) => {
            setDraft(range)
            if (range?.from && range?.to) {
              onSelect({ from: range.from, to: range.to })
              setOpen(false)
            }
          }}
          disabled={max ? { after: max } : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
