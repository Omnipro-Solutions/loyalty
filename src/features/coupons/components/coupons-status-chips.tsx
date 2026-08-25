"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { StatusChipsRow, type StatusChipItem } from "./status-chips-row"

type CouponsStatusChipsProps = {
  allLabel: string
  allTotal: number
  allMatched?: number | null
  items: StatusChipItem[]
}

/** Dueño del `estado` en la URL para `StatusChipsRow` — mismo patrón que `CouponsFiltersBar`. */
export function CouponsStatusChips({
  allLabel,
  allTotal,
  allMatched,
  items,
}: CouponsStatusChipsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selected = searchParams.get("estado")

  function onSelect(value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set("estado", value)
    else params.delete("estado")
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <StatusChipsRow
      allLabel={allLabel}
      allTotal={allTotal}
      allMatched={allMatched}
      items={items}
      selected={selected}
      onSelect={onSelect}
    />
  )
}
