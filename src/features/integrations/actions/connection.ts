"use server"

import { revalidatePath } from "next/cache"

import { integrationsActionClient } from "./action-client"
import { hasPermission } from "../lib/permissions"
import {
  deleteConnectionSchema,
  setConnectionStatusSchema,
  upsertIntegrationConnectionSchema,
} from "../schemas"

const INTEGRATIONS_PATH = "/ajustes/integraciones"

function fail(message: string) {
  return { ok: false as const, message }
}

/**
 * Crea o actualiza la conexión, sus credenciales y su mapeo de campos en un
 * solo paso — la vista de configuración (Fase C) guarda las tres secciones
 * juntas, no hay borrador parcial. El mapeo de campos se reemplaza
 * completo (como `updateRoleAction` con la matriz de permisos): el
 * conjunto siempre es pequeño y diffear fila a fila no aporta nada.
 */
export const upsertIntegrationConnectionAction = integrationsActionClient
  .inputSchema(upsertIntegrationConnectionSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "integraciones", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para configurar integraciones.",
      }
    }

    const { tipoAuth, ...datosCredenciales } = parsedInput.credentials

    const { data: conexion, error: errorConexion } = await ctx.supabase
      .from("integracion_conexiones")
      .upsert(
        {
          org_id: ctx.orgId,
          integration_id: parsedInput.integrationId,
          direccion: parsedInput.direction,
          estado: parsedInput.status,
          frecuencia: parsedInput.frequency || null,
          creado_por: ctx.userId,
        },
        { onConflict: "org_id,integration_id,direccion" }
      )
      .select("id")
      .single()
    if (errorConexion || !conexion) {
      return fail("No se pudo guardar la conexión.")
    }

    const { error: errorCredenciales } = await ctx.supabase
      .from("integracion_credenciales")
      .upsert(
        {
          conexion_id: conexion.id,
          tipo_auth: tipoAuth,
          datos: datosCredenciales,
          rotado_en: new Date().toISOString(),
        },
        { onConflict: "conexion_id" }
      )
    if (errorCredenciales) {
      return fail("No se pudieron guardar las credenciales.")
    }

    const { error: errorBorrarMapeos } = await ctx.supabase
      .from("integracion_mapeos_campos")
      .delete()
      .eq("conexion_id", conexion.id)
    if (errorBorrarMapeos) {
      return fail("No se pudo guardar el mapeo de campos.")
    }

    if (parsedInput.fieldMappings.length) {
      const { error: errorInsertarMapeos } = await ctx.supabase
        .from("integracion_mapeos_campos")
        .insert(
          parsedInput.fieldMappings.map((mapping, index) => ({
            conexion_id: conexion.id as string,
            campo_origen: mapping.sourceField,
            campo_destino: mapping.targetField,
            transformacion: mapping.transform || null,
            orden: index,
          }))
        )
      if (errorInsertarMapeos) {
        return fail("No se pudo guardar el mapeo de campos.")
      }
    }

    revalidatePath(INTEGRATIONS_PATH)
    return { ok: true as const, connectionId: conexion.id as string }
  })

/** "Pausar"/"Reanudar" de `ActiveConnectionsCard` — no toca credenciales ni mapeo. */
export const setConnectionStatusAction = integrationsActionClient
  .inputSchema(setConnectionStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "integraciones", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para configurar integraciones.",
      }
    }

    const { error } = await ctx.supabase
      .from("integracion_conexiones")
      .update({ estado: parsedInput.status })
      .eq("id", parsedInput.connectionId)

    if (error) {
      return fail("No se pudo actualizar el estado.")
    }

    revalidatePath(INTEGRATIONS_PATH)
    return { ok: true as const }
  })

/** Desconecta la integración por completo — credenciales y mapeo se van con el `on delete cascade`. */
export const deleteConnectionAction = integrationsActionClient
  .inputSchema(deleteConnectionSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "integraciones", "eliminar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para eliminar integraciones.",
      }
    }

    const { error } = await ctx.supabase
      .from("integracion_conexiones")
      .delete()
      .eq("id", parsedInput.connectionId)

    if (error) {
      return fail("No se pudo desconectar la integración.")
    }

    revalidatePath(INTEGRATIONS_PATH)
    return { ok: true as const }
  })
