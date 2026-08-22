import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Figma "Form / Fila · 2/3 columnas" (711:315, 711:344): fila con gap-14, cada campo a flex-1. */
export function Row({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-3.5 [&>*]:min-w-0 [&>*]:flex-1",
        className
      )}
    >
      {children}
    </div>
  )
}
