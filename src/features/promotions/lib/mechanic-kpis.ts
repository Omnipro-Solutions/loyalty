import type { BenefitType } from "@/types/domain"

/**
 * Un canje visto desde el panel: lo que la mecánica escribió en
 * `promocion_eventos.metadatos`. Todo opcional porque cada mecánica llena
 * su propio subconjunto — `escalon_alcanzado` solo existe en escalonado y
 * continuidad, `saldo_emitido` solo en cashback.
 */
export type CanjeMetadata = Record<string, unknown>

/** Fila de KPI lista para pintar: una métrica con su formato ya decidido. */
export type MechanicMetric = {
  label: string
  value: number
  /** Cómo se formatea en pantalla — el componente no adivina por el nombre. */
  format: "money" | "number" | "percent" | "points"
  /** Segunda línea: el matiz que evita leer el número al revés. */
  hint?: string
}

/** Distribución para una barra apilada o un desglose — escalones, SKU, niveles. */
export type MechanicBreakdown = {
  label: string
  items: { key: string; label: string; canjes: number; share: number }[]
}

export type MechanicKpis = {
  metrics: MechanicMetric[]
  breakdown: MechanicBreakdown | null
}

function num(meta: CanjeMetadata, key: string): number | null {
  const v = meta[key]
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function bool(meta: CanjeMetadata, key: string): boolean {
  return meta[key] === true
}

function str(meta: CanjeMetadata, key: string): string | null {
  const v = meta[key]
  return typeof v === "string" && v !== "" ? v : null
}

function sum(rows: CanjeMetadata[], key: string): number {
  return rows.reduce((acc, r) => acc + (num(r, key) ?? 0), 0)
}

function avg(rows: CanjeMetadata[], key: string): number | null {
  const values = rows
    .map((r) => num(r, key))
    .filter((v): v is number => v !== null)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Fracción 0-1 de canjes que cumplen un flag — no porcentaje, mismo criterio que `consumedBudgetPct`. */
function rate(rows: CanjeMetadata[], key: string): number {
  if (rows.length === 0) return 0
  return rows.filter((r) => bool(r, key)).length / rows.length
}

function distribution(
  rows: CanjeMetadata[],
  key: string,
  labelFor: (value: string) => string
): MechanicBreakdown["items"] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const raw = num(row, key) ?? str(row, key)
    if (raw === null) continue
    const k = String(raw)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  return [...counts.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]) || a[0].localeCompare(b[0]))
    .map(([key, canjes]) => ({
      key,
      label: labelFor(key),
      canjes,
      share: total > 0 ? canjes / total : 0,
    }))
}

/**
 * Los KPI que de verdad contestan "¿esta mecánica funcionó?", uno por
 * mecánica. No son los universales (canjes, inversión, costo por canje):
 * esos comparan promociones entre sí y viven en la fila de arriba del
 * panel. Estos solo tienen sentido dentro de su mecánica — el escalón
 * alcanzado no significa nada en un envío gratis, y el saldo emitido no
 * existe fuera de cashback.
 *
 * Función pura sobre los metadatos de los canjes: sin Supabase, sin fechas
 * del sistema, testeable entera (ver `mechanic-kpis.test.ts`).
 */
