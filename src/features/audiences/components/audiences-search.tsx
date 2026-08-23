"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"

/** Mismo patrón que `MembersFiltersBar`: cada cambio actualiza `?q=`, la página server-side vuelve a consultar. */
export function AudiencesSearch() {
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

  return (
    <FilterSearch
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Buscar audiencia…"
      className="w-[319px]"
    />
  )
}
