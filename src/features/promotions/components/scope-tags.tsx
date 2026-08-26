"use client"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatNumber, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import { CONDITION_FIELD_LABEL, CONDITION_FIELD_OPERATOR } from "../lib/labels"
import type { Condition, ConditionNode } from "../lib/queries"
import { CONDITION_DOMAIN_COLOR, type ScopeTag } from "../lib/scope"

/** Cuántas etiquetas caben en la columna antes de resumir en "+N". */
const VISIBLE_TAGS = 2

export type ScopeNames = {
  categoryNameById: Map<string, string>
  segmentNameById: Map<string, string>
}

/**
 * Valor de una condición en el árbol del hover. Solo se resuelven a nombre
 * los ids que el listado ya carga (categorías y segmentos); el resto se
 * muestra tal cual en vez de inventar un nombre — es la misma decisión que
 * ya toma `scopeSummary`.
 */
function conditionValue(condition: Condition, names: ScopeNames): string {
  switch (condition.campo) {
    case "categoria":
      return (
        condition.valor
          .map((id) => names.categoryNameById.get(id) ?? id)
          .join(", ") || "—"
      )
    case "segmento":
      return names.segmentNameById.get(condition.valor) ?? condition.valor
    case "monto_carrito":
      return formatUSD(condition.valor)
    case "socio_antiguedad":
      return `${formatNumber(condition.valor)} meses o más`
    case "socio_edad":
      return `${formatNumber(condition.valor)} años o más`
    default:
      return Array.isArray(condition.valor)
        ? condition.valor.join(", ") || "—"
        : String(condition.valor)
  }
}

/** Árbol del popover: sangría por profundidad y la etiqueta Y/O del grupo, igual que el Resumen. */
function ConditionTree({
  node,
  names,
  depth = 0,
}: {
  node: ConditionNode
  names: ScopeNames
  depth?: number
}) {
  if (!("condiciones" in node)) {
    return (
      <p
        className="text-[11px] leading-4 text-secondary-foreground"
        style={{ paddingLeft: depth * 10 }}
      >
        {CONDITION_FIELD_LABEL[node.campo]}{" "}
        <span className="text-muted-foreground">
          {CONDITION_FIELD_OPERATOR[node.campo]}
        </span>{" "}
        <span className="font-medium text-foreground">
          {conditionValue(node, names)}
        </span>
      </p>
    )
  }

  if (node.condiciones.length === 0) return null

  return (
    <div className="flex flex-col gap-0.5" style={{ paddingLeft: depth * 10 }}>
      {node.condiciones.length > 1 && (
        <p className="text-[10px] leading-[14px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          Cumple {node.combinador === "todas" ? "todas" : "alguna"}
        </p>
      )}
      {node.condiciones.map((child, index) => (
        <ConditionTree
          key={index}
          node={child}
          names={names}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

function Tag({ tag }: { tag: ScopeTag }) {
  const color = CONDITION_DOMAIN_COLOR[tag.domain]
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-1.5 py-[2px] text-[10px] leading-[14px] font-medium whitespace-nowrap",
        color.bg,
        color.fg
      )}
    >
      {tag.label}
    </span>
  )
}

type ScopeTagsProps = {
  tags: ScopeTag[]
  conditions: ConditionNode
  names: ScopeNames
  /** Texto de respaldo cuando la promoción no tiene condiciones ("Todos", "E-commerce"…). */
  fallback: string
}

/**
 * Columna ALCANCE de 06.1: qué condiciones acotan la promoción, como
 * etiquetas de color por ámbito. Solo caben `VISIBLE_TAGS`, así que el
 * resto se resume en "+N" y el detalle completo — con valores y la
 * estructura Y/O — se ve al pasar el cursor.
 *
 * El popover se abre en hover (`openOnHover` de Base UI) pero es un
 * `Popover` y no un tooltip: el contenido es un árbol con jerarquía, no una
 * línea de texto, y así también se abre con teclado al enfocar el botón.
 */
export function ScopeTags({
  tags,
  conditions,
  names,
  fallback,
}: ScopeTagsProps) {
  if (tags.length === 0) {
    return (
      <span className="truncate text-secondary-foreground">{fallback}</span>
    )
  }

  const visible = tags.slice(0, VISIBLE_TAGS)
  const hidden = tags.length - visible.length

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={120}
        render={<button type="button" />}
        // La fila entera navega al detalle al hacer clic (`onRowClick`): sin
        // esto, tocar las etiquetas abriría el popover y navegaría a la vez.
        onClick={(event) => event.stopPropagation()}
        className="flex min-w-0 flex-wrap items-center gap-1 text-left"
      >
        {visible.map((tag) => (
          <Tag key={tag.campo} tag={tag} />
        ))}
        {hidden > 0 && (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-[2px] text-[10px] leading-[14px] font-medium text-muted-foreground">
            +{hidden}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <Tag key={tag.campo} tag={tag} />
            ))}
          </div>
          <div className="h-px w-full bg-border" />
          <ConditionTree node={conditions} names={names} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
