"use client"

import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import {
  ChevronDown,
  CircleCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { DataTable } from "@/components/data/data-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PromotionType } from "@/types/domain"

import { shortScope, scopeSummary, scopeTags } from "../lib/scope"
import { PromotionActivateDialog } from "./promotion-activate-dialog"
import { PromotionDeleteDialog } from "./promotion-delete-dialog"
import { ScopeTags } from "./scope-tags"
import { promotionStatus } from "../lib/status"
import {
  PROMOTION_STATUS_DOT,
  PROMOTION_STATUS_LABEL,
  PROMOTION_TYPE_LABEL,
} from "../lib/labels"
import type { Promotion } from "../lib/queries"
import { PROMOTION_TYPE_COLOR, PROMOTION_TYPE_ICON } from "../lib/type-icon"

const features = tableFeatures({ columnSizingFeature })
const helper = createColumnHelper<typeof features, Promotion>()

type PromotionsTableProps = {
  promotions: Promotion[]
  totalStores: number
  categoryNameById: Map<string, string>
  segmentNameById: Map<string, string>
}

/** Figma "Table" de 06.1 (706:2518): fila muestra ícono por tipo + nombre/subtítulo, alcance, canjes, presupuesto, ROI, vigencia, estado. */
export function PromotionsTable({
  promotions,
  totalStores,
  categoryNameById,
  segmentNameById,
}: PromotionsTableProps) {
  const router = useRouter()
  const ctx = useMemo(
    () => ({ totalStores, categoryNameById, segmentNameById }),
    [totalStores, categoryNameById, segmentNameById]
  )

  // Solo los borradores se pueden activar, así que son los únicos
  // seleccionables: una casilla que no lleva a ninguna acción es peor que
  // no tenerla.
  const draftIds = useMemo(
    () =>
      promotions
        .filter((p) => p.estado_publicacion === "borrador")
        .map((p) => p.id),
    [promotions]
  )
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activateIds, setActivateIds] = useState<string[]>([])
  const [deleteIds, setDeleteIds] = useState<string[]>([])

  // La selección vive por página: al cambiar de página o de filtro, las
  // filas de antes ya no están a la vista y activarlas a ciegas sería una
  // sorpresa.
  const visibleSelected = useMemo(
    () => draftIds.filter((id) => selected.has(id)),
    [draftIds, selected]
  )

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "select",
          size: 40,
          header: () =>
            draftIds.length === 0 ? null : (
              <Checkbox
                checked={
                  visibleSelected.length === draftIds.length &&
                  draftIds.length > 0
                }
                indeterminate={
                  visibleSelected.length > 0 &&
                  visibleSelected.length < draftIds.length
                }
                onCheckedChange={(checked) =>
                  setSelected(checked === true ? new Set(draftIds) : new Set())
                }
                aria-label="Seleccionar todos los borradores"
              />
            ),
          cell: (info) => {
            const promotion = info.row.original
            const isDraft = promotion.estado_publicacion === "borrador"
            if (!isDraft) return null
            return (
              <Checkbox
                checked={selected.has(promotion.id)}
                onCheckedChange={(checked) =>
                  toggle(promotion.id, checked === true)
                }
                onClick={(e) => e.stopPropagation()}
                aria-label={`Seleccionar ${promotion.nombre}`}
              />
            )
          },
        }),
        helper.display({
          id: "promotion",
          size: 240,
          header: () => "PROMOCIÓN",
          cell: (info) => {
            const promotion = info.row.original
            const type = promotion.tipo as PromotionType
            const Icon = PROMOTION_TYPE_ICON[type]
            const color = PROMOTION_TYPE_COLOR[type]
            return (
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={cn(
                    "flex size-[34px] shrink-0 items-center justify-center rounded-[10px]",
                    color.bg
                  )}
                >
                  <Icon className={cn("size-4", color.fg)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] leading-[17px] font-medium text-foreground">
                    {promotion.nombre}
                  </p>
                  <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
                    {PROMOTION_TYPE_LABEL[type]} · {shortScope(promotion, ctx)}
                  </p>
                </div>
              </div>
            )
          },
        }),
        helper.display({
          id: "scope",
          size: 130,
          header: () => "ALCANCE",
          cell: (info) => {
            const promotion = info.row.original
            return (
              <ScopeTags
                tags={scopeTags(promotion)}
                conditions={promotion.condiciones}
                names={ctx}
                fallback={scopeSummary(promotion, ctx)}
              />
            )
          },
        }),
        helper.accessor("canjes", {
          size: 90,
          header: () => "CANJES",
          cell: (info) => (
            <span className="font-semibold text-foreground">
              {formatNumber(info.getValue())}
            </span>
          ),
        }),
        helper.display({
          id: "budget",
          size: 130,
          header: () => "PRESUPUESTO",
          cell: (info) => {
            const p = info.row.original
            const percentage =
              p.presupuesto_asignado > 0
                ? p.presupuesto_consumido / p.presupuesto_asignado
                : 0
            return (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-foreground">
                  {formatPercent(percentage)}
                </span>
                <div className="h-[5px] w-full max-w-[110px] overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      percentage >= 0.85
                        ? "bg-warning"
                        : percentage >= 0.5
                          ? "bg-primary"
                          : "bg-success"
                    )}
                    style={{ width: `${Math.min(percentage * 100, 100)}%` }}
                  />
                </div>
              </div>
            )
          },
        }),
        helper.accessor("roi", {
          size: 88,
          header: () => "ROI",
          cell: (info) => {
            const roi = info.getValue()
            return (
              <span className="rounded-full bg-accent px-2 py-[3px] text-[11px] font-semibold text-accent-foreground">
                {roi === null ? "—" : `${formatNumber(roi)} ×`}
              </span>
            )
          },
        }),
        helper.display({
          id: "validity",
          size: 120,
          header: () => "VIGENCIA",
          cell: (info) => {
            const p = info.row.original
            return (
              <span className="truncate text-secondary-foreground">
                {!p.vigente_hasta
                  ? "Permanente"
                  : `${new Date(p.vigente_desde).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} – ${new Date(p.vigente_hasta).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}`}
              </span>
            )
          },
        }),
        helper.display({
          id: "status",
          size: 110,
          header: () => "ESTADO",
          cell: (info) => {
            const status = promotionStatus(info.row.original)
            return (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    PROMOTION_STATUS_DOT[status]
                  )}
                />
                <span className="text-xs">
                  {PROMOTION_STATUS_LABEL[status]}
                </span>
              </div>
            )
          },
        }),
        helper.display({
          id: "actions",
          size: 56,
          header: () => null,
          cell: (info) => {
            const promotion = info.row.original
            const isDraft = promotion.estado_publicacion === "borrador"
            return (
              <div
                className="flex justify-end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<button type="button" />}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                    aria-label={`Acciones de ${promotion.nombre}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  {/* Mismo motivo que el menú de la barra: el disparador es un ícono de 28px, así que sin `w-auto` el menú saldría de 28px de ancho. */}
                  <DropdownMenuContent
                    align="end"
                    className="w-auto min-w-[190px]"
                  >
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/promociones/${promotion.id}/editar`)
                      }
                    >
                      <Pencil className="size-4" />
                      <span className="whitespace-nowrap">
                        {isDraft ? "Editar borrador" : "Ver detalle"}
                      </span>
                    </DropdownMenuItem>
                    {isDraft && (
                      <>
                        <DropdownMenuItem
                          onClick={() => setActivateIds([promotion.id])}
                        >
                          <CircleCheck className="size-4" />
                          <span className="whitespace-nowrap">Activar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteIds([promotion.id])}
                        >
                          <Trash2 className="size-4" />
                          <span className="whitespace-nowrap">Eliminar</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          },
        }),
      ]),
    [ctx, draftIds, selected, visibleSelected, router]
  )

  const data = useMemo(() => promotions, [promotions])
  const table = useTable({ features, columns, data })

  return (
    <div className="flex w-full flex-col">
      {/*
        Barra de selección: aparece solo con algo seleccionado, así la
        tabla se ve igual que siempre mientras no se esté usando.
      */}
      {visibleSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-brand-subtle px-5 py-2.5">
          <p className="flex-1 text-xs text-secondary-foreground">
            <span className="font-semibold text-foreground">
              {visibleSelected.length}
            </span>{" "}
            {visibleSelected.length === 1
              ? "borrador seleccionado"
              : "borradores seleccionados"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Limpiar selección
          </Button>
          {/*
            Un solo botón "Acciones" en vez de uno por operación: la barra
            crece con cada acción nueva, y activar y eliminar juntas en la
            misma fila invitan a pulsar la que no era. Las dos piden
            confirmación en su diálogo antes de tocar nada.
          */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" size="sm" />}>
              Acciones
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            {/*
              `w-auto`: `DropdownMenuContent` fija el ancho al del botón que
              lo abre (`w-(--anchor-width)`), y con un botón de ~100px las
              etiquetas se partían en dos líneas. El menú se dimensiona por
              su contenido, con un mínimo para que no quede angosto.
            */}
            <DropdownMenuContent align="end" className="w-auto min-w-[230px]">
              <DropdownMenuItem onClick={() => setActivateIds(visibleSelected)}>
                <CircleCheck className="size-4" />
                <span className="whitespace-nowrap">
                  Activar {visibleSelected.length}{" "}
                  {visibleSelected.length === 1 ? "borrador" : "borradores"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteIds(visibleSelected)}
              >
                <Trash2 className="size-4" />
                <span className="whitespace-nowrap">
                  Eliminar {visibleSelected.length}{" "}
                  {visibleSelected.length === 1 ? "borrador" : "borradores"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <DataTable
        table={table}
        headerClassName="bg-neutral-50"
        onRowClick={(promotion) =>
          router.push(`/promociones/${promotion.id}/editar`)
        }
      />

      <PromotionActivateDialog
        ids={activateIds}
        open={activateIds.length > 0}
        onOpenChange={(open) => !open && setActivateIds([])}
        onActivated={() => {
          setSelected(new Set())
          setActivateIds([])
        }}
      />

      <PromotionDeleteDialog
        ids={deleteIds}
        open={deleteIds.length > 0}
        onOpenChange={(open) => !open && setDeleteIds([])}
        onDeleted={() => {
          setSelected(new Set())
          setDeleteIds([])
        }}
      />
    </div>
  )
}
