"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterScopedSearch } from "@/components/filters/scoped-search"
import { FilterSelect } from "@/components/filters/select"
import { Segmented } from "@/components/filters/segmented"
import { COUPON_ORIGINS, COUPON_SEARCH_SCOPES } from "@/types/domain"

import { ValidityFilter } from "./validity-filter"
import { COUPON_ORIGIN_LABEL, COUPON_SEARCH_SCOPE_LABEL } from "../lib/labels"

const VIEW_OPTIONS = [
  { value: "batches", label: "Emisiones" },
  { value: "coupons", label: "Cupones" },
]

const SCOPE_OPTIONS = COUPON_SEARCH_SCOPES.map((s) => ({
  value: s,
  label: COUPON_SEARCH_SCOPE_LABEL[s],
}))

/**
 * Buscador con ámbito + filtros de origen/vigencia + selector Emisiones/
 * Cupones (Figma 13.1/13.2). El estado ya no vive aquí — pasó a los chips
 * de `StatusChipsRow`, dentro de `CouponsCard`. Cada cambio actualiza los
 * searchParams y la página server-side vuelve a consultar.
 */
export function CouponsFiltersBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const vista = searchParams.get("vista") ?? "batches"
  const scope = searchParams.get("ambito") ?? "all"

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

  const selectedOrigin = searchParams.get("origen")
  const validFrom = searchParams.get("desde") ?? undefined
  const validTo = searchParams.get("hasta") ?? undefined

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Segmented
        options={VIEW_OPTIONS}
        value={vista}
        onValueChange={(v) => update((params) => params.set("vista", v))}
      />
      <FilterScopedSearch
        scope={scope}
        scopeOptions={SCOPE_OPTIONS}
        onScopeChange={(v) => update((params) => params.set("ambito", v))}
        value={search}
        onChange={setSearch}
        placeholder="Buscar por persona, ID de cupón o emisión…"
      />
      <div className="ml-auto flex items-center gap-2.5">
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
        <ValidityFilter
          from={validFrom}
          to={validTo}
          onChange={({ from, to }) =>
            update((params) => {
              if (from) params.set("desde", from)
              else params.delete("desde")
              if (to) params.set("hasta", to)
              else params.delete("hasta")
            })
          }
        />
      </div>
    </div>
  )
}
