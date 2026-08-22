import type { ReactNode } from "react"

import { AppShell } from "@/components/layout/app-shell"

// TODO(Fase 3): reemplazar por el perfil real de la sesión de Supabase
// (organizations/profiles) — hoy es el usuario de demo del Figma.
const DEMO_USER = { nombre: "Elena Martínez", email: "elena@etteer.com" }

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell nombre={DEMO_USER.nombre} email={DEMO_USER.email}>
      {children}
    </AppShell>
  )
}
