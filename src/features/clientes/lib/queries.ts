import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

export type TierOption = Pick<
  Database["public"]["Tables"]["tiers"]["Row"],
  "id" | "nombre" | "multiplicador" | "umbral_puntos"
>
export type TiendaOption = Pick<
  Database["public"]["Tables"]["tiendas"]["Row"],
  "id" | "nombre"
>

export type Member = Database["public"]["Tables"]["members"]["Row"] & {
  tier: TierOption | null
  tiendaInscripcion: TiendaOption | null
}

export type ClientesFiltros = {
  busqueda?: string
  estadoCuenta?: string
  tierId?: string
  page?: number
}

export const CLIENTES_PAGE_SIZE = 10

const MEMBER_CON_TIER_Y_TIENDA =
  "*, tier:tiers(id, nombre, multiplicador, umbral_puntos), tiendaInscripcion:tiendas(id, nombre)"

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizarBusqueda(valor: string): string {
  return valor.replace(/[,()%]/g, "").trim()
}

export async function listClientes(
  filtros: ClientesFiltros = {}
): Promise<{ clientes: Member[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const desde = (page - 1) * CLIENTES_PAGE_SIZE
  const hasta = desde + CLIENTES_PAGE_SIZE - 1

  let query = supabase
    .from("members")
    .select(MEMBER_CON_TIER_Y_TIENDA, { count: "exact" })
    .order("creado_en", { ascending: false })
    .range(desde, hasta)

  const busqueda = filtros.busqueda ? sanitizarBusqueda(filtros.busqueda) : ""
  if (busqueda) {
    query = query.or(
      `nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%,email.ilike.%${busqueda}%,codigo_socio.ilike.%${busqueda}%`
    )
  }
  if (filtros.estadoCuenta)
    query = query.eq("estado_cuenta", filtros.estadoCuenta)
  if (filtros.tierId) query = query.eq("tier_id", filtros.tierId)

  const { data, error, count } = await query
  if (error) throw error

  return { clientes: (data ?? []) as Member[], total: count ?? 0 }
}

export async function getClienteById(id: string): Promise<Member | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_CON_TIER_Y_TIENDA)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as Member | null
}

export type ClientesKpis = {
  clientesActivos: number
  nuevosEsteMes: number
  conConsentimiento: number
  totalClientes: number
  perfilCompleto: number
}

function inicioDeMes(): string {
  const ahora = new Date()
  return new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
}

export async function getClientesKpis(): Promise<ClientesKpis> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("members")
    .select(
      "estado_cuenta, creado_en, consentimiento_marketing, apellido, telefono, tipo_documento, numero_documento, fecha_nacimiento, genero, provincia, estado_civil, preferencia_compra, tiene_hijos, tiene_mascotas, tienda_inscripcion_id, canal_adquisicion"
    )
  if (error) throw error

  const filas = data ?? []
  const desdeInicioDeMes = inicioDeMes()

  return {
    clientesActivos: filas.filter((m) => m.estado_cuenta === "activo").length,
    nuevosEsteMes: filas.filter((m) => m.creado_en >= desdeInicioDeMes).length,
    conConsentimiento: filas.filter((m) => m.consentimiento_marketing).length,
    totalClientes: filas.length,
    perfilCompleto: filas.filter(
      (m) => calcularCompletitud(m).porcentaje >= 0.8
    ).length,
  }
}

const CAMPOS_PERFIL_OPCIONALES = [
  "apellido",
  "telefono",
  "tipo_documento",
  "numero_documento",
  "fecha_nacimiento",
  "genero",
  "provincia",
  "estado_civil",
  "preferencia_compra",
  "tiene_hijos",
  "tiene_mascotas",
  "tienda_inscripcion_id",
  "canal_adquisicion",
] as const

type CampoPerfil = (typeof CAMPOS_PERFIL_OPCIONALES)[number]
type MemberConCamposPerfil = Pick<
  Database["public"]["Tables"]["members"]["Row"],
  CampoPerfil
>

/**
 * "Perfil unificado" (05.3g) real: en vez de simular una unificación de
 * varias fuentes que no existen, mide cuántos de los atributos opcionales
 * del socio están completos — mismo espíritu (qué tan confiable es la
 * ficha), sin inventar datos.
 */
