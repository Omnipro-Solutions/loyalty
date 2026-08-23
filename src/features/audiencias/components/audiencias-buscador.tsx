"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"

/** Mismo patrón que `ClientesFiltrosBar`: cada cambio actualiza `?q=`, la página server-side vuelve a consultar. */
export function AudienciasBuscador() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [busqueda, setBusqueda] = useState(searchParams.get("q") ?? "")

  useEffect(() => {
    const actual = new URLSearchParams(window.location.search)
    if ((actual.get("q") ?? "") === busqueda) return
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (busqueda) params.set("q", busqueda)
      else params.delete("q")
      params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    }, 300)
    return () => clearTimeout(timeout)
  }, [busqueda, pathname, router])

  return (
    <FilterSearch
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      placeholder="Buscar audiencia…"
      className="w-[319px]"
    />
  )
}
