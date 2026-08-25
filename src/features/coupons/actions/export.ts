"use server"

import { couponsActionClient } from "./action-client"
import { hasPermission } from "../lib/permissions"
import { listAllCouponsForBatch } from "../lib/queries"
import { exportBatchCouponsSchema } from "../schemas"

/**
 * Devuelve las filas ya listas para CSV — no dispara la descarga (eso pasa
 * en el cliente, `export-batch-coupons-button.tsx`) porque una Server
 * Action no puede iniciar un `Blob`/`<a download>` en el navegador.
 */
export const exportBatchCouponsAction = couponsActionClient
  .inputSchema(exportBatchCouponsSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "exportar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para exportar cupones.",
      }
    }

    const coupons = await listAllCouponsForBatch(parsedInput.batchId)
    return {
      ok: true as const,
      rows: coupons.map((c) => ({
        code: c.code,
        memberNombre: c.member_nombre,
        memberEmail: c.member_email,
        status: c.status,
        createdAt: c.created_at,
      })),
    }
  })
