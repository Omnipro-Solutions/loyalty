"use server"

import { revalidatePath, updateTag } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getSiteOrigin } from "@/lib/site-origin"

import { teamActionClient } from "./action-client"
import {
  resetUserMfaSchema,
  revokeUserDevicesSchema,
  sendUserPasswordResetSchema,
  setUserStatusSchema,
  updateUserAccessSchema,
} from "../schemas"

type SessionClient = Awaited<ReturnType<typeof createClient>>

/**
 * El service role bypasea RLS, así que hay que reponer el aislamiento por
 * `org_id` a mano en las 4 acciones que lo usan. Leer primero con el
 * cliente de sesión (`ctx.supabase`, acotado por `profiles_select_org`) es
 * la primera barrera — un `profileId` de otra organización muere aquí. La
 * segunda barrera es el `.eq("org_id", ctx.orgId)` que cada escritura con
 * `createAdminClient()` añade además, por si un futuro refactor se salta
 * esta llamada.
 */
async function assertSameOrgProfile(
  supabase: SessionClient,
  profileId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("id, org_id, email, role_id, estado")
    .eq("id", profileId)
    .maybeSingle()
  return data
}

/**
 * Repite la búsqueda de `assertSameOrgProfile` y empaqueta el error "no
 * encontrado" que las 5 acciones devuelven igual. Comprobar con
 * `"ok" in profile` en el call site: si está, es el error; si no, es la fila.
 */
async function requireSameOrgProfile(
  supabase: SessionClient,
  profileId: string
) {
  const profile = await assertSameOrgProfile(supabase, profileId)
  return profile ?? { ok: false as const, message: "Usuario no encontrado." }
}

async function isTeamManagerRole(supabase: SessionClient, roleId: string) {
  const { data } = await supabase
    .from("role_permissions")
    .select("accion")
    .eq("role_id", roleId)
    .eq("recurso", "equipo")
    .eq("accion", "editar")
    .maybeSingle()
  return !!data
}

/** Cuántos usuarios activos de la org (sin contar `excludeProfileId`) tienen un rol con `equipo:editar`. */
async function countOtherActiveManagers(
  supabase: SessionClient,
  orgId: string,
  excludeProfileId: string
) {
  const { data: managerRoles } = await supabase
    .from("roles")
    .select("id, role_permissions!inner(recurso, accion)")
    .eq("org_id", orgId)
    .eq("role_permissions.recurso", "equipo")
    .eq("role_permissions.accion", "editar")

  const roleIds = (managerRoles ?? []).map((r) => r.id)
  if (roleIds.length === 0) return 0

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("estado", "activo")
    .in("role_id", roleIds)
    .neq("id", excludeProfileId)

  return count ?? 0
}

/**
 * `null` si el cambio puede proceder. Si el perfil ya era el único manager
 * activo de la organización y el cambio se lo quita, el mensaje a devolver.
 * `willStayManager` se evalúa solo si el perfil ya era manager — evita esa
 * segunda consulta en el caso común (no lo era).
 */
async function guardLastManager(
  supabase: SessionClient,
  orgId: string,
  profile: { id: string; estado: string; role_id: string },
  willStayManager: () => Promise<boolean>,
  message: string
) {
  const wasManager =
    profile.estado === "activo" &&
    (await isTeamManagerRole(supabase, profile.role_id))
  if (!wasManager || (await willStayManager())) return null

  const others = await countOtherActiveManagers(supabase, orgId, profile.id)
  return others === 0 ? message : null
}

function revalidateUser(profileId: string) {
  revalidatePath("/ajustes/equipo")
  revalidatePath(`/ajustes/equipo/usuarios/${profileId}`)
}

