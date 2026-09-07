import type { ReactNode } from "react"

import { AppTopbar } from "@/components/layout/app-topbar"

type AppPageProps = {
  breadcrumb?: string
  title: string
  children: ReactNode
}

/**
 * Figma "00.1 · Plantilla de pantalla" (624:616): Topbar (68px, fixed) +
 * Content (flex-1, px-32 py-24, gap-20 — seen en 665:1375). Every `(app)`
 * page wraps in this instead of repeating the padding by hand. El Topbar
 * queda `sticky` y el contenido crece con la página (scroll natural del
 * documento) en vez de recortarse dentro de un panel interno.
 *
 * El padding horizontal baja de 32px a 16px al estrecharse el viewport
 * (zoom de navegador incluido): a 32px por lado el contenido de las tablas
 * empieza a apretarse antes de que haga falta.
 */
export function AppPage({ breadcrumb, title, children }: AppPageProps) {
  return (
    <>
      <AppTopbar
        breadcrumb={breadcrumb}
        title={title}
        className="sticky top-0 z-10 shrink-0 bg-shell-background"
      />
      <div className="flex min-w-0 flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        {children}
      </div>
    </>
  )
}
