"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterScopedSearch } from "@/components/filters/scoped-search"
import { FilterSelect } from "@/components/filters/select"
import { MEMBER_SEARCH_SCOPES, MEMBER_STATUSES } from "@/types/domain"

import {
  MEMBER_SEARCH_SCOPE_LABEL,
  MEMBER_STATUS_LABEL,
  TIER_LABEL,
} from "../lib/labels"
import type { TierOption } from "../lib/queries"

const STATUS_OPTIONS = MEMBER_STATUSES.map((e) => ({
  value: e,
  label: MEMBER_STATUS_LABEL[e],
}))

const SEARCH_SCOPE_OPTIONS = MEMBER_SEARCH_SCOPES.map((s) => ({
  value: s,
  label: MEMBER_SEARCH_SCOPE_LABEL[s],
}))

type MembersFiltersBarProps = { tiers: TierOption[] }

/** Mismo patrón que `CatalogFiltersBar`/`UsersFiltersBar`: cada cambio actualiza los searchParams, la página server-side vuelve a consultar. */
export function MembersFiltersBar({ tiers }: MembersFiltersBarProps) {
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

  const selectedTier = searchParams.get("tier")
  const selectedStatus = searchParams.get("estado")
  const searchScope = searchParams.get("campo") ?? "todos"

  return (
    <div className="flex items-center gap-2.5">
      <FilterScopedSearch
        scope={searchScope}
        scopeOptions={SEARCH_SCOPE_OPTIONS}
        onScopeChange={(value) =>
          update((params) => {
            if (value === "todos") params.delete("campo")
            else params.set("campo", value)
          })
        }
        value={search}
        onChange={setSearch}
        placeholder="Buscar…"
      />
      <FilterSelect
        label="Nivel"
        options={tiers.map((t) => ({
          value: t.id,
          label: TIER_LABEL[t.nombre as keyof typeof TIER_LABEL] ?? t.nombre,
        }))}
        value={selectedTier ? [selectedTier] : []}
        onChange={(value) =>
          update((params) => {
            if (value[0]) params.set("tier", value[0])
            else params.delete("tier")
          })
        }
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
    </div>
  )
}
