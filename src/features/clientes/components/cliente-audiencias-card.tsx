import { Users } from "lucide-react"

import { PlaceholderCard } from "@/components/feedback/placeholder-card"

/** Figma "Card · Audiencias activas" (1125:4791): qué segmentos dinámicos incluyen hoy al socio — necesita un motor de audiencias que evalúe membresía en tiempo real, que no existe todavía (`segments` solo guarda la definición). */
export function ClienteAudienciasCard() {
  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex items-center gap-2.5">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-avatar-violet-bg">
          <Users className="size-3.5 text-avatar-violet-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Audiencias activas
          </p>
          <p className="text-[10px] text-muted-foreground">
            Segmentos dinámicos que la incluyen hoy
          </p>
        </div>
      </div>
      <PlaceholderCard
        icon={Users}
        title="Sin motor de audiencias todavía"
        description="`segments` solo guarda la definición — evaluar membresía en tiempo real es un motor aparte."
        className="flex-1 justify-center"
      />
    </div>
  )
}
