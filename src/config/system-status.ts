import { findIntegration } from "@/config/integrations-catalog"
import { ACTIVE_CONNECTIONS } from "@/config/integrations-connections"

/**
 * Data 100% simulada para la página pública `/estado` y la vista
 * autenticada de Observabilidad (`/ajustes/observabilidad`). A diferencia
 * de `lib/system-log.ts`, que sí consulta Supabase, no hay tabla de
 * monitoreo detrás — igual que el resto de `features/integrations`
 * (ver `integrations-connections.ts`), no existe una tabla de integraciones
 * en las migraciones. Todo lo de aquí es para fines de demostración.
 */

export const SYSTEM_STATUSES = [
  "operativo",
  "degradado",
  "interrumpido",
  "mantenimiento",
] as const
export type SystemStatus = (typeof SYSTEM_STATUSES)[number]

export const SYSTEM_STATUS_LABEL: Record<SystemStatus, string> = {
  operativo: "Operativo",
  degradado: "Rendimiento degradado",
  interrumpido: "Interrupción",
  mantenimiento: "Mantenimiento",
}

export const SYSTEM_STATUS_DOT: Record<SystemStatus, string> = {
  operativo: "bg-success",
  degradado: "bg-warning",
  interrumpido: "bg-destructive",
  mantenimiento: "bg-muted-foreground",
}

export const SYSTEM_STATUS_BADGE_VARIANT: Record<
  SystemStatus,
  "success" | "warning" | "error" | "neutral"
> = {
  operativo: "success",
  degradado: "warning",
  interrumpido: "error",
  mantenimiento: "neutral",
}

export type ServiceGroup = "plataforma" | "integraciones"

export type SystemService = {
  id: string
  name: string
  description: string
  group: ServiceGroup
  status: SystemStatus
  latencyMs: number
}

/** Servicios propios de Loyalty System — sin equivalente en Figma. */
const PLATFORM_SERVICES: SystemService[] = [
  {
    id: "api",
    name: "API de Loyalty System",
    description: "Endpoints de saldo de puntos, canjes y perfiles unificados.",
    group: "plataforma",
    status: "operativo",
    latencyMs: 142,
  },
  {
    id: "portal",
    name: "Portal web",
    description: "Aplicación que estás usando ahora mismo.",
    group: "plataforma",
    status: "operativo",
    latencyMs: 98,
  },
  {
    id: "motor-promociones",
    name: "Motor de promociones",
    description:
      "Evaluación de reglas y aplicación de descuentos en tiempo real.",
    group: "plataforma",
    status: "operativo",
    latencyMs: 210,
  },
  {
    id: "emision-cupones",
    name: "Emisión de cupones",
    description: "Generación y validación de códigos de cupón.",
    group: "plataforma",
    status: "operativo",
    latencyMs: 480,
  },
  {
    id: "loyalty-builder",
    name: "Loyalty Builder",
    description: "Ejecución de journeys y disparo de acciones programadas.",
    group: "plataforma",
    status: "operativo",
    latencyMs: 165,
  },
  {
    id: "webhooks",
    name: "Webhooks de eventos",
    description:
      "Entrega de eventos de lealtad a orígenes y destinos conectados.",
    group: "plataforma",
    status: "operativo",
    latencyMs: 310,
  },
]

/**
 * Deriva la fila de cada integración conectada a partir de
 * `ACTIVE_CONNECTIONS` — la misma fuente que ya usa `SystemViewCard` y
 * `ActiveConnectionsCard` — para que esta vista nunca contradiga a
 * "12 · Integraciones" en qué está conectado. El estado real de la conexión
 * (`con_error` en Salesforce CDP) se ignora a propósito: esta vista es la
 * cara pública/demo del sistema y siempre debe leerse en verde, a
 * diferencia de "12 · Integraciones", que sí muestra ese error a propósito
 * (Cuentas › token expirado). No se toca `ACTIVE_CONNECTIONS`.
 */
