"use client"

import { CalendarDays, Clock, Mail, UserCog } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useState } from "react"

import { DetailField } from "@/components/data/detail-field"
import { Message } from "@/components/form/message"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate, formatDateTime } from "@/lib/format"

import { updateUserAccessAction } from "../actions/users"
import type { RoleWithCount, StoreOption, User } from "../lib/queries"

type UserAccessCardProps = {
  user: User
  roles: RoleWithCount[]
  stores: StoreOption[]
  canManage: boolean
  isSelf: boolean
}

/** Mismo patrón inline-editable que `RoleDetailPanel` (09.2): `useState` + `useAction`, sin diálogo — no es destructivo. */
export function UserAccessCard({
  user,
  roles,
  stores,
  canManage,
  isSelf,
}: UserAccessCardProps) {
  const [roleId, setRoleId] = useState(user.role.id)
  const [storeId, setStoreId] = useState(user.store?.id ?? "")

  const selectedRole = roles.find((r) => r.id === roleId)
  const requiresStore = selectedRole?.alcance_tiendas === "propia"

  const save = useAction(updateUserAccessAction)
  const errorMessage = save.result.serverError
    ? "No se pudo actualizar el acceso."
    : save.result.data?.ok === false
      ? (save.result.data.message ?? "Intenta de nuevo.")
      : undefined
  const success = save.result.data?.ok === true

  const dirty =
    roleId !== user.role.id || (storeId || null) !== (user.store?.id ?? null)

  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <p className="text-[15px] font-semibold text-foreground">
        Datos y acceso
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField
          icon={Mail}
          label="CORREO CORPORATIVO"
          value={user.email}
        />
        <DetailField
          icon={CalendarDays}
          label="MIEMBRO DESDE"
          value={formatDate(user.creado_en)}
        />
        <DetailField
          icon={Clock}
          label="ÚLTIMO ACCESO"
          value={
            user.lastAccessAt ? formatDateTime(user.lastAccessAt) : "Sin acceso"
          }
        />
      </div>

      {!canManage ? null : isSelf ? (
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          No puedes cambiar tu propio rol o tienda desde aquí.
        </p>
      ) : (
        <>
          {errorMessage && (
            <Message
              variant="error"
              title="No se pudo guardar"
              description={errorMessage}
            />
          )}
          {success && (
            <Message
              variant="success"
              title="Acceso actualizado"
              description="Los cambios se guardaron correctamente."
            />
          )}
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <UserCog className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="text-[13px] font-semibold text-foreground">
                  Rol y alcance
                </p>
                <p className="text-xs text-muted-foreground">
                  Define qué puede ver y hacer dentro de Loyalty System.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-muted/40 p-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
                  ROL
                </label>
                <Select
                  value={roleId}
                  onValueChange={(v) => {
                    setRoleId(v ?? "")
                    save.reset()
                  }}
                >
                  <SelectTrigger className="w-56 bg-background">
                    <SelectValue placeholder="Selecciona un rol">
                      {(v: string) =>
                        roles.find((r) => r.id === v)?.nombre ?? v
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {requiresStore && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
                    TIENDA
                  </label>
                  <Select
                    value={storeId}
                    onValueChange={(v) => {
                      setStoreId(v ?? "")
                      save.reset()
                    }}
                  >
                    <SelectTrigger className="w-56 bg-background">
                      <SelectValue placeholder="Selecciona una tienda">
                        {(v: string) =>
                          stores.find((s) => s.id === v)?.nombre ?? v
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                type="button"
                className="ml-auto"
                disabled={
                  !dirty || save.isPending || (requiresStore && !storeId)
                }
                onClick={() =>
                  save.execute({
                    profileId: user.id,
                    roleId,
                    storeId: requiresStore ? storeId || undefined : undefined,
                  })
                }
              >
                {save.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
