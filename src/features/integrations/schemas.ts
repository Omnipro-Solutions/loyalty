import { z } from "zod"

import { INTEGRATION_CONNECTION_DIRECTIONS } from "@/types/domain"

/**
 * Una rama por `tipoAuth` — cada método de autenticación del catálogo
 * (`src/config/integrations-catalog.ts`, campo `method`) pide credenciales
 * distintas. Se guardan tal cual en `integracion_credenciales.datos`
 * (jsonb) sin el campo `tipoAuth`, que vive en su propia columna — ver
 * `upsertIntegrationConnectionAction`.
 */
export const integrationCredentialsSchema = z.discriminatedUnion("tipoAuth", [
  z.object({
    tipoAuth: z.literal("oauth2"),
    clientId: z.string().min(1, "Ingresa el client ID"),
    clientSecret: z.string().min(1, "Ingresa el client secret"),
  }),
  z.object({
    tipoAuth: z.literal("api_key"),
    apiKey: z.string().min(1, "Ingresa la API key"),
  }),
  z.object({
    tipoAuth: z.literal("app_key_token"),
    appKey: z.string().min(1, "Ingresa el App Key"),
    appToken: z.string().min(1, "Ingresa el App Token"),
  }),
  z.object({
    tipoAuth: z.literal("token_personal"),
    token: z.string().min(1, "Ingresa el token personal"),
  }),
  z.object({
    tipoAuth: z.literal("token_integracion"),
    token: z.string().min(1, "Ingresa el token de integración"),
  }),
  z.object({
    tipoAuth: z.literal("certificado"),
    certificado: z.string().min(1, "Pega el certificado"),
  }),
  z.object({
    tipoAuth: z.literal("usuario_tecnico"),
    usuario: z.string().min(1, "Ingresa el usuario técnico"),
    contrasena: z.string().min(1, "Ingresa la contraseña"),
  }),
])
export type IntegrationCredentialsValues = z.infer<
  typeof integrationCredentialsSchema
>

export const integrationFieldMappingSchema = z.object({
  sourceField: z.string().min(1, "Ingresa el campo origen"),
  targetField: z.string().min(1, "Ingresa el campo destino"),
  transform: z.string().optional(),
})
export type IntegrationFieldMappingValues = z.infer<
  typeof integrationFieldMappingSchema
>

export const upsertIntegrationConnectionSchema = z.object({
  integrationId: z.string().min(1),
  direction: z.enum(INTEGRATION_CONNECTION_DIRECTIONS),
  // "con_error" es un estado de sistema (lo pone el sync al fallar, ver
  // `integracion_conexiones.estado`) — desde el formulario solo se elige
  // entre activar o pausar la conexión.
  status: z.enum(["activa", "pausada"]).default("pausada"),
  frequency: z.string().optional(),
  credentials: integrationCredentialsSchema,
  fieldMappings: z.array(integrationFieldMappingSchema).default([]),
})
export type UpsertIntegrationConnectionValues = z.infer<
  typeof upsertIntegrationConnectionSchema
>

export const setConnectionStatusSchema = z.object({
  connectionId: z.string().uuid(),
  status: z.enum(["activa", "pausada"]),
})

export const deleteConnectionSchema = z.object({
  connectionId: z.string().uuid(),
})