export function getIntegrationServices(): SystemService[] {
  return ACTIVE_CONNECTIONS.map((connection) => {
    const integration = findIntegration(
      connection.integrationId,
      connection.direction
    )
    return {
      id: `conn-${connection.direction}-${connection.integrationId}`,
      name: integration?.name ?? connection.integrationId,
      description:
        connection.direction === "origen"
          ? "Origen de datos conectado"
          : "Destino de datos conectado",
      group: "integraciones",
      status: "operativo",
      latencyMs: 220,
    }
  })
}

export function getAllServices(): SystemService[] {
  return [...PLATFORM_SERVICES, ...getIntegrationServices()]
}

// --- Historial de uptime (90 días) ---------------------------------------

export type UptimeDay = { date: string; percent: number; status: SystemStatus }

/** Generador pseudoaleatorio determinista (mulberry32) — misma semilla, misma serie, sin `Math.random()`. */
function mulberry32(seed: number) {
  let state = seed
  return function random() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return hash
}

/**
 * Serie de uptime determinista por servicio. Se calcula a partir de
 * `Date.now()`, así que solo debe invocarse en tiempo de request desde un
 * Server Component (nunca a nivel de módulo) para que el demo no se vea
 * rancio ni cause un mismatch de hidratación.
 *
 * `status` se deja fijo en "operativo" a propósito (demo: nunca debe verse
 * una barra ámbar/roja) — `percent` sí varía un poco para que el número de
 * uptime no se vea artificialmente plano en 100%.
 */
export function buildUptimeHistory(
  serviceId: string,
  days: number
): UptimeDay[] {
  const random = mulberry32(hashSeed(serviceId))
  const today = new Date()

  return Array.from({ length: days }, (_, i) => {
    const daysAgo = days - 1 - i
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)

    const roll = random()
    const percent = roll > 0.9 ? 99.9 + roll * 0.1 : 100

    return {
      date: date.toISOString(),
      percent: Math.round(percent * 100) / 100,
      status: "operativo",
    }
  })
}

export function averageUptime(history: UptimeDay[]): number {
  const sum = history.reduce((acc, day) => acc + day.percent, 0)
  return Math.round((sum / history.length) * 100) / 100
}

// --- Incidentes ------------------------------------------------------------

export const INCIDENT_SEVERITIES = ["menor", "mayor", "critico"] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

export const INCIDENT_SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  menor: "Menor",
  mayor: "Mayor",
  critico: "Crítico",
}

export const INCIDENT_SEVERITY_DOT: Record<IncidentSeverity, string> = {
  menor: "bg-warning",
  mayor: "bg-destructive",
  critico: "bg-destructive",
}

export type IncidentUpdate = {
  status: "investigando" | "identificado" | "monitoreando" | "resuelto"
  message: string
  /** Fecha fija (no relativa a "ahora"): son incidentes históricos ya cerrados. */
  at: string
}

export type IncidentDefinition = {
  id: string
  title: string
  severity: IncidentSeverity
  affectedServiceIds: string[]
  updates: IncidentUpdate[]
}

export type Incident = {
  id: string
  title: string
  severity: IncidentSeverity
  affectedServiceIds: string[]
  startedAt: string
  resolvedAt: string | null
  updates: { status: IncidentUpdate["status"]; message: string; at: string }[]
}

/**
 * Fechas fijas de febrero de 2026 (pedido de usuario) — a diferencia del
 * historial de uptime y la serie de 24 h, un incidente ya cerrado no debe
 * "envejecer" con `Date.now()`, tiene una fecha real de cuándo ocurrió.
 */
