"use client"

import { createContext, useContext } from "react"

import type { NotificationsSnapshot } from "@/lib/notifications"

const NotificationsContext = createContext<NotificationsSnapshot | null>(null)

export const NotificationsProvider = NotificationsContext.Provider

/**
 * Las notificaciones viajan por contexto por la misma razón que el estado
 * del cajón (`mobile-nav-context.tsx`): la campana la pinta `AppTopbar`, que
 * se monta por pantalla desde `AppPage`, mientras quien puede consultarlas
 * es el layout del grupo `(app)` — el único Server Component que envuelve a
 * todas.
 *
 * Y no se resuelven en `AppPage`, aunque sería más directo: `AppPage`
 * también lo usan los 26 `loading.tsx`, y volverlo `async` haría que cada
 * esqueleto esperara una consulta a la base antes de aparecer. Un esqueleto
 * que tarda en pintarse no es un esqueleto.
 *
 * Devuelve `null` fuera del shell (`(auth)`, `/ds`): ahí la campana sale sin
 * novedades en vez de reventar.
 */
export function useNotifications() {
  return useContext(NotificationsContext)
}
