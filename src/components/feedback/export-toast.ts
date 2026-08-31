"use client"

import { toast } from "@/components/ui/toast"
import type { ExportStatus } from "@/lib/csv"

/**
 * Dispara el toast de shadcn a partir del `ExportStatus` derivado de
 * `exportStatus()` (`@/lib/csv`) — centraliza el título por tono para que
 * cada botón de export no lo repita. `lib/csv.ts` no puede importar
 * `components/ui/toast` (capa `lib` no importa de `components`, ver
 * CLAUDE.md §2), así que el disparo del toast vive aquí, un nivel arriba.
 */
export function notifyExportStatus(status: ExportStatus) {
  if (!status) return
  toast.add({
    type: status.tone,
    title:
      status.tone === "error" ? "No se pudo exportar" : "Exportación truncada",
    description: status.text,
  })
}
