export const ACCOUNT_STATUSES = ["activa", "requiere_atencion"] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export type Account = {
  id: string
  provider: string
  identifier: string
  usedBy: string[]
  status: AccountStatus
  connectedOn: string
  note?: string
}

/**
 * Sin equivalente en Figma — agrupa las credenciales que las notas del
 * catálogo referencian ("conectada en Cuentas", "vinculada en Cuentas").
 */
export const ACCOUNTS: Account[] = [
  {
    id: "entra-id",
    provider: "Microsoft Entra ID",
    identifier: "omni.onmicrosoft.com",
    usedBy: ["Microsoft Power BI", "Adobe Journey Optimizer"],
    status: "activa",
    connectedOn: "12 mar 2026",
  },
  {
    id: "google-cloud",
    provider: "Google Cloud",
    identifier: "omni-loyalty-analytics",
    usedBy: ["Looker Studio"],
    status: "activa",
    connectedOn: "3 feb 2026",
  },
  {
    id: "salesforce",
    provider: "Salesforce",
    identifier: "Omni Retail Group (Data Cloud)",
    usedBy: ["Salesforce CDP (Data Cloud)"],
    status: "requiere_atencion",
    connectedOn: "8 dic 2025",
    note: "El token de acceso expiró — vuelve a autenticar la cuenta.",
  },
]
