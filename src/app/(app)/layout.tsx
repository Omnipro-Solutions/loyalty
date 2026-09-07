import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import { getCurrentProfile } from "@/features/profile/lib/queries"
import { getMyNotifications } from "@/lib/notifications"

export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  // Una sola consulta por render del layout, no una por pantalla: la campana
  // del Topbar la pinta cada página, pero el dato es el mismo para todas.
  const notifications = await getMyNotifications()

  return (
    <AppShell
      name={profile.nombre}
      email={profile.email}
      notifications={notifications}
    >
      {children}
    </AppShell>
  )
}
