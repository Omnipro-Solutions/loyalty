"use server"

import { revalidatePath } from "next/cache"

import { equipoActionClient } from "./action-client"
import { cancelarInvitacionSchema, invitarUsuarioSchema } from "../schemas"

export const invitarUsuarioAction = equipoActionClient
  .inputSchema(invitarUsuarioSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("invitaciones").insert({
      org_id: ctx.orgId,
      email: parsedInput.email,
      role_id: parsedInput.roleId,
      tienda_id: parsedInput.tiendaId ?? null,
      invitado_por: ctx.userId,
    })

    if (error) {
      const message =
        error.code === "23505"
          ? "Ya hay una invitación pendiente para ese correo."
          : "No se pudo enviar la invitación."
      return { ok: false as const, message }
    }

    revalidatePath("/ajustes/equipo")
    return { ok: true as const }
  })

export const cancelarInvitacionAction = equipoActionClient
  .inputSchema(cancelarInvitacionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("invitaciones")
      .update({ estado: "cancelada" })
      .eq("id", parsedInput.invitacionId)

    if (error) {
      return {
        ok: false as const,
        message: "No se pudo cancelar la invitación.",
      }
    }

    revalidatePath("/ajustes/equipo")
    return { ok: true as const }
  })
