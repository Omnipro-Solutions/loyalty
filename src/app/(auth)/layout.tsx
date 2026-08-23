import type { ReactNode } from "react"

import { AuthShell } from "@/components/layout/auth-shell"

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>
}