export function calcularCompletitud(member: MemberConCamposPerfil): {
  porcentaje: number
  llenos: number
  total: number
} {
  const llenos = CAMPOS_PERFIL_OPCIONALES.filter((campo) => {
    const valor = member[campo]
    return valor !== null && valor !== undefined && valor !== ""
  }).length
  return {
    porcentaje: llenos / CAMPOS_PERFIL_OPCIONALES.length,
    llenos,
    total: CAMPOS_PERFIL_OPCIONALES.length,
  }
}

export type LedgerEntryConSaldo =
  Database["public"]["Tables"]["points_ledger"]["Row"] & {
    saldoDespues: number
  }

/** "Log de redenciones" (05.3g): extracto real de `points_ledger`, con saldo acumulado calculado en memoria (la tabla solo guarda el delta de cada movimiento). */
export async function listRedencionesPorMiembro(
  memberId: string
): Promise<LedgerEntryConSaldo[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("points_ledger")
    .select("*")
    .eq("member_id", memberId)
    .order("creado_en", { ascending: true })
  if (error) throw error

  let saldo = 0
  const conSaldo = (data ?? []).map((entrada) => {
    saldo += entrada.puntos
    return { ...entrada, saldoDespues: saldo }
  })
  return conSaldo.reverse()
}

export type Consentimiento =
  Database["public"]["Tables"]["member_consentimientos"]["Row"]

/** "Card · Consentimientos" (05.3g), real: `member_consentimientos` por canal. Solo lectura, como en el propio Figma ("Solo lectura · Ley 1581"). */
export async function listConsentimientosPorMiembro(
  memberId: string
): Promise<Consentimiento[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("member_consentimientos")
    .select("*")
    .eq("member_id", memberId)
  if (error) throw error
  return data ?? []
}

export async function listTiendasOptions(): Promise<TiendaOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiendas")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return data
}

export async function listTiersOptions(): Promise<TierOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiers")
    .select("id, nombre, multiplicador, umbral_puntos")
    .order("orden")
  if (error) throw error
  return data
}

/**
 * COP por punto — mismo tipo de supuesto de negocio que cualquier programa
 * de lealtad real (aquí no hay un valor configurable por organización
 * todavía). Alimenta "equivalen a $X" y "Pasivo acumulado" (05.3g),
 * calculados de verdad a partir de esto en vez de inventados por socio.
 */
export const PUNTO_VALOR_COP = 6.75

/** Roles de sistema, no de socio: "VIP" en 05.3g se aproxima con los dos niveles superiores — no hay un motor RFM real. */
export function esVip(tierNombre: string | undefined): boolean {
  return tierNombre === "diamante" || tierNombre === "oro"
}

/** Diamante requiere mantener el saldo sobre su umbral — si ya cayó debajo, el badge "Riesgo de baja de nivel" (05.3g) es una señal real, no decorativa. */
export function enRiesgoDeBajaDeNivel(member: Member): boolean {
  if (!member.tier) return false
  return member.saldo_puntos < member.tier.umbral_puntos
}

export function formatAntiguedad(fechaAlta: string): string {
  const inicio = new Date(fechaAlta)
  const ahora = new Date()
  let meses =
    (ahora.getFullYear() - inicio.getFullYear()) * 12 +
    (ahora.getMonth() - inicio.getMonth())
  if (ahora.getDate() < inicio.getDate()) meses -= 1
  meses = Math.max(0, meses)
  const anios = Math.floor(meses / 12)
  const mesesRestantes = meses % 12
  if (anios === 0)
    return `${mesesRestantes} mes${mesesRestantes === 1 ? "" : "es"}`
  return `${anios} año${anios === 1 ? "" : "s"} · ${mesesRestantes} mes${mesesRestantes === 1 ? "" : "es"}`
}

/**
 * "Calificación cierra 31 dic" (05.3g): política real de revisión anual de
 * nivel — no hay un ciclo configurable por organización, se fija al 31 de
 * diciembre más próximo.
 */
export function getPeriodoCalificacion(): {
  fechaFin: Date
  diasRestantes: number
} {
  const ahora = new Date()
  let fechaFin = new Date(ahora.getFullYear(), 11, 31)
  if (fechaFin < ahora) fechaFin = new Date(ahora.getFullYear() + 1, 11, 31)
  const diasRestantes = Math.ceil(
    (fechaFin.getTime() - ahora.getTime()) / 86_400_000
  )
  return { fechaFin, diasRestantes }
}

export type ResumenLealtad = {
  puntosPorVencer: number
  proximaExpiracion: string | null
  tasaRedencion: number | null
  pasivoAcumulado: number
  serieSaldo: number[]
}

