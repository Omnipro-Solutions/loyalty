import { cn } from "@/lib/utils"

type SparklineProps = {
  values: number[]
  className?: string
  strokeClassName?: string
}

/** Duplicado de `features/members/components/sparkline.tsx` por aislamiento entre features: trazo simple + punto final generado en SVG a partir de la serie real. */
export function Sparkline({
  values,
  className,
  strokeClassName = "stroke-primary",
}: SparklineProps) {
  if (values.length < 2) {
    return <div className={cn("h-[26px] w-full", className)} />
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 100
  const height = 26
  const margin = height * 0.1

  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - margin - ((value - min) / range) * (height - margin * 2)
    return [x, y] as const
  })

  const [lastX, lastY] = points[points.length - 1] ?? [0, 0]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-[26px] w-full overflow-visible", className)}
    >
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={strokeClassName}
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={2}
        className={strokeClassName.replace("stroke-", "fill-")}
      />
    </svg>
  )
}
