import { AppPage } from "@/components/layout/app-page"
import { AccountsCard } from "@/features/integrations/components/accounts-card"
import { ActiveConnectionsCard } from "@/features/integrations/components/active-connections-card"
import { IntegrationsCatalog } from "@/features/integrations/components/integrations-catalog"
import {
  IntegrationsTabsNav,
  type IntegrationsTab,
} from "@/features/integrations/components/integrations-tabs-nav"
import { SystemViewCard } from "@/features/integrations/components/system-view-card"
import { DESTINATIONS, SOURCES } from "@/features/integrations/lib/catalog"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Figma "12 · Integraciones" (1261:3974): sub-vista de Ajustes, agrupada
 * junto a Equipo bajo el ítem colapsable "Ajustes" del sidebar (ver
 * `config/navigation.ts`).
 */
export default async function IntegrationsPage({
  searchParams,
}: PageProps<"/ajustes/integraciones">) {
  const params = await searchParams
  const tab = (firstValue(params.tab) ?? "origenes") as IntegrationsTab

  return (
    <AppPage breadcrumb="Configuración  ›  Integraciones" title="Integraciones">
      <IntegrationsTabsNav active={tab} />
      {tab === "origenes" && (
        <IntegrationsCatalog
          direction="origen"
          groups={SOURCES}
          initialSelectionId="cjo"
          title="Integraciones"
          description="Conecta los sistemas que alimentan a Etteer y define a dónde enviar audiencias, eventos y resultados."
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
          initialSelectionId="power-bi"
          title="Integraciones"
          description="Elige a dónde enviar audiencias, eventos de lealtad y resultados de campaña desde Etteer."
          searchLabel="Buscar destino…"
          totalLabel="destinos"
          allLabel="Todos los destinos"
          secondaryActionLabel="Ver flujos de salida"
          primaryActionLabel="Nuevo destino"
        />
      )}
      {tab === "conexiones" && <ActiveConnectionsCard />}
      {tab === "cuentas" && <AccountsCard />}
      {tab === "sistema" && <SystemViewCard />}
    </AppPage>
  )
}
