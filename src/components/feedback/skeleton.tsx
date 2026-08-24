import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

/**
 * Figma "10.2 · Estado de carga" (665:1597): relleno `bg/subtle` (=
 * `bg-muted`), radio según la altura de la barra (6px/8px/10px ≈
 * `rounded-sm`/`rounded-md`/`rounded-lg`). El Figma anima una barra de
 * progreso en el topbar en vez de pulsar las barras — mantenemos
 * `animate-pulse` de todos modos: sin movimiento, un bloque gris se lee
 * como UI rota.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-muted", className)}
      style={style}
      aria-hidden="true"
    />
  )
}
