"use client"

import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState, type ReactElement, type ReactNode } from "react"

import { Message } from "@/components/form/message"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatNumber } from "@/lib/format"

import {
  createStoreGroupAction,
  deleteStoreGroupAction,
  updateStoreGroupAction,
} from "../actions/store-groups"
import type { StoreGroupOption } from "../lib/queries"

type StoreGroupsDialogProps = {
  groups: StoreGroupOption[]
  /** Elemento "plantilla" para `DialogTrigger` (ej. `<Button variant="outline" />`) — mismo patrón que `NewRoleDialog`. */
  renderTrigger: ReactElement
  /** Contenido del trigger (ícono + texto). */
  children: ReactNode
  /** Al crear un grupo desde `StoreForm`, para seleccionarlo sin cerrar ese formulario. */
  onCreated?: (group: { id: string; name: string }) => void
}

/**
 * Gestión de grupos de tienda (crear/renombrar/eliminar) — sin nodo de
 * Figma, feature nueva (ver plan). Se reusa tal cual desde `/tiendas`
 * (gestión completa) y desde `StoreForm` (alta rápida junto al selector de
 * grupo), igual que `NewRoleDialog` de `features/team` para roles.
 */
export function StoreGroupsDialog({
  groups,
  renderTrigger,
  children,
  onCreated,
}: StoreGroupsDialogProps) {
  const router = useRouter()
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string>()

  const create = useAction(createStoreGroupAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setError(data?.message ?? "No se pudo crear el grupo.")
        return
      }
      setNewName("")
      setError(undefined)
      onCreated?.({ id: data.id, name: data.name })
      router.refresh()
    },
    onError: () => setError("No se pudo crear el grupo."),
  })

  const update = useAction(updateStoreGroupAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setError(data?.message ?? "No se pudo guardar el grupo.")
        return
      }
      setEditingId(null)
      setError(undefined)
      router.refresh()
    },
    onError: () => setError("No se pudo guardar el grupo."),
  })

  const del = useAction(deleteStoreGroupAction, {
    onSuccess: ({ data }) => {
      setConfirmDeleteId(null)
      if (!data?.ok) {
        setError(data?.message ?? "No se pudo eliminar el grupo.")
        return
      }
      setError(undefined)
      router.refresh()
    },
    onError: () => setError("No se pudo eliminar el grupo."),
  })

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          setError(undefined)
          setEditingId(null)
          setConfirmDeleteId(null)
        }
      }}
    >
      <DialogTrigger render={renderTrigger}>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Grupos de tienda</DialogTitle>
          <DialogDescription>
            Agrupa tiendas para reportes, campañas y como condición en
            promociones y journeys.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Message
            variant="error"
            title="No se pudo completar la acción"
            description={error}
          />
        )}

        <div className="flex max-h-72 scrollbar-thin flex-col gap-2 overflow-y-auto">
          {groups.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Todavía no hay grupos.
            </p>
          )}
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              {editingId === group.id ? (
                <>
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-8 flex-1"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={update.isPending}
                    onClick={() => {
                      if (!editingName.trim()) return
                      update.execute({
                        id: group.id,
                        name: editingName.trim(),
                      })
                    }}
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </>
              ) : confirmDeleteId === group.id ? (
                <>
                  <p className="flex-1 truncate text-xs text-muted-foreground">
                    ¿Eliminar &quot;{group.name}&quot;?
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={del.isPending}
                    onClick={() => del.execute({ id: group.id })}
                  >
                    Eliminar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {group.name}
                    </p>
                    {group.description && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="neutral">
                    {formatNumber(group.storeCount)} tiendas
                  </Badge>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Renombrar grupo"
                    onClick={() => {
                      setEditingId(group.id)
                      setEditingName(group.name)
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Eliminar grupo"
                    onClick={() => setConfirmDeleteId(group.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <form
          className="flex items-center gap-2 border-t border-border pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newName.trim()) return
            create.execute({ name: newName.trim() })
          }}
        >
          <Input
            placeholder="Nombre del grupo nuevo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9 flex-1"
          />
          <Button type="submit" size="sm" disabled={create.isPending}>
            <Plus className="size-3.5" />
            Agregar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
