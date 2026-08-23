"use client"

import { History } from "lucide-react"
import { useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  formatCOP,
  formatDeltaPorcentaje,
  formatFechaEvento,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  PRODUCTO_EVENTO_CATEGORIAS,
  type ProductoEventoCategoria,
} from "@/types/domain"

import type { ProductoEvento } from "../lib/queries"

const CAMPO_LABEL: Record<string, string> = {
  proveedor: "Proveedor",
  marca: "Marca",
  presentacion: "Presentación",
  tipo_producto: "Tipo de producto",
  codigo_barras: "Código de barras",
  nombre: "Nombre",
}

const ESTADO_LABEL: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
}

function nombreArchivo(url: string): string {
  return url.split("/").pop() ?? url
}

/** Reconstruye el texto "valor anterior → valor nuevo" del Figma a partir de las columnas reales del evento — cada rama es un caso genuino de `productos_registrar_eventos()`. */
function detalleEvento(evento: ProductoEvento): string | null {
  const { categoria, campo, valor_anterior, valor_nuevo, descripcion } = evento

  if (categoria === "estado") {
    const anterior = ESTADO_LABEL[valor_anterior ?? ""] ?? valor_anterior ?? "—"
    const nuevo = ESTADO_LABEL[valor_nuevo ?? ""] ?? valor_nuevo ?? "—"
    return `${anterior} → ${nuevo}`
  }

  if (categoria === "precio" && valor_anterior && valor_nuevo) {
    const anterior = Number(valor_anterior)
    const nuevo = Number(valor_nuevo)
    const cambio = anterior !== 0 ? (nuevo - anterior) / anterior : 0
    const prefijo = descripcion ? `${descripcion}  ·  ` : ""
    const porcentaje = formatDeltaPorcentaje(cambio).replace("%", " %")
    return `${prefijo}${formatCOP(anterior)} → ${formatCOP(nuevo)}  (${porcentaje})`
  }

  if (campo === "imagen_url" && valor_nuevo) {
    return `Imagen actualizada: ${nombreArchivo(valor_nuevo)}`
  }

  if (campo && campo in CAMPO_LABEL) {
    const etiqueta = CAMPO_LABEL[campo]
    return valor_anterior !== null
      ? `${etiqueta}: “${valor_anterior}” → “${valor_nuevo}”`
      : `${etiqueta} asignado: “${valor_nuevo}”`
  }

  if (valor_anterior !== null || valor_nuevo !== null) {
    return `${valor_anterior ?? "—"} → ${valor_nuevo ?? "—"}`
  }

  return descripcion
}

const CATEGORIA_LABEL: Record<ProductoEventoCategoria, string> = {
  precio: "Precios",
  datos: "Datos del producto",
  promocion: "Promociones",
  estado: "Estado",
}

const CATEGORIA_TAG_LABEL: Record<ProductoEventoCategoria, string> = {
  precio: "PRECIO",
  datos: "DATOS",
  promocion: "PROMOCIÓN",
  estado: "ESTADO",
}

/** Variante del `Badge` compartido por categoría — verificada contra `get_variable_defs` del nodo 1218:4026: precio=info (primary/50-700), datos=neutral (bg/subtle+text/secondary), promoción=success, estado=warning. */
const CATEGORIA_BADGE_VARIANT: Record<
  ProductoEventoCategoria,
  "info" | "neutral" | "success" | "warning"
> = {
  precio: "info",
  datos: "neutral",
  promocion: "success",
  estado: "warning",
}

/** Color del punto del riel — verificado exportando los 5 SVG "Rail" del nodo (data/indigo, data/coral, data/teal, data/amber, data/violet). No sigue 1:1 la categoría: "Imagen actualizada" es violeta aunque su tag sea DATOS. */
const CATEGORIA_DOT_CLASS: Record<ProductoEventoCategoria, string> = {
  precio: "bg-data-indigo",
  datos: "bg-data-teal",
  promocion: "bg-data-coral",
  estado: "bg-data-amber",
}

const FILTROS = ["todos", ...PRODUCTO_EVENTO_CATEGORIAS] as const
type Filtro = (typeof FILTROS)[number]

const PAGINA = 8

function colorDot(evento: ProductoEvento): string {
  if (evento.campo === "imagen_url") return "bg-data-violet"
  return CATEGORIA_DOT_CLASS[evento.categoria as ProductoEventoCategoria]
}

