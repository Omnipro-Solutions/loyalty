import { createSafeActionClient } from "next-safe-action"

/**
 * Cliente base de next-safe-action. Sin middleware de sesión todavía porque
 * las únicas Server Actions de Fase 3 son las de `(auth)`, que corren
 * precisamente antes de que exista sesión completa (aal2) — una acción que
 * sí requiera sesión de app (Fase 4+) puede extender este cliente con
 * `.use(...)` en su propio módulo sin tocar este archivo.
 */
export const actionClient = createSafeActionClient()
