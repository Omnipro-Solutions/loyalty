export const ESTADOS_CONEXION = ["activa", "con_error", "pausada"] as const
export type EstadoConexion = (typeof ESTADOS_CONEXION)[number]

export type ConexionActiva = {
  integracionId: string
  direccion: "origen" | "destino"
  estado: EstadoConexion
  ultimaSincronizacion: string
  frecuencia: string
  detalle?: string
}

/** Sin equivalente en Figma — "12 · Integraciones" (1261:3974) no dibuja esta pestaña. */
export const CONEXIONES_ACTIVAS: ConexionActiva[] = [
  {
    integracionId: "cjo",
    direccion: "origen",
    estado: "activa",
    ultimaSincronizacion: "Hace 4 min",
    frecuencia: "Tiempo real",
  },
  {
    integracionId: "shopify",
    direccion: "origen",
    estado: "activa",
    ultimaSincronizacion: "Hace 12 min",
    frecuencia: "Tiempo real",
  },
  {
    integracionId: "power-bi",
    direccion: "destino",
    estado: "activa",
    ultimaSincronizacion: "Hace 3 horas",
    frecuencia: "Cada 6 h",
  },
  {
    integracionId: "meta-ads",
    direccion: "destino",
    estado: "con_error",
    ultimaSincronizacion: "Hace 2 días",
    frecuencia: "Cada hora",
    detalle:
      "Token de acceso expirado — renueva la cuenta de Meta Business en Cuentas.",
  },
  {
    integracionId: "whatsapp",
    direccion: "destino",
    estado: "pausada",
    ultimaSincronizacion: "Hace 5 días",
    frecuencia: "Tiempo real",
    detalle: "Pausada manualmente.",
  },
]
