"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Message } from "@/components/form/message"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatNumber } from "@/lib/format"

import { deletePromotionsAction } from "../actions/promotions"
import { DELETE_PROMOTIONS_BATCH_SIZE } from "../schemas"

type PromotionDeleteDialogProps = {
  /** Borradores a eliminar — uno desde el menú de la fila, varios desde la barra de selección. */
  ids: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

type Progress = { done: number; total: number }

/**
 * Borrado de borradores en lotes de `DELETE_PROMOTIONS_BATCH_SIZE`, con
 * barra de avance.
 *
 * Se trocea por dos razones, no solo estética: un `delete` de 500 ids en una
 * sola petición es una transacción larga que o pasa entera o no pasa nada, y
 * mientras tanto la pantalla no puede decir cuánto lleva. Por lotes, lo ya
 * borrado queda borrado aunque uno falle, y el avance es real — no una
 * animación.
 */
export function PromotionDeleteDialog({
  ids,
  open,
  onOpenChange,
  onDeleted,
}: PromotionDeleteDialogProps) {
  const router = useRouter()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string>()
  const [skipped, setSkipped] = useState<{ name: string; reason: string }[]>([])
  const [deleted, setDeleted] = useState(0)

  const remove = useAction(deletePromotionsAction)

  function close() {
    onOpenChange(false)
    setProgress(null)
    setError(undefined)
    setSkipped([])
    setDeleted(0)
  }

  async function confirm() {
    setError(undefined)
    setSkipped([])

    const batches: string[][] = []
    for (let i = 0; i < ids.length; i += DELETE_PROMOTIONS_BATCH_SIZE) {
      batches.push(ids.slice(i, i + DELETE_PROMOTIONS_BATCH_SIZE))
    }

    let totalDeleted = 0
    const allSkipped: { name: string; reason: string }[] = []
    setProgress({ done: 0, total: ids.length })

    // Secuencial y no en paralelo: el avance tiene que ser el real, y
    // lanzar 50 peticiones a la vez tampoco ayudaría a la base de datos.
    for (const [index, batch] of batches.entries()) {
      const result = await remove.executeAsync({ ids: batch })
      const data = result?.data

      if (!data?.ok) {
        setError(
          data?.message ??
            "Se interrumpió el borrado — vuelve a intentarlo con las que queden."
        )
        break
      }
      totalDeleted += data.deleted
      allSkipped.push(...data.skipped)
      setProgress({
        done: Math.min((index + 1) * DELETE_PROMOTIONS_BATCH_SIZE, ids.length),
        total: ids.length,
      })
    }

    setDeleted(totalDeleted)
    setSkipped(allSkipped)
    router.refresh()

    // Solo se cierra si salió todo limpio: si algo se omitió o falló, el
    // diálogo es el único sitio donde se puede leer qué pasó.
    if (allSkipped.length === 0 && totalDeleted === ids.length) {
      onDeleted()
      onOpenChange(false)
    }
  }

  const count = ids.length
  const running = progress !== null && remove.isPending
  const percent = progress
    ? Math.round((progress.done / Math.max(progress.total, 1)) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {count === 1
              ? "Eliminar el borrador"
              : `Eliminar ${count} borradores`}
          </DialogTitle>
          <DialogDescription>
            {count === 1
              ? "¿Seguro que quieres eliminarlo?"
              : `¿Seguro que quieres eliminar ${count} borradores?`}{" "}
            <strong>Esta acción no se puede deshacer.</strong> Solo se eliminan
            promociones en Borrador: nunca han estado activas, así que no hay
            canjes ni historial que conservar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {progress && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Eliminando en lotes de {DELETE_PROMOTIONS_BATCH_SIZE}…
                </span>
                <span className="tabular-nums">
                  {formatNumber(progress.done)} / {formatNumber(progress.total)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {skipped.length > 0 && (
            <Message
              variant="warning"
              title={`${formatNumber(deleted)} eliminadas · ${formatNumber(skipped.length)} omitidas`}
              description={skipped
                .map((s) => `${s.name} — ${s.reason}`)
                .join(" · ")}
            />
          )}

          {error && (
            <Message
              variant="error"
              title="No se pudo completar el borrado"
              description={error}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={running}
          >
            {skipped.length > 0 || error ? "Cerrar" : "Cancelar"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={running}
          >
            {running
              ? "Eliminando…"
              : count === 1
                ? "Eliminar borrador"
                : `Eliminar ${count}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
