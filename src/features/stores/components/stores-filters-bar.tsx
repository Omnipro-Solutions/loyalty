"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { STORE_FORMATS } from "@/types/domain"

import { STORE_FORMAT_LABEL } from "../lib/labels"

type StoresFiltersBarProps = {
  cities: string[]
}

/** Búsqueda + filtros de 04.1 — cada cambio actualiza los searchParams y la página server-side vuelve a consultar. */
export function StoresFiltersBar({ cities }: StoresFiltersBarProps) {
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

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  const selectedCity = searchParams.get("ciudad")
  const selectedFormat = searchParams.get("formato")

  return (
    <div className="flex items-center gap-2.5">
      <FilterSearch
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <FilterSelect
        label="Ciudad"
        options={cities.map((c) => ({ value: c, label: c }))}
        value={selectedCity ? [selectedCity] : []}
        onChange={(value) =>
          updateParams((params) => {
            if (value[0]) params.set("ciudad", value[0])
            else params.delete("ciudad")
          })
        }
      />
      <FilterSelect
        label="Formato"
        options={STORE_FORMATS.map((f) => ({
          value: f,
          label: STORE_FORMAT_LABEL[f],
        }))}
        value={selectedFormat ? [selectedFormat] : []}
        onChange={(value) =>
          updateParams((params) => {
            if (value[0]) params.set("formato", value[0])
            else params.delete("formato")
          })
        }
      />
    </div>
  )
}
