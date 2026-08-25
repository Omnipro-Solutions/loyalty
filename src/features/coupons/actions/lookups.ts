"use server"

import { z } from "zod"

import { couponsActionClient } from "./action-client"
import { searchMembers } from "../lib/queries"

/**
 * Búsqueda de socios para el paso "Destinatario" del asistente — de solo
 * lectura, sin gate de permiso propio (mismo criterio que
 * `simulatePromotionAction`): cualquiera que puede abrir el asistente
 * puede buscar a quién asignarle un cupón.
 */
export const searchMembersAction = couponsActionClient
  .inputSchema(z.object({ search: z.string() }))
  .action(async ({ parsedInput }) => {
    const members = await searchMembers(parsedInput.search)
    return { ok: true as const, members }
  })
