import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type FieldProps = {
  label: string
  value: ReactNode
  icon?: LucideIcon
  className?: string
}

export function Field({ label, value, icon: Icon, className }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2.5", className)}>
      {Icon && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-[13px] font-medium text-foreground">
          {value}
        </p>
      </div>
    </div>
  )
}
