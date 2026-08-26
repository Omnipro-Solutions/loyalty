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

import { formatWindowLabel } from "../lib/dashboard-filters"

type PromotionsDateRangePickerProps = {
  /** Ventana activa (semiabierta, `to` exclusivo) — `undefined` = "Todo" (sin filtro de vigencia). */
  from?: Date
  to?: Date
  onSelect: (range: { from: Date; to: Date }) => void
  className?: string
}

/** Duplicado de `features/dashboard/components/date-range-picker.tsx` (aislamiento entre features, CLAUDE.md §2), adaptado a un rango opcional: sin selección, el chip invita a elegir fechas en vez de mostrar un rango por defecto. */
export function PromotionsDateRangePicker({
  from,
  to,
  onSelect,
  className,
}: PromotionsDateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const inclusiveTo = to ? addDays(to, -1) : undefined
  const initialDraft: DateRange | undefined =
    from && inclusiveTo ? { from, to: inclusiveTo } : undefined
  const [draft, setDraft] = useState<DateRange | undefined>(initialDraft)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft(initialDraft)
      }}
    >
      <PopoverTrigger
        className={cn(
          "flex items-center gap-2 rounded-[10px] border border-border bg-background px-3 py-[9px] text-xs leading-4",
          className
        )}
      >
        <CalendarIcon className="size-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">
          {from && to ? formatWindowLabel({ from, to }) : "Elegir fechas"}
        </span>
        <ChevronDown className="size-2.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          locale={es}
          defaultMonth={from ?? new Date()}
          selected={draft}
          onSelect={(range) => {
            setDraft(range)
            if (range?.from && range?.to) {
              onSelect({ from: range.from, to: addDays(range.to, 1) })
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