function EventoRow({
  evento,
  esPrimero,
  esUltimo,
}: {
  evento: ProductoEvento
  esPrimero: boolean
  esUltimo: boolean
}) {
  const categoria = evento.categoria as ProductoEventoCategoria
  const detalle = detalleEvento(evento)

  return (
    <div className="flex gap-3.5 py-3.5">
      <p className="w-[140px] shrink-0 font-mono text-[11px] leading-4 text-muted-foreground">
        {formatFechaEvento(evento.creado_en)}
      </p>
      <div className="relative flex w-3 shrink-0 flex-col items-center">
        {!esPrimero && (
          <div className="absolute top-0 h-1/2 w-[1.5px] bg-border" />
        )}
        {!esUltimo && (
          <div className="absolute bottom-0 h-1/2 w-[1.5px] bg-border" />
        )}
        <div
          className={cn(
            "z-10 mt-[3px] size-3 shrink-0 rounded-full ring-[3px] ring-background",
            colorDot(evento)
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] leading-[18px] font-semibold text-foreground">
            {evento.titulo}
          </p>
          <Badge
            variant={CATEGORIA_BADGE_VARIANT[categoria]}
            className="h-auto shrink-0 rounded-[6px] px-[7px] py-0.5 text-[9px] leading-[13px] font-semibold tracking-[0.3px]"
          >
            {CATEGORIA_TAG_LABEL[categoria]}
          </Badge>
        </div>
        {detalle && (
          <p className="text-[12px] leading-[17px] text-muted-foreground">
            {detalle}
          </p>
        )}
        <p className="text-[11px] leading-[15px] text-muted-foreground">
          {evento.autor_nombre}
          {evento.es_automatico && " · automático"}
        </p>
      </div>
    </div>
  )
}

type BitacoraProductoCardProps = { eventos: ProductoEvento[] }

/** Figma "Card · Bitácora de cambios" (1218:4026), "03.3 · Catálogo · detalle de producto · v2" — generada por triggers reales, ver 20260823160000_bitacora_producto.sql. */
export function BitacoraProductoCard({ eventos }: BitacoraProductoCardProps) {
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [visibles, setVisibles] = useState(PAGINA)

  const filtrados =
    filtro === "todos" ? eventos : eventos.filter((e) => e.categoria === filtro)
  const mostrados = filtrados.slice(0, visibles)

  function seleccionarFiltro(siguiente: Filtro) {
    setFiltro(siguiente)
    setVisibles(PAGINA)
  }

  return (
    <div className="w-full rounded-[20px] bg-background shadow-form-section">
      <div className="flex flex-col gap-3.5 px-[22px] pt-[18px] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[16px] leading-[23px] font-semibold text-foreground">
              Bitácora del producto
            </p>
            <p className="text-[11px] leading-[15px] text-muted-foreground">
              Todos los cambios de precio, datos, promociones y estado en un
              solo lugar
            </p>
          </div>
          <button
            type="button"
            disabled
            className="shrink-0 cursor-not-allowed rounded-[10px] bg-muted px-4 py-2 text-xs font-medium text-muted-foreground"
          >
            Exportar bitácora
          </button>
        </div>

        {eventos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {FILTROS.map((f) => {
              const activo = filtro === f
              const conteo =
                f === "todos"
                  ? eventos.length
                  : eventos.filter((e) => e.categoria === f).length
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => seleccionarFiltro(f)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11px] leading-4",
                    activo
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "bg-muted font-medium text-muted-foreground"
                  )}
                >
                  {f === "todos" ? "Todos" : CATEGORIA_LABEL[f]} ({conteo})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {eventos.length === 0 ? (
        <EmptyState
          icon={History}
          titulo="Sin cambios registrados"
          descripcion="Los cambios de precio, datos, promociones y estado de este producto aparecerán aquí a medida que ocurran."
          className="pt-0 pb-8"
        />
      ) : (
        <>
          <div className="flex flex-col divide-y divide-muted px-[22px] pt-1.5 pb-2.5">
            {mostrados.map((evento, i) => (
              <EventoRow
                key={evento.id}
                evento={evento}
                esPrimero={i === 0}
                esUltimo={i === mostrados.length - 1}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-b-[20px] bg-neutral-50 px-[22px] py-3.5 text-xs">
            <p className="flex-1 text-muted-foreground">
              Mostrando {mostrados.length} de {filtrados.length} eventos
            </p>
            {visibles < filtrados.length && (
              <button
                type="button"
                onClick={() => setVisibles((v) => v + PAGINA)}
                className="shrink-0 font-medium text-primary"
              >
                Cargar más eventos
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
