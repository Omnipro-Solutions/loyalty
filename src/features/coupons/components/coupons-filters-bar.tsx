"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { Segmented } from "@/components/filters/segmented"
import {
  COUPON_BATCH_STATUSES,
  COUPON_ORIGINS,
  COUPON_STATUSES,
} from "@/types/domain"

import {
  COUPON_BATCH_STATUS_LABEL,
  COUPON_DISPLAY_STATUS_LABEL,
  COUPON_ORIGIN_LABEL,
} from "../lib/labels"

const VIEW_OPTIONS = [
  { value: "batches", label: "Emisiones" },
  { value: "coupons", label: "Cupones" },
]

// Sin 'expired': no es un valor almacenado en `coupon.status` (se deriva de
// `valid_to`, ver lib/status.ts) — filtrar por él en el servidor exigiría
// lógica aparte que este MVP no cubre todavía.
const COUPON_STATUS_OPTIONS = COUPON_STATUSES.map((s) => ({
  value: s,
  label: COUPON_DISPLAY_STATUS_LABEL[s],
}))

/**
 * Buscador + filtros + selector Emisiones/Cupones (doc §4.1) — cada cambio
 * actualiza los searchParams y la página server-side vuelve a consultar.
 * Mismo patrón que `features/promotions/components/promotions-filters-bar.tsx`.
 */
export function CouponsFiltersBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const vista = searchParams.get("vista") ?? "batches"

  useEffect(() => {
    const current = new URLSearchParams(window.location.search)
    if ((current.get("q") ?? "") === search) return
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (search) params.set("q", search)
      else params.delete("q")
      params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, pathname, router])

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  const selectedStatus = searchParams.get("estado")
  const selectedOrigin = searchParams.get("origen")

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Segmented
        options={VIEW_OPTIONS}
        value={vista}
        onValueChange={(v) => update((params) => params.set("vista", v))}
      />
      <FilterSearch
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <FilterSelect
        label="Estado"
        options={
          vista === "batches"
            ? COUPON_BATCH_STATUSES.map((s) => ({
                value: s,
                label: COUPON_BATCH_STATUS_LABEL[s],
              }))
            : COUPON_STATUS_OPTIONS
        }
        value={selectedStatus ? [selectedStatus] : []}
        onChange={(value) =>
          update((params) => {
            if (value[0]) params.set("estado", value[0])
            else params.delete("estado")
          })
        }
      />
      {vista === "batches" && (
        <FilterSelect
          label="Origen"
          options={COUPON_ORIGINS.map((o) => ({
            value: o,
            label: COUPON_ORIGIN_LABEL[o],
          }))}
          value={selectedOrigin ? [selectedOrigin] : []}
          onChange={(value) =>
            update((params) => {
              if (value[0]) params.set("origen", value[0])
              else params.delete("origen")
            })
          }
        />
      )}
    </div>
  )
}
