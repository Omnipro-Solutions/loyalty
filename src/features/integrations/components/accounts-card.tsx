import {
  Cloud,
  Database,
  KeyRound,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { ACCOUNTS, type AccountStatus } from "../lib/accounts"

const PROVIDER_ICON: Record<string, LucideIcon> = {
  "Microsoft Entra ID": ShieldCheck,
  "Google Cloud": Cloud,
  Salesforce: Database,
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  activa: "Activa",
  requiere_atencion: "Requiere atención",
}

/**
 * Sin equivalente en Figma — agrupa las credenciales que las notas del
 * catálogo referencian ("conectada en Cuentas", "vinculada en Cuentas").
 */
export function AccountsCard() {
  return (
    <div className="flex w-full flex-col gap-3">
      {ACCOUNTS.map((account) => {
        const Icon = PROVIDER_ICON[account.provider] ?? KeyRound
        return (
          <div
            key={account.id}
            className="flex items-center gap-3.5 rounded-2xl bg-background p-4 shadow-form-section"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Icon className="size-[18px] text-secondary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {account.provider}
                </p>
                <Badge
                  variant={account.status === "activa" ? "success" : "warning"}
                >
                  {STATUS_LABEL[account.status]}
                </Badge>
              </div>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {account.identifier} · conectada el {account.connectedOn}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Usada por {account.usedBy.join(", ")}
              </p>
              {account.note && (
                <p className="mt-1.5 rounded-lg bg-warning-bg px-2.5 py-1.5 text-[10.5px] text-foreground">
                  {account.note}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="shrink-0"
              title="Disponible en una próxima fase"
            >
              {account.status === "requiere_atencion"
                ? "Renovar acceso"
                : "Gestionar"}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
