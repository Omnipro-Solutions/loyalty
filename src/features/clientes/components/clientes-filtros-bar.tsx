"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { MEMBER_ESTADOS } from "@/types/domain"

import { MEMBER_ESTADO_LABEL, TIER_LABEL } from "../lib/labels"
import type { TierOption } from "../lib/queries"

const ESTADO_OPTIONS = MEMBER_ESTADOS.map((e) => ({
  value: e,
  label: MEMBER_ESTADO_LABEL[e],
}))

type ClientesFiltrosBarProps = { tiers: TierOption[] }

/** Mismo patrón que `CatalogoFiltrosBar`/`UsuariosFiltrosBar`: cada cambio actualiza los searchParams, la página server-side vuelve a consultar. */
export function ClientesFiltrosBar({ tiers }: ClientesFiltrosBarProps) {
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

  const tierSeleccionado = searchParams.get("tier")
  const estadoSeleccionado = searchParams.get("estado")

  return (
    <div className="flex items-center gap-2.5">
      <FilterSearch
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <FilterSelect
        label="Nivel"
        options={tiers.map((t) => ({
          value: t.id,
          label: TIER_LABEL[t.nombre as keyof typeof TIER_LABEL] ?? t.nombre,
        }))}
        value={tierSeleccionado ? [tierSeleccionado] : []}
        onChange={(value) =>
          actualizar((params) => {
            if (value[0]) params.set("tier", value[0])
            else params.delete("tier")
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
