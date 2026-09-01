"use server"

import { revalidatePath } from "next/cache"

import {
  APPROVABLE_RESOURCES,
  actionApplies,
  applicablePermissions,
  isFullAccessRole,
  missingForFullAccess,
  type Action,
  type Resource,
} from "@/lib/permissions"
import type { createClient } from "@/lib/supabase/server"

import { teamActionClient } from "./action-client"
import { RESOURCE_INFO } from "../lib/labels"
import {
  updateRoleSchema,
  createRoleSchema,
  duplicateRoleSchema,
} from "../schemas"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export const createRoleAction = teamActionClient
  .inputSchema(createRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data, error } = await ctx.supabase
      .from("roles")
      .insert({
        org_id: ctx.orgId,
        nombre: parsedInput.name,
        descripcion: parsedInput.description || null,
        tipo: "personalizado",
        rol_base: parsedInput.baseRole,
        alcance_tiendas: parsedInput.storeScope,
        alcance_canal: parsedInput.channelScope,
        descuento_maximo_pct: parsedInput.maxDiscountPct ?? null,
      })
      .select("id")
      .single()

    if (error || !data) {
      const message =
        error?.code === "23505"
          ? "Ya existe un rol con ese nombre."
          : "No se pudo crear el rol."
      return { ok: false as const, message }
    }

    revalidatePath("/ajustes/equipo")
    return { ok: true as const, id: data.id as string }
  })

export const duplicateRoleAction = teamActionClient
  .inputSchema(duplicateRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: original, error: errorOriginal } = await ctx.supabase
      .from("roles")
      .select("*")
      .eq("id", parsedInput.roleId)
      .single()
    if (errorOriginal || !original) {
      return {
        ok: false as const,
        message: "No se encontró el rol a duplicar.",
      }
    }

    const { data: newRole, error } = await ctx.supabase
      .from("roles")
      .insert({
        org_id: ctx.orgId,
        nombre: parsedInput.name,
        descripcion: original.descripcion,
        tipo: "personalizado",
        rol_base: original.rol_base,
        alcance_tiendas: original.alcance_tiendas,
        alcance_canal: original.alcance_canal,
        descuento_maximo_pct: original.descuento_maximo_pct,
      })
      .select("id")
      .single()

    if (error || !newRole) {
      const message =
        error?.code === "23505"
          ? "Ya existe un rol con ese nombre."
          : "No se pudo duplicar el rol."
      return { ok: false as const, message }
    }

    const { data: permissions } = await ctx.supabase
      .from("role_permissions")
      .select("recurso, accion")
      .eq("role_id", parsedInput.roleId)

    if (permissions?.length) {
      await ctx.supabase.from("role_permissions").insert(
        permissions.map((p) => ({
          role_id: newRole.id as string,
          recurso: p.recurso,
          accion: p.accion,
        }))
      )
    }

    revalidatePath("/ajustes/equipo")
    return { ok: true as const, id: newRole.id as string }
  })

export const updateRoleAction = teamActionClient
  .inputSchema(updateRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Validar ANTES de escribir nada: el guardado toca dos tablas y no hay
    // transacción entre ellas, así que un rechazo a mitad dejaría el nombre y
    // el alcance ya cambiados sin forma de desandarlos.
    const validPermissions = parsedInput.permissions.filter((p) =>
      actionApplies(p.resource, p.action)
    )

    const guard = await guardPermissionMatrix(ctx, {
      roleId: parsedInput.roleId,
      granted: validPermissions,
    })
    if (!guard.ok) return guard

    const { error: errorUpdate } = await ctx.supabase
      .from("roles")
      .update({
        nombre: parsedInput.name,
        descripcion: parsedInput.description || null,
        alcance_tiendas: parsedInput.storeScope,
        alcance_canal: parsedInput.channelScope,
        descuento_maximo_pct: parsedInput.maxDiscountPct ?? null,
      })
      .eq("id", parsedInput.roleId)

    if (errorUpdate) {
      const message =
        errorUpdate.code === "23505"
          ? "Ya existe un rol con ese nombre."
          : "No se pudo guardar el rol."
      return { ok: false as const, message }
    }

    {
      const written =
        guard.mode === "replace"
          ? await replacePermissionMatrix(
              ctx,
              parsedInput.roleId,
              validPermissions
            )
          : await ensureFullPermissionMatrix(ctx, parsedInput.roleId)
      if (!written.ok) {
        return {
          ok: false as const,
          message: "No se pudo guardar la matriz de permisos.",
        }
      }
    }

    revalidatePath("/ajustes/equipo")
    return { ok: true as const }
  })

/**
 * Borra y reinserta la matriz entera: más simple que diffear fila a fila, y
 * el conjunto siempre es pequeño (como mucho 10 recursos × 9 acciones).
 */
