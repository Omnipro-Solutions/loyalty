import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
  className?: string
}

/** Figma "10.1 · Estado vacío": bg-accent 64px circle + 16/22 title + 13/20 description, w-420. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-2.5 px-6 py-16",
        className
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-accent">
        <Icon className="size-[26px] text-accent-foreground" />
      </div>
      <p className="text-center text-base leading-[22px] font-semibold text-foreground">
        {title}
      </p>
      <p className="max-w-[420px] text-center text-[13px] leading-5 text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  )
}
