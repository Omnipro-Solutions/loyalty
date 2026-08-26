"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import { colorByRootCategory } from "../lib/categories-tree"
import type { ClassificationPath, Product } from "../lib/queries"

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
        {label}
      </p>
      <p className="text-[13px] font-medium text-foreground">{value}</p>
    </div>
  )
}

function CopiableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
        {label}
      </p>
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-1.5 text-left"
        aria-label={`Copiar ${label.toLowerCase()}`}
      >
        <span className="font-mono text-xs text-foreground">{value}</span>
        {copied ? (
          <Check className="size-[11px] text-success" />
        ) : (
          <Copy className="size-[11px] text-muted-foreground" />
        )}
      </button>
    </div>
  )
}

const DIVIDER = <div className="h-[30px] w-px shrink-0 bg-border" />

type ClassificationGroup = {
  root: string
  color: string
  paths: ClassificationPath[]
}

/**
 * Agrupa las rutas por categoría raíz para no repetir "Analgésicos ›" en
 * cada fila cuando un producto tiene varias subcategorías de la misma
 * familia — el crecimiento pasa a ser horizontal (chips que envuelven) en
 * vez de una fila completa por cada subcategoría.
 */
function groupByRootCategory(
  paths: ClassificationPath[]
): ClassificationGroup[] {
  const byRoot = new Map<string, ClassificationPath[]>()
  for (const path of paths) {
    const root = path.parentName ?? path.name
    byRoot.set(root, [...(byRoot.get(root) ?? []), path])
  }
  return [...byRoot.entries()].map(([root, rootPaths]) => ({
    root,
    color: colorByRootCategory(root),
    paths: rootPaths,
  }))
}

function PathChip({ path }: { path: ClassificationPath }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] leading-4",
        path.isPrimary
          ? "bg-accent font-semibold text-accent-foreground"
          : "bg-background text-secondary-foreground"
      )}
    >
      {path.isPrimary && <Check className="size-[9px]" />}
      {path.parentName ? path.name : "General"}
    </span>
  )
}

/** Todo en una sola línea (nombre de la raíz + chips) — se envuelve solo si no cabe. */
function ClassificationGroupRow({ group }: { group: ClassificationGroup }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5">
      <span className={cn("size-[6px] shrink-0 rounded-full", group.color)} />
      <span className="shrink-0 text-xs font-semibold text-foreground">
        {group.root}
      </span>
      {group.paths.map((path) => (
        <PathChip key={path.categoryId} path={path} />
      ))}
    </div>
  )
}

const INITIAL_VISIBLE_GROUPS = 4

function ClassificationSection({
  paths,
  productType,
}: {
  paths: ClassificationPath[]
  productType: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const groups = groupByRootCategory(paths)
  const visible = expanded ? groups : groups.slice(0, INITIAL_VISIBLE_GROUPS)
  const remaining = groups.length - visible.length

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <p className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
          CLASIFICACIÓN
        </p>
        <span className="rounded-full bg-accent px-[7px] py-px text-[9px] font-semibold tracking-[0.2px] text-accent-foreground">
          {paths.length} {paths.length === 1 ? "ruta" : "rutas"}
        </span>
        <div className="flex-1" />
        <p className="flex items-center gap-1.5 text-[11px]">
          <span className="text-[9px] font-semibold tracking-[0.6px] text-muted-foreground">
            TIPO DE PRODUCTO
          </span>
          <span className="text-secondary-foreground">
            {productType ?? "—"}
          </span>
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin categoría asignada todavía.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {visible.map((group) => (
            <ClassificationGroupRow key={group.root} group={group} />
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-secondary-foreground"
        >
          +{remaining} {remaining === 1 ? "categoría" : "categorías"}
        </button>
      )}
    </div>
  )
}

type ProductDetailCardProps = { product: Product }

/** Figma "Card · Ficha del producto" (1212:4027) — clasificación adaptada a multi-categoría con subcategorías. */
export function ProductDetailCard({ product }: ProductDetailCardProps) {
  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <p className="text-[15px] font-semibold text-foreground">
        Ficha del producto
      </p>
      <div className="flex flex-wrap items-start gap-x-3.5 gap-y-4">
        <CopiableField
          label="ID DEL PRODUCTO"
          value={product.codigo_producto}
        />
        {DIVIDER}
        <CopiableField label="SKU" value={product.sku} />
        {DIVIDER}
        {product.codigo_barras ? (
          <CopiableField
            label="CÓDIGO DE BARRAS"
            value={product.codigo_barras}
          />
        ) : (
          <Field label="CÓDIGO DE BARRAS" value="—" />
        )}
        {DIVIDER}
        <Field label="MARCA" value={product.marca ?? "—"} />
        {DIVIDER}
        <Field label="PROVEEDOR" value={product.proveedor ?? "—"} />
        {DIVIDER}
        <Field
          label="COSTO UNITARIO"
          value={
            product.costo_unitario !== null
              ? formatUSD(product.costo_unitario)
              : "—"
          }
        />
      </div>
      <div className="h-px w-full bg-muted" />
      <ClassificationSection
        paths={product.paths}
        productType={product.tipo_producto}
      />
    </div>
  )
}
