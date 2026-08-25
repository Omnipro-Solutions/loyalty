"use client"

import { Chip } from "@/components/filters/chip"
import { formatNumber } from "@/lib/format"

export type StatusChipItem = {
  value: string
  label: string
  total: number
  /** `null` = sin búsqueda activa (se muestra solo `total`); si hay número, se compone "N de total". */
  matched?: number | null
  dotClassName?: string
}

type StatusChipsRowProps = {
  allLabel: string
  allTotal: number
  allMatched?: number | null
  items: StatusChipItem[]
  selected: string | null
  onSelect: (value: string | null) => void
}

function countLabel(total: number, matched?: number | null) {
  if (matched == null) return formatNumber(total)
  return `${formatNumber(matched)} de ${formatNumber(total)}`
}

/** Fila de chips de estado (Figma 13.1 "Chips de estado" / 13.2 "Chips de estado") — el chip "Todas"/"Todos" es el filtro sin estado. */
export function StatusChipsRow({
  allLabel,
  allTotal,
  allMatched,
  items,
  selected,
  onSelect,
}: StatusChipsRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        active={selected === null}
        count={countLabel(allTotal, allMatched)}
        onClick={() => onSelect(null)}
      >
        {allLabel}
      </Chip>
      {items.map((item) => (
        <Chip
          key={item.value}
          active={selected === item.value}
          dotClassName={item.dotClassName}
          count={countLabel(item.total, item.matched)}
          onClick={() => onSelect(item.value)}
        >
          {item.label}
        </Chip>
      ))}
    </div>
  )
}
