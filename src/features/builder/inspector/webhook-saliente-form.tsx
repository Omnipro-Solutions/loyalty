"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { FieldSlashAutocomplete } from "./field-slash-autocomplete"
import { SIMPLE_FIELD_SPECS } from "./field-specs"
import type { GraphVariable } from "./node-variables"
import { SimpleConfigForm } from "./simple-config-form"

type WebhookHeader = { id: string; key: string; value: string }
type WebhookBodyField = { id: string; campo: string; variable: string }

/**
 * Sin tarjeta en el catálogo de Figma (ver comentario de
 * `BUILDER_NODE_GROUPS` en `types/domain.ts`) — mismo criterio que
 * `IntegrationMessageForm`: los campos escalares (URL, método, reintentos…)
 * caben en `SimpleConfigForm`/`FieldSpec[]`, pero headers y cuerpo son
 * listas de longitud variable que no caben ahí, así que este componente
 * dedicado las agrega debajo. "Headers" reusa el patrón de fila de
 * `branches-tab.tsx` (agregar/quitar, 2 inputs por fila); "Cuerpo" reusa el
 * bloque "Mapeo de variables" de `integration-message-form.tsx` (mismo
 * `FieldSlashAutocomplete` atado a `graphVariables`), pero con filas
 * dinámicas en vez de una lista fija de `flow.parameters` — acá no hay un
 * flujo de proveedor del que derivarlas.
 */
export function WebhookSalienteForm({
  config,
  graphVariables,
  onChange,
}: {
  config: Record<string, unknown>
  /** Variables reales de los bloques anteriores a este en el grafo (ver `resolveAvailableVariables`, resuelto por `InspectorPanel`). */
  graphVariables: GraphVariable[]
  onChange: (config: Record<string, unknown>) => void
}) {
  const headers = Array.isArray(config.headers)
    ? (config.headers as WebhookHeader[])
    : []
  const cuerpo = Array.isArray(config.cuerpo)
    ? (config.cuerpo as WebhookBodyField[])
    : []

  function updateHeaders(next: WebhookHeader[]) {
    onChange({ ...config, headers: next })
  }

  function updateCuerpo(next: WebhookBodyField[]) {
    onChange({ ...config, cuerpo: next })
  }

  return (
    <div className="flex flex-col gap-5">
      <SimpleConfigForm
        specs={SIMPLE_FIELD_SPECS.webhook_saliente ?? []}
        config={config}
        onChange={onChange}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] leading-[13px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
            Headers HTTP
          </p>
          <button
            type="button"
            onClick={() =>
              updateHeaders([
                ...headers,
                {
                  id: crypto.randomUUID(),
                  key: `Header ${String(headers.length + 1)}`,
                  value: "",
                },
              ])
            }
            className="flex items-center gap-1 text-[11px] font-medium text-primary"
          >
            <Plus className="size-3" />
            Agregar header
          </button>
        </div>
        {headers.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Sin headers adicionales.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {headers.map((header, i) => (
              <div
                key={header.id}
                className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3"
              >
                <Input
                  placeholder="Header"
                  value={header.key}
                  onChange={(e) => {
                    const next = [...headers]
                    next[i] = { ...header, key: e.target.value }
                    updateHeaders(next)
                  }}
                  className="h-8 flex-1 bg-background text-[13px]"
                />
                <Input
                  placeholder="Valor"
                  value={header.value}
                  onChange={(e) => {
                    const next = [...headers]
                    next[i] = { ...header, value: e.target.value }
                    updateHeaders(next)
                  }}
                  className="h-8 flex-1 bg-background text-[13px]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quitar header"
                  onClick={() =>
                    updateHeaders(headers.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-neutral-50 p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
            Cuerpo
          </p>
          <button
            type="button"
            onClick={() =>
              updateCuerpo([
                ...cuerpo,
                {
                  id: crypto.randomUUID(),
                  campo: `campo_${String(cuerpo.length + 1)}`,
                  variable: "",
                },
              ])
            }
            className="flex items-center gap-1 text-[11px] font-medium text-primary"
          >
            <Plus className="size-3" />
            Agregar campo
          </button>
        </div>
        {cuerpo.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Sin campos en el cuerpo todavía.
          </p>
        ) : (
          <>
            {graphVariables.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Ningún bloque anterior de este flujo expone variables todavía —
                conecta este bloque después de uno que sí (ej. Evento de compra)
                para poder mapearlas aquí.
              </p>
            )}
            {cuerpo.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  placeholder="campo"
                  value={field.campo}
                  onChange={(e) => {
                    const next = [...cuerpo]
                    next[i] = { ...field, campo: e.target.value }
                    updateCuerpo(next)
                  }}
                  className="h-9 w-[110px] shrink-0 bg-background text-[12px]"
                />
                <div className="min-w-0 flex-1">
                  <FieldSlashAutocomplete
                    fields={graphVariables.map((v) => ({
                      name: v.name,
                      label: v.name,
                      group: v.sourceLabel,
                    }))}
                    value={field.variable}
                    onSelect={(name) => {
                      const next = [...cuerpo]
                      next[i] = { ...field, variable: name }
                      updateCuerpo(next)
                    }}
                    placeholder="Escribe / para elegir una variable"
                    className="w-full"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quitar campo"
                  onClick={() =>
                    updateCuerpo(cuerpo.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