export const sendUserPasswordResetAction = teamActionClient
  .inputSchema(sendUserPasswordResetSchema)
  .action(async ({ parsedInput, ctx }) => {
    const profile = await requireSameOrgProfile(
      ctx.supabase,
      parsedInput.profileId
    )
    if ("ok" in profile) return profile

    const origin = await getSiteOrigin()
    // Mismo flujo implícito que el reset self-service (`features/auth`): el
    // mailer incluido de Supabase (2 correos/hora, ver DEPLOY.md §4.2) es el
    // límite real aquí, no el código.
    await ctx.supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${origin}/verificando-enlace`,
    })
    return { ok: true as const }
  })

export const updateUserAccessAction = teamActionClient
  .inputSchema(updateUserAccessSchema)
  .action(async ({ parsedInput, ctx }) => {
    const profile = await requireSameOrgProfile(
      ctx.supabase,
      parsedInput.profileId
    )
    if ("ok" in profile) return profile
    if (profile.id === ctx.userId) {
      return {
        ok: false as const,
        message: "No puedes cambiar tu propio acceso desde aquí.",
      }
    }

    const { data: role } = await ctx.supabase
      .from("roles")
      .select("id, alcance_tiendas")
      .eq("id", parsedInput.roleId)
      .maybeSingle()
    if (!role) {
      return { ok: false as const, message: "Rol no encontrado." }
    }

    let tiendaId: string | null = null
    if (role.alcance_tiendas === "propia") {
      if (!parsedInput.storeId) {
        return {
          ok: false as const,
          message: "Selecciona una tienda para este rol.",
        }
      }
      const { data: store } = await ctx.supabase
        .from("tiendas")
        .select("id")
        .eq("id", parsedInput.storeId)
        .maybeSingle()
      if (!store) {
        return { ok: false as const, message: "Tienda no encontrada." }
      }
      tiendaId = store.id
    }

    const guardMessage = await guardLastManager(
      ctx.supabase,
      ctx.orgId,
      profile,
      () => isTeamManagerRole(ctx.supabase, role.id),
      "No puedes quitarle la gestión del equipo: es el único administrador activo de la organización."
    )
    if (guardMessage) return { ok: false as const, message: guardMessage }

    const admin = createAdminClient()
    const { error } = await admin
      .from("profiles")
      .update({ role_id: role.id, tienda_id: tiendaId })
      .eq("id", profile.id)
      .eq("org_id", ctx.orgId)
    if (error) {
      return { ok: false as const, message: "No se pudo actualizar el acceso." }
    }

    revalidateUser(profile.id)
    return { ok: true as const }
  })

export const setUserStatusAction = teamActionClient
  .inputSchema(setUserStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const profile = await requireSameOrgProfile(
      ctx.supabase,
      parsedInput.profileId
    )
    if ("ok" in profile) return profile
    if (profile.id === ctx.userId) {
      return {
        ok: false as const,
        message: "No puedes desactivarte a ti mismo.",
      }
    }

    if (parsedInput.status === "inactivo") {
      const guardMessage = await guardLastManager(
        ctx.supabase,
        ctx.orgId,
        profile,
        () => Promise.resolve(false),
        "No puedes desactivar al único administrador activo de la organización."
      )
      if (guardMessage) return { ok: false as const, message: guardMessage }
    }

    const admin = createAdminClient()

    // El ban bloquea el login de inmediato; `proxy.ts` cierra el hueco de
    // hasta ~1h de un access token ya emitido comprobando `estado` en cada
    // request de (app) — ver src/lib/supabase/proxy.ts.
    const { error: banError } = await admin.auth.admin.updateUserById(
      profile.id,
      { ban_duration: parsedInput.status === "inactivo" ? "876000h" : "none" }
    )
    if (banError) {
      return { ok: false as const, message: "No se pudo actualizar el acceso." }
    }

    const { error } = await admin
      .from("profiles")
      .update({ estado: parsedInput.status })
      .eq("id", profile.id)
      .eq("org_id", ctx.orgId)
    if (error) {
      return { ok: false as const, message: "No se pudo actualizar el estado." }
    }

    revalidateUser(profile.id)
    updateTag("team-auth-status")
    return { ok: true as const }
  })

export const resetUserMfaAction = teamActionClient
  .inputSchema(resetUserMfaSchema)
  .action(async ({ parsedInput, ctx }) => {
    const profile = await requireSameOrgProfile(
      ctx.supabase,
      parsedInput.profileId
    )
    if ("ok" in profile) return profile

    const admin = createAdminClient()
    const { data: factorsResponse } = await admin.auth.admin.mfa.listFactors({
      userId: profile.id,
    })

    // `deleteFactor` ya cierra las sesiones activas del usuario si el
    // factor borrado estaba verificado (ver auth-js `GoTrueAdminMFAApi`);
    // los factores son independientes entre sí, igual que los dos deletes
    // de abajo, así que corren en paralelo en vez de uno tras otro.
    await Promise.all([
      ...(factorsResponse?.factors ?? []).map((factor) =>
        admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: profile.id })
      ),
      admin.from("mfa_backup_codes").delete().eq("profile_id", profile.id),
      admin.from("trusted_devices").delete().eq("profile_id", profile.id),
    ])

    revalidateUser(profile.id)
    updateTag("team-auth-status")
    return { ok: true as const }
  })

export const revokeUserDevicesAction = teamActionClient
  .inputSchema(revokeUserDevicesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const profile = await requireSameOrgProfile(
      ctx.supabase,
      parsedInput.profileId
    )
    if ("ok" in profile) return profile

    const admin = createAdminClient()
    const { error } = await admin
      .from("trusted_devices")
      .delete()
      .eq("profile_id", profile.id)
    if (error) {
      return {
        ok: false as const,
        message: "No se pudieron revocar los dispositivos.",
      }
    }

    revalidateUser(profile.id)
    return { ok: true as const }
  })
