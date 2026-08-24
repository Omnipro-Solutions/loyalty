import { formatUSD } from "@/lib/format"
import type {
  BenefitType,
  DiscountValueType,
  PromotionMechanic,
  PromotionType,
} from "@/types/domain"

import type { RewardValues } from "../schemas"

export const MECHANIC_LABEL: Record<PromotionMechanic, string> = {
  descuento: "Descuento",
  escalonado: "Escalonado",
  puntos: "Puntos",
  nxm: "Lleva más, paga menos (NxM)",
  cupon: "Cupón",
}

/** Ejemplo concreto por mecánica — texto del card picker (paso 1 del wizard). */
export const MECHANIC_EXAMPLE: Record<PromotionMechanic, string> = {
  descuento: "20% en toda la categoría Dermocosmética.",
  escalonado: "10% desde $50, 20% desde $100.",
  puntos: "Puntos dobles en compras de fin de semana.",
  nxm: "Lleva 3 y paga 2 en Vitaminas.",
  cupon: "Cupón de $15 al superar el carrito mínimo.",
}

/** Forma inicial de `reward` al elegir (o cambiar de) mecánica — mismo rol que `defaultValueFor` en `condition-row.tsx`. */
export function defaultRewardFor(mecanica: PromotionMechanic): RewardValues {
  switch (mecanica) {
    case "descuento":
      return {
        mecanica,
        tipoDescuento: "porcentaje",
        valor: 10,
        aplicarSobre: "subtotal_carrito",
      }
    case "escalonado":
      return {
        mecanica,
        base: "monto_carrito",
        tramos: [
          { desde: 50, tipoDescuento: "porcentaje", valor: 10 },
          { desde: 100, tipoDescuento: "porcentaje", valor: 20 },
        ],
      }
    case "puntos":
      return { mecanica, modo: "multiplicador", valor: 2 }
    case "nxm":
      return { mecanica, llevaN: 3, pagaM: 2, aplicarA: "mismo_producto" }
    case "cupon":
      return {
        mecanica,
        tipoDescuento: "porcentaje",
        valor: 15,
        vigenciaDias: 30,
      }
  }
}

function formatDiscountValue(tipo: DiscountValueType, valor: number): string {
  return tipo === "porcentaje" ? `${valor}%` : formatUSD(valor)
}

/**
 * Frase concreta de "así lo ve el cliente" — se muestra en el paso Recompensa
 * mientras se configura. Recibe datos en vivo del form (aún no validados por
 * Zod), así que tolera tramos vacíos en vez de asumir el mínimo de 2.
 */
export function rewardPreview(reward: RewardValues): string {
  switch (reward.mecanica) {
    case "descuento":
      return `El cliente obtiene ${formatDiscountValue(reward.tipoDescuento, reward.valor)} de descuento${reward.topeMaximo ? `, hasta ${formatUSD(reward.topeMaximo)}` : ""}.`
    case "escalonado": {
      if (reward.tramos.length === 0) return "Agrega al menos 2 tramos."
      const esMonto = reward.base === "monto_carrito"
      return reward.tramos
        .map((t) => {
          const umbral = esMonto ? formatUSD(t.desde) : `${t.desde} productos`
          return `Desde ${umbral}: ${formatDiscountValue(t.tipoDescuento, t.valor)}`
        })
        .join(" · ")
    }
    case "puntos":
      return reward.modo === "multiplicador"
        ? `El cliente acumula ${reward.valor}× puntos.`
        : `El cliente recibe ${reward.valor} puntos adicionales.`
    case "nxm": {
      const ahorro =
        reward.llevaN > 0
          ? Math.round(((reward.llevaN - reward.pagaM) / reward.llevaN) * 100)
          : 0
      return `El cliente lleva ${reward.llevaN} y paga ${reward.pagaM} — ahorra ${ahorro}%.`
    }
    case "cupon":
      return `El cliente recibe un cupón de ${formatDiscountValue(reward.tipoDescuento, reward.valor)}, válido por ${reward.vigenciaDias} días.`
  }
}

/** Deriva la columna legacy `tipo` (ícono/subtítulo del listado 06.1) desde la mecánica elegida. */
export function legacyTypeFor(mecanica: PromotionMechanic): PromotionType {
  switch (mecanica) {
    case "descuento":
    case "escalonado":
      return "carrito"
    case "puntos":
      return "segmento"
    case "nxm":
      return "cantidad"
    case "cupon":
      return "cupon"
  }
}

/** Deriva las columnas legacy `tipo_beneficio`/`valor_beneficio` desde la recompensa elegida — ver decisión en el plan sobre por qué siguen existiendo. */
export function legacyBenefitFor(reward: RewardValues): {
  benefitType: BenefitType
  benefitValue: number
} {
  switch (reward.mecanica) {
    case "descuento":
    case "cupon":
      return {
        benefitType:
          reward.tipoDescuento === "porcentaje"
            ? "descuento_porcentual"
            : "descuento_monto_fijo",
        benefitValue: reward.valor,
      }
    case "escalonado": {
      const first = reward.tramos[0]
      return {
        benefitType:
          first.tipoDescuento === "porcentaje"
            ? "descuento_porcentual"
            : "descuento_monto_fijo",
        benefitValue: first.valor,
      }
    }
    case "puntos":
      return { benefitType: "puntos", benefitValue: reward.valor }
    case "nxm":
      return { benefitType: "producto_gratis", benefitValue: 0 }
  }
}
