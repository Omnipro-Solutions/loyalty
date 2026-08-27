"use client"

import { Download } from "lucide-react"

import { csvCell, downloadCsv } from "@/lib/csv"

import { MEMBER_STATUS_LABEL, TIER_LABEL } from "../lib/labels"
import type { Member } from "../lib/queries"

const COLUMNS: { header: string; value: (m: Member) => string }[] = [
  { header: "Nombre", value: (m) => `${m.nombre} ${m.apellido}`.trim() },
  { header: "Email", value: (m) => m.email },
  { header: "Código de socio", value: (m) => m.codigo_socio ?? "" },
  {
    header: "Documento",
    value: (m) =>
      m.numero_documento
        ? `${m.tipo_documento ?? ""} ${m.numero_documento}`.trim()
        : "",
  },
  { header: "Teléfono", value: (m) => m.telefono ?? "" },
  {
    header: "Nivel",
    value: (m) =>
      m.tier
        ? (TIER_LABEL[m.tier.nombre as keyof typeof TIER_LABEL] ??
          m.tier.nombre)
        : "",
  },
  { header: "Puntos", value: (m) => String(m.saldo_puntos) },
  { header: "Registro", value: (m) => m.fecha_alta },
  {
    header: "Estado",
    value: (m) =>
      MEMBER_STATUS_LABEL[
        m.estado_cuenta as keyof typeof MEMBER_STATUS_LABEL
      ] ?? m.estado_cuenta,
  },
]

type ExportMembersButtonProps = { members: Member[] }

/** Exporta la página actual de la tabla (05.1 "Exportar") como CSV. */
export function ExportMembersButton({ members }: ExportMembersButtonProps) {
  function exportCsv() {
    downloadCsv("clientes.csv", [
      COLUMNS.map((c) => csvCell(c.header)),
      ...members.map((m) => COLUMNS.map((c) => csvCell(c.value(m)))),
    ])
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      className="flex items-center gap-[7px] rounded-[10px] border border-border bg-background py-[9px] pr-3.5 pl-3 text-xs font-medium text-secondary-foreground"
    >
      <Download className="size-3.5" />
      Exportar
    </button>
  )
}
