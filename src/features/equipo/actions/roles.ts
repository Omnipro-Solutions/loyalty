"use server"

import { revalidatePath } from "next/cache"

import { actionApplies } from "@/lib/permissions"

import { equipoActionClient } from "./action-client"
import {
  actualizarRolSchema,
  crearRolSchema,
  duplicarRolSchema,
} from "../schemas"

export const crearRolAction = equipoActionClient
  .inputSchema(crearRolSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data, error } = await ctx.supabase
      .from("roles")
      .insert({
        org_id: ctx.orgId,
        nombre: parsedInput.nombre,
        descripcion: parsedInput.descripcion || null,
        tipo: "personalizado",
        rol_base: parsedInput.rolBase,
        alcance_tiendas: parsedInput.alcanceTiendas,
        alcance_canal: parsedInput.alcanceCanal,
        descuento_maximo_pct: parsedInput.descuentoMaximoPct ?? null,
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

export const duplicarRolAction = equipoActionClient
  .inputSchema(duplicarRolSchema)
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

    const { data: nuevo, error } = await ctx.supabase
      .from("roles")
      .insert({
        org_id: ctx.orgId,
        nombre: parsedInput.nombre,
        descripcion: original.descripcion,
        tipo: "personalizado",
        rol_base: original.rol_base,
        alcance_tiendas: original.alcance_tiendas,
        alcance_canal: original.alcance_canal,
        descuento_maximo_pct: original.descuento_maximo_pct,
      })
      .select("id")
      .single()

    if (error || !nuevo) {
      const message =
        error?.code === "23505"
          ? "Ya existe un rol con ese nombre."
          : "No se pudo duplicar el rol."
      return { ok: false as const, message }
    }

    const { data: permisos } = await ctx.supabase
      .from("role_permissions")
      .select("recurso, accion")
      .eq("role_id", parsedInput.roleId)

    if (permisos?.length) {
      await ctx.supabase.from("role_permissions").insert(
        permisos.map((p) => ({
          role_id: nuevo.id as string,
          recurso: p.recurso,
          accion: p.accion,
        }))
      )
    }

    revalidatePath("/ajustes/equipo")
    return { ok: true as const, id: nuevo.id as string }
  })

export const actualizarRolAction = equipoActionClient
  .inputSchema(actualizarRolSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error: errorUpdate } = await ctx.supabase
      .from("roles")
      .update({
        nombre: parsedInput.nombre,
        descripcion: parsedInput.descripcion || null,
        alcance_tiendas: parsedInput.alcanceTiendas,
        alcance_canal: parsedInput.alcanceCanal,
        descuento_maximo_pct: parsedInput.descuentoMaximoPct ?? null,
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
    const permisosValidos = parsedInput.permisos.filter((p) =>
      actionApplies(p.recurso, p.accion)
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

    if (permisosValidos.length) {
      const { error: errorInsert } = await ctx.supabase
        .from("role_permissions")
        .insert(
          permisosValidos.map((p) => ({
            role_id: parsedInput.roleId,
            recurso: p.recurso,
            accion: p.accion,
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