async function replacePermissionMatrix(
  ctx: { supabase: SupabaseClient },
  roleId: string,
  permissions: { resource: Resource; action: Action }[]
): Promise<{ ok: boolean }> {
  const { error: errorDelete } = await ctx.supabase
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId)
  if (errorDelete) return { ok: false }

  if (!permissions.length) return { ok: true }

  const { error: errorInsert } = await ctx.supabase
    .from("role_permissions")
    .insert(
      permissions.map((p) => ({
        role_id: roleId,
        recurso: p.resource,
        accion: p.action,
      }))
    )
  return { ok: !errorInsert }
}

/**
 * Solo añade lo que falte — nunca borra, que es justo lo que el trigger
 * `role_permissions_full_access_guard` prohíbe sobre este rol.
 */
async function ensureFullPermissionMatrix(
  ctx: { supabase: SupabaseClient },
  roleId: string
): Promise<{ ok: boolean }> {
  const { error } = await ctx.supabase.from("role_permissions").upsert(
    applicablePermissions().map((p) => ({
      role_id: roleId,
      recurso: p.resource,
      accion: p.action,
    })),
    { onConflict: "role_id,recurso,accion", ignoreDuplicates: true }
  )
  return { ok: !error }
}

type GuardResult =
  { ok: true; mode: "replace" | "ensure_full" } | { ok: false; message: string }

/**
 * Las dos cosas que la matriz de 09.2 nunca debería poder provocar y hasta
 * ahora sí: dejar sin permisos al rol de sistema "Administrador", y dejar a
 * la organización sin nadie que pueda aprobar un recurso.
 *
 * Van aquí y no en la pantalla porque `updateRoleAction` borra y reinserta
 * la matriz entera — un cliente que llame la action con menos filas de las
 * que la UI muestra consigue exactamente el mismo estropicio. El blindaje
 * de verdad (contra un DELETE directo a la Data API, que las políticas de
 * `role_permissions` permiten a cualquier miembro de la org) vive en el
 * trigger de `20260901090000_roles_sistema_blindaje.sql`; esto es lo que da
 * el mensaje legible antes de llegar ahí.
 */
async function guardPermissionMatrix(
  ctx: { supabase: SupabaseClient },
  params: { roleId: string; granted: { resource: Resource; action: Action }[] }
): Promise<GuardResult> {
  const { data: role, error } = await ctx.supabase
    .from("roles")
    .select("tipo, rol_base")
    .eq("id", params.roleId)
    .maybeSingle()
  if (error || !role) {
    return { ok: false, message: "No se encontró el rol." }
  }

  if (isFullAccessRole(role)) {
    const missing = missingForFullAccess(params.granted)
    if (missing.length) {
      return {
        ok: false,
        message:
          "El rol Administrador del sistema tiene acceso total por definición y no se puede recortar. Duplícalo si necesitas una versión con menos permisos.",
      }
    }
    // No se reescribe: se completa. El trigger de Postgres impide borrarle
    // filas a este rol, así que el borra-y-reinserta moriría en el DELETE —
    // y además así un rol recortado antes del blindaje se sana solo con el
    // primer guardado.
    return { ok: true, mode: "ensure_full" }
  }

  // Solo se comprueban los recursos que este guardado QUITA: si el rol nunca
  // tuvo `aprobar` sobre algo, guardar cualquier otro cambio no puede ser lo
  // que deje ese recurso huérfano.
  const { data: currentRows } = await ctx.supabase
    .from("role_permissions")
    .select("recurso")
    .eq("role_id", params.roleId)
    .eq("accion", "aprobar")

  const grantedKeys = new Set(
    params.granted.map((p) => `${p.resource}:${p.action}`)
  )
  const removed = (currentRows ?? [])
    .map((row) => row.recurso as Resource)
    .filter(
      (recurso) =>
        APPROVABLE_RESOURCES.includes(recurso) &&
        !grantedKeys.has(`${recurso}:aprobar`)
    )
  if (!removed.length) return { ok: true, mode: "replace" }

  // Un rol con el permiso pero sin nadie asignado no es un aprobador: la
  // solicitud se quedaría igual de atascada. Por eso se cruza con `profiles`
  // en vez de contar roles a secas.
  const [{ data: approverRows }, { data: staffedRows }] = await Promise.all([
    ctx.supabase
      .from("role_permissions")
      .select("role_id, recurso")
      .eq("accion", "aprobar")
      .in("recurso", removed),
    ctx.supabase.from("profiles").select("role_id").eq("estado", "activo"),
  ])

  const staffedRoleIds = new Set((staffedRows ?? []).map((p) => p.role_id))
  const orphaned = removed.filter(
    (recurso) =>
      !(approverRows ?? []).some(
        (row) =>
          row.recurso === recurso &&
          row.role_id !== params.roleId &&
          staffedRoleIds.has(row.role_id)
      )
  )
  if (orphaned.length) {
    const labels = orphaned.map((r) => `«${RESOURCE_INFO[r].label}»`).join(", ")
    return {
      ok: false,
      message: `Este es el último rol con gente asignada que puede aprobar ${labels}. Dale «Aprobar» a otro rol antes de quitárselo a este, o lo que quede pendiente de aprobación no lo podrá desbloquear nadie.`,
    }
  }

  return { ok: true, mode: "replace" }
}
