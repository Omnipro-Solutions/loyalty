"use client"

import { Download } from "lucide-react"
import { useAction } from "next-safe-action/hooks"

import { exportBatchCouponsAction } from "../actions/export"
import { csvCell, downloadCsv } from "../lib/csv"

type ExportBatchCouponsButtonProps = { batchId: string; batchReference: string }

export function ExportBatchCouponsButton({
  batchId,
  batchReference,
}: ExportBatchCouponsButtonProps) {
  const exportAction = useAction(exportBatchCouponsAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      downloadCsv(`${batchReference}.csv`, [
        ["Código", "Persona", "Email", "Estado", "Creado"].map(csvCell),
        ...data.rows.map((r) =>
          [
            r.code,
            r.memberNombre ?? "Al portador",
            r.memberEmail ?? "",
            r.status,
            r.createdAt,
          ].map(csvCell)
        ),
      ])
    },
  })

  return (
    <button
      type="button"
      disabled={exportAction.isPending}
      onClick={() => exportAction.execute({ batchId })}
      className="flex items-center gap-[7px] rounded-[10px] border border-border bg-background px-3.5 py-2 text-xs font-medium text-secondary-foreground disabled:opacity-50"
    >
      <Download className="size-3.5" />
      {exportAction.isPending ? "Exportando…" : "Exportar CSV"}
    </button>
  )
}
