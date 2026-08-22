/**
 * Conjuntos cerrados del dominio, como union types derivados de tuplas
 * `as const` — nunca `enum` (convención heredada de polar-portal). Cada
 * tupla debe reflejar exactamente el `check` de la columna equivalente en
 * `supabase/migrations/`; si cambias una, cambia la otra.
 */

export const ROLES = ["admin", "gestor", "aprobador", "lector"] as const
export type Rol = (typeof ROLES)[number]

export const TENANT_IDPS = [
  "microsoft_entra_id",
  "saml_okta",
  "saml_ping",
  "saml_google_workspace",
] as const
export type TenantIdp = (typeof TENANT_IDPS)[number]

// Niveles del programa de lealtad (08.5 "Multiplicador por nivel").
export const TIER_NOMBRES = ["diamante", "oro", "plata", "bronce"] as const
export type TierNombre = (typeof TIER_NOMBRES)[number]

export const POINTS_LEDGER_TIPOS = [
  "acumulacion",
  "canje",
  "expiracion",
  "ajuste",
] as const
export type PointsLedgerTipo = (typeof POINTS_LEDGER_TIPOS)[number]

export const COUPON_TIPOS = [
  "descuento_porcentaje",
  "descuento_monto",
  "envio_gratis",
  "2x1",
] as const
export type CouponTipo = (typeof COUPON_TIPOS)[number]

export const COUPON_ESTADOS = [
  "activo",
  "canjeado",
  "expirado",
  "anulado",
] as const
export type CouponEstado = (typeof COUPON_ESTADOS)[number]

export const CHALLENGE_ESTADOS = [
  "en_progreso",
  "cumplido",
  "expirado",
] as const
export type ChallengeEstado = (typeof CHALLENGE_ESTADOS)[number]

export const WORKFLOW_ESTADOS = [
  "borrador",
  "publicado",
  "pausado",
  "archivado",
] as const
export type WorkflowEstado = (typeof WORKFLOW_ESTADOS)[number]

export const WORKFLOW_RUN_TIPOS = ["simulacion", "publicacion"] as const
export type WorkflowRunTipo = (typeof WORKFLOW_RUN_TIPOS)[number]

export const WORKFLOW_RUN_ESTADOS = [
  "en_progreso",
  "completado",
  "con_errores",
] as const
export type WorkflowRunEstado = (typeof WORKFLOW_RUN_ESTADOS)[number]

/**
 * Catálogo de 19 tipos de bloque del Loyalty Builder, en 5 grupos (Figma
 * "08.4 · Loyalty builder · catálogo de bloques"). Los metadatos de
 * presentación (etiqueta, ícono, color) viven en src/config/builder-blocks.ts;
 * aquí solo el conjunto cerrado de valores válidos para `workflow_nodes.tipo`.
 */
export const BUILDER_NODE_GROUPS = {
  entradas: [
    "evento_compra",
    "entra_segmento",
    "canje_cupon",
    "fecha_recurrente",
    "alta_socio",
  ],
  lealtad: [
    "acumular_puntos",
    "canjear_puntos",
    "cambio_nivel",
    "emitir_cupon",
    "reto",
    "referido",
  ],
  acciones: ["email", "push", "sms_whatsapp", "aplicar_promocion"],
  logica: ["condicion_multiple", "ramificacion_valor", "split_ab", "esperar"],
  fin: ["fin_workflow"],
} as const

export type BuilderNodeGroup = keyof typeof BUILDER_NODE_GROUPS

export const BUILDER_NODE_TIPOS = Object.values(BUILDER_NODE_GROUPS).flat()
export type BuilderNodeTipo = (typeof BUILDER_NODE_TIPOS)[number]

// Solo puede haber una entrada activa por workflow (regla explícita del Figma).
export const BUILDER_ENTRY_NODE_TIPOS = BUILDER_NODE_GROUPS.entradas

// Puertos de salida por tipo de nodo — los de lógica ramifican, el resto no.
export const BUILDER_LOGIC_NODE_TIPOS = BUILDER_NODE_GROUPS.logica
