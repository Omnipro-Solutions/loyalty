"use client"

import { Button } from "@/components/ui/button"
import { buildCsvRows, downloadCsv, type CsvColumn } from "@/lib/csv"

import { cardNumber } from "../lib/avatar-palette"
import { MEMBER_STATUS_LABEL, TIER_LABEL } from "../lib/labels"
import type { AudienceMember } from "../lib/queries"
import type { TierName } from "@/types/domain"

const COLUMNS: CsvColumn<AudienceMember>[] = [
  {
    key: "nombre",
    header: "Nombre",
    value: (m) => `${m.nombre} ${m.apellido}`.trim(),
  },
  { key: "email", header: "Email", value: (m) => m.email },
  {
    key: "nivel",
    header: "Nivel",
    value: (m) => (m.tier ? TIER_LABEL[m.tier.nombre as TierName] : ""),
  },
  { key: "puntos", header: "Puntos", value: (m) => String(m.saldo_puntos) },
  {
    key: "tarjeta",
    header: "Tarjeta",
    value: (m) => cardNumber(m.codigo_socio ?? ""),
  },
  { key: "ingreso", header: "Ingreso", value: (m) => m.fecha_alta },
  {
    key: "estado",
    header: "Estado",
    value: (m) => MEMBER_STATUS_LABEL[m.estado_cuenta as never],
  },
]

type ExportMembersButtonProps = { members: AudienceMember[] }

/** "Exportar" (11.2 hero) — exporta la muestra de socios de la audiencia, mismo patrón CSV que `ExportPromotionsButton`. */
export function ExportMembersButton({ members }: ExportMembersButtonProps) {
  function exportCsv() {
    downloadCsv("audiencia-miembros.csv", buildCsvRows(COLUMNS, members))
  }

  return (
    <Button variant="outline" onClick={exportCsv}>
      Exportar
    </Button>
  )
}
