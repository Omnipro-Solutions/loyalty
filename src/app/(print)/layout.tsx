import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/profile/lib/queries"

/** Mismo gate de sesión que `(app)/layout.tsx`, sin `AppShell`: `window.print()` necesita una hoja A4 limpia, sin sidebar/topbar alrededor. */
export default async function PrintGroupLayout({
  children,
}: {
  children: ReactNode
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  return <>{children}</>
}
