import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { BrandMark } from "@/components/layout/brand-mark"

type ErrorPageProps = {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}

/**
 * Pantalla completa fuera del shell autenticado (404/500 de nivel raíz, sin
 * sesión o layout disponible) — reutiliza el mismo lenguaje visual de
 * `EmptyState` en vez de un frame de Figma dedicado (no hay uno en el
 * archivo de diseño para estos casos).
 */
export function ErrorPage({
  icon,
  title,
  description,
  children,
}: ErrorPageProps) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-neutral-50 p-6">
      <BrandMark className="size-10 shrink-0" />
      <div className="w-full max-w-[480px] rounded-2xl bg-background shadow-form-section">
        <EmptyState icon={icon} title={title} description={description}>
          {children}
        </EmptyState>
      </div>
    </div>
  )
}
