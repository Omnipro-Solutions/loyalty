import { formatCOP } from "@/lib/format"

import type { Condicion } from "./queries"

type PromocionAlcance = {
  tipo: string
  canal_aplicacion: string
  condiciones: Condicion[]
}

type AlcanceContexto = {
  totalTiendas: number
  categoriaNombrePorId: Map<string, string>
  segmentoNombrePorId: Map<string, string>
}

/**
 * Resumen de a quién/dónde aplica una promoción (06.1 "ALCANCE": "E-commerce",
 * "42 tiendas", "Segmento VIP"…) — se computa desde `condiciones`/`canal_aplicacion`
 * en vez de guardarse aparte, para que nunca quede desincronizado con la condición real.
 */
export function alcanceResumen(
  promocion: PromocionAlcance,
  ctx: AlcanceContexto
): string {
  const segmento = promocion.condiciones.find((c) => c.campo === "segmento")
  if (segmento) {
    return `Segmento ${ctx.segmentoNombrePorId.get(segmento.valor) ?? segmento.valor}`
  }

  const categoria = promocion.condiciones.find((c) => c.campo === "categoria")
  if (categoria) {
    const nombres = categoria.valor.map(
      (id) => ctx.categoriaNombrePorId.get(id) ?? id
    )
    return nombres.join(", ") || "—"
  }

  const tienda = promocion.condiciones.find((c) => c.campo === "tienda")
  if (tienda) return tienda.valor

  const montoCarrito = promocion.condiciones.find(
    (c) => c.campo === "monto_carrito"
  )
  if (montoCarrito) return `Carrito ≥ ${formatCOP(montoCarrito.valor)}`

  if (promocion.canal_aplicacion === "pos") return "Tiendas físicas"
  if (promocion.canal_aplicacion === "ecommerce") return "E-commerce"
  if (promocion.tipo === "cantidad") return `${ctx.totalTiendas} tiendas`
  return "Todos"
}

/** Subtítulo de 06.1 ("Cantidad · todas las tiendas", "Cupón · nuevos clientes"…) — segunda mitad, versión corta. */
export function alcanceCorto(
  promocion: PromocionAlcance,
  ctx: AlcanceContexto
): string {
  const resumen = alcanceResumen(promocion, ctx)
  if (promocion.tipo === "cantidad" && resumen.endsWith(" tiendas")) {
    return "todas las tiendas"
  }
  if (resumen === "Todos") return "todos los clientes"
  if (resumen === "E-commerce") return "e-commerce"
  if (resumen === "Tiendas físicas") return "tiendas físicas"
  return resumen.toLowerCase()
}
