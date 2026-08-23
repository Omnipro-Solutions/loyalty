"use server"

import { revalidatePath } from "next/cache"

import { tiendasActionClient } from "./action-client"
import { actualizarTiendaSchema, tiendaSchema } from "../schemas"

function aFilas(valores: {
  nombre: string
  codigoTienda: string
  formato: string
  estado: string
  pais: string
  region: string
  ciudad: string
  colonia: string
  direccion: string
  codigoPostal: string
  referencia?: string
  telefono: string
  email: string
  responsable?: string
  zonaHoraria?: string
}) {
  return {
    nombre: valores.nombre,
    codigo_tienda: valores.codigoTienda,
    formato: valores.formato,
    estado: valores.estado,
    pais: valores.pais,
    region: valores.region,
    ciudad: valores.ciudad,
    colonia: valores.colonia,
    direccion: valores.direccion,
    codigo_postal: valores.codigoPostal,
    referencia: valores.referencia || null,
    telefono: valores.telefono,
    email: valores.email,
    responsable: valores.responsable || null,
    zona_horaria: valores.zonaHoraria || null,
  }
}

export const crearTiendaAction = tiendasActionClient
  .inputSchema(tiendaSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data, error } = await ctx.supabase
      .from("tiendas")
      .insert({ org_id: ctx.orgId, ...aFilas(parsedInput) })
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

export const actualizarTiendaAction = tiendasActionClient
  .inputSchema(actualizarTiendaSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...valores } = parsedInput
    const { error } = await ctx.supabase
      .from("tiendas")
      .update(aFilas(valores))
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
