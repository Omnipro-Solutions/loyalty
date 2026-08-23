"use server"

import { revalidatePath } from "next/cache"

import { actionApplies } from "@/lib/permissions"

import { teamActionClient } from "./action-client"
import {
  updateRoleSchema,
  createRoleSchema,
  duplicateRoleSchema,
} from "../schemas"

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

    // Reemplaza la matriz completa: más simple que diffear fila a fila, y
    // el conjunto siempre es pequeño (como mucho 9 recursos × 5 acciones).
    const validPermissions = parsedInput.permissions.filter((p) =>
      actionApplies(p.resource, p.action)
    )

    const { error: errorDelete } = await ctx.supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", parsedInput.roleId)
    if (errorDelete) {
      return {
        ok: false as const,
        message: "No se pudo guardar la matriz de permisos.",
      }
    }

    if (validPermissions.length) {
      const { error: errorInsert } = await ctx.supabase
        .from("role_permissions")
        .insert(
          validPermissions.map((p) => ({
            role_id: parsedInput.roleId,
            recurso: p.resource,
            accion: p.action,
          }))
        )
      if (errorInsert) {
        return {
          ok: false as const,
          message: "No se pudo guardar la matriz de permisos.",
        }
      }
    }

    revalidatePath("/ajustes/equipo")
    return { ok: true as const }
  })
