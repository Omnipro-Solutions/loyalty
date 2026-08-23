"use client"

import { X } from "lucide-react"

import { CurrencyInput } from "@/components/form/currency-input"
import { FilterSelect } from "@/components/filters/select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatNumero } from "@/lib/format"
import { CAMPOS_CONDICION, CAMPOS_CONDICION_HABILITADOS } from "@/types/domain"
import type { CampoCondicion } from "@/types/domain"

import { CAMPO_CONDICION_LABEL, CAMPO_CONDICION_OPERADOR } from "../lib/labels"
import type {
  CategoriaCondicion,
  CiudadCondicion,
  SegmentoCondicion,
} from "../lib/queries"
import type { CondicionValues } from "../schemas"

function valorPorDefecto(campo: CampoCondicion): CondicionValues {
  switch (campo) {
    case "categoria":
      return { campo, valor: [] }
    case "tienda":
      return { campo, valor: "" }
    case "segmento":
      return { campo, valor: "" }
    case "monto_carrito":
      return { campo, valor: 0 }
  }
}

type CondicionRowProps = {
  numero: number
  condicion: CondicionValues
  categorias: CategoriaCondicion[]
  ciudades: CiudadCondicion[]
  segmentos: SegmentoCondicion[]
  onChange: (siguiente: CondicionValues) => void
  onRemove: () => void
}

/** Figma "Condición" (633:860): número + campo + operador (fijo por campo) + valor + eliminar. */
export function CondicionRow({
  numero,
  condicion,
  categorias,
  ciudades,
  segmentos,
  onChange,
  onRemove,
}: CondicionRowProps) {
  const habilitado = CAMPOS_CONDICION_HABILITADOS.includes(condicion.campo)

  return (
    <div className="flex w-full items-center gap-2.5 rounded-[10px] border border-border bg-neutral-50 px-3 py-2.5">
      <div className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted">
        <span className="text-[11px] font-semibold text-secondary-foreground">
          {numero}
        </span>
      </div>

      <Select
        value={condicion.campo}
        onValueChange={(v) => onChange(valorPorDefecto(v as CampoCondicion))}
      >
        <SelectTrigger className="flex-1">
          <SelectValue>
            {(v: CampoCondicion) => CAMPO_CONDICION_LABEL[v]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CAMPOS_CONDICION.map((campo) => (
            <SelectItem
              key={campo}
              value={campo}
              disabled={!CAMPOS_CONDICION_HABILITADOS.includes(campo)}
            >
              {CAMPO_CONDICION_LABEL[campo]}
              {!CAMPOS_CONDICION_HABILITADOS.includes(campo) &&
                " · Próximamente"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="w-32 shrink-0 truncate text-center text-xs text-muted-foreground">
        {CAMPO_CONDICION_OPERADOR[condicion.campo]}
      </span>

      <div className="min-w-0 flex-1">
        {condicion.campo === "categoria" && (
          <FilterSelect
            label="Categorías"
            multiple
            className="w-full justify-between"
            options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
            value={condicion.valor}
            onChange={(valor) => onChange({ campo: "categoria", valor })}
          />
        )}
        {condicion.campo === "tienda" && (
          <Select
            value={condicion.valor}
            onValueChange={(v) =>
              onChange({ campo: "tienda", valor: v as string })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Elige una ciudad" />
            </SelectTrigger>
            <SelectContent>
              {ciudades.map((c) => (
                <SelectItem key={c.ciudad} value={c.ciudad}>
                  {c.ciudad} ({c.totalTiendas})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {condicion.campo === "segmento" && (
          <Select
            value={condicion.valor}
            onValueChange={(v) =>
              onChange({ campo: "segmento", valor: v as string })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Elige una audiencia" />
            </SelectTrigger>
            <SelectContent>
              {segmentos.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                  {s.conteoEstimado !== null &&
                    ` (${formatNumero(s.conteoEstimado)})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {condicion.campo === "monto_carrito" && (
          <CurrencyInput
            value={condicion.valor}
            onChange={(e) =>
              onChange({
                campo: "monto_carrito",
                valor: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
        )}
        {!habilitado && (
          <p className="truncate text-xs text-muted-foreground italic">
            Disponible cuando exista el módulo de Clientes/Pedidos.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar condición"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
