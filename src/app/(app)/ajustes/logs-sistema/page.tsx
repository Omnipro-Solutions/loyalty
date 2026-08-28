import { AppPage } from "@/components/layout/app-page"
import { SystemLog } from "@/components/data/system-log"
import { listSystemEvents } from "@/lib/system-log"

/**
 * Antes era "Logs de promociones" y solo leía `promocion_eventos`. Un canje
 * pagado con un cupón que un journey emitió son tres eventos del mismo
 * hecho: separados en tres pantallas, nadie reconstruye qué pasó.
 *
 * Vive en `lib` + `components` y no en una feature porque cruza tres
 * (`promotions`, `coupons`, `builder`) y las reglas de frontera prohíben
 * que se importen entre sí — ver CLAUDE.md §2.
 */
export default async function SystemLogsPage() {
  const entries = await listSystemEvents()

  return (
    <AppPage
      breadcrumb="Configuración  ›  Logs del sistema"
      title="Logs del sistema"
    >
      <SystemLog entries={entries} />
    </AppPage>
  )
}
