import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import { getCurrentProfile } from "@/features/profile/lib/queries"

export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  return (
    <AppShell name={profile.nombre} email={profile.email}>
      {children}
    </AppShell>
  )
}
