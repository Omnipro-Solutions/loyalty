"use client"

import { PlugZap } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { FilterSearch } from "@/components/filters/search"
import { Button } from "@/components/ui/button"
import type { IntegrationGroup } from "@/config/integrations-catalog"
import type { ConnectionStatus } from "@/config/integrations-connections"

import { IntegrationCard } from "./integration-card"
import { IntegrationDetailPanel } from "./integration-detail-panel"
import { IntegrationsRail } from "./integrations-rail"
import type { IntegrationConnectionRow } from "../lib/queries"

type IntegrationsCatalogProps = {
  direction: "origen" | "destino"
  groups: IntegrationGroup[]
  connections: IntegrationConnectionRow[]
  initialSelectionId: string
  title: string
  description: string
  searchLabel: string
  totalLabel: string
  allLabel: string
  secondaryActionLabel: string
  primaryActionLabel: string
}

/**
 * Orquesta el "12.1/12.2 · Integraciones" completo (encabezado, rail de
 * categorías, grilla y panel de detalle). Las acciones del encabezado
 * ("Nueva conexión"/"Nuevo destino") siguen deshabilitadas, igual que en el
 * Figma — solo "Configurar" (dentro de `IntegrationDetailPanel`) tiene
 * backend real detrás (`integracion_conexiones`). `connections` viene del
 * servidor (`listIntegrationConnections`, ver `page.tsx`) y alimenta el
 * estado real de cada tarjeta y "Mis conexiones".
 */
export function IntegrationsCatalog({
  direction,
  groups,
  connections,
  initialSelectionId,
  title,
  description,
  searchLabel,
  totalLabel,
  allLabel,
  secondaryActionLabel,
  primaryActionLabel,
}: IntegrationsCatalogProps) {
  const [mode, setMode] = useState<"todas" | "mias">("todas")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selectionId, setSelectionId] = useState(initialSelectionId)

  const allIntegrations = useMemo(
    () => groups.flatMap((group) => group.integrations),
    [groups]
  )
  const total = allIntegrations.length

  const categories = useMemo(
    () =>
      groups.map((group) => ({
        name: group.category,
        total: group.integrations.length,
      })),
    [groups]
  )

  const filteredGroups = useMemo(() => {
    const search = query.trim().toLowerCase()
    return groups
      .filter((group) => !activeCategory || group.category === activeCategory)
      .map((group) => ({
        ...group,
        integrations: group.integrations.filter((integration) =>
          integration.name.toLowerCase().includes(search)
        ),
      }))
      .filter((group) => group.integrations.length > 0)
  }, [groups, activeCategory, query])

  const connectedStatusById = useMemo(() => {
    const map = new Map<string, ConnectionStatus>()
    for (const connection of connections) {
      if (connection.direccion === direction) {
        map.set(connection.integration_id, connection.estado)
      }
    }
    return map
  }, [connections, direction])
  const hasConnections = connectedStatusById.size > 0

  const visibleGroups = useMemo(() => {
    if (mode === "todas") return filteredGroups
    return filteredGroups
      .map((group) => ({
        ...group,
        integrations: group.integrations.filter((integration) =>
          connectedStatusById.has(integration.id)
        ),
      }))
      .filter((group) => group.integrations.length > 0)
  }, [filteredGroups, mode, connectedStatusById])
  const visibleTotal = mode === "mias" ? connectedStatusById.size : total

  const selected =
    allIntegrations.find((integration) => integration.id === selectionId) ??
    null
  const showDetailPanel =
    selected !== null &&
    (mode === "todas" || connectedStatusById.has(selected.id))

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[22px] leading-7 font-bold text-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/ajustes/integraciones?tab=sistema" />}
          >
            {secondaryActionLabel}
          </Button>
          <Button size="sm" disabled title="Disponible en una próxima fase">
            {primaryActionLabel}
          </Button>
        </div>
      </div>

      <div className="flex w-full items-start gap-5">
        <IntegrationsRail
          allLabel={allLabel}
          mode={mode}
          onModeChange={setMode}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {mode === "mias" && !hasConnections ? (
          <div className="flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
            <EmptyState
              icon={PlugZap}
              title="Todavía no tienes conexiones activas"
              description="Cuando actives una integración desde el catálogo, aparecerá acá."
            />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <FilterSearch
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchLabel}
                className="w-full rounded-[10px]"
              />
              <p className="shrink-0 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
                {visibleTotal} {mode === "mias" ? "conectados" : totalLabel}
              </p>
            </div>

            {visibleGroups.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
                <p className="py-16 text-sm text-muted-foreground">
                  {mode === "mias"
                    ? "Ninguna conexión coincide con la búsqueda."
                    : "Ninguna integración coincide con la búsqueda."}
                </p>
              </div>
            ) : (
              visibleGroups.map((group) => (
                <div
                  key={group.category}
                  className="flex w-full flex-col gap-2.5"
                >
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-[13px] font-semibold text-foreground">
                      {group.category}
                    </p>
                    <p className="text-[10.5px] whitespace-nowrap text-muted-foreground">
                      {group.integrations.length}{" "}
                      {mode === "mias"
                        ? group.integrations.length === 1
                          ? "conectada"
                          : "conectadas"
                        : group.integrations.length === 1
                          ? "disponible"
                          : "disponibles"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {group.integrations.map((integration) => (
                      <IntegrationCard
                        key={integration.id}
                        integration={integration}
                        selected={integration.id === selectionId}
                        onSelect={() => setSelectionId(integration.id)}
                        status={connectedStatusById.get(integration.id)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showDetailPanel && selected && (
          <IntegrationDetailPanel
            integration={selected}
            category={
              groups.find((group) =>
                group.integrations.some((i) => i.id === selected.id)
              )?.category ?? ""
            }
            direction={direction}
            onClose={() => setSelectionId("")}
          />
        )}
      </div>
    </div>
  )
}
