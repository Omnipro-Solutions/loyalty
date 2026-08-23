"use client"

import { useAction } from "next-safe-action/hooks"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

import { simularPromocionAction } from "../actions/promociones"
import type { Colision } from "../lib/colision"
import type { Condicion, SegmentoCondicion } from "../lib/queries"

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="flex-1 text-secondary-foreground">{etiqueta}</span>
      <span className="shrink-0 font-medium whitespace-nowrap text-foreground">
        {valor}
      </span>
    </div>
  )
}

type ResumenPromocionCardProps = {
  idExcluir?: string
  condiciones: Condicion[]
  segmentos: SegmentoCondicion[]
  canalAplicacion: string
  prioridad: number
  onGuardar: (estado: "activa" | "borrador") => void
  guardando: boolean
}

/** Figma "Resumen de la regla" + colisión + acciones (633:928) — panel lateral de 07.1. */
export function ResumenPromocionCard({
  idExcluir,
  condiciones,
  segmentos,
  canalAplicacion,
  prioridad,
  onGuardar,
  guardando,
}: ResumenPromocionCardProps) {
  const segmentoCondicion = condiciones.find((c) => c.campo === "segmento")
  const segmento = segmentoCondicion
    ? segmentos.find((s) => s.id === segmentoCondicion.valor)
    : undefined
  const [resultado, setResultado] = useState<{
    tiendasImpactadas: number
    colisiones: Colision[]
  } | null>(null)

  const simular = useAction(simularPromocionAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setResultado({
          tiendasImpactadas: data.tiendasImpactadas,
          colisiones: data.colisiones,
        })
      }
    },
  })

  function ejecutarSimulacion() {
    simular.execute({
      idExcluir,
      condiciones,
      canalAplicacion: canalAplicacion as "pos" | "ecommerce" | "pos_ecommerce",
      prioridad,
    })
  }

  // Primera estimación automática al montar, con las condiciones por defecto.
  useEffect(() => {
    ejecutarSimulacion()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo la corrida inicial; después el usuario dispara "Simular con datos reales".
  }, [])

  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex flex-col gap-3 rounded-[20px] bg-background px-[18px] py-4 shadow-form-section">
        <p className="text-sm font-semibold text-foreground">
          Resumen de la promoción
        </p>
        <Fila
          etiqueta="Clientes alcanzados"
          valor={
            segmento
              ? segmento.conteoEstimado !== null
                ? `~${formatNumber(segmento.conteoEstimado)}`
                : segmento.nombre
              : "—"
          }
        />
        <Fila
          etiqueta="Tiendas impactadas"
          valor={resultado ? formatNumber(resultado.tiendasImpactadas) : "…"}
        />
        <Fila etiqueta="Impacto estimado" valor="Próximamente" />
        <Fila
          etiqueta="Colisiones"
          valor={
            !resultado
              ? "…"
              : resultado.colisiones.length === 0
                ? "Ninguna"
                : `${resultado.colisiones.length} detectada${resultado.colisiones.length > 1 ? "s" : ""}`
          }
        />
      </div>

      {resultado && resultado.colisiones.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-[20px] bg-warning-bg px-4 py-3.5 shadow-form-section">
          <p className="text-[13px] font-semibold text-warning">
            Colisión detectada
          </p>
          {resultado.colisiones.map((colision) => (
            <p
              key={colision.promocionId}
              className="text-xs leading-[18px] text-secondary-foreground"
            >
              &quot;{colision.nombre}&quot; {colision.motivo}.{" "}
              {prioridad >= colision.prioridad
                ? "Esta promoción se ejecuta primero."
                : `Prioridad ${colision.prioridad} — "${colision.nombre}" se ejecuta primero.`}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={() => onGuardar("activa")}
          disabled={guardando}
        >
          Guardar y activar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={ejecutarSimulacion}
          disabled={simular.isPending}
        >
          {simular.isPending ? "Simulando…" : "Simular con datos reales"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onGuardar("borrador")}
          disabled={guardando}
        >
          Guardar como borrador
        </Button>
      </div>
    </div>
  )
}