/** KPIs reales de "PROGRAMA DE LEALTAD" (05.3g), derivados del ledger real — sin LTV/riesgo de fuga (esos sí necesitan pedidos y scoring). */
export async function getResumenLealtad(
  memberId: string,
  saldoActual: number
): Promise<ResumenLealtad> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("points_ledger")
    .select("tipo, puntos, expira_en, creado_en")
    .eq("member_id", memberId)
    .order("creado_en", { ascending: true })
  if (error) throw error

  const movimientos = data ?? []
  const ahora = Date.now()
  const en90Dias = ahora + 90 * 86_400_000

  let porVencer = 0
  let proximaExpiracion: string | null = null
  let sumaAcumulacion = 0
  let sumaCanje = 0

  for (const m of movimientos) {
    if (m.tipo === "acumulacion") sumaAcumulacion += m.puntos
    if (m.tipo === "canje") sumaCanje += Math.abs(m.puntos)

    if (m.expira_en) {
      const expiraEn = new Date(m.expira_en).getTime()
      if (expiraEn >= ahora && expiraEn <= en90Dias && m.puntos > 0) {
        porVencer += m.puntos
        if (
          !proximaExpiracion ||
          expiraEn < new Date(proximaExpiracion).getTime()
        ) {
          proximaExpiracion = m.expira_en
        }
      }
    }
  }

  let saldo = 0
  const serieSaldo = movimientos.map((m) => {
    saldo += m.puntos
    return saldo
  })
  if (serieSaldo.length === 0) serieSaldo.push(saldoActual, saldoActual)

  return {
    puntosPorVencer: porVencer,
    proximaExpiracion,
    tasaRedencion: sumaAcumulacion > 0 ? sumaCanje / sumaAcumulacion : null,
    pasivoAcumulado: Math.max(0, saldoActual - porVencer) * PUNTO_VALOR_COP,
    serieSaldo: serieSaldo.slice(-8),
  }
}

/** Tasa de redención agregada de toda la organización — el punto de comparación real de "promedio del programa" (05.3g), no un número fijo. */
export async function getTasaRedencionPrograma(): Promise<number | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("points_ledger")
    .select("tipo, puntos")
  if (error) throw error

  const filas = data ?? []
  const acumulado = filas
    .filter((f) => f.tipo === "acumulacion")
    .reduce((acc, f) => acc + f.puntos, 0)
  const canjeado = filas
    .filter((f) => f.tipo === "canje")
    .reduce((acc, f) => acc + Math.abs(f.puntos), 0)

  return acumulado > 0 ? canjeado / acumulado : null
}

const DIA_MS = 86_400_000

export type PedidoSocio = {
  id: string
  tienda_id: string | null
  canal: string
  total: number
  costo_total: number
  estado: string
  creado_en: string
  tiendas: { nombre: string } | null
}

/**
 * Un solo fetch de `pedidos` del socio, compartido por
 * `getComportamientoCompra`/`getValorComercial` (antes cada una pedía la
 * misma tabla por su cuenta). Sin filtrar por `estado`: cada consumidora
 * decide qué estados le importan.
 */
export async function getPedidosSocio(
  memberId: string
): Promise<PedidoSocio[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      "id, tienda_id, canal, total, costo_total, estado, creado_en, tiendas(nombre)"
    )
    .eq("member_id", memberId)
    .order("creado_en", { ascending: true })
  if (error) throw error
  return data ?? []
}

export type ComportamientoCompra = {
  totalPedidos: number
  tiendaHabitual: { nombre: string; porcentaje: number } | null
  canalPreferido: { canal: string; porcentaje: number } | null
  frecuenciaMensual: number | null
  intervaloDias: number | null
  ticketPromedio: number
  tendenciaTicket: number | null
  categoriaDominante: { nombre: string; porcentaje: number } | null
  ultimaCompra: string | null
  proximaEstimada: string | null
}

