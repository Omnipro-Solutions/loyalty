"use client"

import type { ReactNode } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarRail } from "@/components/layout/sidebar-rail"
import { useLocalStorageBoolean } from "@/hooks/use-local-storage-boolean"

const STORAGE_KEY = "loyalty-portal:sidebar-collapsed"

type AppShellProps = {
  name: string
  email: string
  children: ReactNode
}

/**
 * Figma "00.1 · Plantilla de pantalla" (624:616): fondo `bg-brand-subtle`
 * (mismo #eef0fe que `color/primary/50`), sidebar/rail a la izquierda,
 * columna Topbar+Content a la derecha. El colapso persiste en localStorage.
 */
export function AppShell({ name, email, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useLocalStorageBoolean(STORAGE_KEY, false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-brand-subtle">
      {collapsed ? (
        <SidebarRail
          name={name}
          email={email}
          onExpand={() => setCollapsed(false)}
          className="shrink-0"
        />
      ) : (
        <AppSidebar
          name={name}
          email={email}
          onCollapse={() => setCollapsed(true)}
          className="shrink-0"
        />
      )}
      <div className="flex h-full min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
