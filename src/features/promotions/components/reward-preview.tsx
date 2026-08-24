import { Sparkles } from "lucide-react"

import { rewardPreview } from "../lib/mechanics"
import type { RewardValues } from "../schemas"

/** "Así lo ve el cliente" — traduce la recompensa configurada a una frase concreta (clave para escalonado/NxM, difíciles de imaginar desde un formulario). */
export function RewardPreview({ reward }: { reward: RewardValues }) {
  return (
    <div className="flex items-start gap-2 rounded-[10px] border border-dashed border-border bg-neutral-50 px-3 py-2.5">
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <p className="text-xs leading-[17px] text-secondary-foreground">
        {rewardPreview(reward)}
      </p>
    </div>
  )
}
