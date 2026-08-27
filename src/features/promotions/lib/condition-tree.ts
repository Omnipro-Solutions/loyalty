import type { ConditionField } from "@/types/domain"

import type {
  ConditionGroupValues,
  ConditionNodeValues,
  ConditionValues,
} from "../schemas"

/**
 * Un nodo es grupo si tiene `condiciones` (un array de hijos) — sin campo
 * discriminante nuevo, mismo criterio estructural que ya usa
 * `features/builder/inspector/condition-preview.ts` para su propio árbol
 * (`"rules" in node`) — no se importa de ahí (aislamiento entre features,
 * CLAUDE.md §2), solo se copia el criterio.
 */
export function isConditionGroup(
  node: ConditionNodeValues
): node is ConditionGroupValues {
  return "condiciones" in node
}

/** Recolecta todas las hojas del árbol sin importar la anidación — el adaptador que deja a `collision.ts`/`scope.ts` sin enterarse de que existen subgrupos. */
export function flattenConditionTree(
  node: ConditionNodeValues
): ConditionValues[] {
  if (!isConditionGroup(node)) return [node]
  return node.condiciones.flatMap(flattenConditionTree)
}

/**
 * Para el header "CONDICIONES · N en M niveles" — cálculo puro sobre la
 * forma del árbol, sin consultar datos reales. "Niveles" cuenta
 * anidación de GRUPOS únicamente (la raíz es nivel 1) — una hoja no suma
 * un nivel propio, vive al mismo nivel que el grupo que la contiene
 * directamente (mismo criterio que el Figma: "4 en 2 niveles" con un
 * root + un subgrupo, sin contar las hojas dentro de cada uno como
 * niveles aparte).
 */
export function countLeavesAndDepth(
  node: ConditionNodeValues,
  depth = 1
): { leaves: number; maxDepth: number } {
  if (!isConditionGroup(node)) return { leaves: 1, maxDepth: depth }
  if (node.condiciones.length === 0) return { leaves: 0, maxDepth: depth }
  return node.condiciones.reduce(
    (acc, child) => {
      const childDepth = isConditionGroup(child) ? depth + 1 : depth
      const r = countLeavesAndDepth(child, childDepth)
      return {
        leaves: acc.leaves + r.leaves,
        maxDepth: Math.max(acc.maxDepth, r.maxDepth),
      }
    },
    { leaves: 0, maxDepth: depth }
  )
}

/** Valor por defecto de una hoja nueva al elegir el campo — movido desde `condition-row.tsx` (ahora `condition-leaf-row.tsx`), vive aquí porque `withConditionAdded` también lo necesita. */
export function defaultConditionFor(field: ConditionField): ConditionValues {
  switch (field) {
    case "categoria":
      return { campo: field, valor: [] }
    case "producto":
      return { campo: field, valor: [] }
    case "tienda":
      return { campo: field, valor: "" }
    case "segmento":
      return { campo: field, valor: "" }
    case "monto_carrito":
      return { campo: field, valor: 0 }
    case "cupon_codigo":
      return { campo: field, valor: "" }
    case "socio_nivel":
      return { campo: field, valor: [] }
    case "socio_provincia":
      return { campo: field, valor: [] }
    case "socio_antiguedad":
      return { campo: field, valor: 0 }
    case "socio_edad":
      return { campo: field, valor: 0 }
    case "genero":
      return { campo: field, valor: [] }
    case "estado_civil":
      return { campo: field, valor: [] }
    case "tiene_hijos":
      return { campo: field, valor: true }
    case "tiene_mascotas":
      return { campo: field, valor: true }
    case "tienda_region":
      return { campo: field, valor: [] }
    case "tienda_formato":
      return { campo: field, valor: [] }
    case "tienda_grupo":
      return { campo: field, valor: [] }
    case "producto_marca":
      return { campo: field, valor: [] }
    case "producto_proveedor":
      return { campo: field, valor: [] }
    case "producto_receta":
      return { campo: field, valor: false }
  }
}

/** Reemplaza el hijo en `index` — usado por la UI recursiva para editar/anidar sin mutar el árbol original. */
export function withChildReplaced(
  group: ConditionGroupValues,
  index: number,
  next: ConditionNodeValues
): ConditionGroupValues {
  return {
    ...group,
    condiciones: group.condiciones.map((child, i) =>
      i === index ? next : child
    ),
  }
}

/** Quita el hijo en `index`. */
export function withChildRemoved(
  group: ConditionGroupValues,
  index: number
): ConditionGroupValues {
  return {
    ...group,
    condiciones: group.condiciones.filter((_, i) => i !== index),
  }
}

/** Agrega una condición nueva (campo "categoria" por defecto) al final del grupo. */
export function withConditionAdded(
  group: ConditionGroupValues
): ConditionGroupValues {
  return {
    ...group,
    condiciones: [...group.condiciones, defaultConditionFor("categoria")],
  }
}

/** Agrega un subgrupo vacío ("todas") al final del grupo — sin tope de profundidad, solo el `.max(8)` de hijos directos por nivel. */
export function withGroupAdded(
  group: ConditionGroupValues
): ConditionGroupValues {
  return {
    ...group,
    condiciones: [
      ...group.condiciones,
      { combinador: "todas", condiciones: [] },
    ],
  }
}
