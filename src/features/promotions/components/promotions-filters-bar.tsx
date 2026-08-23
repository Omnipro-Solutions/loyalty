"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { CHANNEL_SCOPES } from "@/types/domain"

import { CHANNEL_SCOPE_LABEL } from "../lib/labels"

const STATUS_OPTIONS = [
  { value: "activa", label: "Activas" },
  { value: "borrador", label: "Borradores" },
]

/** Búsqueda + filtros de 06.1 — cada cambio actualiza los searchParams y la página server-side vuelve a consultar. */
export function PromotionsFiltersBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")

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
  const selectedChannel = searchParams.get("canal")

  return (
    <div className="flex items-center gap-2.5">
      <FilterSearch
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <FilterSelect
        label="Estado"
        options={STATUS_OPTIONS}
        value={selectedStatus ? [selectedStatus] : []}
        onChange={(value) =>
          update((params) => {
            if (value[0]) params.set("estado", value[0])
            else params.delete("estado")
          })
        }
      />
      <FilterSelect
        label="Canal"
        options={CHANNEL_SCOPES.map((c) => ({
          value: c,
          label: CHANNEL_SCOPE_LABEL[c],
        }))}
        value={selectedChannel ? [selectedChannel] : []}
        onChange={(value) =>
          update((params) => {
            if (value[0]) params.set("canal", value[0])
            else params.delete("canal")
          })
        }
      />
    </div>
  )
}
