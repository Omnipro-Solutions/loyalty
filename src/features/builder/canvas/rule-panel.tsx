"use client"

import {
  BookOpen,
  ChevronDown,
  CircleDot,
  FlaskConical,
  History,
  Rocket,
  Save,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"

import type { WorkflowActivityEntry } from "@/features/builder/canvas/queries"
import type { ReadingClause } from "@/features/builder/engine/rule-reading"
import { formatDateTime, formatRelativeTime } from "@/lib/format"
import {
  PUBLICATION_STATUS_LABEL,
  type DisplayStatus,
} from "@/lib/publication-status"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "lectura", label: "Lectura de la regla", icon: BookOpen },
  { id: "actividad", label: "Actividad", icon: History },
] as const

type Tab = (typeof TABS)[number]["id"]

/**
 * El panel inferior del editor: dos formas de mirar la MISMA regla —qué
 * hace (en palabras) y qué ha pasado con ella a lo largo del tiempo.
 *
 * La simulación NO está aquí a propósito. Su resultado se lee sobre el
 * canvas —cada tarjeta muestra cuánta cohorte le llegó—, que es donde
 * significa algo: ver «1.514 → 1.402 → 1.088» encima de los bloques dice
 * dónde se cae la gente; la misma lista en un panel aparte obligaba a
 * emparejar nombres de bloque a mano. Simular sigue en la barra superior.
 *
 * **Cerrado por defecto, y esa es la decisión de diseño principal.** Antes
 * ocupaba 260px fijos en la parte de abajo, siempre: el canvas es la
 * herramienta y el panel es la consulta, así que quedarse permanentemente
 * con un tercio de la pantalla invertía las prioridades. Ahora es una barra
 * de 36px con tres disparadores, y quien quiere leer abre; quien está
 * construyendo no paga nada.
 *
 * Los disparadores llevan icono Y etiqueta: solo con icono habría que
 * abrir los tres para saber cuál es cuál la primera vez, y ese coste se
 * paga una vez por persona pero para siempre.
 */
export function RulePanel({
  clauses,
  activity,
  displayStatus,
}: {
  clauses: ReadingClause[]
  activity: WorkflowActivityEntry[]
  displayStatus: DisplayStatus
}) {
  const [openTab, setOpenTab] = useState<Tab | null>(null)

  return (
    <div className="flex shrink-0 flex-col border-t border-border bg-background">
      <div className="flex items-center gap-1 px-4 py-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isOpen = openTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenTab(isOpen ? null : tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors",
                isOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
              {/* La flecha solo en el abierto: tres flechas apuntando hacia
                  arriba a la vez sugieren tres paneles, no uno. */}
              {isOpen && <ChevronDown className="size-3" />}
            </button>
          )
        })}

        {/* Solo con el panel abierto: fuera de ese momento es ruido
            permanente. */}
        {openTab === "lectura" && (
          <span className="ml-auto hidden text-[11px] text-muted-foreground lg:block">
            Se genera del grafo — cambiar un bloque cambia la frase
          </span>
        )}
      </div>

      {openTab && (
        <div className="h-[240px] overflow-y-auto border-t border-border p-4">
          {openTab === "lectura" && <Reading clauses={clauses} />}
          {openTab === "actividad" && (
            <Activity entries={activity} displayStatus={displayStatus} />
          )}
        </div>
      )}
    </div>
  )
}

function Reading({ clauses }: { clauses: ReadingClause[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {clauses.map((clause) => (
        <div key={clause.keyword} className="flex gap-3">
          <span className="w-[76px] shrink-0 pt-[2px] text-right font-mono text-[10.5px] font-semibold tracking-[0.4px] text-avatar-violet-fg">
            {clause.keyword}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] leading-[19px] text-foreground">
              {clause.text}
            </p>
            {clause.items && clause.items.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {clause.items.map((item, i) => (
                  <li
                    key={i}
                    className="text-[12.5px] leading-[19px] text-secondary-foreground before:mr-1.5 before:text-muted-foreground before:content-['·']"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Un icono y un color por clase de suceso — el color agrupa de un vistazo sin tener que leer cada fila. */
const ACTIVITY_META: Record<
  WorkflowActivityEntry["kind"],
  { icon: LucideIcon; dotClassName: string }
> = {
  creada: { icon: Sparkles, dotClassName: "text-muted-foreground" },
  version: { icon: Save, dotClassName: "text-muted-foreground" },
  simulacion: { icon: FlaskConical, dotClassName: "text-avatar-violet-fg" },
  publicacion: { icon: Rocket, dotClassName: "text-success" },
  estado: { icon: CircleDot, dotClassName: "text-warning" },
}

/**
 * Línea de tiempo de lo que le ha pasado a la regla.
 *
 * El riel vertical con un punto por suceso, y no una tabla: lo que importa
 * aquí es el ORDEN y la distancia entre sucesos —«se publicó y a los diez
 * minutos alguien la inactivó» cuenta una historia que dos filas de tabla
 * no—, y el riel es lo que hace visible esa secuencia.
 *
 * Cada fila lleva el tiempo relativo («hace 2 horas») como dato principal y
 * la fecha exacta como apoyo: al revisar qué pasó, «hace dos horas» sitúa
 * mucho más rápido que un timestamp, pero el timestamp es el que sirve para
 * cruzar con otro sistema.
 */
function Activity({
  entries,
  displayStatus,
}: {
  entries: WorkflowActivityEntry[]
  displayStatus: DisplayStatus
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-foreground">
        Estado actual: <b>{PUBLICATION_STATUS_LABEL[displayStatus]}</b>.
        {displayStatus === "programada" &&
          " Se deriva de estar Activa con una fecha de inicio futura — no es un estado guardado."}
      </p>

      {entries.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          Todavía no hay actividad registrada.
        </p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry, i) => {
            const meta = ACTIVITY_META[entry.kind]
            const Icon = meta.icon
            const isLast = i === entries.length - 1
            return (
              <li key={entry.id} className="flex gap-3">
                {/* Riel + punto. El riel se corta en el último para que la
                    línea no siga hacia un suceso que no existe. */}
                <div className="flex w-4 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center",
                      meta.dotClassName
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {!isLast && (
                    <span
                      className="w-px flex-1 bg-border"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-3")}>
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 flex-1 text-[12.5px] leading-[17px] font-medium text-foreground">
                      {entry.titulo}
                    </p>
                    <time
                      dateTime={entry.ocurridoEn}
                      title={formatDateTime(entry.ocurridoEn)}
                      className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground"
                    >
                      {formatRelativeTime(entry.ocurridoEn)}
                    </time>
                  </div>
                  {(entry.detalle ?? entry.actorName) && (
                    <p className="text-[11px] leading-4 text-muted-foreground">
                      {[entry.actorName, entry.detalle]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
