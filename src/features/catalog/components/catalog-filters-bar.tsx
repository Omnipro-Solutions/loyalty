"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"

import { groupByRoot } from "../lib/categories-tree"
import type { Category } from "../lib/queries"

const STATUS_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
]

type CatalogFiltersBarProps = {
  categories: Category[]
}

/**
 * Búsqueda + filtros de 03.1. Cada cambio actualiza los searchParams de la
 * URL — la página server-side vuelve a consultar con los filtros nuevos, en
 * vez de filtrar en cliente sobre una página ya cargada.
 */
export function CatalogFiltersBar({ categories }: CatalogFiltersBarProps) {
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

  const selectedCategories = searchParams.getAll("categoria")
  const selectedStatus = searchParams.get("estado")

  const categoryOptions = groupByRoot(categories).flatMap((root) => [
    { value: root.id, label: root.nombre },
    ...root.children.map((child) => ({
      value: child.id,
      label: `— ${child.nombre}`,
    })),
  ])

  return (
    <div className="flex items-center gap-2.5">
      <FilterSearch
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <FilterSelect
        label="Categoría"
        multiple
        placeholder="Todas"
        options={categoryOptions}
        value={selectedCategories}
        onChange={(value) =>
          update((params) => {
            params.delete("categoria")
            value.forEach((v) => params.append("categoria", v))
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
