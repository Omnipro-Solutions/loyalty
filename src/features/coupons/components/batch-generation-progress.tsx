"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Message } from "@/components/form/message"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

import { generateNextChunkAction } from "../actions/batches"

type BatchGenerationProgressProps = {
  batchId: string
  initialGenerated: number
  initialTotal: number
}

/**
 * Sin worker ni cola en este proyecto: la generación de un batch grande
 * depende de que esta pestaña siga llamando al RPC un chunk a la vez. Si se
 * cierra a medias, reabrir esta página retoma exactamente donde quedó
 * (`generated_count` en servidor, no en el estado de React) — por eso
 * arranca sola al montar, sin esperar un clic.
 */
export function BatchGenerationProgress({
  batchId,
  initialGenerated,
  initialTotal,
}: BatchGenerationProgressProps) {
  const router = useRouter()
  const [generated, setGenerated] = useState(initialGenerated)
  const [total, setTotal] = useState(initialTotal)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string>()
  const startedRef = useRef(false)

  const generateChunk = useAction(generateNextChunkAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setError(data?.message ?? "No se pudo generar el siguiente lote.")
        setRunning(false)
        return
      }
      setGenerated(data.generated)
      setTotal(data.total)
      if (data.done) {
        setRunning(false)
        router.refresh()
        return
      }
      generateChunk.execute({ batchId })
    },
    onError: () => {
      setError("No se pudo generar el siguiente lote de códigos.")
      setRunning(false)
    },
  })

  function start() {
    setError(undefined)
    setRunning(true)
    generateChunk.execute({ batchId })
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pct =
    total > 0 ? Math.min(100, Math.round((generated / total) * 100)) : 0

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-background p-5 shadow-form-section">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          {running ? "Generando códigos…" : "Generación pausada"}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatNumber(generated)} / {formatNumber(total)} · {pct}%
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Este proyecto no tiene un worker en segundo plano — la generación avanza
        mientras esta pestaña esté abierta. Si se cierra, vuelve a abrir esta
        página para retomarla.
      </p>
      {error && (
        <Message
          variant="error"
          title="Se interrumpió la generación"
          description={error}
        />
      )}
      {!running && (
        <Button type="button" onClick={start} className="self-start">
          Reanudar generación
        </Button>
      )}
    </div>
  )
}
