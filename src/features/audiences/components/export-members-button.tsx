"use client"

import { Button } from "@/components/ui/button"

import { cardNumber } from "../lib/avatar-palette"
import { MEMBER_STATUS_LABEL, TIER_LABEL } from "../lib/labels"
import type { AudienceMember } from "../lib/queries"
import type { TierName } from "@/types/domain"

const COLUMNS: {
  header: string
  value: (m: AudienceMember) => string
}[] = [
  { header: "Nombre", value: (m) => `${m.nombre} ${m.apellido}`.trim() },
  { header: "Email", value: (m) => m.email },
  {
    header: "Nivel",
    value: (m) => (m.tier ? TIER_LABEL[m.tier.nombre as TierName] : ""),
  },
  { header: "Puntos", value: (m) => String(m.saldo_puntos) },
  {
    header: "Tarjeta",
    value: (m) => cardNumber(m.codigo_socio ?? ""),
  },
  { header: "Ingreso", value: (m) => m.fecha_alta },
  {
    header: "Estado",
    value: (m) => MEMBER_STATUS_LABEL[m.estado_cuenta as never],
  },
]

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

type ExportMembersButtonProps = { members: AudienceMember[] }

/** "Exportar" (11.2 hero) — exporta la muestra de socios de la audiencia, mismo patrón CSV que `ExportarPromocionesButton`. */
export function ExportMembersButton({ members }: ExportMembersButtonProps) {
  function exportCsv() {
    const rows = [
      COLUMNS.map((c) => csvCell(c.header)).join(","),
      ...members.map((m) => COLUMNS.map((c) => csvCell(c.value(m))).join(",")),
    ]
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "audiencia-miembros.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" onClick={exportCsv}>
      Exportar
    </Button>
  )
}
