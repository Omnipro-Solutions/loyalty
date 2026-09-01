import { NoAccess } from "@/components/feedback/no-access"
import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { AppPage } from "@/components/layout/app-page"
import { DESTINATIONS, SOURCES } from "@/config/integrations-catalog"
import { AccountsCard } from "@/features/integrations/components/accounts-card"
import { ActiveConnectionsCard } from "@/features/integrations/components/active-connections-card"
import { IntegrationsCatalog } from "@/features/integrations/components/integrations-catalog"
import {
  IntegrationsTabsNav,
  type IntegrationsTab,
} from "@/features/integrations/components/integrations-tabs-nav"
import { SystemViewCard } from "@/features/integrations/components/system-view-card"
import { listIntegrationConnections } from "@/features/integrations/lib/queries"
import { firstValue } from "@/lib/search-params"

/** Figma "12 · Integraciones" (1261:3974). Ítem propio del sidebar bajo "Configuración" (ver `config/navigation.ts`). */
export default async function IntegrationsPage({
  searchParams,
}: PageProps<"/ajustes/integraciones">) {
  if (!allows(await getSessionPermissions(), "integraciones", "ver")) {
    return <NoAccess action="ver" moduleLabel="Integraciones" />
  }

  const params = await searchParams
  const tab = (firstValue(params.tab) ?? "origenes") as IntegrationsTab
  // "cuentas"/"sistema" no leen conexiones reales todavía (Fase 1, mock) — no vale pagar el round-trip.
  const connections =
    tab === "cuentas" || tab === "sistema"
      ? []
      : await listIntegrationConnections()

  return (
    <AppPage breadcrumb="Configuración  ›  Integraciones" title="Integraciones">
      <IntegrationsTabsNav active={tab} />
      {tab === "origenes" && (
        <IntegrationsCatalog
          direction="origen"
          groups={SOURCES}
          connections={connections}
          initialSelectionId="cjo"
          title="Integraciones"
          description="Conecta los sistemas que alimentan a Loyalty System y define a dónde enviar audiencias, eventos y resultados."
          searchLabel="Buscar integración…"
          totalLabel="orígenes"
          allLabel="Todos los orígenes"
          secondaryActionLabel="Ver flujos de datos"
          primaryActionLabel="Nueva conexión"
        />
      )}
      {tab === "destinos" && (
        <IntegrationsCatalog
          direction="destino"
          groups={DESTINATIONS}
          connections={connections}
          initialSelectionId="power-bi"
          title="Integraciones"
          description="Elige a dónde enviar audiencias, eventos de lealtad y resultados de campaña desde Loyalty System."
          searchLabel="Buscar destino…"
          totalLabel="destinos"
          allLabel="Todos los destinos"
          secondaryActionLabel="Ver flujos de salida"
          primaryActionLabel="Nuevo destino"
        />
      )}
      {tab === "conexiones" && (
        <ActiveConnectionsCard connections={connections} />
      )}
      {tab === "cuentas" && <AccountsCard />}
      {tab === "sistema" && <SystemViewCard />}
    </AppPage>
  )
}
