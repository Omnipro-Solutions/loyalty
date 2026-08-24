import { test } from "@playwright/test"

/**
 * Mapa componente → nodeId de Figma (fileKey KxtI6mzVfDqGisGhC9VAf5).
 * Cada entrada renderiza `/ds` y recorta su sección `[data-ds="<key>"]`
 * a `screenshots/<key>.png`; comparar a mano contra `get_screenshot` del
 * nodeId correspondiente. No hay snapshots versionados todavía — este
 * spec es la herramienta del bucle de verificación, no un test que falle
 * el CI (ver CLAUDE.md §7).
 */
const COMPONENTS = {
  "brand-mark": "686:204",
  "layout-sidebar": "624:561",
  "layout-sidebar-rail": "680:230",
  "layout-topbar": "624:614",
  button: "624:199",
  badge: "624:215",
  switch: "624:441",
  tabs: "1088:4445",
  "catalog-product-history": "1218:4026",
  "dashboard-ai-hero": "1027:4267",
  "loading-state": "665:1597",
} as const

test.describe("pixel-perfect", () => {
  for (const [key, nodeId] of Object.entries(COMPONENTS)) {
    test(`${key} (nodeId ${nodeId})`, async ({ page }) => {
      await page.goto("/ds")
      await page
        .locator(`[data-ds="${key}"]`)
        .screenshot({ path: `screenshots/${key}.png` })
    })
  }
})

/**
 * Pantallas completas de "01 · Acceso" (Fase 3) — a diferencia de
 * COMPONENTS arriba, cada frame del Figma mide 1440x1024 completos, así
 * que se captura la página entera (no un recorte `[data-ds]`) al mismo
 * tamaño con `deviceScaleFactor: 2` para comparar 1:1 contra
 * `get_screenshot` del nodeId a esa escala.
 *
 * `/verificacion` no está aquí: exige sesión autenticada (`proxy.ts`) y
 * este entorno no tiene `SUPABASE_SERVICE_ROLE_KEY` para crear un usuario
 * de prueba confirmado sin pasar por el correo de confirmación real — ver
 * reporte de Fase 3.
 */
const AUTH_SCREENS = {
  "01.1-login": { nodeId: "634:773", path: "/login" },
  "01.3-sso-proveedor": { nodeId: "1145:4809", path: "/sso" },
  "01.4-sso-redirigiendo": {
    nodeId: "1145:4884",
    path: "/sso/redirigiendo?email=elena.marin@etter.com",
  },
  "01.5-sso-no-autorizado": {
    nodeId: "1145:4959",
    path: "/sso/no-autorizado?email=elena.marin@etter.com",
  },
} as const

test.describe("pixel-perfect · 01 Acceso", () => {
  test.use({ viewport: { width: 1440, height: 1024 }, deviceScaleFactor: 2 })

  for (const [key, { nodeId, path }] of Object.entries(AUTH_SCREENS)) {
    test(`${key} (nodeId ${nodeId})`, async ({ page }) => {
      await page.goto(path)
      // DM Sans es una web font — sin esto, la captura puede tomarse con el
      // fallback del sistema todavía puesto y dar anchos de línea distintos.
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ path: `screenshots/${key}.png` })
    })
  }
})

/**
 * Mapa componente → nodeId para "08 · Journeys" (Fase 4, primera mitad:
 * canvas + guardado). No están automatizadas aquí por la misma razón que
 * `/verificacion` en Fase 3: ambas rutas exigen sesión autenticada real
 * (`proxy.ts`), y `/journeys/[id]` además necesita un workflow real con
 * nodos — no hay un usuario/journey de prueba fijo en este entorno para
 * un fixture de CI. Verificado manualmente con Playwright contra un
 * usuario y journey desechables (creados y borrados en la misma sesión de
 * verificación) comparando contra estas capturas de Figma:
 * - `08.1-constructor` (nodeId `675:1892`) — chrome del editor: topbar,
 *   editor bar (nombre/badge/meta/botones), paleta agrupada, canvas con
 *   grid de puntos, controles de zoom, inspector vacío.
 * - `08.2-journeys-listado` (nodeId `678:2007`) — tabla de journeys.
 *   Esta implementación es un subconjunto honesto del Figma: no incluye
 *   los 4 widgets KPI ni los filtros/exportar/paginación (piden datos de
 *   analítica que no existen todavía — eso es de "Simular"/"Publicar",
 *   fuera del alcance de este fork), solo la tabla con columnas que sí
 *   tienen datos reales (journey, estado, nodos, autor, actualizado).
 */

