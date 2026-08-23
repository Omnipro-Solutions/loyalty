"use server"

import { revalidatePath } from "next/cache"

import { clientesActionClient } from "./action-client"
import { actualizarClienteSchema, clienteSchema } from "../schemas"

function aFilas(valores: {
  nombre: string
  apellido: string
  email: string
  telefono?: string
  tipoDocumento?: string
  numeroDocumento?: string
  fechaNacimiento?: string
  genero?: string
  provincia?: string
  estadoCivil?: string
  preferenciaCompra?: string
  tieneHijos?: boolean
  tieneMascotas?: boolean
  consentimientoMarketing: boolean
  canalAdquisicion?: string
  estadoCuenta: string
  tiendaInscripcionId?: string
  idioma: string
  tierId?: string
}) {
  return {
    nombre: valores.nombre,
    apellido: valores.apellido,
    email: valores.email,
    telefono: valores.telefono || null,
    tipo_documento: valores.tipoDocumento || null,
    numero_documento: valores.numeroDocumento || null,
    fecha_nacimiento: valores.fechaNacimiento || null,
    genero: valores.genero || null,
    provincia: valores.provincia || null,
    estado_civil: valores.estadoCivil || null,
    preferencia_compra: valores.preferenciaCompra || null,
    tiene_hijos: valores.tieneHijos ?? null,
    tiene_mascotas: valores.tieneMascotas ?? null,
    consentimiento_marketing: valores.consentimientoMarketing,
    canal_adquisicion: valores.canalAdquisicion || null,
    estado_cuenta: valores.estadoCuenta,
    tienda_inscripcion_id: valores.tiendaInscripcionId || null,
    idioma: valores.idioma,
    tier_id: valores.tierId || null,
  }
}

export const crearClienteAction = clientesActionClient
  .inputSchema(clienteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data, error } = await ctx.supabase
      .from("members")
      .insert({ org_id: ctx.orgId, ...aFilas(parsedInput) })
      .select("id")
      .single()

    if (error || !data) {
      const message =
        error?.code === "23505"
          ? "Ya existe un cliente con ese correo o documento."
          : "No se pudo crear el cliente."
      return { ok: false as const, message }
    }

    revalidatePath("/clientes")
    return { ok: true as const, id: data.id as string }
  })

export const actualizarClienteAction = clientesActionClient
  .inputSchema(actualizarClienteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...valores } = parsedInput
    const { error } = await ctx.supabase
      .from("members")
      .update(aFilas(valores))
      .eq("id", id)

    if (error) {
      const message =
        error.code === "23505"
          ? "Ya existe un cliente con ese correo o documento."
          : "No se pudo guardar el cliente."
      return { ok: false as const, message }
    }

    revalidatePath("/clientes")
    revalidatePath(`/clientes/${id}`)
    revalidatePath(`/clientes/${id}/editar`)
    return { ok: true as const, id }
  })
