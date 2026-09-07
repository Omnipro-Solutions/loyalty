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
  applicablePermissions,
  isFullAccessRole,
  isOptInAction,
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
  permissions: RoleDetail["permissions"],
  fullAccess: boolean
): Record<string, boolean> {
  const map: Record<string, boolean> = {}
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      if (!actionApplies(resource, action)) continue
      // Un rol de acceso total se pinta por lo que garantiza, no por lo que
      // haya quedado en `role_permissions`: si alguien lo recortó antes de
      // que existiera el blindaje, la pantalla lo muestra completo y el
      // primer "Guardar cambios" lo restituye. Las acciones opt-in quedan
      // fuera de esa garantía (`applicablePermissions` tampoco las incluye),
      // así que se leen de la fila real como en cualquier otro rol: pintarlas
      // marcadas sería afirmar un permiso que ese rol no tiene.
      map[`${resource}:${action}`] =
        (fullAccess && !isOptInAction(action)) ||
        (permissions[resource]?.includes(action) ?? false)
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
  const fullAccess = isFullAccessRole(roleDetail)
  const [permissions, setPermissions] = useState(() =>
    initialPermissionsFrom(roleDetail.permissions, fullAccess)
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
  // "Acceso total" no es una matriz por defecto que se pueda recortar, es lo
  // que ese rol ES — y recortarla deja a la organización sin quien decida las
  // aprobaciones pendientes. El servidor lo rechaza igual
  // (`guardPermissionMatrix`); esto evita ofrecer el gesto, sobre todo el
  // "Nada", que borra la matriz de un clic.
  //
  // Gobierna los gestos MASIVOS y el texto de ayuda, no las casillas: cada
  // celda se pregunta por su cuenta con `cellLocked`, porque en un rol de
  // acceso total las opt-in sí se editan (ver más abajo).
  const matrixLocked = readOnly || fullAccess

  /**
   * El candado va por celda y no por matriz: lo que "acceso total" garantiza
   * es inamovible, pero las acciones opt-in (`OPT_IN_ACTIONS`) ese rol nunca
   * las prometió —`applicablePermissions()` las excluye— así que sí se
   * marcan y se desmarcan aquí. Sin esto la autoaprobación era
   * inconcedible justo en el rol que más la necesita: el único que existe
   * en una organización de una sola persona.
   *
   * El trigger de Postgres acompaña la misma excepción desde
   * `20260907170000_blindaje_admite_opt_in.sql` — si no, se podría conceder
   * y no revocar.
   */
  function cellLocked(action: Action): boolean {
    if (readOnly) return true
    return fullAccess && !isOptInAction(action)
  }

  function set(resource: Resource, action: Action, value: boolean) {
    if (cellLocked(action) || !actionApplies(resource, action)) return
    setPermissions((prev) => ({
      ...prev,
      [`${resource}:${action}`]: value,
      // `autoaprobar` amplía `aprobar`, no vale por su cuenta
      // (`can_self_approve()` exige los dos). Al quitar `aprobar` se cae
      // solo, en vez de quedar una casilla marcada que no concede nada y que
      // el servidor rechazaría al guardar.
      ...(action === "aprobar" && !value
        ? { [`${resource}:autoaprobar`]: false }
        : {}),
    }))
  }

  function applyBulk(criteria: (action: Action) => boolean) {
    if (matrixLocked) return
    const next: Record<string, boolean> = {}
    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        if (!actionApplies(resource, action)) continue
        // "Todo" no concede las opt-in: son excepciones a una regla de
        // seguridad (hoy, saltarse la doble aprobación), y eso no puede
        // entrar de refilón en un clic que el usuario lee como "marca lo
        // normal". Se marcan una por una, a propósito.
        next[`${resource}:${action}`] =
          criteria(action) && !isOptInAction(action)
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
      // Para un rol de acceso total la matriz garantizada es el único valor
      // válido (lo exige `guardPermissionMatrix`), así que se manda entera
      // —guardar cualquier otro campo la deja sana de paso— MÁS las opt-in
      // que estén marcadas, que son las únicas celdas editables de ese rol.
      permissions: fullAccess
        ? [
            ...applicablePermissions(),
            ...grantedPermissions.filter((p) => isOptInAction(p.action)),
          ]
        : grantedPermissions,
    })
  }

  const visibleMembers = roleDetail.membersPreview.slice(0, 3)
  const remaining = roleDetail.membersTotal - visibleMembers.length

  // `min-w-0` en la raíz: este panel es un `flex-1` dentro del `lg:flex-row`
  // de la página (ajustes/equipo/page.tsx) y, sin él, su ancho mínimo es el
  // de su contenido —la matriz de 13 columnas—. El panel no se encogía, así
  // que quien scrolleaba en horizontal era la página entera: la tabla se veía
  // completa y el que se salía de la vista era el sidebar.
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3.5">
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
              {matrixLocked && !readOnly
                ? "Acceso total a todos los módulos: esta matriz no se recorta, solo se le puede activar Autoaprobar. Duplica el rol si necesitas una versión con menos permisos."
                : "Ver incluye acceso de solo lectura. Aprobar habilita publicar cambios que afectan a clientes. Autoaprobar deja además firmar las solicitudes propias: rompe la doble aprobación a propósito, dalo solo si esta persona es la única que puede firmar."}
            </p>
          </div>
          {canManage && !matrixLocked && (
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
          ancho fijo del panel a w-24 por columna — se baja a w-16 y cabecera y
          filas van en UN SOLO contenedor que scrollea en los dos ejes, con la
          cabecera `sticky top-0`. Anidar un `overflow-y-auto` dentro de un
          `overflow-x-auto` no sirve: al fijar un eje, CSS resuelve el otro
          como `auto`, así que las filas se llevaban su propia barra horizontal
          y se desalineaban de la cabecera en cuanto se scrolleaba. El nombre
          del módulo queda con ancho mínimo propio en vez de flex-1 para que no
          se aplaste al scrollear.
        */}
        <div className="min-h-0 flex-1 scrollbar-thin overflow-auto">
          <div className="sticky top-0 z-10 flex w-fit min-w-full items-center gap-2.5 bg-muted px-5 py-2.5">
            <span className="w-[200px] shrink-0 text-[10px] font-semibold tracking-[0.4px] text-muted-foreground">
              MÓDULO
            </span>
            {ACTIONS.map((action) => (
              <span
                key={action}
                // El nombre completo en el `title` porque "AUTOAPR." está
                // abreviado para caber en `w-16` (ver `ACTION_LABELS`).
                title={action}
                className="w-16 shrink-0 text-center text-[10px] font-semibold tracking-[0.4px] text-muted-foreground"
              >
                {ACTION_LABELS[action]}
              </span>
            ))}
          </div>

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
                // Sin `aprobar` sobre el mismo recurso, `autoaprobar` no
                // concede nada (ver `can_self_approve()`): la casilla se
                // deshabilita en vez de dejar guardar una combinación que
                // la Server Action rechaza.
                const needsApprove =
                  action === "autoaprobar" &&
                  !permissions[`${resource}:aprobar`]
                return (
                  <div
                    key={action}
                    className="flex w-16 shrink-0 justify-center"
                  >
                    {applies ? (
                      <Checkbox
                        checked={permissions[`${resource}:${action}`] ?? false}
                        disabled={cellLocked(action) || needsApprove}
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
                  ? "border-selected bg-accent text-primary-800"
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
