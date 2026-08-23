import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import { getPerfilActual } from "@/features/perfil/lib/queries"

export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode
}) {
  const perfil = await getPerfilActual()
  if (!perfil) redirect("/login")

  return (
    <AppShell name={perfil.nombre} email={perfil.email}>
      {children}
    </AppShell>
  )
}