/**
 * Mapa componente → nodeId para "02 · Dashboard" (`/resumen`, `/analitica`,
 * secciones 639:1585 y 1025:4123). Misma razón que 08/09/11 abajo para no
 * automatizarlas: `proxy.ts` exige sesión real. Construidas directamente
 * desde `get_design_context` (no desde un bucle de captura/comparación
 * manual) — pendiente verificación visual 1:1 contra Figma con un usuario
 * real:
 * - `/resumen` (nodeId `1025:4123`, "02.3 · Dashboard · IA") — pantalla que
 *   se muestra al iniciar sesión. Hero con prompt de IA que abre
 *   `AiChatPanel` (nodeId `1057:37`, estado "02.4") con una conversación de
 *   ejemplo fija — no hay modelo real detrás todavía, a propósito. Los KPIs
 *   y la tendencia SÍ salen de datos reales (`pedidos`/`members`/
 *   `promociones`, ver `features/dashboard/lib/queries.ts`); tabla de
 *   riesgo, insight del motor y top de campañas siguen de ejemplo
 *   (`features/dashboard/lib/mock-data.ts`) — no hay lógica real de
 *   "riesgo" ni un modelo de IA detrás. Sin filtros propios.
 * - `/analitica` (nodeId `639:1585`, "02.1 · Dashboard · denso") — segundo
 *   dashboard, alcanzable desde el menú ("Principal › Analítica"). La barra
 *   de filtros es real de punta a punta: rango rápido, rango de fechas
 *   (picker), comparación y segmento actualizan la URL y 5 de los 6 KPIs
 *   densos + las 3 gráficas (canjes por bucket, atribución por canal,
 *   tendencia) vuelven a consultar `pedidos`/`points_ledger`/`members`
 *   filtrados por esa ventana (ver `features/dashboard/lib/queries.ts`). Sin
 *   control de "Tienda" — `points_ledger` no tiene `tienda_id`. El KPI "ROI
 *   promocional", la meta trimestral (`KpiFeaturedWidget`) y las alertas del
 *   motor (`EngineAlertsWidget`) siguen de ejemplo y no responden a los
 *   filtros — no hay tracking de descuento, meta configurable ni motor de
 *   alertas real en el schema. "Exportar reporte" sigue sin implementar.
 */

/**
 * Mapa componente → nodeId para "09 · Equipo y permisos" (`/ajustes/equipo`,
 * sección 725:3563). Misma razón que 08 arriba para no automatizarlas:
 * `proxy.ts` exige sesión real, y además estas pantallas necesitan datos de
 * `auth.admin` (2FA/último acceso de OTRAS personas) que no existen sin un
 * `SUPABASE_SERVICE_ROLE_KEY` de un proyecto real. Verificado a mano:
 * - `09.1-equipo-usuarios` (nodeId `720:2865`) — tabla de usuarios, KPIs,
 *   filtros e "Invitar usuario". Divergencia honesta del Figma: no hay fila
 *   "Invitación enviada" en esta tabla — las invitaciones pendientes viven
 *   en su propia pestaña (`?tab=invitaciones`), porque no son perfiles
 *   reales todavía.
 * - `09.2-equipo-roles` (nodeId `718:2747`) — lista de roles + matriz de
 *   permisos editable + alcance de datos. Los 5 roles del mock (3 de
 *   sistema + 2 personalizados de ejemplo) se siembran de verdad en
 *   `supabase/seed.sql`; la matriz de valores concedidos por rol es una
 *   aproximación razonable, no una copia celda a celda del Figma.
 * - "Invitaciones" y "Registro de auditoría" (pestañas del propio tab bar
 *   09.1/09.2) no tienen pantalla propia en el Figma — la primera tiene
 *   tabla real (`invitaciones`); la segunda cae a `RoutePlaceholder`
 *   ("Fase 5") hasta que haya un registro de auditoría real que mostrar.
 */

/**
 * Mapa componente → nodeId para "11 · Audiencias" (`/audiencias`,
 * `/audiencias/[id]`, sección 842:8551). Misma razón que 08/09 arriba para
 * no automatizarlas: `proxy.ts` exige sesión real. Verificado a mano:
 * - `11.1-audiencias-listado` (nodeId `842:5955`) — KPIs (misma estructura y
 *   alto en las 4 tarjetas — todas con etiqueta/valor/leyenda, aunque solo
 *   dos tengan variación real que mostrar), tabla con buscador/exportar/
 *   paginación, columnas TAMAÑO y LOYALTY RULES ordenables de verdad
 *   (`?sort=&dir=`, no solo el ícono; "LOYALTY RULES" en vez de "Journeys"
 *   a pedido — mismo dato que `workflow_nodes`/journeys por debajo, solo
 *   cambia la copia visible en este listado). Los 24 segmentos de
 *   `supabase/seed.sql` sostienen el KPI "Total audiencias: 24"; el resto
 *   de KPIs se computan de esos mismos datos (sin perseguir los números
 *   exactos del mock, que no son internamente consistentes entre sí).
 *   Divergencia honesta: la casilla de selección de fila es solo visual
 *   (704:312) — no hay una acción de bulk que la respalde todavía, mismo
 *   espíritu que el "…" sin `onClick` de `PromotionsTable`.
 * - `11.2-audiencia-detalle` (nodeId `842:6209`) — hero con "Sincronizar
 *   ahora" real (marca `sincronizado_con_ajo`/`ultima_sincronizacion_en`,
 *   sin fingir una llamada a AJO que no existe), tamaño de audiencia con
 *   sparkline y nuevos/salieron/neto reales (`segment_size_history`),
 *   journeys vinculados reales (`workflow_nodes` con `tipo =
 *   'entra_segmento'`), y tabla de miembros. Divergencia honesta:
 *   "Distribución por nivel" reparte el tamaño real entre el nivel
 *   dominante y sus dos vecinos con pesos fijos (50/30/20) — no hay
 *   universo completo de socios por audiencia para calcularla de verdad; la
 *   comparación "vs. base general del programa" sí es real (`members` ×
 *   `tiers` de toda la organización). La tabla de miembros es una muestra
 *   curada (`segment_members`), no el universo completo.
 * - `11.3 · Audiencias · constructor` (nodeId `716:2629`) no se implementó:
 *   está marcado `hidden` en el propio archivo de Figma (no renderiza en
 *   `get_screenshot`), consistente con "Reglas de descuento" y otros
 *   módulos todavía en `RoutePlaceholder` ("Fase 5").
 */
