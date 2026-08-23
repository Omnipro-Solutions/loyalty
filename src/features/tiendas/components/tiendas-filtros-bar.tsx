"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { TIENDA_FORMATOS } from "@/types/domain"

import { TIENDA_FORMATO_LABEL } from "../lib/labels"

type TiendasFiltrosBarProps = {
  ciudades: string[]
}

/** Búsqueda + filtros de 04.1 — cada cambio actualiza los searchParams y la página server-side vuelve a consultar. */
export function TiendasFiltrosBar({ ciudades }: TiendasFiltrosBarProps) {
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

  const ciudadSeleccionada = searchParams.get("ciudad")
  const formatoSeleccionado = searchParams.get("formato")

  return (
    <div className="flex items-center gap-2.5">
      <FilterSearch
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <FilterSelect
        label="Ciudad"
        options={ciudades.map((c) => ({ value: c, label: c }))}
        value={ciudadSeleccionada ? [ciudadSeleccionada] : []}
        onChange={(value) =>
          actualizar((params) => {
            if (value[0]) params.set("ciudad", value[0])
            else params.delete("ciudad")
          })
        }
      />
      <FilterSelect
        label="Formato"
        options={TIENDA_FORMATOS.map((f) => ({
          value: f,
          label: TIENDA_FORMATO_LABEL[f],
        }))}
        value={formatoSeleccionado ? [formatoSeleccionado] : []}
        onChange={(value) =>
          actualizar((params) => {
            if (value[0]) params.set("formato", value[0])
            else params.delete("formato")
          })
        }
      />
    </div>
  )
}
