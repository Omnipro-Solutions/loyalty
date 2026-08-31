"use client"

import {
  ArrowRight,
  KeyRound,
  Plug,
  Plus,
  Trash2,
  Waypoints,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"

import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { PasswordInput } from "@/components/form/password-input"
import { Row } from "@/components/form/row"
import { Section } from "@/components/form/section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type {
  IntegrationAuthType,
  IntegrationConnectionDirection,
} from "@/types/domain"

import { upsertIntegrationConnectionAction } from "../actions/connection"
import { ConnectionStatusDot } from "./connection-status-dot"
import type { IntegrationConnectionDetail } from "../lib/queries"
import type { IntegrationCredentialsValues } from "../schemas"

/** Mismos valores que ya aparecen como tag de frecuencia en el catálogo (`src/config/integrations-catalog.ts`) — no es un check de BD, `frecuencia` sigue siendo texto libre por si un proveedor real usa otra cadencia. */
const SYNC_FREQUENCY_PRESETS = [
  "Tiempo real",
  "Cada 15 min",
  "Cada hora",
  "Cada 6 h",
  "Diario",
] as const

const AUTH_TYPE_LABEL: Record<IntegrationAuthType, string> = {
  oauth2: "OAuth 2.0",
  api_key: "API key",
  app_key_token: "App Key / Token",
  token_personal: "Token personal",
  token_integracion: "Token de integración",
  certificado: "Certificado",
  usuario_tecnico: "Usuario técnico",
}

type CredentialFieldSpec = {
  name: string
  label: string
  kind: "text" | "password" | "textarea"
  hint?: string
}

/**
 * Única tabla que describe los campos de credenciales por `authType` — antes
 * la misma información vivía repetida en el tipo del formulario, en
 * `defaultValuesFor`, en `credentialsFrom` y en 6 bloques JSX casi
 * idénticos. Agregar un campo nuevo a un método de auth es ahora un cambio
 * en un solo lugar.
 */
const CREDENTIAL_FIELDS: Record<IntegrationAuthType, CredentialFieldSpec[]> = {
  oauth2: [
    { name: "clientId", label: "Client ID", kind: "text" },
    { name: "clientSecret", label: "Client secret", kind: "password" },
  ],
  api_key: [{ name: "apiKey", label: "API key", kind: "password" }],
  app_key_token: [
    { name: "appKey", label: "App Key", kind: "text" },
    { name: "appToken", label: "App Token", kind: "password" },
  ],
  token_personal: [
    { name: "token", label: "Token personal", kind: "password" },
  ],
  token_integracion: [
    { name: "token", label: "Token de integración", kind: "password" },
  ],
  certificado: [
    {
      name: "certificado",
      label: "Certificado",
      kind: "textarea",
      hint: "Pega el contenido del certificado provisto por el integrador.",
    },
  ],
  usuario_tecnico: [
    { name: "usuario", label: "Usuario técnico", kind: "text" },
    { name: "contrasena", label: "Contraseña", kind: "password" },
  ],
}

/** Agrupa de 2 en 2 para reproducir el layout de dos columnas (`Row`) que ya tenían los campos pareados (Client ID/secret, App Key/Token, usuario/contraseña). */
function pairs<T>(items: T[]): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += 2) result.push(items.slice(i, i + 2))
  return result
}

type ConfigFormValues = {
  status: "activa" | "pausada"
  frequency: string
  credentials: Record<string, string>
  fieldMappings: {
    sourceField: string
    targetField: string
    transform: string
  }[]
}

function defaultValuesFor(
  authType: IntegrationAuthType,
  connection: IntegrationConnectionDetail | null
): ConfigFormValues {
  const saved =
    connection?.credentials?.tipoAuth === authType
      ? (connection.credentials as unknown as Record<string, string>)
      : null

  const credentials: Record<string, string> = {}
  for (const field of CREDENTIAL_FIELDS[authType]) {
    credentials[field.name] = saved?.[field.name] ?? ""
  }

  return {
    status: connection?.estado === "activa" ? "activa" : "pausada",
    frequency: connection?.frecuencia ?? "",
    credentials,
    fieldMappings: (connection?.fieldMappings ?? []).map((m) => ({
      sourceField: m.campo_origen,
      targetField: m.campo_destino,
      transform: m.transformacion ?? "",
    })),
  }
}

function credentialsFrom(
  authType: IntegrationAuthType,
  values: ConfigFormValues
): IntegrationCredentialsValues {
  const entries = CREDENTIAL_FIELDS[authType].map(
    (field) => [field.name, values.credentials[field.name] ?? ""] as const
  )
  return {
    tipoAuth: authType,
    ...Object.fromEntries(entries),
  } as IntegrationCredentialsValues
}

type IntegrationConfigFormProps = {
  integrationId: string
  integrationName: string
  direction: IntegrationConnectionDirection
  authType: IntegrationAuthType
  connection: IntegrationConnectionDetail | null
}