const INCIDENT_DEFINITIONS: IncidentDefinition[] = [
  {
    id: "inc-emision-cupones-latencia",
    title: "Latencia elevada en emisión de cupones",
    severity: "menor",
    affectedServiceIds: ["emision-cupones"],
    updates: [
      {
        status: "investigando",
        message:
          "Detectamos tiempos de respuesta por encima de lo normal al generar códigos de cupón.",
        at: "2026-02-18T09:00:00-05:00",
      },
      {
        status: "identificado",
        message:
          "El origen es un pico de tráfico en el proveedor de generación de códigos de barras.",
        at: "2026-02-18T10:00:00-05:00",
      },
      {
        status: "monitoreando",
        message:
          "La latencia bajó, seguimos observando antes de cerrar el incidente.",
        at: "2026-02-18T11:00:00-05:00",
      },
      {
        status: "resuelto",
        message: "La latencia volvió a sus valores normales.",
        at: "2026-02-18T11:30:00-05:00",
      },
    ],
  },
  {
    id: "inc-salesforce-token",
    title: "Sincronización pausada con Salesforce Data Cloud",
    severity: "mayor",
    affectedServiceIds: ["conn-destino-salesforce-cdp"],
    updates: [
      {
        status: "investigando",
        message: "El token de acceso de la cuenta de Salesforce expiró.",
        at: "2026-02-10T08:15:00-05:00",
      },
      {
        status: "identificado",
        message:
          "Confirmado: se requiere renovar la autenticación en Ajustes › Integraciones › Cuentas.",
        at: "2026-02-10T09:15:00-05:00",
      },
      {
        status: "resuelto",
        message:
          "La autenticación se renovó y la sincronización se restableció.",
        at: "2026-02-10T10:15:00-05:00",
      },
    ],
  },
  {
    id: "inc-webhooks-mantenimiento",
    title: "Mantenimiento programado de webhooks de eventos",
    severity: "menor",
    affectedServiceIds: ["webhooks"],
    updates: [
      {
        status: "monitoreando",
        message:
          "Actualización de infraestructura sin impacto esperado en la entrega de eventos.",
        at: "2026-02-03T22:00:00-05:00",
      },
      {
        status: "resuelto",
        message: "Mantenimiento completado sin incidentes.",
        at: "2026-02-04T00:00:00-05:00",
      },
    ],
  },
]

export function resolveIncidents(): Incident[] {
  return INCIDENT_DEFINITIONS.map((incident) => {
    const last = incident.updates[incident.updates.length - 1]
    return {
      id: incident.id,
      title: incident.title,
      severity: incident.severity,
      affectedServiceIds: incident.affectedServiceIds,
      startedAt: incident.updates[0].at,
      resolvedAt: last.status === "resuelto" ? last.at : null,
      updates: incident.updates,
    }
  })
}

// --- Series de las últimas 24 horas (latencia / eventos) -------------------

const HOURLY_LABELS = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`
)

/**
 * Misma forma que `TrendSeries` (`features/dashboard/lib/mock-data.ts`) —
 * no se importa ese tipo porque `config` no puede depender de `features`
 * (CLAUDE.md §2); el tipado estructural de TS basta para que encaje como
 * prop de `TrendMultiLineChart`.
 */
export type ObservabilityTrendSeries = {
  name: string
  colorVar: string
  values: number[]
}

/**
 * Serie horaria determinista de latencia p95 y eventos procesados, para
 * `TrendMultiLineChart` (mismo componente de `/analitica`).
 */
export function getObservabilityTrend(): {
  xLabels: string[]
  series: ObservabilityTrendSeries[]
} {
  const latencyRandom = mulberry32(hashSeed("latencia-p95"))
  const eventsRandom = mulberry32(hashSeed("eventos-procesados"))

  const latency = HOURLY_LABELS.map(() =>
    Math.round(120 + latencyRandom() * 90)
  )
  const events = HOURLY_LABELS.map(() =>
    Math.round(800 + eventsRandom() * 1400)
  )

  return {
    xLabels: HOURLY_LABELS,
    series: [
      { name: "Latencia p95 (ms)", colorVar: "--data-indigo", values: latency },
      { name: "Eventos procesados", colorVar: "--data-teal", values: events },
    ],
  }
}

export const EVENTS_PROCESSED_TODAY = 48231
