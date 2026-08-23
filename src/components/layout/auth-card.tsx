import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Tarjeta blanca compartida por las 5 pantallas de "01 · Acceso" (634:792 y análogos). */
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
        // Ancho fluido (antes fijo en 420px, desbordaba en mobile) y algo
        // más compacto que el spec original de Figma (36px/18px de
        // padding/gap) a propósito: así la tarjeta más alta del grupo
        // (01.2 con QR de enrolamiento) entra sin scroll en más tamaños de
        // ventana, sin depender de un breakpoint de ancho — un laptop
        // angosto de alto también se beneficia.
        "flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-auth-card",
        className
      )}
    >
      {children}
    </div>
  )
}