/** Sin equivalente en Figma — reemplaza el botón "Configurar" deshabilitado de `IntegrationDetailPanel`. */
export function IntegrationConfigForm({
  integrationId,
  integrationName,
  direction,
  authType,
  connection,
}: IntegrationConfigFormProps) {
  const router = useRouter()
  const [generalError, setGeneralError] = useState<string>()
  const isEditing = Boolean(connection)

  // Lazy: `defaultValues` solo se lee al montar (RHF), recalcularlo en cada
  // render (p.ej. al togglear el Switch) sería trabajo tirado a la basura.
  const [initialValues] = useState(() => defaultValuesFor(authType, connection))

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ConfigFormValues>({ defaultValues: initialValues })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fieldMappings",
  })

  const status = useWatch({ control, name: "status" })
  const frequency = useWatch({ control, name: "frequency" })

  const save = useAction(upsertIntegrationConnectionAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setGeneralError(data?.message ?? "No se pudo guardar la conexión.")
        return
      }
      router.push(
        `/ajustes/integraciones?tab=${direction === "origen" ? "origenes" : "destinos"}`
      )
    },
    onError: () => setGeneralError("No se pudo guardar la conexión."),
  })

  function onSubmit(values: ConfigFormValues) {
    setGeneralError(undefined)
    save.execute({
      integrationId,
      direction,
      status: values.status,
      frequency: values.frequency || undefined,
      credentials: credentialsFrom(authType, values),
      fieldMappings: values.fieldMappings,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-2xl leading-7 font-semibold text-foreground">
            {isEditing ? "Editar conexión" : "Configurar integración"}
          </p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            {integrationName} ·{" "}
            {direction === "origen" ? "Origen de datos" : "Destino de datos"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/ajustes/integraciones")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            Guardar cambios
          </Button>
        </div>
      </div>

      {generalError && (
        <Message
          variant="error"
          title="No se pudo guardar"
          description={generalError}
        />
      )}

      <Section
        title="Conexión"
        icon={Plug}
        description="Activa la conexión una vez verifiques que las credenciales de abajo funcionan."
      >
        <Row>
          <Field
            label="Frecuencia de sincronización (opcional)"
            htmlFor="frequency"
            hint="Qué tan seguido se sincronizan los datos con el proveedor."
          >
            <Select
              value={frequency || undefined}
              onValueChange={(v) => setValue("frequency", v ?? "")}
            >
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Selecciona una frecuencia">
                  {(v: string) => v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SYNC_FREQUENCY_PRESETS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Estado de la conexión" htmlFor="status">
            <div className="flex items-center gap-2.5">
              <Switch
                id="status"
                checked={status === "activa"}
                onCheckedChange={(checked) =>
                  setValue("status", checked ? "activa" : "pausada")
                }
              />
              <ConnectionStatusDot status={status} />
            </div>
          </Field>
        </Row>
      </Section>

      <Section
        title="Credenciales"
        icon={KeyRound}
        description="Datos de acceso al proveedor. Quedan asociados solo a esta organización."
        action={<Badge variant="neutral">{AUTH_TYPE_LABEL[authType]}</Badge>}
      >
        {pairs(CREDENTIAL_FIELDS[authType]).map((row) => (
          <Row key={row.map((f) => f.name).join("-")}>
            {row.map((field) => (
              <Field
                key={field.name}
                label={field.label}
                htmlFor={`credentials.${field.name}`}
                required
                hint={field.hint}
                error={errors.credentials?.[field.name]?.message}
              >
                {field.kind === "textarea" ? (
                  <Textarea
                    id={`credentials.${field.name}`}
                    rows={4}
                    {...register(`credentials.${field.name}`, {
                      required: `Ingresa ${field.label.toLowerCase()}`,
                    })}
                  />
                ) : field.kind === "password" ? (
                  <PasswordInput
                    id={`credentials.${field.name}`}
                    {...register(`credentials.${field.name}`, {
                      required: `Ingresa ${field.label.toLowerCase()}`,
                    })}
                  />
                ) : (
                  <Input
                    id={`credentials.${field.name}`}
                    {...register(`credentials.${field.name}`, {
                      required: `Ingresa ${field.label.toLowerCase()}`,
                    })}
                  />
                )}
              </Field>
            ))}
          </Row>
        ))}
      </Section>

      <Section
        title="Mapeo de campos"
        icon={Waypoints}
        description="Relaciona un campo de origen con su equivalente en el destino. Opcional."
      >
        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Sin mapeos — se usan los nombres de campo por defecto.
          </p>
        )}
        <div className="flex w-full flex-col gap-2.5">
          {fields.map((field, index) => (
            <div key={field.id} className="flex w-full items-start gap-2.5">
              <Field
                label="Campo origen"
                htmlFor={`fieldMappings.${index}.sourceField`}
                className="flex-1"
              >
                <Input
                  id={`fieldMappings.${index}.sourceField`}
                  {...register(`fieldMappings.${index}.sourceField`)}
                />
              </Field>
              <div className="flex h-[38px] shrink-0 items-center self-end">
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </div>
              <Field
                label="Campo destino"
                htmlFor={`fieldMappings.${index}.targetField`}
                className="flex-1"
              >
                <Input
                  id={`fieldMappings.${index}.targetField`}
                  {...register(`fieldMappings.${index}.targetField`)}
                />
              </Field>
              <Field
                label="Transformación (opcional)"
                htmlFor={`fieldMappings.${index}.transform`}
                className="flex-1"
              >
                <Input
                  id={`fieldMappings.${index}.transform`}
                  {...register(`fieldMappings.${index}.transform`)}
                />
              </Field>
              <div className="flex h-[38px] shrink-0 items-center self-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Quitar mapeo</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed text-muted-foreground hover:text-foreground"
          onClick={() =>
            append({ sourceField: "", targetField: "", transform: "" })
          }
        >
          <Plus className="size-3.5" />
          Añadir mapeo
        </Button>
      </Section>
    </form>
  )
}
