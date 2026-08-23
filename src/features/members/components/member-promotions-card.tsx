import { Gift } from "lucide-react"

import { PlaceholderCard } from "@/components/feedback/placeholder-card"

/** Figma "Card · Promociones activas" (1125:4724): qué promociones puede canjear hoy — necesita evaluar reglas de elegibilidad contra el socio, un motor que todavía no existe. */
export function MemberPromotionsCard() {
  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex items-center gap-2.5">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-avatar-coral-bg">
          <Gift className="size-3.5 text-avatar-coral-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Promociones activas
          </p>
          <p className="text-[10px] text-muted-foreground">
            Disponibles para canjear hoy
          </p>
        </div>
      </div>
      <PlaceholderCard
        icon={Gift}
        title="Sin motor de elegibilidad todavía"
        description="Evaluar qué promociones aplican a este socio necesita reglas de elegibilidad, no solo el catálogo de promociones."
        className="flex-1 justify-center"
      />
    </div>
  )
}
