"use client"

import { PlugZap } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { FilterSearch } from "@/components/filters/search"
import { Button } from "@/components/ui/button"

import type { IntegracionGrupo } from "../lib/catalogo"
import { IntegracionCard } from "./integracion-card"
import { IntegracionDetallePanel } from "./integracion-detalle-panel"
import { IntegracionesRail } from "./integraciones-rail"

type IntegracionesCatalogoProps = {
  direccion: "origen" | "destino"
  grupos: IntegracionGrupo[]
  seleccionInicialId: string
  titulo: string
  descripcion: string
  labelBuscar: string
  labelTotal: string
  labelTodos: string
  labelAccionSecundaria: string
  labelAccionPrimaria: string
}

/**
 * Orquesta el "12.1/12.2 · Integraciones" completo (encabezado, rail de
 * categorías, grilla y panel de detalle) — sin backend detrás: es el
 * catálogo de la Fase 1, por eso "Configurar" y las acciones del
 * encabezado quedan deshabilitadas, igual que en el Figma.
 */
export function IntegracionesCatalogo({
  direccion,
  grupos,
  seleccionInicialId,
  titulo,
  descripcion,
  labelBuscar,
  labelTotal,
  labelTodos,
  labelAccionSecundaria,
  labelAccionPrimaria,
}: IntegracionesCatalogoProps) {
  const [modo, setModo] = useState<"todas" | "mias">("todas")
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [seleccionId, setSeleccionId] = useState(seleccionInicialId)

  const todasLasIntegraciones = useMemo(
    () => grupos.flatMap((grupo) => grupo.integraciones),
    [grupos]
  )
  const total = todasLasIntegraciones.length

  const categorias = useMemo(
    () =>
      grupos.map((grupo) => ({
        nombre: grupo.categoria,
        total: grupo.integraciones.length,
      })),
    [grupos]
  )

  const grupoFiltrados = useMemo(() => {
    const busqueda = query.trim().toLowerCase()
    return grupos
      .filter(
        (grupo) => !categoriaActiva || grupo.categoria === categoriaActiva
      )
      .map((grupo) => ({
        ...grupo,
        integraciones: grupo.integraciones.filter((integracion) =>
          integracion.nombre.toLowerCase().includes(busqueda)
        ),
      }))
      .filter((grupo) => grupo.integraciones.length > 0)
  }, [grupos, categoriaActiva, query])

  const seleccionada =
    todasLasIntegraciones.find(
      (integracion) => integracion.id === seleccionId
    ) ?? null

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[22px] leading-7 font-bold text-foreground">
            {titulo}
          </p>
          <p className="text-xs text-muted-foreground">{descripcion}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/ajustes/integraciones?tab=sistema" />}
          >
            {labelAccionSecundaria}
          </Button>
          <Button size="sm" disabled>
            {labelAccionPrimaria}
          </Button>
        </div>
      </div>

      <div className="flex w-full items-start gap-5">
        <IntegracionesRail
          labelTodos={labelTodos}
          modo={modo}
          onModoChange={setModo}
          categorias={categorias}
          categoriaActiva={categoriaActiva}
          onCategoriaChange={setCategoriaActiva}
        />

        {modo === "mias" ? (
          <div className="flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
            <EmptyState
              icon={PlugZap}
              titulo="Todavía no tienes conexiones activas"
              descripcion="Cuando actives una integración desde el catálogo, aparecerá acá."
            />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <FilterSearch
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={labelBuscar}
                className="w-full rounded-[10px]"
              />
              <p className="shrink-0 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
                {total} {labelTotal}
              </p>
            </div>

            {grupoFiltrados.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
                <p className="py-16 text-sm text-muted-foreground">
                  Ninguna integración coincide con la búsqueda.
                </p>
              </div>
            ) : (
              grupoFiltrados.map((grupo) => (
                <div
                  key={grupo.categoria}
                  className="flex w-full flex-col gap-2.5"
                >
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-[13px] font-semibold text-foreground">
                      {grupo.categoria}
                    </p>
                    <p className="text-[10.5px] whitespace-nowrap text-muted-foreground">
                      {grupo.integraciones.length}{" "}
                      {grupo.integraciones.length === 1
                        ? "disponible"
                        : "disponibles"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {grupo.integraciones.map((integracion) => (
                      <IntegracionCard
                        key={integracion.id}
                        integracion={integracion}
                        seleccionada={integracion.id === seleccionId}
                        onSeleccionar={() => setSeleccionId(integracion.id)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {modo === "todas" && seleccionada && (
          <IntegracionDetallePanel
            integracion={seleccionada}
            categoria={
              grupos.find((grupo) =>
                grupo.integraciones.some((i) => i.id === seleccionada.id)
              )?.categoria ?? ""
            }
            direccion={direccion}
            onCerrar={() => setSeleccionId("")}
          />
        )}
      </div>
    </div>
  )
}
