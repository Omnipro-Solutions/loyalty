"use server"

import { revalidatePath } from "next/cache"

import { hasPermission } from "../lib/permissions"
import { assignPromotionSchema } from "../schemas"
import { membersPermissionActionClient } from "./action-client"

/**
 * "Enviar promoción" del Hero: no hay motor de mensajería en este proyecto
 * (ver `member-hero.tsx`), así que esto no envía nada — registra que un
 * gestor habilitó una promoción activa para este socio puntual, saltando la
 * elegibilidad por segmento/categoría. Ver `member_promociones`
 * (`20260823220000_member_promociones.sql`).
 */
export const assignPromotionToMemberAction = membersPermissionActionClient
  .inputSchema(assignPromotionSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "promociones", "crear")) {
      return {
        ok: false as const,
        message: "No tienes permiso para asignar promociones.",
      }
    }

    const { error } = await ctx.supabase.from("member_promociones").insert({
      org_id: ctx.orgId,
      member_id: parsedInput.memberId,
      promocion_id: parsedInput.promotionId,
      asignado_por: ctx.userId,
      nota: parsedInput.note || null,
    })

    if (error) {
      const message =
        error.code === "23505"
          ? "Este socio ya tiene esta promoción asignada."
          : "No se pudo asignar la promoción."
      return { ok: false as const, message }
    }

    revalidatePath(`/clientes/${parsedInput.memberId}`)
    return { ok: true as const }
  })