export function mechanicKpis(
  mecanica: BenefitType,
  canjes: CanjeMetadata[]
): MechanicKpis {
  if (canjes.length === 0) return { metrics: [], breakdown: null }

  switch (mecanica) {
    case "descuento_porcentual":
    case "descuento_monto_fijo": {
      const otorgado = sum(canjes, "descuento_otorgado")
      const carrito = sum(canjes, "monto_carrito")
      const topados = rate(canjes, "tope_alcanzado")
      return {
        metrics: [
          {
            label: "Descuento otorgado",
            value: otorgado,
            format: "money",
            hint: `${(otorgado / canjes.length).toFixed(0)} por canje en promedio`,
          },
          {
            // El configurado dice la intención; el efectivo dice lo que pasó.
            // Se separan porque el tope los aleja, y esa distancia es el hallazgo.
            label: "Descuento efectivo",
            value: carrito > 0 ? otorgado / carrito : 0,
            format: "percent",
            hint: "sobre el carrito canjeado, ya con el tope aplicado",
          },
          {
            label: "Canjes que tocaron el tope",
            value: topados,
            format: "percent",
            hint:
              topados > 0.2
                ? "el tope está recortando de forma sistemática"
                : "el tope casi no interviene",
          },
        ],
        breakdown: null,
      }
    }

    case "descuento_escalonado": {
      const items = distribution(
        canjes,
        "escalon_alcanzado",
        (k) => `${k}+ unidades`
      )
      const ultimo = items.at(-1)
      return {
        metrics: [
          {
            label: "Descuento otorgado",
            value: sum(canjes, "descuento_otorgado"),
            format: "money",
          },
          {
            label: "Unidades por canje",
            value: avg(canjes, "unidades") ?? 0,
            format: "number",
            hint: "promedio de piezas que llevó el carrito",
          },
          {
            label: "Llega al escalón más alto",
            value: ultimo?.share ?? 0,
            format: "percent",
            hint:
              (ultimo?.share ?? 0) < 0.1
                ? "el escalón alto casi no se alcanza: o sobra o está mal calibrado"
                : "el escalón alto tiene demanda real",
          },
        ],
        breakdown: { label: "Canjes por escalón alcanzado", items },
      }
    }

    case "envio_gratis": {
      const costo = sum(canjes, "costo_envio")
      const umbral = avg(canjes, "umbral_disparo") ?? 0
      const ticket = avg(canjes, "monto_carrito") ?? 0
      return {
        metrics: [
          {
            label: "Costo de envío asumido",
            value: costo,
            format: "money",
            hint: "naturaleza «costo de servicio» — no lo cofinancia nadie",
          },
          {
            label: "Ticket promedio",
            value: ticket,
            format: "money",
          },
          {
            // Si el ticket apenas supera el umbral, la promoción está
            // premiando compras que ya iban a ocurrir.
            label: "Holgura sobre el umbral",
            value: umbral > 0 ? ticket / umbral - 1 : 0,
            format: "percent",
            hint:
              umbral > 0 && ticket / umbral - 1 < 0.25
                ? "compran justo por encima: el umbral no está empujando el carrito"
                : "el umbral empuja el carrito por encima de sí mismo",
          },
        ],
        breakdown: null,
      }
    }

    case "producto_gratis":
    case "por_piezas": {
      const piezas = sum(canjes, "cantidad")
      const compradas = sum(canjes, "piezas_compradas")
      const items = distribution(canjes, "producto_id", (k) => k)
      return {
        metrics: [
          {
            label: "Piezas entregadas",
            value: piezas,
            format: "number",
            hint: "lo que se consolida y se factura al proveedor",
          },
          {
            label: "Piezas por canje",
            value: piezas / canjes.length,
            format: "number",
          },
          ...(compradas > 0
            ? [
                {
                  label: "Piezas regaladas sobre vendidas",
                  value: compradas > 0 ? piezas / compradas : 0,
                  format: "percent" as const,
                  hint: "cuánto del volumen movido se entregó sin cobrar",
                },
              ]
            : []),
        ],
        breakdown:
          items.length > 1 ? { label: "Piezas por producto", items } : null,
      }
    }

    case "precio_fijo_bundle": {
      const bundles = sum(canjes, "bundles")
      const margen = sum(canjes, "margen_sacrificado")
      return {
        metrics: [
          { label: "Bundles vendidos", value: bundles, format: "number" },
          {
            label: "Margen sacrificado",
            value: margen,
            format: "money",
            hint: `${(margen / Math.max(bundles, 1)).toFixed(0)} por bundle`,
          },
          {
            label: "Ticket promedio",
            value: avg(canjes, "monto_carrito") ?? 0,
            format: "money",
          },
        ],
        breakdown: null,
      }
    }

    case "precio_especial": {
      const unidades = sum(canjes, "cantidad")
      const delta = avg(canjes, "delta_unitario") ?? 0
      return {
        metrics: [
          {
            label: "Unidades a precio especial",
            value: unidades,
            format: "number",
          },
          {
            label: "Sacrificio por unidad",
            value: delta,
            format: "money",
            hint: "diferencia contra el precio de referencia",
          },
          {
            label: "Sacrificio total",
            value: delta * unidades,
            format: "money",
            hint: "es la base de la liquidación con el proveedor",
          },
        ],
        breakdown: null,
      }
    }

    case "multiplicador_puntos":
    case "bono_puntos": {
      const puntos = sum(canjes, "puntos_otorgados")
      const topados = rate(canjes, "tope_alcanzado")
      const multiplicador = avg(canjes, "multiplicador_aplicado")
      const niveles = distribution(canjes, "nivel_socio", (k) => k)
      return {
        metrics: [
          {
            label: "Puntos otorgados",
            value: puntos,
            format: "points",
            hint: "pasivo del programa: se contabiliza al otorgar, no al canjear",
          },
          {
            label: "Puntos por canje",
            value: puntos / canjes.length,
            format: "points",
          },
          ...(multiplicador !== null
            ? [
                {
                  label: "Multiplicador efectivo",
                  value: multiplicador,
                  format: "number" as const,
                  hint:
                    topados > 0.05
                      ? `${(topados * 100).toFixed(0)} % de los canjes tocaron el tope`
                      : "el tope casi no interviene",
                },
              ]
            : []),
        ],
        breakdown:
          niveles.length > 1
            ? { label: "Canjes por nivel del socio", items: niveles }
            : null,
      }
    }

    case "cashback": {
      const emitido = sum(canjes, "saldo_emitido")
      const redimido = sum(canjes, "saldo_redimido")
      return {
        metrics: [
          { label: "Saldo emitido", value: emitido, format: "money" },
          {
            label: "Saldo redimido",
            value: redimido,
            format: "money",
            hint: "el costo real: lo emitido y no usado nunca sale de caja",
          },
          {
            // Breakage: la parte de la promoción que se presupuestó y no
            // costó. En cashback es la diferencia entre lo que parece
            // costar y lo que cuesta.
            label: "Breakage",
            value: emitido > 0 ? 1 - redimido / emitido : 0,
            format: "percent",
            hint: "saldo emitido que vence sin usarse",
          },
        ],
        breakdown: null,
      }
    }

    case "descuento_continuidad": {
      const items = distribution(
        canjes,
        "escalon_alcanzado",
        (k) => `Compra ${k}.ª`
      )
      const primero = items[0]?.canjes ?? 0
      const ultimo = items.at(-1)?.canjes ?? 0
      return {
        metrics: [
          {
            label: "Descuento otorgado",
            value: sum(canjes, "descuento_otorgado"),
            format: "money",
          },
          {
            // La pregunta de una escalera de adherencia no es cuántos
            // entran, es cuántos llegan al final.
            label: "Llega al último escalón",
            value: primero > 0 ? ultimo / primero : 0,
            format: "percent",
            hint: "de los que empezaron la escalera",
          },
          {
            label: "Rachas rotas",
            value: rate(canjes, "racha_rota"),
            format: "percent",
            hint: "excedieron la ventana y volvieron a empezar",
          },
        ],
        breakdown: { label: "Canjes por escalón de la escalera", items },
      }
    }

    case "emitir_cupon":
      return {
        metrics: [
          { label: "Cupones emitidos", value: canjes.length, format: "number" },
        ],
        breakdown: null,
      }
  }
}
