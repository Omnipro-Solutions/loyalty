import type { BuilderNodeType } from "@/types/domain"

import { inferType, VARIABLES_BY_TYPE } from "./node-variables"

export function DataTab({ tipo }: { tipo: BuilderNodeType }) {
  const variables = VARIABLES_BY_TYPE[tipo]

  if (!variables?.length) {
    return (
      <p className="text-[12px] text-muted-foreground">
        Este bloque no expone variables hacia adelante en el flujo.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] leading-[13px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Variables disponibles
        </p>
        <p className="text-[11px] leading-4 text-muted-foreground">
          Quedan disponibles para los bloques que siguen en el flujo.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {variables.map((v) => (
          <div
            key={v}
            className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2"
          >
            <p className="min-w-0 truncate font-mono text-[12px] text-foreground">
              {v}
            </p>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {inferType(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
