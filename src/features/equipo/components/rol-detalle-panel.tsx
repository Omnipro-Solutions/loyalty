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
  ACCIONES,
  RECURSOS,
  accionAplica,
  type Accion,
  type Recurso,
} from "@/lib/permissions"
import { cn } from "@/lib/utils"
import {
  ALCANCE_CANALES,
  ALCANCE_TIENDAS,
  type AlcanceCanal,
  type AlcanceTiendas,
} from "@/types/domain"

import { actualizarRolAction, duplicarRolAction } from "../actions/roles"
import { paletaAvatar } from "../lib/avatar-palette"
import { RECURSO_INFO } from "../lib/labels"
import type { RoleDetalle } from "../lib/queries"

const ALCANCE_TIENDAS_LABEL: Record<string, string> = {
  todas: "Todas las tiendas",
  propia: "Solo su tienda",
}

const ALCANCE_CANAL_LABEL: Record<string, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  pos_ecommerce: "POS + E-commerce",
}

function permisosInicialesFrom(
  permisos: RoleDetalle["permisos"]
): Record<string, boolean> {
  const mapa: Record<string, boolean> = {}
  for (const recurso of RECURSOS) {
    for (const accion of ACCIONES) {
      if (!accionAplica(recurso, accion)) continue
      mapa[`${recurso}:${accion}`] =
        permisos[recurso]?.includes(accion) ?? false
    }
  }
  return mapa
}

type RolDetallePanelProps = {
  roleDetalle: RoleDetalle
  puedeGestionar: boolean
}

