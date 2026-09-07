"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { FilterSearch } from "@/components/filters/search"
import { FilterSelect } from "@/components/filters/select"
import { useSearchParam } from "@/hooks/use-search-param"
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
  const search = useSearchParam()

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  const selectedCity = searchParams.get("ciudad")
  const selectedFormat = searchParams.get("formato")

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <FilterSearch
        value={search.value}
        onChange={(e) => search.setValue(e.target.value)}
        loading={search.loading}
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