/** "Card · Comportamiento de compra" (05.3g), real: agregado de `pedidos`/`pedido_items` — vacío si el socio todavía no tiene pedidos. */
export async function getComportamientoCompra(
  pedidosSocio: PedidoSocio[]
): Promise<ComportamientoCompra> {
  const supabase = await createClient()
  const pedidos = pedidosSocio.filter((p) => p.estado === "completado")
  if (pedidos.length === 0) {
    return {
      totalPedidos: 0,
      tiendaHabitual: null,
      canalPreferido: null,
      frecuenciaMensual: null,
      intervaloDias: null,
      ticketPromedio: 0,
      tendenciaTicket: null,
      categoriaDominante: null,
      ultimaCompra: null,
      proximaEstimada: null,
    }
  }

  const tiendaConteo = new Map<string, { nombre: string; conteo: number }>()
  const canalConteo = new Map<string, number>()
  for (const p of pedidos) {
    canalConteo.set(p.canal, (canalConteo.get(p.canal) ?? 0) + 1)
    if (p.tienda_id) {
      const nombre = (p.tiendas as { nombre: string } | null)?.nombre ?? "—"
      const actual = tiendaConteo.get(p.tienda_id) ?? { nombre, conteo: 0 }
      actual.conteo += 1
      tiendaConteo.set(p.tienda_id, actual)
    }
  }
  const tiendaTop = [...tiendaConteo.values()].sort(
    (a, b) => b.conteo - a.conteo
  )[0]
  const canalTop = [...canalConteo.entries()].sort((a, b) => b[1] - a[1])[0]

  const primeraFecha = new Date(pedidos[0].creado_en).getTime()
  const ultimaFecha = new Date(pedidos[pedidos.length - 1].creado_en).getTime()
  const mesesActivo = Math.max(1, (ultimaFecha - primeraFecha) / (30 * DIA_MS))
  const frecuenciaMensual =
    pedidos.length > 1 ? pedidos.length / mesesActivo : null

  // Suma de intervalos consecutivos = última fecha - primera fecha
  // (telescópica): no hace falta sumar par a par.
  const intervaloDias =
    pedidos.length > 1
      ? Math.round((ultimaFecha - primeraFecha) / (pedidos.length - 1) / DIA_MS)
      : null

  const totalGeneral = pedidos.reduce((acc, p) => acc + p.total, 0)
  const ticketPromedio = totalGeneral / pedidos.length

  const ahora = Date.now()
  const recientes = pedidos.filter(
    (p) => ahora - new Date(p.creado_en).getTime() <= 180 * DIA_MS
  )
  const anteriores = pedidos.filter((p) => {
    const antiguedad = ahora - new Date(p.creado_en).getTime()
    return antiguedad > 180 * DIA_MS && antiguedad <= 360 * DIA_MS
  })
  const ticketReciente = recientes.length
    ? recientes.reduce((a, p) => a + p.total, 0) / recientes.length
    : null
  const ticketAnterior = anteriores.length
    ? anteriores.reduce((a, p) => a + p.total, 0) / anteriores.length
    : null
  const tendenciaTicket =
    ticketReciente !== null && ticketAnterior
      ? (ticketReciente - ticketAnterior) / ticketAnterior
      : null

  // Categoría dominante: gasto por categoría principal del producto,
  // vía `pedido_items` → `productos` → `producto_categorias`.
  const pedidoIds = pedidos.map((p) => p.id)
  const { data: items, error: errorItems } = await supabase
    .from("pedido_items")
    .select("producto_id, subtotal")
    .in("pedido_id", pedidoIds)
  if (errorItems) throw errorItems

  let categoriaDominante: ComportamientoCompra["categoriaDominante"] = null
  const productoIds = [...new Set((items ?? []).map((i) => i.producto_id))]
  if (productoIds.length > 0) {
    const { data: categorias, error: errorCategorias } = await supabase
      .from("producto_categorias")
      .select("producto_id, categorias(nombre)")
      .eq("es_principal", true)
      .in("producto_id", productoIds)
    if (errorCategorias) throw errorCategorias

    const categoriaPorProducto = new Map(
      (categorias ?? []).map((c) => [
        c.producto_id,
        (c.categorias as { nombre: string } | null)?.nombre ?? "Sin categoría",
      ])
    )
    const gastoPorCategoria = new Map<string, number>()
    for (const item of items ?? []) {
      const categoria =
        categoriaPorProducto.get(item.producto_id) ?? "Sin categoría"
      gastoPorCategoria.set(
        categoria,
        (gastoPorCategoria.get(categoria) ?? 0) + item.subtotal
      )
    }
    const categoriaTop = [...gastoPorCategoria.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0]
    if (categoriaTop && totalGeneral > 0) {
      categoriaDominante = {
        nombre: categoriaTop[0],
        porcentaje: categoriaTop[1] / totalGeneral,
      }
    }
  }

  const ultimaCompra = pedidos[pedidos.length - 1].creado_en
  const proximaEstimada = intervaloDias
    ? new Date(
        new Date(ultimaCompra).getTime() + intervaloDias * DIA_MS
      ).toISOString()
    : null

  return {
    totalPedidos: pedidos.length,
    tiendaHabitual: tiendaTop
      ? {
          nombre: tiendaTop.nombre,
          porcentaje: tiendaTop.conteo / pedidos.length,
        }
      : null,
    canalPreferido: canalTop
      ? { canal: canalTop[0], porcentaje: canalTop[1] / pedidos.length }
      : null,
    frecuenciaMensual,
    intervaloDias,
    ticketPromedio,
    tendenciaTicket,
    categoriaDominante,
    ultimaCompra,
    proximaEstimada,
  }
}

