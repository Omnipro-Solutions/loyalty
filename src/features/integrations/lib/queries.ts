import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"
import type {
  IntegrationConnectionDirection,
  IntegrationConnectionStatus,
} from "@/types/domain"

import type { IntegrationCredentialsValues } from "../schemas"

/**
 * `direccion`/`estado` narrowed a los union types de dominio — el tipo
 * generado por Supabase los deja en `string` (no refleja los `check` de la
 * migración). Se acota una sola vez aquí, no con un `as` en cada sitio que
 * lee una fila.
 */
export type IntegrationConnectionRow = Omit<
  Database["public"]["Tables"]["integracion_conexiones"]["Row"],
  "direccion" | "estado"
> & {
  direccion: IntegrationConnectionDirection
  estado: IntegrationConnectionStatus
}
export type IntegrationFieldMappingRow =
  Database["public"]["Tables"]["integracion_mapeos_campos"]["Row"]

export type IntegrationConnectionDetail = IntegrationConnectionRow & {
  credentials: IntegrationCredentialsValues | null
  fieldMappings: IntegrationFieldMappingRow[]
}

/**
 * Una conexión es 1:1 con `(org_id, integration_id, direccion)` — ver el
 * `unique` de la migración. Trae credenciales y mapeo embebidos en el mismo
 * select (en vez de un segundo `Promise.all`): `integracion_credenciales`
 * es 1:1 por `unique(conexion_id)`, así que PostgREST lo devuelve como
 * objeto, no array.
 */
export async function getIntegrationConnectionDetail(
  integrationId: string,
  direction: IntegrationConnectionDirection
): Promise<IntegrationConnectionDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("integracion_conexiones")
    .select(
      "*, integracion_credenciales(tipo_auth, datos), integracion_mapeos_campos(*)"
    )
    .eq("integration_id", integrationId)
    .eq("direccion", direction)
    .order("orden", { referencedTable: "integracion_mapeos_campos" })
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const {
    integracion_credenciales: credenciales,
    integracion_mapeos_campos: mapeos,
    ...conexion
  } = data

  return {
    ...(conexion as IntegrationConnectionRow),
    credentials: credenciales
      ? ({
          tipoAuth: credenciales.tipo_auth,
          ...(credenciales.datos as object),
        } as IntegrationCredentialsValues)
      : null,
    fieldMappings: mapeos,
  }
}

/** Conexiones activas/con error de toda la organización, para la pestaña "Conexiones" (`ActiveConnectionsCard`). */
export async function listIntegrationConnections(): Promise<
  IntegrationConnectionRow[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("integracion_conexiones")
    .select("*")
    .order("creado_en")
  if (error) throw error
  return (data ?? []) as IntegrationConnectionRow[]
}
