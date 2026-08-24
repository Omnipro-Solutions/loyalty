/**
 * Espejo TS de `render_coupon_code()` en
 * supabase/migrations/20260824110000_cupones_esquema.sql — solo para la
 * previsualización del asistente ("Ejemplo: CUP-K7QW-0472"); la fuente de
 * verdad de los códigos reales es siempre la función de Postgres.
 */

/** Sin I/L/O/0/1: se leen mal por teléfono o en un papel impreso. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

/** 'N' = dígito de secuencia (relleno a la longitud de la corrida), 'A' = carácter aleatorio del alfabeto, cualquier otro carácter es literal. */
export function renderCodePattern(
  pattern: string,
  sequence: number,
  prefix?: string | null
): string {
  let result = ""
  let i = 0
  while (i < pattern.length) {
    const char = pattern[i]
    let runLength = 0
    while (i < pattern.length && pattern[i] === char) {
      runLength += 1
      i += 1
    }

    if (char === "N") {
      result += String(sequence).padStart(runLength, "0")
    } else if (char === "A") {
      for (let j = 0; j < runLength; j += 1) {
        result +=
          CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
      }
    } else {
      result += char.repeat(runLength)
    }
  }
  return (prefix ?? "") + result
}

/** Ejemplo determinista para la previsualización (sequence=1) — la 'A' se muestra fija en vez de aleatoria, para no reflowear la UI en cada render. */
export function sampleCode(pattern: string, prefix?: string | null): string {
  const withoutRandom = pattern.replace(/A/g, "X")
  return renderCodePattern(withoutRandom, 1, prefix)
}

/** `code_pattern` válido: 4-32 caracteres y al menos un token 'N' — mismo `check` que la columna. */
export function isValidCodePattern(pattern: string): boolean {
  return pattern.length >= 4 && pattern.length <= 32 && pattern.includes("N")
}
