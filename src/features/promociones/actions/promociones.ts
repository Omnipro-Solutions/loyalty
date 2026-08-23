"use server"

import { revalidatePath } from "next/cache"

import { promocionesActionClient } from "./action-client"
import { detectarColisiones } from "../lib/colision"
import { tienePermiso } from "../lib/permisos"
import {
  getTotalTiendas,
  listCiudadesCondicion,
  listPromocionesActivas,
} from "../lib/queries"
import {
  actualizarPromocionSchema,
  promocionSchema,
  simularPromocionSchema,
  type PromocionValues,
} from "../schemas"
import type { Json } from "@/types/database.types"

function aFilas(valores: PromocionValues) {
  return {
    nombre: valores.nombre,
    codigo: valores.codigo,
    tipo: valores.tipo,
    prioridad: valores.prioridad,
    acumulable: valores.acumulable,
    canal_aplicacion: valores.canalAplicacion,
    combinador_condiciones: valores.combinadorCondiciones,
    condiciones: valores.condiciones as unknown as Json,
    tipo_beneficio: valores.tipoBeneficio,
    valor_beneficio: valores.valorBeneficio,
    tope_maximo: valores.topeMaximo ?? null,
    aplicar_sobre: valores.aplicarSobre,
    usos_por_cliente: valores.usosPorCliente ?? null,
    usos_periodo: valores.usosPeriodo ?? null,
    presupuesto_asignado: valores.presupuestoAsignado,
    vigente_desde: valores.vigenteDesde,
    vigente_hasta: valores.vigenteHasta || null,
    estado_publicacion: valores.estadoPublicacion,
  }
}

export const crearPromocionAction = promocionesActionClient
  .inputSchema(promocionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const accionRequerida =
      parsedInput.estadoPublicacion === "activa" ? "aprobar" : "crear"
    if (!tienePermiso(ctx.permisosSet, "promociones", accionRequerida)) {
      return {
        ok: false as const,
        message:
          accionRequerida === "aprobar"
            ? "No tienes permiso para activar promociones — guárdala como borrador."
            : "No tienes permiso para crear promociones.",
      }
    }

    const { data, error } = await ctx.supabase
      .from("promociones")
      .insert({ org_id: ctx.orgId, ...aFilas(parsedInput) })
      .select("id")
      .single()

    if (error || !data) {
      const message =
        error?.code === "23505"
          ? "Ya existe una promoción con ese código."
          : "No se pudo crear la promoción."
      return { ok: false as const, message }
    }

    revalidatePath("/promociones")
    return { ok: true as const, id: data.id as string }
  })

export const actualizarPromocionAction = promocionesActionClient
  .inputSchema(actualizarPromocionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const accionRequerida =
      parsedInput.estadoPublicacion === "activa" ? "aprobar" : "editar"
    if (!tienePermiso(ctx.permisosSet, "promociones", accionRequerida)) {
      return {
        ok: false as const,
        message:
          accionRequerida === "aprobar"
            ? "No tienes permiso para activar promociones — guárdala como borrador."
            : "No tienes permiso para editar promociones.",
      }
    }

    const { id, ...valores } = parsedInput
    const { error } = await ctx.supabase
      .from("promociones")
      .update(aFilas(valores))
      .eq("id", id)

    if (error) {
      const message =
        error.code === "23505"
          ? "Ya existe una promoción con ese código."
          : "No se pudo guardar la promoción."
      return { ok: false as const, message }
    }

    revalidatePath("/promociones")
    revalidatePath(`/promociones/${id}/editar`)
    return { ok: true as const, id }
  })

export const simularPromocionAction = promocionesActionClient
  .inputSchema(simularPromocionSchema)
  .action(async ({ parsedInput }) => {
    const [activas, ciudades, totalTiendas] = await Promise.all([
      listPromocionesActivas(parsedInput.idExcluir),
      listCiudadesCondicion(),
      getTotalTiendas(),
    ])

    const tiendaCondicion = parsedInput.condiciones.find(
      (c) => c.campo === "tienda"
    )
    const tiendasImpactadas = tiendaCondicion
      ? (ciudades.find((c) => c.ciudad === tiendaCondicion.valor)
          ?.totalTiendas ?? 0)
      : totalTiendas

    const colisiones = detectarColisiones(
      {
        condiciones: parsedInput.condiciones,
        canalAplicacion: parsedInput.canalAplicacion,
        prioridad: parsedInput.prioridad,
      },
      activas
    )

    return { ok: true as const, tiendasImpactadas, colisiones }
  })
