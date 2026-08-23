"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { ALCANCE_CANALES } from "@/types/domain"

import { CANAL_APLICACION_LABEL } from "../lib/labels"

const ESTADO_OPCIONES = [
  { value: "activa", label: "Activas" },
  { value: "borrador", label: "Borradores" },
]

/** Búsqueda + filtros de 06.1 — cada cambio actualiza los searchParams y la página server-side vuelve a consultar. */
export function PromocionesFiltrosBar() {
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

  const estadoSeleccionado = searchParams.get("estado")
  const canalSeleccionado = searchParams.get("canal")

  return (
    <div className="flex items-center gap-2.5">
      <FilterSearch
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <FilterSelect
        label="Estado"
        options={ESTADO_OPCIONES}
        value={estadoSeleccionado ? [estadoSeleccionado] : []}
        onChange={(value) =>
          actualizar((params) => {
            if (value[0]) params.set("estado", value[0])
            else params.delete("estado")
          })
        }
      />
      <FilterSelect
        label="Canal"
        options={ALCANCE_CANALES.map((c) => ({
          value: c,
          label: CANAL_APLICACION_LABEL[c],
        }))}
        value={canalSeleccionado ? [canalSeleccionado] : []}
        onChange={(value) =>
          actualizar((params) => {
            if (value[0]) params.set("canal", value[0])
            else params.delete("canal")
          })
        }
      />
    </div>
  )
}
