"use client"

import { Lock, ShieldCheck } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Message } from "@/components/form/message"
import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ACTIONS,
  RESOURCES,
  actionApplies,
  type Action,
  type Resource,
} from "@/lib/permissions"
import { cn } from "@/lib/utils"
import {
  CHANNEL_SCOPES,
  STORE_SCOPES,
  type ChannelScope,
  type StoreScope,
} from "@/types/domain"

import { updateRoleAction, duplicateRoleAction } from "../actions/roles"
import { avatarPalette } from "../lib/avatar-palette"
import { ACTION_LABELS, RESOURCE_INFO } from "../lib/labels"
import type { RoleDetail } from "../lib/queries"

const STORE_SCOPE_LABEL: Record<string, string> = {
  todas: "Todas las tiendas",
  propia: "Solo su tienda",
}

const CHANNEL_SCOPE_LABEL: Record<string, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  pos_ecommerce: "POS + E-commerce",
}

function initialPermissionsFrom(
  permissions: RoleDetail["permissions"]
): Record<string, boolean> {
  const map: Record<string, boolean> = {}
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      if (!actionApplies(resource, action)) continue
      map[`${resource}:${action}`] =
        permissions[resource]?.includes(action) ?? false
    }
  }
  return map
}

type RoleDetailPanelProps = {
  roleDetail: RoleDetail
  canManage: boolean
}

