import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { findIntegration } from "@/config/integrations-catalog"
import { IntegrationConfigForm } from "@/features/integrations/components/integration-config-form"
import { authTypeForIntegration } from "@/features/integrations/lib/auth-type"
import { getIntegrationConnectionDetail } from "@/features/integrations/lib/queries"
import { firstValue } from "@/lib/search-params"
import type { IntegrationConnectionDirection } from "@/types/domain"

function resolveDirection(
  value: string | undefined
): IntegrationConnectionDirection {
  return value === "destino" ? "destino" : "origen"
}

/** Sin equivalente en Figma — reemplaza el "Configurar" deshabilitado de `IntegrationDetailPanel` (1265:4205 / 1265:4811). */
export default async function IntegrationConfigPage({
  params,
  searchParams,
}: PageProps<"/ajustes/integraciones/[id]">) {
  const { id } = await params
  const query = await searchParams
  const direction = resolveDirection(firstValue(query.direccion))

  const integration = findIntegration(id, direction)
  if (!integration) notFound()

  const connection = await getIntegrationConnectionDetail(id, direction)

  return (
    <AppPage
      breadcrumb={`Configuración  ›  Integraciones  ›  ${integration.name}`}
      title={integration.name}
    >
      <BackLink href="/ajustes/integraciones">Volver a Integraciones</BackLink>
      <IntegrationConfigForm
        integrationId={integration.id}
        integrationName={integration.name}
        direction={direction}
        authType={authTypeForIntegration(integration.id)}
        connection={connection}
      />
    </AppPage>
  )
}
