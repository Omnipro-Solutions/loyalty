"use client"

import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Rama = { id: string; etiqueta: string; peso?: number }

/**
 * Pestaña "Ramas" para `ramificacion_valor`/`split_ab` — agregar/quitar/
 * nombrar ramas, cada una con un peso (%) que usa el motor de simulación
 * (`features/builder/engine/simulate.ts`) para repartir la cohorte.
 * `condicion_multiple` NO usa esta pestaña: su salida siempre es binaria
 * (cumple/no cumple) — ver `builder-node.tsx`.
 *
 * Diseño de tarjeta por rama según Figma "Inspector · Ramificar por nivel ·
 * Ramas" (1114:4590): cada rama ahí también muestra una condición
 * ("Nivel = Diamante") y a qué nodo del canvas conecta ("Cupón 15% + envío"
 * / "Sin conectar · Conectar"). Esta pestaña no reproduce esas dos filas
 * a propósito: la condición depende del `atributo_evaluado` elegido en
 * Configuración (relacionarla 1:1 con cada rama es un editor de reglas por
 * rama, alcance mayor) y el estado de conexión depende del grafo completo
 * de aristas, al que este panel aislado no tiene acceso hoy. Se deja
 * documentado como siguiente paso, no se simula con datos inventados.
 */
export function RamasTab({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  const ramasIniciales = Array.isArray(config.ramas)
    ? (config.ramas as Rama[])
    : [
        { id: "rama_1", etiqueta: "Rama 1", peso: 50 },
        { id: "por_defecto", etiqueta: "Por defecto", peso: 50 },
      ]
  const [ramas, setRamas] = useState<Rama[]>(ramasIniciales)

  function actualizar(next: Rama[]) {
    setRamas(next)
    onChange({ ...config, ramas: next })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-4 text-muted-foreground">
        Cada rama es un puerto de salida conectable en el canvas. El peso decide
        cómo se reparte la cohorte al Simular.
      </p>

      <div className="flex items-center justify-between">
        <p className="text-[10px] leading-[13px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Ramas de salida
        </p>
        <button
          type="button"
          onClick={() =>
            actualizar([
              ...ramas,
              {
                id: crypto.randomUUID(),
                etiqueta: `Rama ${String(ramas.length + 1)}`,
                peso: 0,
              },
            ])
          }
          className="flex items-center gap-1 text-[11px] font-medium text-primary"
        >
          <Plus className="size-3" />
          Agregar rama
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {ramas.map((rama, i) => (
          <div
            key={rama.id}
            className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                value={rama.etiqueta}
                onChange={(e) => {
                  const next = [...ramas]
                  next[i] = { ...rama, etiqueta: e.target.value }
                  actualizar(next)
                }}
                className="h-8 flex-1 bg-background text-[13px]"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={rama.peso ?? ""}
                  onChange={(e) => {
                    const next = [...ramas]
                    next[i] = {
                      ...rama,
                      peso: e.target.value ? Number(e.target.value) : undefined,
                    }
                    actualizar(next)
                  }}
                  className="h-8 w-14 bg-background text-right text-[13px]"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Quitar rama"
                disabled={ramas.length <= 1}
                onClick={() => actualizar(ramas.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
