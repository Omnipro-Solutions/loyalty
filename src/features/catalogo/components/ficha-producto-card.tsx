"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

import { colorPorCategoriaRaiz } from "../lib/categorias-arbol"
import type { Producto, RutaClasificacion } from "../lib/queries"

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
        {etiqueta}
      </p>
      <p className="text-[13px] font-medium text-foreground">{valor}</p>
    </div>
  )
}

function CampoCopiable({
  etiqueta,
  valor,
}: {
  etiqueta: string
  valor: string
}) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    await navigator.clipboard.writeText(valor)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
        {etiqueta}
      </p>
      <button
        type="button"
        onClick={copiar}
        className="flex items-center gap-1.5 text-left"
        aria-label={`Copiar ${etiqueta.toLowerCase()}`}
      >
        <span className="font-mono text-xs text-foreground">{valor}</span>
        {copiado ? (
          <Check className="size-[11px] text-success" />
        ) : (
          <Copy className="size-[11px] text-muted-foreground" />
        )}
      </button>
    </div>
  )
}

const DIVISOR = <div className="h-[30px] w-px shrink-0 bg-border" />

type GrupoClasificacion = {
  raiz: string
  color: string
  rutas: RutaClasificacion[]
}

/**
 * Agrupa las rutas por categoría raíz para no repetir "Analgésicos ›" en
 * cada fila cuando un producto tiene varias subcategorías de la misma
 * familia — el crecimiento pasa a ser horizontal (chips que envuelven) en
 * vez de una fila completa por cada subcategoría.
 */
function agruparPorCategoriaRaiz(
  rutas: RutaClasificacion[]
): GrupoClasificacion[] {
  const porRaiz = new Map<string, RutaClasificacion[]>()
  for (const ruta of rutas) {
    const raiz = ruta.nombrePadre ?? ruta.nombre
    porRaiz.set(raiz, [...(porRaiz.get(raiz) ?? []), ruta])
  }
  return [...porRaiz.entries()].map(([raiz, rutasDeRaiz]) => ({
    raiz,
    color: colorPorCategoriaRaiz(raiz),
    rutas: rutasDeRaiz,
  }))
}

function ChipRuta({ ruta }: { ruta: RutaClasificacion }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] leading-4",
        ruta.esPrincipal
          ? "bg-accent font-semibold text-accent-foreground"
          : "bg-background text-secondary-foreground"
      )}
    >
      {ruta.esPrincipal && <Check className="size-[9px]" />}
      {ruta.nombrePadre ? ruta.nombre : "General"}
    </span>
  )
}

/** Todo en una sola línea (nombre de la raíz + chips) — se envuelve solo si no cabe. */
function GrupoClasificacionRow({ grupo }: { grupo: GrupoClasificacion }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5">
      <span className={cn("size-[6px] shrink-0 rounded-full", grupo.color)} />
      <span className="shrink-0 text-xs font-semibold text-foreground">
        {grupo.raiz}
      </span>
      {grupo.rutas.map((ruta) => (
        <ChipRuta key={ruta.categoriaId} ruta={ruta} />
      ))}
    </div>
  )
}

const GRUPOS_VISIBLES_INICIAL = 4

function ClasificacionSection({
  rutas,
  tipoProducto,
}: {
  rutas: RutaClasificacion[]
  tipoProducto: string | null
}) {
  const [expandido, setExpandido] = useState(false)
  const grupos = agruparPorCategoriaRaiz(rutas)
  const visibles = expandido ? grupos : grupos.slice(0, GRUPOS_VISIBLES_INICIAL)
  const restantes = grupos.length - visibles.length

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <p className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
          CLASIFICACIÓN
        </p>
        <span className="rounded-full bg-accent px-[7px] py-px text-[9px] font-semibold tracking-[0.2px] text-accent-foreground">
          {rutas.length} {rutas.length === 1 ? "ruta" : "rutas"}
        </span>
        <div className="flex-1" />
        <p className="flex items-center gap-1.5 text-[11px]">
          <span className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
            TIPO DE PRODUCTO
          </span>
          <span className="text-secondary-foreground">
            {tipoProducto ?? "—"}
          </span>
        </p>
      </div>

      {grupos.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin categoría asignada todavía.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {visibles.map((grupo) => (
            <GrupoClasificacionRow key={grupo.raiz} grupo={grupo} />
          ))}
        </div>
      )}

      {restantes > 0 && (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          className="self-start rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-secondary-foreground"
        >
          +{restantes} {restantes === 1 ? "categoría" : "categorías"}
        </button>
      )}
    </div>
  )
}

type FichaProductoCardProps = { producto: Producto }

/** Figma "Card · Ficha del producto" (1212:4027) — clasificación adaptada a multi-categoría con subcategorías. */
export function FichaProductoCard({ producto }: FichaProductoCardProps) {
  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <p className="text-[15px] font-semibold text-foreground">
        Ficha del producto
      </p>
      <div className="flex flex-wrap items-start gap-x-3.5 gap-y-4">
        <CampoCopiable
          etiqueta="ID DEL PRODUCTO"
          valor={producto.codigo_producto}
        />
        {DIVISOR}
        <CampoCopiable etiqueta="SKU" valor={producto.sku} />
        {DIVISOR}
        {producto.codigo_barras ? (
          <CampoCopiable
            etiqueta="CÓDIGO DE BARRAS"
            valor={producto.codigo_barras}
          />
        ) : (
          <Campo etiqueta="CÓDIGO DE BARRAS" valor="—" />
        )}
        {DIVISOR}
        <Campo etiqueta="MARCA" valor={producto.marca ?? "—"} />
        {DIVISOR}
        <Campo etiqueta="PROVEEDOR" valor={producto.proveedor ?? "—"} />
      </div>
      <div className="h-px w-full bg-muted" />
      <ClasificacionSection
        rutas={producto.rutas}
        tipoProducto={producto.tipo_producto}
      />
    </div>
  )
}
