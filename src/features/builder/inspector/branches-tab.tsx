"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Branch = { id: string; label: string; weight?: number }

/** Ramas de arranque de un bloque recién soltado — se muestran hasta que el usuario toque algo; nunca se mutan en sitio (cada `update` construye un array nuevo). */
const DEFAULT_BRANCHES: Branch[] = [
  { id: "rama_1", label: "Rama 1", weight: 50 },
  { id: "por_defecto", label: "Por defecto", weight: 50 },
]

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
export function BranchesTab({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  // Derivado de props, sin copia local — misma razón que en
  // `accumulate-points-form.tsx`: con `useState` las ramas del nodo que
  // estaba seleccionado al montar sobreviven al cambio de selección y se
  // escriben sobre el nodo siguiente.
  const branches: Branch[] = Array.isArray(config.branches)
    ? (config.branches as Branch[])
    : DEFAULT_BRANCHES

  function update(next: Branch[]) {
    onChange({ ...config, branches: next })
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
            update([
              ...branches,
              {
                id: crypto.randomUUID(),
                label: `Rama ${String(branches.length + 1)}`,
                weight: 0,
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
        {branches.map((branch, i) => (
          <div
            key={branch.id}
            className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                value={branch.label}
                onChange={(e) => {
                  const next = [...branches]
                  next[i] = { ...branch, label: e.target.value }
                  update(next)
                }}
                className="h-8 flex-1 bg-background text-[13px]"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={branch.weight ?? ""}
                  onChange={(e) => {
                    const next = [...branches]
                    next[i] = {
                      ...branch,
                      weight: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }
                    update(next)
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
                disabled={branches.length <= 1}
                onClick={() => update(branches.filter((_, idx) => idx !== i))}
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