export type ValorComercial = {
  totalPedidos: number
  ltv: number
  margen: number
  margenPct: number | null
  devoluciones: number
  valorPrevisto12m: number
  valorPrevistoMargen: number
  tendenciaPct: number
  riesgoFuga: number
  riesgoFugaDelta: number | null
  serieMensual: number[]
}

function calcularRiesgoFuga(
  pedidos: { creado_en: string }[],
  hastaMs: number
): number | null {
  const filas = pedidos.filter(
    (p) => new Date(p.creado_en).getTime() <= hastaMs
  )
  if (filas.length < 2) return null
  // Suma de intervalos consecutivos = última fecha - primera fecha
  // (telescópica): no hace falta sumar par a par.
  const primeraFecha = new Date(filas[0].creado_en).getTime()
  const ultimaFecha = new Date(filas[filas.length - 1].creado_en).getTime()
  const intervaloPromedio = (ultimaFecha - primeraFecha) / (filas.length - 1)
  const diasDesdeUltima = hastaMs - ultimaFecha
  return Math.min(
    100,
    Math.round((diasDesdeUltima / (intervaloPromedio * 2)) * 100)
  )
}

/**
 * "Sección · VALOR COMERCIAL" (05.3g), real: LTV y margen salen de
 * `pedidos`/`pedido_items`. "Valor previsto 12m" y "Riesgo de fuga" son
 * heurísticas (tendencia de gasto reciente, intervalo entre compras) — no
 * hay un modelo de scoring en este proyecto, y una heurística real es más
 * honesto que un número fijo.
 */
export async function getValorComercial(
  pedidosSocio: PedidoSocio[]
): Promise<ValorComercial> {
  const completados = pedidosSocio.filter((p) => p.estado === "completado")
  const devoluciones = pedidosSocio
    .filter((p) => p.estado === "devuelto")
    .reduce((acc, p) => acc + p.total, 0)

  const ltv = completados.reduce((acc, p) => acc + p.total, 0)
  const costoTotal = completados.reduce((acc, p) => acc + p.costo_total, 0)
  const margen = ltv - costoTotal
  const margenPct = ltv > 0 ? margen / ltv : null

  const ahora = Date.now()
  const serieMensual = Array.from({ length: 8 }, (_, i) => {
    const desde = ahora - (8 - i) * 30 * DIA_MS
    const hasta = ahora - (7 - i) * 30 * DIA_MS
    return completados
      .filter((p) => {
        const t = new Date(p.creado_en).getTime()
        return t >= desde && t < hasta
      })
      .reduce((acc, p) => acc + p.total, 0)
  })

  const promedioReciente = serieMensual.slice(-3).reduce((a, b) => a + b, 0) / 3
  const promedioAnterior =
    serieMensual.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
  const tendencia =
    promedioAnterior > 0 ? promedioReciente / promedioAnterior : 1
  const tendenciaAcotada = Math.min(1.5, Math.max(0.5, tendencia))
  const valorPrevisto12m = Math.round(promedioReciente * 12 * tendenciaAcotada)
  const valorPrevistoMargen =
    margenPct !== null ? Math.round(valorPrevisto12m * margenPct) : 0
  const tendenciaPct = Math.round(Math.abs(tendenciaAcotada - 1) * 100)

  const riesgoFuga = calcularRiesgoFuga(completados, ahora) ?? 0
  const riesgoHace30d = calcularRiesgoFuga(completados, ahora - 30 * DIA_MS)
  const riesgoFugaDelta =
    riesgoHace30d !== null ? riesgoFuga - riesgoHace30d : null

  return {
    totalPedidos: completados.length,
    ltv,
    margen,
    margenPct,
    devoluciones,
    valorPrevisto12m,
    valorPrevistoMargen,
    tendenciaPct,
    riesgoFuga,
    riesgoFugaDelta,
    serieMensual,
  }
}
