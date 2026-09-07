import Link from "next/link"

import { AppPage } from "@/components/layout/app-page"
import { SystemLog } from "@/components/data/system-log"
import {
  SYSTEM_LOG_MODULES,
  SYSTEM_LOG_MODULE_LABEL,
  type SystemLogModule,
} from "@/config/system-log"
import { formatNumber } from "@/lib/format"
import { getMemberName, listSystemEvents } from "@/lib/system-log"

/**
 * Antes era "Logs de promociones" y solo leía `promocion_eventos`. Un canje
 * pagado con un cupón que un journey emitió son tres eventos del mismo
 * hecho: separados en tres pantallas, nadie reconstruye qué pasó.
 *
 * Vive en `lib` + `components` y no en una feature porque las cruza todas
 * (`members` con compras y devoluciones, `promotions`, `coupons`,
 * `builder`) y las reglas de frontera prohíben que se importen entre sí —
 * ver CLAUDE.md §2.
 *
 * `?socio=` acota el log a una persona: es a donde llevan los "Ver
 * histórico" de la ficha del cliente. El filtro va en la URL y no en estado
 * de cliente para que ese enlace sea compartible y para que el `limit` de la
 * consulta se aplique ya acotado (ver `listSystemEvents`).
 */
export default async function SystemLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ socio?: string; modulo?: string }>
}) {
  const { socio, modulo } = await searchParams
  const modulos = SYSTEM_LOG_MODULES.includes(modulo as SystemLogModule)
    ? [modulo as SystemLogModule]
    : []

  const [entries, memberName] = await Promise.all([
    listSystemEvents(modulos, 300, socio),
    socio ? getMemberName(socio) : Promise.resolve(null),
  ])

  const scoped = Boolean(socio)

  return (
    <AppPage
      breadcrumb="Configuración  ›  Logs del sistema"
      title="Logs del sistema"
    >
      {scoped && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-accent px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-accent-foreground">
              Actividad de {memberName ?? "este socio"}
              {modulos.length > 0
                ? ` · ${SYSTEM_LOG_MODULE_LABEL[modulos[0]]}`
                : ""}
              {" · "}
              {formatNumber(entries.length)} evento
              {entries.length === 1 ? "" : "s"}
            </p>
            {/* Por qué aquí hay menos filas que promociones en su ficha: la
                ficha lista lo que PUEDE usar; esto, lo que ya pasó. Decirlo
                evita la lectura de que falten datos. */}
            <p className="text-[11px] text-accent-foreground/80">
              Solo lo que ocurrió con esta persona: sus canjes, sus cupones y
              sus movimientos de puntos. Las promociones que tiene disponibles
              —y que todavía no ha usado— están en su ficha, no aquí.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {modulos.length > 0 && (
              <Link
                href={`/ajustes/logs-sistema?socio=${socio}`}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Ver todo lo suyo
              </Link>
            )}
            <Link
              href={`/clientes/${socio}`}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Ver la ficha
            </Link>
            <Link
              href="/ajustes/logs-sistema"
              className="text-[11px] font-medium text-accent-foreground/80 hover:underline"
            >
              Quitar filtro
            </Link>
          </div>
        </div>
      )}

      <SystemLog entries={entries} />
    </AppPage>
  )
}
