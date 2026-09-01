"use server"

import { revalidatePath } from "next/cache"

import { membersPermissionActionClient } from "./action-client"
import { updateMemberSchema, memberSchema } from "../schemas"
import { hasPermission } from "../lib/permissions"

function toRow(values: {
  name: string
  lastName: string
  email: string
  phone?: string
  documentType?: string
  documentNumber?: string
  birthDate?: string
  gender?: string
  province?: string
  maritalStatus?: string
  purchasePreference?: string
  hasChildren?: boolean
  hasPets?: boolean
  marketingConsent: boolean
  acquisitionChannel?: string
  accountStatus: string
  enrollmentStoreId?: string
  language: string
  tierId?: string
}) {
  return {
    nombre: values.name,
    apellido: values.lastName,
    email: values.email,
    telefono: values.phone || null,
    tipo_documento: values.documentType || null,
    numero_documento: values.documentNumber || null,
    fecha_nacimiento: values.birthDate || null,
    genero: values.gender || null,
    provincia: values.province || null,
    estado_civil: values.maritalStatus || null,
    preferencia_compra: values.purchasePreference || null,
    tiene_hijos: values.hasChildren ?? null,
    tiene_mascotas: values.hasPets ?? null,
    consentimiento_marketing: values.marketingConsent,
    canal_adquisicion: values.acquisitionChannel || null,
    estado_cuenta: values.accountStatus,
    tienda_inscripcion_id: values.enrollmentStoreId || null,
    idioma: values.language,
    tier_id: values.tierId || null,
  }
}

export const createMemberAction = membersPermissionActionClient
  .inputSchema(memberSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "clientes", "crear")) {
      return {
        ok: false as const,
        message: "No tienes permiso para crear clientes.",
      }
    }

    const { data, error } = await ctx.supabase
      .from("members")
      .insert({ org_id: ctx.orgId, ...toRow(parsedInput) })
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

export const updateMemberAction = membersPermissionActionClient
  .inputSchema(updateMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "clientes", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para editar clientes.",
      }
    }

    const { id, ...values } = parsedInput
    const { error } = await ctx.supabase
      .from("members")
      .update(toRow(values))
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
