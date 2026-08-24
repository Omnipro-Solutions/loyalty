export const CONNECTION_STATUSES = ["activa", "con_error", "pausada"] as const
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number]

export type ActiveConnection = {
  integrationId: string
  direction: "origen" | "destino"
  status: ConnectionStatus
  lastSyncedAt: string
  frequency: string
  detail?: string
}

export const CONNECTION_STATUS_LABEL: Record<ConnectionStatus, string> = {
  activa: "Activa",
  con_error: "Con error",
  pausada: "Pausada",
}

export const CONNECTION_STATUS_DOT: Record<ConnectionStatus, string> = {
  activa: "bg-success",
  con_error: "bg-destructive",
  pausada: "bg-warning",
}

/** Sin equivalente en Figma — "12 · Integraciones" (1261:3974) no dibuja esta pestaña. */
export const ACTIVE_CONNECTIONS: ActiveConnection[] = [
  {
    integrationId: "cjo",
    direction: "origen",
    status: "activa",
    lastSyncedAt: "Hace 4 min",
    frequency: "Tiempo real",
  },
  {
    integrationId: "shopify",
    direction: "origen",
    status: "activa",
    lastSyncedAt: "Hace 12 min",
    frequency: "Tiempo real",
  },
  {
    integrationId: "power-bi",
    direction: "destino",
    status: "activa",
    lastSyncedAt: "Hace 3 horas",
    frequency: "Cada 6 h",
  },
  {
    integrationId: "salesforce-cdp",
    direction: "destino",
    status: "con_error",
    lastSyncedAt: "Hace 2 días",
    frequency: "Cada hora",
    detail:
      "Token de acceso expirado — renueva la organización de Salesforce en Cuentas.",
  },
]
