"use client"

import { PlugZap } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { FilterSearch } from "@/components/filters/search"
import { Button } from "@/components/ui/button"

import type { IntegrationGroup } from "../lib/catalog"
import { IntegrationCard } from "./integration-card"
import { IntegrationDetailPanel } from "./integration-detail-panel"
import { IntegrationsRail } from "./integrations-rail"

type IntegrationsCatalogProps = {
  direction: "origen" | "destino"
  groups: IntegrationGroup[]
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
 * categorías, grilla y panel de detalle) — sin backend detrás: es el
 * catálogo de la Fase 1, por eso "Configurar" y las acciones del
 * encabezado quedan deshabilitadas, igual que en el Figma.
 */
export function IntegrationsCatalog({
  direction,
  groups,
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

  const selected =
    allIntegrations.find((integration) => integration.id === selectionId) ??
    null

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
          <Button size="sm" disabled>
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

        {mode === "mias" ? (
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
                {total} {totalLabel}
              </p>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
                <p className="py-16 text-sm text-muted-foreground">
                  Ninguna integración coincide con la búsqueda.
                </p>
              </div>
            ) : (
              filteredGroups.map((group) => (
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
                      {group.integrations.length === 1
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
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {mode === "todas" && selected && (
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
