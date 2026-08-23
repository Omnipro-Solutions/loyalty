import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type CampoProps = {
  etiqueta: string
  valor: ReactNode
  icon?: LucideIcon
  className?: string
}

export function Campo({ etiqueta, valor, icon: Icon, className }: CampoProps) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2.5", className)}>
      {Icon && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
          {etiqueta}
        </p>
        <p className="truncate text-[13px] font-medium text-foreground">
          {valor}
        </p>
      </div>
    </div>
  )
}
