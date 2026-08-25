"use client"

import Link from "next/link"

import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  connectedMessageProviders,
  findFlow,
  type MessageNodeType,
} from "@/config/integration-flows"

import { FieldSlashAutocomplete } from "./field-slash-autocomplete"
import { SIMPLE_FIELD_SPECS } from "./field-specs"
import { ALL_NODE_VARIABLES } from "./node-variables"
import { SimpleConfigForm } from "./simple-config-form"

type MessageConfig = {
  integracion_id?: string
  flujo_id?: string
  mapeo?: Record<string, string>
}

/**
 * Caso difícil #3: proveedor → flujo es una cascada dependiente (elegir
 * proveedor determina qué flujos hay para elegir) que no cabe en el modelo
 * plano de `SimpleConfigForm`/`FieldSpec[]` — mismo criterio que
 * `AccumulatePointsForm`/`MultiConditionForm`. Los guardarraíles que sí
 * comparten forma con el resto de bloques simples (`MESSAGE_GUARDRAIL_SPECS`
 * en `field-specs.ts`) se delegan a `SimpleConfigForm` al final, en vez de
 * reimplementar boolean/number/time-range aquí.
 */
export function IntegrationMessageForm({
  channel,
  config,
  onChange,
}: {
  channel: MessageNodeType
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  const providers = connectedMessageProviders(channel)
  const {
    integracion_id: integrationId,
    flujo_id: flowId,
    mapeo,
  } = config as MessageConfig

  if (providers.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Message
          variant="info"
          title="Ninguna integración conectada"
          description="Conecta un proveedor como destino (Adobe Journey Optimizer, CJO o Braze) para poder elegir un flujo desde aquí."
        />
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/ajustes/integraciones?tab=destinos" />}
        >
          Ir a Integraciones
        </Button>
      </div>
    )
  }

  const selectedProvider = providers.find(
    (p) => p.integrationId === integrationId
  )
  const flows = selectedProvider?.flows ?? []
  const selectedFlow = flowId ? findFlow(flowId) : undefined

  function setProvider(nextIntegrationId: string | null) {
    onChange({
      ...config,
      integracion_id: nextIntegrationId ?? undefined,
      flujo_id: undefined,
      mapeo: undefined,
    })
  }

  function setFlow(nextFlowId: string | null) {
    onChange({ ...config, flujo_id: nextFlowId ?? undefined, mapeo: undefined })
  }

  function setMappingValue(paramKey: string, variableName: string) {
    onChange({
      ...config,
      mapeo: { ...(mapeo ?? {}), [paramKey]: variableName },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Proveedor" required htmlFor="msg-proveedor">
        <Select value={integrationId ?? null} onValueChange={setProvider}>
          <SelectTrigger id="msg-proveedor" className="w-full">
            <SelectValue placeholder="Selecciona un proveedor">
              {(v: string) =>
                providers.find((p) => p.integrationId === v)?.integrationName ??
                v
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.integrationId} value={p.integrationId}>
                {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 16px, no vale next/image. */}
                <img src={p.logo} alt="" className="size-4 shrink-0" />
                {p.integrationName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {selectedProvider && (
        <Field
          label="Flujo"
          required
          htmlFor="msg-flujo"
          hint={selectedFlow?.description}
        >
          <Select value={flowId ?? null} onValueChange={setFlow}>
            <SelectTrigger id="msg-flujo" className="w-full">
              <SelectValue placeholder="Selecciona un flujo">
                {(v: string) => flows.find((f) => f.id === v)?.name ?? v}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {flows.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {selectedFlow && selectedFlow.parameters.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-neutral-50 p-3.5">
          <p className="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
            Mapeo de variables
          </p>
          {selectedFlow.parameters.map((param) => (
            <div key={param.key} className="flex items-center gap-2">
              <span
                title={param.label}
                className="w-[110px] shrink-0 truncate text-[12px] text-secondary-foreground"
              >
                {param.label}
                {param.required && <span className="text-destructive"> *</span>}
              </span>
              <div className="min-w-0 flex-1">
                <FieldSlashAutocomplete
                  fields={ALL_NODE_VARIABLES}
                  value={mapeo?.[param.key] ?? ""}
                  onSelect={(name) => setMappingValue(param.key, name)}
                  placeholder="Escribe / para elegir una variable"
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <SimpleConfigForm
        specs={SIMPLE_FIELD_SPECS[channel] ?? []}
        config={config}
        onChange={onChange}
      />
    </div>
  )
}
