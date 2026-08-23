"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"

import type { RoleWithCount } from "../lib/queries"

const STATUS_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
]

type UsersFiltersBarProps = { roles: RoleWithCount[] }

/** Mismo patrón que `CatalogFiltersBar`: cada cambio actualiza los searchParams, la página server-side vuelve a consultar. */
export function UsersFiltersBar({ roles }: UsersFiltersBarProps) {
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

  // `rolFiltro` (no `rol`): la pestaña de roles usa `?rol=` para el rol
  // seleccionado en el panel de detalle — mismo searchParam, dos pestañas
  // distintas, así que aquí se usa un nombre propio para no pisarlo.
  const selectedRole = searchParams.get("rolFiltro")
  const selectedStatus = searchParams.get("estado")

  return (
    <div className="flex items-center gap-2.5">
      <FilterSearch
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <FilterSelect
        label="Role"
        options={roles.map((r) => ({ value: r.id, label: r.nombre }))}
        value={selectedRole ? [selectedRole] : []}
        onChange={(value) =>
          update((params) => {
            if (value[0]) params.set("rolFiltro", value[0])
            else params.delete("rolFiltro")
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
