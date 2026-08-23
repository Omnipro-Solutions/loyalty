export const ESTADOS_CUENTA = ["activa", "requiere_atencion"] as const
export type EstadoCuenta = (typeof ESTADOS_CUENTA)[number]

export type Cuenta = {
  id: string
  proveedor: string
  identificador: string
  usadaPor: string[]
  estado: EstadoCuenta
  conectadaEl: string
  nota?: string
}

/**
 * Sin equivalente en Figma — agrupa las credenciales que las notas del
 * catálogo referencian ("conectada en Cuentas", "vinculada en Cuentas").
 */
export const CUENTAS: Cuenta[] = [
  {
    id: "entra-id",
    proveedor: "Microsoft Entra ID",
    identificador: "omni.onmicrosoft.com",
    usadaPor: ["Microsoft Power BI", "Adobe Journey Optimizer"],
    estado: "activa",
    conectadaEl: "12 mar 2026",
  },
  {
    id: "google-cloud",
    proveedor: "Google Cloud",
    identificador: "omni-loyalty-analytics",
    usadaPor: ["Looker Studio", "Google Ads"],
    estado: "activa",
    conectadaEl: "3 feb 2026",
  },
  {
    id: "twilio",
    proveedor: "Twilio",
    identificador: "Account SID ····91d4",
    usadaPor: ["Twilio"],
    estado: "activa",
    conectadaEl: "20 ene 2026",
  },
  {
    id: "meta-business",
    proveedor: "Meta Business",
    identificador: "Omni Retail Group Ads",
    usadaPor: ["Meta Ads"],
    estado: "requiere_atencion",
    conectadaEl: "8 dic 2025",
    nota: "El token de acceso expiró — vuelve a autenticar la cuenta.",
  },
]
