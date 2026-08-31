/**
 * Helpers puros para parsear `searchParams` de una página — reemplazan 7
 * copias casi idénticas (`firstValue`/`primerValor` en cada `page.tsx` de
 * listado) y arreglan dos clases de bug presentes en todas ellas:
 * `?pageSize=abc` llegando como `NaN` sin clamp, y un valor de URL inventado
 * (`?campo=xxx`, `?estado=xxx`) llegando sin validar a un `.eq()`.
 */

export function firstValue(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function allValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/** Descarta un valor de URL que no está entre los permitidos — mismo
 *  criterio que ya aplicaba a mano `promociones/page.tsx` vía `.find()`. */
export function enumValue<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T | undefined {
  const raw = firstValue(value)
  return allowed.find((option) => option === raw)
}

/** `?page=` inválido o negativo se trata como página 1, nunca `NaN`. */
export function parsePage(value: string | string[] | undefined): number {
  const parsed = Number(firstValue(value))
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1
}

/** Clamp 1..100 — protege tanto de `NaN` como de un `pageSize` absurdo en la URL. */
export function parsePageSize(
  value: string | string[] | undefined,
  fallback: number
): number {
  const parsed = Number(firstValue(value))
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(Math.floor(parsed), 100)
}
