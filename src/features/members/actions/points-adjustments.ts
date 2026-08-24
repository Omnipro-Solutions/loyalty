"use server"

import { revalidatePath } from "next/cache"

import { hasPermission } from "../lib/permissions"
import { pointsAdjustmentSchema } from "../schemas"
import { membersActionClient } from "./action-client"

/**
 * "Aplicar regla" del Hero: no existe un motor de reglas en este proyecto
 * (`/reglas` es un placeholder de Fase 5, ver `member-hero.tsx`) — el único
 * alcance real hoy es un ajuste manual de puntos (`points_ledger`, tipo
 * `'ajuste'`, mismo tipo que ya usa el seed). El trigger
 * `points_ledger_apply_after_insert` actualiza `members.saldo_puntos`
 * solo; nunca se escribe esa columna a mano.
 */
export const applyPointsAdjustmentAction = membersActionClient
  .inputSchema(pointsAdjustmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "reglas", "crear")) {
      return {
        ok: false as const,
        message: "No tienes permiso para aplicar reglas de ajuste.",
      }
    }

    const puntos =
      parsedInput.direction === "otorgar"
        ? parsedInput.amount
        : -parsedInput.amount

    if (puntos < 0) {
      // Releer el saldo real en servidor — nunca confiar en el saldo que
      // muestra el cliente para decidir si el ajuste es válido.
      const { data: member, error: memberError } = await ctx.supabase
        .from("members")
        .select("saldo_puntos")
        .eq("id", parsedInput.memberId)
        .single()
      if (memberError || !member || member.saldo_puntos + puntos < 0) {
        return {
          ok: false as const,
          message: "No puedes restar más puntos de los que tiene el socio.",
        }
      }
    }

    const { error } = await ctx.supabase.from("points_ledger").insert({
      org_id: ctx.orgId,
      member_id: parsedInput.memberId,
      tipo: "ajuste",
      puntos,
      origen: parsedInput.reason,
      canal: "app",
      aplicado_por: ctx.userId,
    })

    if (error) {
      return { ok: false as const, message: "No se pudo aplicar el ajuste." }
    }

    revalidatePath(`/clientes/${parsedInput.memberId}`)
    return { ok: true as const }
  })
