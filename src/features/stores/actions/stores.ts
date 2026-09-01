"use server"

import { revalidatePath } from "next/cache"

import { storesActionClient } from "./action-client"
import { storeSchema, updateStoreSchema } from "../schemas"
import { hasPermission } from "../lib/permissions"

function toRow(values: {
  name: string
  storeCode: string
  format: string
  status: string
  groupId: string
  country: string
  region: string
  city: string
  neighborhood: string
  address: string
  postalCode: string
  reference?: string
  phone: string
  email: string
  manager?: string
  timezone?: string
}) {
  return {
    nombre: values.name,
    codigo_tienda: values.storeCode,
    formato: values.format,
    estado: values.status,
    grupo_id: values.groupId,
    pais: values.country,
    region: values.region,
    ciudad: values.city,
    colonia: values.neighborhood,
    direccion: values.address,
    codigo_postal: values.postalCode,
    referencia: values.reference || null,
    telefono: values.phone,
    email: values.email,
    responsable: values.manager || null,
    zona_horaria: values.timezone || null,
  }
}

export const createStoreAction = storesActionClient
  .inputSchema(storeSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "tiendas", "crear")) {
      return {
        ok: false as const,
        message: "No tienes permiso para crear tiendas.",
      }
    }

    const { data, error } = await ctx.supabase
      .from("tiendas")
      .insert({ org_id: ctx.orgId, ...toRow(parsedInput) })
      .select("id")
      .single()

    if (error || !data) {
      const message =
        error?.code === "23505"
          ? "Ya existe una tienda con ese código."
          : "No se pudo crear la tienda."
      return { ok: false as const, message }
    }

    revalidatePath("/tiendas")
    return { ok: true as const, id: data.id as string }
  })

export const updateStoreAction = storesActionClient
  .inputSchema(updateStoreSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "tiendas", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para editar tiendas.",
      }
    }

    const { id, ...values } = parsedInput
    const { error } = await ctx.supabase
      .from("tiendas")
      .update(toRow(values))
      .eq("id", id)

    if (error) {
      const message =
        error.code === "23505"
          ? "Ya existe una tienda con ese código."
          : "No se pudo guardar la tienda."
      return { ok: false as const, message }
    }

    revalidatePath("/tiendas")
    revalidatePath(`/tiendas/${id}/editar`)
    return { ok: true as const, id }
  })
