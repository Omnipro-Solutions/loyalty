import {
  Banknote,
  CreditCard,
  Landmark,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import type { PaymentMethod } from "@/types/domain"

/**
 * Cómo se lee un medio de pago. Vive en `config` por la misma razón que
 * `config/return-reason.ts`: lo consume la bitácora (`components/data`, que
 * no puede importar de `features` — CLAUDE.md §2) y lo va a consumir
 * cualquier pantalla de caja o de reembolso.
 */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta_credito: "Tarjeta de crédito",
  tarjeta_debito: "Tarjeta de débito",
  transferencia: "Transferencia",
  puntos: "Puntos del programa",
}

/**
 * El ícono distingue los medios de un vistazo cuando hay dos o tres filas,
 * que es el caso normal de un pago partido. Las dos tarjetas comparten
 * ícono a propósito: lo que las diferencia es el copy, no la forma.
 */
export const PAYMENT_METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  efectivo: Banknote,
  tarjeta_credito: CreditCard,
  tarjeta_debito: CreditCard,
  transferencia: Landmark,
  puntos: Sparkles,
}

/**
 * Los puntos no son dinero que entró a la caja: son saldo del socio que se
 * quemó. En un arqueo hay que poder separarlos del resto, y en un reembolso
 * vuelven al saldo y no al bolsillo.
 */
export function isPointsPayment(metodo: PaymentMethod): boolean {
  return metodo === "puntos"
}
