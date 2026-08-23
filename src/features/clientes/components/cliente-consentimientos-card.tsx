import {
  Bell,
  Check,
  Handshake,
  Mail,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { formatFecha } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ConsentimientoCanal } from "@/types/domain"

import {
  CONSENTIMIENTO_CANAL_LABEL,
  CONSENTIMIENTO_FUENTE_LABEL,
} from "../lib/labels"
import type { Consentimiento } from "../lib/queries"

const CANAL_ICON: Record<ConsentimientoCanal, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  push: Bell,
  whatsapp: MessageCircle,
  personalizacion: Sparkles,
  socios_comerciales: Handshake,
}

const CANAL_ICON_BG: Record<ConsentimientoCanal, string> = {
  email: "bg-avatar-indigo-bg text-avatar-indigo-fg",
  sms: "bg-avatar-indigo-bg text-avatar-indigo-fg",
  push: "bg-avatar-teal-bg text-avatar-teal-fg",
  whatsapp: "bg-avatar-coral-bg text-avatar-coral-fg",
  personalizacion: "bg-avatar-violet-bg text-avatar-violet-fg",
  socios_comerciales: "bg-avatar-amber-bg text-avatar-amber-fg",
}

const ORDEN: ConsentimientoCanal[] = [
  "email",
  "sms",
  "push",
  "whatsapp",
  "personalizacion",
  "socios_comerciales",
]

type ClienteConsentimientosCardProps = { consentimientos: Consentimiento[] }

/** Figma "Card · Consentimientos" (1125:4871) pixel-perfect, real: `member_consentimientos` por canal. Solo lectura, como en el propio Figma. */
export function ClienteConsentimientosCard({
  consentimientos,
}: ClienteConsentimientosCardProps) {
  const porCanal = new Map(consentimientos.map((c) => [c.canal, c]))

  return (
    <div className="flex h-full w-full flex-col gap-2.5 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex items-center gap-2.5">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-avatar-teal-bg">
          <ShieldCheck className="size-3.5 text-avatar-teal-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              Consentimientos
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {consentimientos.length}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Solo lectura · Ley 1581
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {ORDEN.map((canal) => {
          const item = porCanal.get(canal)
          const Icon = CANAL_ICON[canal]
          const otorgado = item?.otorgado ?? false
          return (
            <div
              key={canal}
              className={cn(
                "flex flex-col gap-px rounded-[10px] px-3 py-1.5",
                !otorgado && "bg-destructive-bg"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-[7px]",
                      CANAL_ICON_BG[canal]
                    )}
                  >
                    <Icon className="size-3" />
                  </div>
                  <p className="truncate text-[11px] text-foreground">
                    {CONSENTIMIENTO_CANAL_LABEL[canal]}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5",
                    otorgado ? "bg-success-bg" : "bg-destructive-bg"
                  )}
                >
                  {otorgado ? (
                    <Check className="size-3 text-success" />
                  ) : (
                    <X className="size-3 text-destructive" />
                  )}
                  <p
                    className={cn(
                      "text-[10px] font-medium",
                      otorgado ? "text-success" : "text-destructive"
                    )}
                  >
                    {otorgado ? "Otorgado" : "Revocado"}
                  </p>
                </div>
              </div>
              <p className="truncate pl-[27px] text-[9px] text-muted-foreground">
                {item
                  ? `${item.fuente ? CONSENTIMIENTO_FUENTE_LABEL[item.fuente as keyof typeof CONSENTIMIENTO_FUENTE_LABEL] : "Sin fuente"} · desde ${formatFecha(item.actualizado_en)} · ${otorgado ? "indefinida" : "sin vigencia"}`
                  : "Sin registro"}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
