"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"

import { agruparPorRaiz } from "../lib/categorias-arbol"
import type { Categoria } from "../lib/queries"

const ESTADO_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
]

type CatalogoFiltrosBarProps = {
  categorias: Categoria[]
}

/**
 * Búsqueda + filtros de 03.1. Cada cambio actualiza los searchParams de la
 * URL — la página server-side vuelve a consultar con los filtros nuevos, en
 * vez de filtrar en cliente sobre una página ya cargada.
 */
export function CatalogoFiltrosBar({ categorias }: CatalogoFiltrosBarProps) {
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

  const categoriaSeleccionada = searchParams.getAll("categoria")
  const estadoSeleccionado = searchParams.get("estado")

  const opcionesCategoria = agruparPorRaiz(categorias).flatMap((raiz) => [
    { value: raiz.id, label: raiz.nombre },
    ...raiz.hijos.map((hijo) => ({
      value: hijo.id,
      label: `— ${hijo.nombre}`,
    })),
  ])

  return (
    <div className="flex items-center gap-2.5">
      <FilterSearch
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <FilterSelect
        label="Categoría"
        multiple
        placeholder="Todas"
        options={opcionesCategoria}
        value={categoriaSeleccionada}
        onChange={(value) =>
          actualizar((params) => {
            params.delete("categoria")
            value.forEach((v) => params.append("categoria", v))
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
