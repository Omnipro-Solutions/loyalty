"use client"

import { FilterSearch } from "@/components/filters/search"
import { useSearchParam } from "@/hooks/use-search-param"

/** Mismo patrón que `MembersFiltersBar`: cada cambio actualiza `?q=`, la página server-side vuelve a consultar. */
export function AudiencesSearch() {
  const search = useSearchParam()

  return (
    <FilterSearch
      value={search.value}
      onChange={(e) => search.setValue(e.target.value)}
      loading={search.loading}
      placeholder="Buscar audiencia…"
      className="w-[319px]"
    />
  )
}
