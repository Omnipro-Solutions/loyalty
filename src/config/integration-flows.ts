import { findIntegration } from "@/config/integrations-catalog"
import { ACTIVE_CONNECTIONS } from "@/config/integrations-connections"
import type { BuilderNodeType } from "@/types/domain"

/**
 * Sin equivalente en Figma — ninguna de las fases del archivo diseñó "cómo
 * se configura un bloque de Email/Push/SMS". El único rastro del concepto
 * en el Figma son dos botones sin función real en 12 · Integraciones ("Ver
 * flujos de datos" / "Ver flujos de salida", `ajustes/integraciones/page.tsx`).
 *
 * Loyalty Builder no tiene motor propio de envío: los 3 bloques de acción de
 * mensajería (`email`, `push`, `sms_whatsapp`) despachan a un flujo ya
 * definido en un proveedor externo conectado como destino en 12 ·
 * Integraciones (Adobe Journey Optimizer, CJO, Braze) — la plantilla y el
 * copy viven allá, no acá. Este catálogo modela esos flujos y qué
 * parámetros espera cada uno para el mapeo de variables del inspector
 * (ver `features/builder/inspector/integration-message-form.tsx`).
 */
export const MESSAGE_NODE_TYPES = [
  "email",
  "push",
  "sms_whatsapp",
] as const satisfies readonly BuilderNodeType[]

export type MessageNodeType = (typeof MESSAGE_NODE_TYPES)[number]

export function isMessageNodeType(
  tipo: BuilderNodeType
): tipo is MessageNodeType {
  return (MESSAGE_NODE_TYPES as readonly string[]).includes(tipo)
}

export type FlowParameter = { key: string; label: string; required?: boolean }

export type IntegrationFlow = {
  id: string
  /** Coincide con `Integration.id` de `integrations-catalog.ts`. */
  integrationId: string
  channel: MessageNodeType
  name: string
  description: string
  /** Parámetros que el flujo del proveedor espera recibir en el payload. */
  parameters: FlowParameter[]
}

export const INTEGRATION_FLOWS: IntegrationFlow[] = [
  // === Adobe Journey Optimizer ===
  {
    id: "ajo-reactivacion-vip",
    integrationId: "ajo",
    channel: "email",
    name: "Reactivación VIP",
    description:
      "Journey de reactivación para socios de nivel Oro/Diamante inactivos.",
    parameters: [
      { key: "firstName", label: "Nombre del socio", required: true },
      { key: "couponCode", label: "Código de cupón" },
      { key: "expiryDate", label: "Fecha de vencimiento" },
    ],
  },
  {
    id: "ajo-bienvenida",
    integrationId: "ajo",
    channel: "email",
    name: "Bienvenida nuevo socio",
    description: "Secuencia de bienvenida al dar de alta un socio nuevo.",
    parameters: [
      { key: "firstName", label: "Nombre del socio", required: true },
    ],
  },
  {
    id: "ajo-recordatorio-puntos",
    integrationId: "ajo",
    channel: "push",
    name: "Recordatorio de saldo",
    description: "Push con el saldo de puntos próximo a vencer.",
    parameters: [
      { key: "pointsBalance", label: "Saldo de puntos", required: true },
      { key: "expiryDate", label: "Fecha de vencimiento" },
    ],
  },
  {
    id: "ajo-confirmacion-canje",
    integrationId: "ajo",
    channel: "sms_whatsapp",
    name: "Confirmación de canje",
    description: "Mensaje corto confirmando un canje de recompensa.",
    parameters: [
      { key: "rewardName", label: "Recompensa canjeada", required: true },
    ],
  },

  // === CJO · Customer Journey Orchestration ===
  {
    id: "cjo-siguiente-mejor-oferta",
    integrationId: "cjo",
    channel: "email",
    name: "Siguiente mejor oferta",
    description:
      "Oferta personalizada calculada por el motor de decisión de CJO.",
    parameters: [
      { key: "firstName", label: "Nombre del socio", required: true },
      { key: "offerId", label: "ID de la oferta", required: true },
    ],
  },
  {
    id: "cjo-alerta-nivel",
    integrationId: "cjo",
    channel: "push",
    name: "Alerta de cambio de nivel",
    description: "Notificación al subir o bajar de nivel de lealtad.",
    parameters: [
      { key: "tierName", label: "Nivel nuevo", required: true },
      { key: "previousTier", label: "Nivel anterior" },
    ],
  },

  // === Braze ===
  {
    id: "braze-carrito-abandonado",
    integrationId: "braze",
    channel: "email",
    name: "Carrito abandonado",
    description: "Canvas de recuperación de carrito con descuento incluido.",
    parameters: [
      { key: "cartItems", label: "Ítems del carrito", required: true },
      { key: "discountCode", label: "Código de descuento" },
    ],
  },
  {
    id: "braze-reto-progreso",
    integrationId: "braze",
    channel: "push",
    name: "Progreso de reto",
    description: "Push motivacional con el avance de un reto activo.",
    parameters: [
      { key: "challengeProgress", label: "Progreso", required: true },
      { key: "challengeGoal", label: "Meta" },
    ],
  },
  {
    id: "braze-referido-pendiente",
    integrationId: "braze",
    channel: "sms_whatsapp",
    name: "Referido pendiente",
    description: "Recordatorio al referidor de una recompensa por cobrar.",
    parameters: [{ key: "rewardName", label: "Recompensa", required: true }],
  },
]

export type ConnectedMessageProvider = {
  integrationId: string
  integrationName: string
  logo: string
  flows: IntegrationFlow[]
}

/**
 * Proveedores conectados con conexión `destino` `activa` que además ofrecen
 * flujos para `channel` — el gating real: un proveedor con flujos definidos
 * pero sin conexión activa (ver `integrations-connections.ts`) no aparece
 * acá, aunque siga listado en el catálogo de Integraciones.
 */
export function connectedMessageProviders(
  channel: MessageNodeType
): ConnectedMessageProvider[] {
  const activeDestinationIds = new Set(
    ACTIVE_CONNECTIONS.filter(
      (c) => c.direction === "destino" && c.status === "activa"
    ).map((c) => c.integrationId)
  )

  const byIntegration = new Map<string, IntegrationFlow[]>()
  for (const flow of INTEGRATION_FLOWS) {
    if (flow.channel !== channel) continue
    if (!activeDestinationIds.has(flow.integrationId)) continue
    const flows = byIntegration.get(flow.integrationId) ?? []
    flows.push(flow)
    byIntegration.set(flow.integrationId, flows)
  }

  const providers: ConnectedMessageProvider[] = []
  for (const [integrationId, flows] of byIntegration) {
    const integration = findIntegration(integrationId, "destino")
    if (!integration) continue
    providers.push({
      integrationId,
      integrationName: integration.name,
      logo: integration.logo,
      flows,
    })
  }
  return providers
}

export function flowsFor(
  integrationId: string,
  channel: MessageNodeType
): IntegrationFlow[] {
  return INTEGRATION_FLOWS.filter(
    (f) => f.integrationId === integrationId && f.channel === channel
  )
}

export function findFlow(flowId: string): IntegrationFlow | undefined {
  return INTEGRATION_FLOWS.find((f) => f.id === flowId)
}
