"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { getSiteOrigin } from "@/lib/site-origin"

import { teamActionClient } from "./action-client"
import { cancelInvitationSchema, inviteUserSchema } from "../schemas"

export const inviteUserAction = teamActionClient
  .inputSchema(inviteUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Se inserta ANTES de invitar por Auth a propósito: `handle_new_user()`
    // (supabase/migrations/20260823100000_equipo_roles_permisos.sql) busca
    // una invitación 'pendiente' para asignar role_id/tienda_id en el
    // momento en que `inviteUserByEmail` crea la fila en `auth.users` — si
    // el orden fuera al revés, el trigger no la encontraría.
    const { data: invitacion, error } = await ctx.supabase
      .from("invitaciones")
      .insert({
        org_id: ctx.orgId,
        email: parsedInput.email,
        role_id: parsedInput.roleId,
        tienda_id: parsedInput.storeId ?? null,
        invitado_por: ctx.userId,
      })
      .select("id")
      .single()

    if (error) {
      const message =
        error.code === "23505"
          ? "Ya hay una invitación pendiente para ese correo."
          : "No se pudo enviar la invitación."
      return { ok: false as const, message }
    }

    // API admin (service role) — el correo real de invitación lo manda
    // Supabase Auth. El plan Free sin SMTP propio no permite personalizar
    // esa plantilla (ver DEPLOY.md 4.1), así que el link usa el flujo
    // implícito de siempre: `redirectTo` apunta a /verificando-enlace, que
    // recibe los tokens de sesión en el fragmento de la URL y de ahí manda
    // a /activar-cuenta (ver link-callback-card.tsx).
    const admin = createAdminClient()
    const origin = await getSiteOrigin()
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      parsedInput.email,
      { redirectTo: `${origin}/verificando-enlace` }
    )

    if (inviteError) {
      await ctx.supabase.from("invitaciones").delete().eq("id", invitacion.id)
      return {
        ok: false as const,
        message: "No se pudo enviar el correo de invitación.",
      }
    }

    revalidatePath("/ajustes/equipo")
    return { ok: true as const }
  })

export const cancelInvitationAction = teamActionClient
  .inputSchema(cancelInvitationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("invitaciones")
      .update({ estado: "cancelada" })
      .eq("id", parsedInput.invitationId)

    if (error) {
      return {
        ok: false as const,
        message: "No se pudo cancelar la invitación.",
      }
    }

    revalidatePath("/ajustes/equipo")
    return { ok: true as const }
  })
