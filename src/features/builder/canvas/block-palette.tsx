"use client"

import { GripVertical } from "lucide-react"

import { cn } from "@/lib/utils"
import { BUILDER_NODE_GROUPS, type BuilderNodeTipo } from "@/types/domain"
import { BUILDER_BLOCKS, BUILDER_GROUP_META } from "@/config/builder-blocks"

export const BLOCK_DRAG_MIME = "application/loyalty-builder-block"

/** Paleta lateral agrupada (Figma "08.1", panel izquierdo). Arrastra un bloque hacia el canvas para crearlo. */
export function BlockPalette() {
  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-background p-4">
      <p className="text-[11px] leading-[15px] font-semibold tracking-[0.6px] text-muted-foreground uppercase">
        Bloques
      </p>
      {(
        Object.keys(BUILDER_NODE_GROUPS) as (keyof typeof BUILDER_NODE_GROUPS)[]
      ).map((grupo) => {
        const grupoMeta = BUILDER_GROUP_META[grupo]
        const tipos = BUILDER_NODE_GROUPS[grupo] as readonly BuilderNodeTipo[]
        return (
          <div key={grupo} className="flex flex-col gap-1.5">
            <p className="text-[10px] leading-[14px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
              {grupoMeta.etiqueta}
            </p>
            {tipos.map((tipo) => {
              const meta = BUILDER_BLOCKS[tipo]
              const Icon = meta.icono
              return (
                <div
                  key={tipo}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(BLOCK_DRAG_MIME, tipo)
                    e.dataTransfer.effectAllowed = "move"
                  }}
                  className={cn(
                    "flex cursor-grab items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-[12px] text-foreground transition-colors hover:border-border hover:bg-muted active:cursor-grabbing"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md",
                      grupoMeta.bgClassName
                    )}
                  >
                    <Icon className={cn("size-3", grupoMeta.fgClassName)} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {meta.etiqueta}
                  </span>
                  <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
