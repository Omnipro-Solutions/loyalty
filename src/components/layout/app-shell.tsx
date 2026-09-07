"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { MobileNavProvider } from "@/components/layout/mobile-nav-context"
import { NotificationsProvider } from "@/components/layout/notifications-context"
import { SidebarRail } from "@/components/layout/sidebar-rail"
import { useLocalStorageBoolean } from "@/hooks/use-local-storage-boolean"
import type { NotificationsSnapshot } from "@/lib/notifications"

const STORAGE_KEY = "loyalty-portal:sidebar-collapsed"

type AppShellProps = {
  /**
   * Las notificaciones de quien está dentro, resueltas por el layout del
   * grupo `(app)`. Viajan por contexto hasta la campana del Topbar — ver
   * `notifications-context.tsx`.
   */
  notifications?: NotificationsSnapshot
  name: string
  email: string
  children: ReactNode
}

/**
 * Figma "00.1 · Plantilla de pantalla" (624:616): fondo `bg-shell-background`
 * (mismo #eef0fe que `color/primary/50` en claro; en oscuro es un lienzo
 * neutro, no el acento índigo — ver comentario junto al token en
 * globals.css), sidebar/rail a la izquierda, columna Topbar+Content a la
 * derecha. El colapso persiste en localStorage.
 *
 * El Figma solo cubre ancho de escritorio. Por debajo de `lg` (1024px — el
 * umbral donde 260px de sidebar + el contenido dejan de convivir sin
 * apretar tablas y KPIs) la columna izquierda desaparece del flujo y pasa a
 * ser un cajón off-canvas que abre el botón de menú del Topbar
 * (`useMobileNav`). Esto es lo que hace que la app aguante zoom de
 * navegador: al 150% un monitor de 1440px reporta 960px de viewport, ya por
 * debajo del umbral.
 */
export function AppShell({
  name,
  email,
  notifications,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useLocalStorageBoolean(STORAGE_KEY, false)
  const [navOpen, setNavOpen] = useState(false)

  const setOpen = useCallback((open: boolean) => setNavOpen(open), [])

  // El cajón y su backdrop son `lg:hidden`, así que al ensanchar la ventana
  // (o bajar el zoom) con el cajón abierto quedaría un diálogo invisible
  // pero activo: bloqueo de scroll del body y foco atrapado, sin nada que
  // cerrar. Cruzar a `lg` lo cierra.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)")
    const sync = () => {
      if (desktop.matches) setNavOpen(false)
    }
    sync()
    desktop.addEventListener("change", sync)
    return () => desktop.removeEventListener("change", sync)
  }, [])
  const mobileNav = useMemo(
    () => ({ open: navOpen, setOpen }),
    [navOpen, setOpen]
  )

  return (
    <NotificationsProvider value={notifications ?? null}>
      <MobileNavProvider value={mobileNav}>
        <div className="flex min-h-screen w-full bg-shell-background">
          {/* Columna fija: solo a partir de `lg`. Debajo vive en el cajón. */}
          {collapsed ? (
            <SidebarRail
              name={name}
              email={email}
              onExpand={() => setCollapsed(false)}
              className="sticky top-0 hidden h-screen shrink-0 lg:flex"
            />
          ) : (
            <AppSidebar
              name={name}
              email={email}
              onCollapse={() => setCollapsed(true)}
              className="sticky top-0 hidden h-screen shrink-0 lg:flex"
            />
          )}

          <DialogPrimitive.Root open={navOpen} onOpenChange={setNavOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-foreground/20 lg:hidden data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
              <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[85vw] outline-none lg:hidden data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left">
                <DialogPrimitive.Title className="sr-only">
                  Menú de navegación
                </DialogPrimitive.Title>
                <AppSidebar
                  name={name}
                  email={email}
                  onCollapse={() => setNavOpen(false)}
                  collapseLabel="Cerrar menú"
                  onNavigate={() => setNavOpen(false)}
                  className="h-full w-full"
                />
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </MobileNavProvider>
    </NotificationsProvider>
  )
}
