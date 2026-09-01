"use server"

import { revalidatePath } from "next/cache"

import { storesActionClient } from "./action-client"
import { hasPermission } from "../lib/permissions"
import {
  deleteStoreGroupSchema,
  storeGroupSchema,
  updateStoreGroupSchema,
} from "../schemas"

export const createStoreGroupAction = storesActionClient
  .inputSchema(storeGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "tiendas", "crear")) {
      return {
        ok: false as const,
        message: "No tienes permiso para crear grupos de tiendas.",
      }
    }

    const { data, error } = await ctx.supabase
      .from("tienda_grupos")
      .insert({
        org_id: ctx.orgId,
        nombre: parsedInput.name,
        descripcion: parsedInput.description || null,
      })
      .select("id")
      .single()

    if (error || !data) {
      const message =
        error?.code === "23505"
          ? "Ya existe un grupo con ese nombre."
          : "No se pudo crear el grupo."
      return { ok: false as const, message }
    }

    revalidatePath("/tiendas")
    return { ok: true as const, id: data.id as string, name: parsedInput.name }
  })

export const updateStoreGroupAction = storesActionClient
  .inputSchema(updateStoreGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "tiendas", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para editar grupos de tiendas.",
      }
    }

    const { error } = await ctx.supabase
      .from("tienda_grupos")
      .update({
        nombre: parsedInput.name,
        descripcion: parsedInput.description || null,
      })
      .eq("id", parsedInput.id)

    if (error) {
      const message =
        error.code === "23505"
          ? "Ya existe un grupo con ese nombre."
          : "No se pudo guardar el grupo."
      return { ok: false as const, message }
    }

    revalidatePath("/tiendas")
    return { ok: true as const }
  })

export const deleteStoreGroupAction = storesActionClient
  .inputSchema(deleteStoreGroupSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "tiendas", "eliminar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para eliminar grupos de tiendas.",
      }
    }

    const { error } = await ctx.supabase
      .from("tienda_grupos")
      .delete()
      .eq("id", parsedInput.id)

    if (error) {
      // 23503 = FK violation — todavía hay tiendas asignadas a este grupo.
      const message =
        error.code === "23503"
          ? "No se puede eliminar: hay tiendas asignadas a este grupo."
          : "No se pudo eliminar el grupo."
      return { ok: false as const, message }
    }

    revalidatePath("/tiendas")
    return { ok: true as const }
  })
