import type { CouponBatchSummary } from "@/features/builder/canvas/queries"

/**
 * Los constraints reales de la tabla `coupon`, traducidos a lo que la UI
 * debe permitir.
 *
 * El criterio: **lo que la base va a rechazar, la UI no debería dejar
 * construir**. Un formulario que acepta una combinación imposible no falla
 * al guardar la config del nodo —el nodo se guarda perfectamente— sino
 * mucho después, al ejecutar la regla contra un socio real, y para entonces
 * el error ya no se parece a lo que se configuró.
 *
 * Puro y sin JSX, mismo criterio que `node-logic.ts`: el inspector decide
 * cómo mostrarlo.
 */

export type CouponConstraint = {
  /** `error` bloquea Publicar (vía `validateNodeConfig`); `aviso` solo se explica. */
  level: "error" | "aviso"
  message: string
}

/** Un lote sin titular posible: sus cupones son al portador por definición. */
function isAnonymous(batch: CouponBatchSummary): boolean {
  return batch.origin === "batch_anonymous"
}

/**
 * Qué opciones de titular admite el lote elegido.
 *
 * `coupon_bearer_or_member` hace excluyentes `member_id` y `bearer`, y un
 * lote `batch_anonymous` se generó justamente para no tener titular: dejar
 * elegir "el socio del flujo" ahí produciría cupones que la base rechaza de
 * uno en uno, en ejecución.
 */
export function allowedHolders(
  batch: CouponBatchSummary | undefined
): readonly string[] {
  if (!batch) return ["socio_del_flujo", "al_portador"]
  return isAnonymous(batch)
    ? ["al_portador"]
    : ["socio_del_flujo", "al_portador"]
}

/**
 * Problemas de la combinación lote + configuración del bloque.
 *
 * Se calcula contra el lote REAL (no contra lo que el bloque cree): el lote
 * puede haberse agotado o cerrado después de configurar la regla, y el
 * bloque seguiría pareciendo correcto.
 */
export function couponConstraints(
  batch: CouponBatchSummary | undefined,
  config: Record<string, unknown>
): CouponConstraint[] {
  if (!batch) return []
  const issues: CouponConstraint[] = []
  const asigna = config.modo === "asignar"

  if (isAnonymous(batch) && config.titular === "socio_del_flujo") {
    issues.push({
      level: "error",
      message:
        "Este lote es anónimo (`batch_anonymous`): sus cupones no pueden tener titular. Elige «Al portador» o cambia de emisión.",
    })
  }

  // Asignar toma un cupón YA CREADO del lote; emitir crea uno nuevo y no
  // depende del stock. Por eso el lote agotado solo bloquea uno de los dos
  // modos, y decirlo así evita el "no funciona" que en realidad era "no
  // quedan".
  if (asigna && batch.remaining <= 0) {
    issues.push({
      level: "error",
      message:
        "El lote está agotado: no quedan cupones sin asignar. Emitir uno nuevo sí es posible — no depende del stock.",
    })
  }

  if (batch.status === "cancelled" || batch.status === "closed") {
    issues.push({
      level: "error",
      message:
        "La emisión está cerrada o cancelada: no admite ni emitir ni asignar mientras siga así.",
    })
  }

  if (batch.status === "draft" || batch.status === "pending_approval") {
    issues.push({
      level: "aviso",
      message:
        "La emisión todavía no está aprobada. La regla se puede publicar, pero no entregará nada hasta que el lote se emita.",
    })
  }

  // El cupón caduca antes que la ventana que el bloque promete: no falla,
  // pero entrega cupones ya vencidos, que es peor que no entregarlos.
  const dias = config.vigencia_dias
  if (!asigna && typeof dias === "number" && batch.validTo) {
    const remainingDays = Math.round(
      (new Date(batch.validTo).getTime() - Date.now()) / 86_400_000
    )
    if (remainingDays >= 0 && dias > remainingDays) {
      issues.push({
        level: "aviso",
        message: `La emisión vence en ${String(remainingDays)} día(s), antes de los ${String(dias)} que promete este bloque: los cupones nacerían con menos vigencia de la configurada.`,
      })
    }
  }

  return issues
}