/** Figma "Detalle rol" (718:2930) + "Matriz de permisos" (719:2865), 09.2. */
export function RolDetallePanel({
  roleDetalle,
  puedeGestionar,
}: RolDetallePanelProps) {
  const router = useRouter()
  const [permisos, setPermisos] = useState(() =>
    permisosInicialesFrom(roleDetalle.permisos)
  )
  const [alcanceTiendas, setAlcanceTiendas] = useState(
    roleDetalle.alcance_tiendas as AlcanceTiendas
  )
  const [alcanceCanal, setAlcanceCanal] = useState(
    roleDetalle.alcance_canal as AlcanceCanal
  )
  const [descuentoMaximoPct, setDescuentoMaximoPct] = useState(
    roleDetalle.descuento_maximo_pct?.toString() ?? ""
  )
  const [resultado, setResultado] = useState<{
    ok: boolean
    message?: string
  }>()

  const soloLectura = !puedeGestionar

  function set(recurso: Recurso, accion: Accion, valor: boolean) {
    if (soloLectura || !accionAplica(recurso, accion)) return
    setPermisos((prev) => ({ ...prev, [`${recurso}:${accion}`]: valor }))
  }

  function aplicarMasivo(criterio: (accion: Accion) => boolean) {
    if (soloLectura) return
    const siguiente: Record<string, boolean> = {}
    for (const recurso of RECURSOS) {
      for (const accion of ACCIONES) {
        if (!accionAplica(recurso, accion)) continue
        siguiente[`${recurso}:${accion}`] = criterio(accion)
      }
    }
    setPermisos(siguiente)
  }

  const guardar = useAction(actualizarRolAction, {
    onSuccess: ({ data }) => {
      setResultado(
        data?.ok ? { ok: true } : { ok: false, message: data?.message }
      )
    },
    onError: () =>
      setResultado({ ok: false, message: "No se pudo guardar el rol." }),
  })

  const duplicar = useAction(duplicarRolAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) router.push(`/ajustes/equipo?tab=roles&rol=${data.id}`)
    },
  })

  function guardarCambios() {
    const permisosGranted = Object.entries(permisos)
      .filter(([, valor]) => valor)
      .map(([clave]) => {
        const [recurso, accion] = clave.split(":") as [Recurso, Accion]
        return { recurso, accion }
      })

    guardar.execute({
      roleId: roleDetalle.id,
      nombre: roleDetalle.nombre,
      descripcion: roleDetalle.descripcion ?? undefined,
      alcanceTiendas,
      alcanceCanal,
      descuentoMaximoPct: descuentoMaximoPct
        ? Number(descuentoMaximoPct)
        : undefined,
      permisos: permisosGranted,
    })
  }

  const miembrosVisibles = roleDetalle.miembrosPreview.slice(0, 3)
  const restantes = roleDetalle.miembrosTotal - miembrosVisibles.length

  return (
    <div className="flex h-full flex-1 flex-col gap-3.5">
      <div className="flex items-center gap-3 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-avatar-indigo-bg">
          <ShieldCheck className="size-5 text-avatar-indigo-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {roleDetalle.nombre}
          </p>
          {roleDetalle.descripcion && (
            <p className="text-[11px] leading-4 text-muted-foreground">
              {roleDetalle.descripcion}
            </p>
          )}
        </div>
        {miembrosVisibles.length > 0 && (
          <div className="flex shrink-0 items-center">
            {miembrosVisibles.map((m) => {
              const paleta = paletaAvatar(m.id)
              return (
                <AvatarInitials
                  key={m.id}
                  nombre={m.nombre}
                  size={30}
                  bgClassName={paleta.bg}
                  fgClassName={paleta.fg}
                  className="-mr-2 border-2 border-background"
                />
              )
            })}
            {restantes > 0 && (
              <div className="-mr-2 flex size-[30px] items-center justify-center rounded-full border-2 border-background bg-muted">
                <span className="text-[10px] font-semibold text-secondary-foreground">
                  +{restantes}
                </span>
              </div>
            )}
          </div>
        )}
        {puedeGestionar && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={duplicar.isPending}
              onClick={() =>
                duplicar.execute({
                  roleId: roleDetalle.id,
                  nombre: `${roleDetalle.nombre} (copia)`,
                })
              }
            >
              Duplicar
            </Button>
            <Button
              type="button"
              disabled={guardar.isPending}
              onClick={guardarCambios}
            >
              Guardar cambios
            </Button>
          </>
        )}
      </div>

      {resultado?.ok === false && (
        <Message
          tipo="error"
          titulo="No se pudo guardar el rol"
          descripcion={resultado.message ?? "Intenta de nuevo."}
        />
      )}
      {resultado?.ok === true && (
        <Message
          tipo="exito"
          titulo="Rol actualizado"
          descripcion="Los cambios se guardaron correctamente."
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
          {puedeGestionar && (
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => aplicarMasivo(() => true)}
                className="rounded-full bg-muted px-[11px] py-1.5 text-[11px] font-medium text-secondary-foreground"
              >
                Todo
              </button>
              <button
                type="button"
                onClick={() => aplicarMasivo(() => false)}
                className="rounded-full bg-muted px-[11px] py-1.5 text-[11px] font-medium text-secondary-foreground"
              >
                Nada
              </button>
              <button
                type="button"
                onClick={() => aplicarMasivo((accion) => accion === "ver")}
                className="rounded-full bg-muted px-[11px] py-1.5 text-[11px] font-medium text-secondary-foreground"
              >
                Solo lectura
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 bg-muted px-5 py-2.5">
          <span className="flex-1 text-[10px] font-semibold tracking-[0.4px] text-muted-foreground">
            MÓDULO
          </span>
          {ACCIONES.map((accion) => (
            <span
              key={accion}
              className="w-24 shrink-0 text-center text-[10px] font-semibold tracking-[0.4px] text-muted-foreground"
            >
              {accion.toUpperCase()}
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {RECURSOS.map((recurso) => (
            <div
              key={recurso}
              className="flex items-center gap-2.5 border-t border-muted px-5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground">
                  {RECURSO_INFO[recurso].etiqueta}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {RECURSO_INFO[recurso].descripcion}
                </p>
              </div>
              {ACCIONES.map((accion) => {
                const aplica = accionAplica(recurso, accion)
                return (
                  <div
                    key={accion}
                    className="flex w-24 shrink-0 justify-center"
                  >
                    {aplica ? (
                      <Checkbox
                        checked={permisos[`${recurso}:${accion}`] ?? false}
                        disabled={soloLectura}
                        onCheckedChange={(checked) =>
                          set(recurso, accion, checked === true)
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
            value={alcanceTiendas}
            onValueChange={(v) => setAlcanceTiendas(v as typeof alcanceTiendas)}
          >
            <SelectTrigger
              disabled={soloLectura}
              className={cn(
                "w-auto shrink-0 gap-1.5 rounded-[10px] py-2 pr-2.5 pl-3 text-[11px] font-medium",
                alcanceTiendas === "propia"
                  ? "border-primary bg-accent text-primary-800"
                  : "text-secondary-foreground"
              )}
            >
              <SelectValue>
                {() => `Tiendas: ${ALCANCE_TIENDAS_LABEL[alcanceTiendas]}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ALCANCE_TIENDAS.map((a) => (
                <SelectItem key={a} value={a}>
                  {ALCANCE_TIENDAS_LABEL[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={alcanceCanal}
            onValueChange={(v) => setAlcanceCanal(v as typeof alcanceCanal)}
          >
            <SelectTrigger
              disabled={soloLectura}
              className="w-auto shrink-0 gap-1.5 rounded-[10px] py-2 pr-2.5 pl-3 text-[11px] font-medium text-secondary-foreground"
            >
              <SelectValue>
                {() => `Canal: ${ALCANCE_CANAL_LABEL[alcanceCanal]}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ALCANCE_CANALES.map((c) => (
                <SelectItem key={c} value={c}>
                  {ALCANCE_CANAL_LABEL[c]}
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
              disabled={soloLectura}
              value={descuentoMaximoPct}
              onChange={(e) => setDescuentoMaximoPct(e.target.value)}
              className="h-auto w-12 border-0 p-0 text-[11px] leading-4 focus-visible:border-0"
            />
            <span>%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
