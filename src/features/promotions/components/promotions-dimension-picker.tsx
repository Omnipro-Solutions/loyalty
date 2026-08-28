"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Segmented } from "@/components/filters/segmented"

import {
  PROMOTION_DIMENSIONS,
  type PromotionDimension,
} from "../lib/dashboard-filters"

const DIMENSION_LABEL: Record<PromotionDimension, string> = {
  segmento: "Segmento",
  categoria: "Categoría",
  socio_nivel: "Nivel",
  mecanica: "Mecánica",
  tipo: "Tipo",
  financiador: "Financiador",
}

const OPTIONS = PROMOTION_DIMENSIONS.map((value) => ({
  value,
  label: DIMENSION_LABEL[value],
}))

/**
 * Cambia el EJE del panel, no su universo. Los filtros de arriba deciden
 * qué promociones entran; esto decide contra qué se agrupan las que
 * entraron — el mismo conjunto de canjes leído por segmento o por mecánica
 * contesta preguntas distintas, y ninguna de las dos es "la" lectura.
 */
export function PromotionsDimensionPicker({
  value,
}: {
  value: PromotionDimension
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <Segmented
      options={OPTIONS}
      value={value}
      onValueChange={(next) => {
        const params = new URLSearchParams(searchParams.toString())
        if (next === "segmento") params.delete("eje")
        else params.set("eje", next)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      }}
    />
  )
}
