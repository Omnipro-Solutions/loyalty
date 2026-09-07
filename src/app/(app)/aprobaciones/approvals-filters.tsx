"use client"

import { FilterSearch } from "@/components/filters/search"
import { useSearchParam } from "@/hooks/use-search-param"

/**
 * Buscador de la cola de aprobaciones: por quién la pidió o por el nombre de
 * lo que se decide.
 *
 * Va sobre `?buscar=` y no sobre `?q=` porque `q` ya lo usan los listados de
 * las otras pantallas, y esta cola convive con el filtro de tipo en la misma
 * URL — dos parámetros distintos para dos filtros distintos se explican
 * solos al compartir un enlace.
 *
 * Usa `useSearchParam`, así que hereda el debounce y el spinner de todos los
 * buscadores del portal: aquí la consulta la resuelve el Server Component de
 * la página, y sin indicador la cola parecía no responder.
 */
export function ApprovalsSearch() {
  const search = useSearchParam("buscar")

  return (
    <FilterSearch
      value={search.value}
      onChange={(e) => search.setValue(e.target.value)}
      loading={search.loading}
      placeholder="Buscar por quién la pidió o qué se decide…"
      className="w-full sm:w-[320px]"
    />
  )
}