/** Figma "Detalle rol" (718:2930) + "Matriz de permisos" (719:2865), 09.2. */
export function RoleDetailPanel({
  roleDetail,
  canManage,
}: RoleDetailPanelProps) {
  const router = useRouter()
  const [permissions, setPermissions] = useState(() =>
    initialPermissionsFrom(roleDetail.permissions)
  )
  const [storeScope, setStoreScope] = useState(
    roleDetail.alcance_tiendas as StoreScope
  )
  const [channelScope, setChannelScope] = useState(
    roleDetail.alcance_canal as ChannelScope
  )
  const [maxDiscountPct, setMaxDiscountPct] = useState(
    roleDetail.descuento_maximo_pct?.toString() ?? ""
  )
  const [result, setResult] = useState<{
    ok: boolean
    message?: string
  }>()

  const readOnly = !canManage

  function set(resource: Resource, action: Action, value: boolean) {
    if (readOnly || !actionApplies(resource, action)) return
    setPermissions((prev) => ({ ...prev, [`${resource}:${action}`]: value }))
  }

  function applyBulk(criteria: (action: Action) => boolean) {
    if (readOnly) return
    const next: Record<string, boolean> = {}
    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        if (!actionApplies(resource, action)) continue
        next[`${resource}:${action}`] = criteria(action)
      }
    }
    setPermissions(next)
  }

  const save = useAction(updateRoleAction, {
    onSuccess: ({ data }) => {
      setResult(data?.ok ? { ok: true } : { ok: false, message: data?.message })
    },
    onError: () =>
      setResult({ ok: false, message: "No se pudo guardar el rol." }),
  })

  const duplicate = useAction(duplicateRoleAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) router.push(`/ajustes/equipo?tab=roles&rol=${data.id}`)
    },
  })

  function saveChanges() {
    const grantedPermissions = Object.entries(permissions)
      .filter(([, value]) => value)
      .map(([key]) => {
        const [resource, action] = key.split(":") as [Resource, Action]
        return { resource, action }
      })

    save.execute({
      roleId: roleDetail.id,
      name: roleDetail.nombre,
      description: roleDetail.descripcion ?? undefined,
      storeScope,
      channelScope,
      maxDiscountPct: maxDiscountPct ? Number(maxDiscountPct) : undefined,
      permissions: grantedPermissions,
    })
  }

  const visibleMembers = roleDetail.membersPreview.slice(0, 3)
  const remaining = roleDetail.membersTotal - visibleMembers.length

  return (
    <div className="flex h-full flex-1 flex-col gap-3.5">
      <div className="flex items-center gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-avatar-indigo-bg">
          <ShieldCheck className="size-5 text-avatar-indigo-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {roleDetail.nombre}
          </p>
          {roleDetail.descripcion && (
            <p className="text-[11px] leading-4 text-muted-foreground">
              {roleDetail.descripcion}
            </p>
          )}
        </div>
        {visibleMembers.length > 0 && (
          <div className="flex shrink-0 items-center">
            {visibleMembers.map((m) => {
              const palette = avatarPalette(m.id)
              return (
                <AvatarInitials
                  key={m.id}
                  name={m.nombre}
                  size={30}
                  bgClassName={palette.bg}
                  fgClassName={palette.fg}
                  className="-mr-2 border-2 border-background"
                />
              )
            })}
            {remaining > 0 && (
              <div className="-mr-2 flex size-[30px] items-center justify-center rounded-full border-2 border-background bg-muted">
                <span className="text-[10px] font-semibold text-secondary-foreground">
                  +{remaining}
                </span>
              </div>
            )}
          </div>
        )}
        {canManage && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={duplicate.isPending}
              onClick={() =>
                duplicate.execute({
                  roleId: roleDetail.id,
                  name: `${roleDetail.nombre} (copia)`,
                })
              }
            >
              Duplicar
            </Button>
            <Button
              type="button"
              disabled={save.isPending}
              onClick={saveChanges}
            >
              Guardar cambios
            </Button>
          </>
        )}
      </div>

      {result?.ok === false && (
        <Message
          variant="error"
          title="No se pudo guardar el rol"
          description={result.message ?? "Intenta de nuevo."}
        />
      )}
      {result?.ok === true && (
        <Message
          variant="success"
          title="Role actualizado"
          description="Los cambios se guardaron correctamente."
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden rounded-[20px] bg-background shadow-form-section">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              Permisos por módulo
            </p>
            <p className="text-[11px] text-muted-foreground">
              Ver incluye acceso de solo lectura. Aprobar habilita publicar
              cambios que afectan a clientes.
            </p>
          </div>
          {canManage && (
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => applyBulk(() => true)}
                className="rounded-full bg-muted px-[11px] py-1.5 text-[11px] font-medium text-secondary-foreground"
              >
                Todo
              </button>
              <button
                type="button"
                onClick={() => applyBulk(() => false)}
                className="rounded-full bg-muted px-[11px] py-1.5 text-[11px] font-medium text-secondary-foreground"
              >
                Nada
              </button>
              <button
                type="button"
                onClick={() => applyBulk((action) => action === "ver")}
                className="rounded-full bg-muted px-[11px] py-1.5 text-[11px] font-medium text-secondary-foreground"
              >
                Solo lectura
              </button>
            </div>
          )}
        </div>

        {/*
          9 acciones (antes 5, ver src/lib/permissions.ts) ya no caben en el
          ancho fijo del panel a w-24 por columna — se baja a w-16 y se envuelve
          todo el bloque (cabecera + filas) en un mismo overflow-x-auto para que
          scrollee como una sola unidad; el nombre del módulo queda con ancho
          mínimo propio en vez de flex-1 para que no se aplaste al scrollear.
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
          <div className="flex w-fit min-w-full items-center gap-2.5 bg-muted px-5 py-2.5">
            <span className="w-[200px] shrink-0 text-[10px] font-semibold tracking-[0.4px] text-muted-foreground">
              MÓDULO
            </span>
            {ACTIONS.map((action) => (
              <span
                key={action}
                className="w-16 shrink-0 text-center text-[10px] font-semibold tracking-[0.4px] text-muted-foreground"
              >
                {ACTION_LABELS[action]}
              </span>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {RESOURCES.map((resource) => (
              <div
                key={resource}
                className="flex w-fit min-w-full items-center gap-2.5 border-t border-muted px-5 py-2.5"
              >
                <div className="w-[200px] min-w-0 shrink-0">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {RESOURCE_INFO[resource].label}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {RESOURCE_INFO[resource].description}
                  </p>
                </div>
                {ACTIONS.map((action) => {
                  const applies = actionApplies(resource, action)
                  return (
                    <div
                      key={action}
                      className="flex w-16 shrink-0 justify-center"
                    >
                      {applies ? (
                        <Checkbox
                          checked={
                            permissions[`${resource}:${action}`] ?? false
                          }
                          disabled={readOnly}
                          onCheckedChange={(checked) =>
                            set(resource, action, checked === true)
                          }
                        />
                      ) : (
                        <div className="flex size-[19px] items-center justify-center rounded-md bg-muted">
                          <Lock className="size-2.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3.5 bg-muted px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">
              Alcance de datos
            </p>
            <p className="text-[10px] text-muted-foreground">
              Define sobre qué tiendas y canales puede actuar el rol, además de
              los permisos de arriba.
            </p>
          </div>
          <Select
            value={storeScope}
            onValueChange={(v) => setStoreScope(v as typeof storeScope)}
          >
            <SelectTrigger
              disabled={readOnly}
              className={cn(
                "w-auto shrink-0 gap-1.5 rounded-[10px] py-2 pr-2.5 pl-3 text-[11px] font-medium",
                storeScope === "propia"
                  ? "border-primary bg-accent text-primary-800"
                  : "text-secondary-foreground"
              )}
            >
              <SelectValue>
                {() => `Tiendas: ${STORE_SCOPE_LABEL[storeScope]}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STORE_SCOPES.map((a) => (
                <SelectItem key={a} value={a}>
                  {STORE_SCOPE_LABEL[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={channelScope}
            onValueChange={(v) => setChannelScope(v as typeof channelScope)}
          >
            <SelectTrigger
              disabled={readOnly}
              className="w-auto shrink-0 gap-1.5 rounded-[10px] py-2 pr-2.5 pl-3 text-[11px] font-medium text-secondary-foreground"
            >
              <SelectValue>
                {() => `Canal: ${CHANNEL_SCOPE_LABEL[channelScope]}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_SCOPES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CHANNEL_SCOPE_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-border bg-background py-1.5 pr-2 pl-3 text-[11px] font-medium text-secondary-foreground">
            <span className="whitespace-nowrap">Descuento máx.</span>
            <Input
              type="number"
              min={0}
              max={100}
              disabled={readOnly}
              value={maxDiscountPct}
              onChange={(e) => setMaxDiscountPct(e.target.value)}
              className="h-auto w-12 border-0 p-0 text-[11px] leading-4 focus-visible:border-0"
            />
            <span>%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
