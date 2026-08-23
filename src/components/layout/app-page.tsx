import type { ReactNode } from "react"

import { AppTopbar } from "@/components/layout/app-topbar"

type AppPageProps = {
  breadcrumb?: string
  title: string
  children: ReactNode
}

/**
 * Figma "00.1 · Plantilla de pantalla" (624:616): Topbar (68px, fixed) +
 * Content (flex-1, px-32 py-24, gap-20 — seen in 665:1375). Every `(app)`
 * page wraps in this instead of repeating the padding by hand.
 */
export function AppPage({ breadcrumb, title, children }: AppPageProps) {
  return (
    <>
      <AppTopbar breadcrumb={breadcrumb} title={title} className="shrink-0" />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-6">
        {children}
      </div>
    </>
  )
}
