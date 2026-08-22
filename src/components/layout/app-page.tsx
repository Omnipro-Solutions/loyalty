import type { ReactNode } from "react"

import { AppTopbar } from "@/components/layout/app-topbar"

type AppPageProps = {
  breadcrumb?: string
  titulo: string
  children: ReactNode
}

/**
 * Figma "00.1 · Plantilla de pantalla" (624:616): Topbar (68px, fijo) +
 * Content (flex-1, px-32 py-24, gap-20 — visto en 665:1375). Cada página de
 * `(app)` se envuelve en esto en vez de repetir el padding a mano.
 */
export function AppPage({ breadcrumb, titulo, children }: AppPageProps) {
  return (
    <>
      <AppTopbar breadcrumb={breadcrumb} titulo={titulo} className="shrink-0" />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-6">
        {children}
      </div>
    </>
  )
}
