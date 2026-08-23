import { cn } from "@/lib/utils"

type SparklineProps = {
  valores: number[]
  className?: string
  strokeClassName?: string
}

/**
 * Figma "Sparkline" (05.3g, KPI · *): trazo simple + punto final. Sin
 * asset del Figma (era un `Vector` exportado) — se genera en SVG a partir
 * de la serie real (saldo de puntos por movimiento del ledger), no de una
 * curva decorativa fija.
 */
export function Sparkline({
  valores,
  className,
  strokeClassName = "stroke-primary",
}: SparklineProps) {
  if (valores.length < 2) {
    return <div className={cn("h-[26px] w-full", className)} />
  }

  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const rango = max - min || 1
  const width = 100
  const height = 26
  const margen = height * 0.1

  const puntos = valores.map((valor, i) => {
    const x = (i / (valores.length - 1)) * width
    const y = height - margen - ((valor - min) / rango) * (height - margen * 2)
    return [x, y] as const
  })

  const [ultimoX, ultimoY] = puntos[puntos.length - 1] ?? [0, 0]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-[26px] w-full overflow-visible", className)}
    >
      <polyline
        points={puntos.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={strokeClassName}
      />
      <circle
        cx={ultimoX}
        cy={ultimoY}
        r={2}
        className={strokeClassName.replace("stroke-", "fill-")}
      />
    </svg>
  )
}
