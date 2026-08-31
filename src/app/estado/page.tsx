import type { Metadata } from "next"
import Link from "next/link"

import { BrandMark } from "@/components/layout/brand-mark"
import { getAllServices, resolveIncidents } from "@/config/system-status"
import { IncidentTimeline } from "@/features/system-status/components/incident-timeline"
import { ServiceStatusList } from "@/features/system-status/components/service-status-list"
import { StatusBanner } from "@/features/system-status/components/status-banner"

export const metadata: Metadata = {
  title: "Estado del sistema · Loyalty System",
  description: "Estado en tiempo real de Loyalty System y sus integraciones.",
}

/**
 * Página pública (fuera del login) — fidelidad al patrón statuspage.io real:
 * un cliente debe poder consultarla incluso si el login está caído. Excluida
 * del gate en `src/lib/supabase/proxy.ts` (`isAppRoute`). Igual que el resto
 * de `features/system-status`, toda la data es simulada — no hay tabla de
 * monitoreo real detrás (ver docblock de `config/system-status.ts`).
 */
export default function EstadoPage() {
  const services = getAllServices()
  const incidents = resolveIncidents()

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Loyalty System
            </p>
            <p className="text-xs text-muted-foreground">Estado del sistema</p>
          </div>
        </div>
        <Link
          href="/login"
          className="text-xs font-medium text-secondary-foreground hover:underline"
        >
          Ir al portal
        </Link>
      </header>

      <StatusBanner services={services} />

      <section className="flex flex-col gap-3">
        <h1 className="text-sm font-semibold text-foreground">
          Estado de los sistemas
        </h1>
        <ServiceStatusList services={services} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Historial de incidentes
        </h2>
        <IncidentTimeline incidents={incidents} services={services} />
      </section>

      <footer className="text-center text-[11px] text-muted-foreground">
        Datos simulados con fines de demostración — no reflejan un incidente
        real.
      </footer>
    </div>
  )
}
