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

import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ConsentChannel } from "@/types/domain"

import { CONSENT_CHANNEL_LABEL, CONSENT_SOURCE_LABEL } from "../lib/labels"
import type { Consent } from "../lib/queries"

const CHANNEL_ICON: Record<ConsentChannel, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  push: Bell,
  whatsapp: MessageCircle,
  personalizacion: Sparkles,
  socios_comerciales: Handshake,
}

const CHANNEL_ICON_BG: Record<ConsentChannel, string> = {
  email: "bg-avatar-indigo-bg text-avatar-indigo-fg",
  sms: "bg-avatar-indigo-bg text-avatar-indigo-fg",
  push: "bg-avatar-teal-bg text-avatar-teal-fg",
  whatsapp: "bg-avatar-coral-bg text-avatar-coral-fg",
  personalizacion: "bg-avatar-violet-bg text-avatar-violet-fg",
  socios_comerciales: "bg-avatar-amber-bg text-avatar-amber-fg",
}

const ORDER: ConsentChannel[] = [
  "email",
  "sms",
  "push",
  "whatsapp",
  "personalizacion",
  "socios_comerciales",
]

type MemberConsentsCardProps = { consents: Consent[] }

/** Figma "Card · Consentimientos" (1125:4871) pixel-perfect, real: `member_consentimientos` por canal. Solo lectura, como en el propio Figma. */
export function MemberConsentsCard({ consents }: MemberConsentsCardProps) {
  const byChannel = new Map(consents.map((c) => [c.canal, c]))

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
              {consents.length}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Solo lectura · Ley 1581
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {ORDER.map((channel) => {
          const item = byChannel.get(channel)
          const Icon = CHANNEL_ICON[channel]
          const granted = item?.otorgado ?? false
          return (
            <div
              key={channel}
              className={cn(
                "flex flex-col gap-px rounded-[10px] px-3 py-1.5",
                !granted && "bg-destructive-bg"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-[7px]",
                      CHANNEL_ICON_BG[channel]
                    )}
                  >
                    <Icon className="size-3" />
                  </div>
                  <p className="truncate text-[11px] text-foreground">
                    {CONSENT_CHANNEL_LABEL[channel]}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5",
                    granted ? "bg-success-bg" : "bg-destructive-bg"
                  )}
                >
                  {granted ? (
                    <Check className="size-3 text-success" />
                  ) : (
                    <X className="size-3 text-destructive" />
                  )}
                  <p
                    className={cn(
                      "text-[10px] font-medium",
                      granted ? "text-success" : "text-destructive"
                    )}
                  >
                    {granted ? "Otorgado" : "Revocado"}
                  </p>
                </div>
              </div>
              <p className="truncate pl-[27px] text-[9px] text-muted-foreground">
                {item
                  ? `${item.fuente ? CONSENT_SOURCE_LABEL[item.fuente as keyof typeof CONSENT_SOURCE_LABEL] : "Sin fuente"} · desde ${formatDate(item.actualizado_en)} · ${granted ? "indefinida" : "sin vigencia"}`
                  : "Sin registro"}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
