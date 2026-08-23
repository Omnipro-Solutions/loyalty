"use client"

import { Button } from "@/components/ui/button"

import { numeroDeTarjeta } from "../lib/avatar-palette"
import { MEMBER_ESTADO_LABEL, TIER_LABEL } from "../lib/labels"
import type { MiembroAudiencia } from "../lib/queries"
import type { TierNombre } from "@/types/domain"

const COLUMNAS: {
  encabezado: string
  valor: (m: MiembroAudiencia) => string
}[] = [
  { encabezado: "Nombre", valor: (m) => `${m.nombre} ${m.apellido}`.trim() },
  { encabezado: "Email", valor: (m) => m.email },
  {
    encabezado: "Nivel",
    valor: (m) => (m.tier ? TIER_LABEL[m.tier.nombre as TierNombre] : ""),
  },
  { encabezado: "Puntos", valor: (m) => String(m.saldo_puntos) },
  {
    encabezado: "Tarjeta",
    valor: (m) => numeroDeTarjeta(m.codigo_socio ?? ""),
  },
  { encabezado: "Ingreso", valor: (m) => m.fecha_alta },
  {
    encabezado: "Estado",
    valor: (m) => MEMBER_ESTADO_LABEL[m.estado_cuenta as never],
  },
]

function celdaCsv(valor: string): string {
  return `"${valor.replaceAll('"', '""')}"`
}

type ExportarMiembrosButtonProps = { miembros: MiembroAudiencia[] }

/** "Exportar" (11.2 hero) — exporta la muestra de socios de la audiencia, mismo patrón CSV que `ExportarPromocionesButton`. */
export function ExportarMiembrosButton({
  miembros,
}: ExportarMiembrosButtonProps) {
  function exportar() {
    const filas = [
      COLUMNAS.map((c) => celdaCsv(c.encabezado)).join(","),
      ...miembros.map((m) =>
        COLUMNAS.map((c) => celdaCsv(c.valor(m))).join(",")
      ),
    ]
    const blob = new Blob([filas.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = "audiencia-miembros.csv"
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" onClick={exportar}>
      Exportar
    </Button>
  )
}
