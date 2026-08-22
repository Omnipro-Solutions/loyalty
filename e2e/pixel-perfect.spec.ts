import { test } from "@playwright/test"

/**
 * Mapa componente → nodeId de Figma (fileKey KxtI6mzVfDqGisGhC9VAf5).
 * Cada entrada renderiza `/ds` y recorta su sección `[data-ds="<key>"]`
 * a `screenshots/<key>.png`; comparar a mano contra `get_screenshot` del
 * nodeId correspondiente. No hay snapshots versionados todavía — este
 * spec es la herramienta del bucle de verificación, no un test que falle
 * el CI (ver CLAUDE.md §7).
 */
const COMPONENTES = {
  "brand-mark": "686:204",
  "layout-sidebar": "624:561",
  "layout-sidebar-rail": "680:230",
  "layout-topbar": "624:614",
  button: "624:199",
  badge: "624:215",
  switch: "624:441",
} as const

test.describe("pixel-perfect", () => {
  for (const [key, nodeId] of Object.entries(COMPONENTES)) {
    test(`${key} (nodeId ${nodeId})`, async ({ page }) => {
      await page.goto("/ds")
      await page
        .locator(`[data-ds="${key}"]`)
        .screenshot({ path: `screenshots/${key}.png` })
    })
  }
})
