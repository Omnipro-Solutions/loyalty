"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"

import type { RoleConConteo } from "../lib/queries"

const ESTADO_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
]

type UsuariosFiltrosBarProps = { roles: RoleConConteo[] }

/** Mismo patrón que `CatalogoFiltrosBar`: cada cambio actualiza los searchParams, la página server-side vuelve a consultar. */
export function UsuariosFiltrosBar({ roles }: UsuariosFiltrosBarProps) {
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

  function actualizar(mutar: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutar(params)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  // `rolFiltro` (no `rol`): la pestaña de roles usa `?rol=` para el rol
  // seleccionado en el panel de detalle — mismo searchParam, dos pestañas
  // distintas, así que aquí se usa un nombre propio para no pisarlo.
  const rolSeleccionado = searchParams.get("rolFiltro")
  const estadoSeleccionado = searchParams.get("estado")

  return (
    <div className="flex items-center gap-2.5">
      <FilterSearch
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <FilterSelect
        label="Role"
        options={roles.map((r) => ({ value: r.id, label: r.nombre }))}
        value={rolSeleccionado ? [rolSeleccionado] : []}
        onChange={(value) =>
          actualizar((params) => {
            if (value[0]) params.set("rolFiltro", value[0])
            else params.delete("rolFiltro")
          })
        }
      />
      <FilterSelect
        label="Estado"
        options={ESTADO_OPTIONS}
        value={estadoSeleccionado ? [estadoSeleccionado] : []}
        onChange={(value) =>
          actualizar((params) => {
            if (value[0]) params.set("estado", value[0])
            else params.delete("estado")
          })
        }
      />
    </div>
  )
}
