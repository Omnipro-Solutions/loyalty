import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** White card shared by the 5 "01 · Acceso" screens (634:792 and analogous). */
export function AuthCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        // Fluid width (previously fixed at 420px, overflowed on mobile) and
        // somewhat more compact than the original Figma spec (36px/18px
        // padding/gap) on purpose: this way the group's tallest card (01.2
        // with the enrollment QR) fits without scrolling across more window
        // sizes, without depending on a width breakpoint — a narrow, tall
        // laptop benefits too.
        "flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-auth-card",
        className
      )}
    >
      {children}
    </div>
  )
}
