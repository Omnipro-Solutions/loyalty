import { cn } from "@/lib/utils"

export type DonutSlice = {
  key: string
  label: string
  /** Proporción 0-1 del total. */
  share: number
  /** Color del arco — referencia a un token (`var(--color-data-indigo)`), nunca un hex suelto. */
  color: string
}

type DonutChartProps = {
  slices: DonutSlice[]
  size?: number
  /** Grosor del anillo. Fino a propósito: el dato es la proporción, no el área. */
  thickness?: number
  /** Cifra grande del centro. */
  centerValue: string
  /** Renglón pequeño bajo la cifra. */
  centerLabel?: string
  className?: string
}

/**
 * Anillo de composición para tarjetas KPI. Ocupa la mitad de alto que una
 * barra apilada con su leyenda debajo, que es justo el problema que
 * resuelve: en una fila de 3 tarjetas, la más alta estira a las otras dos.
 *
 * El arco solo acompaña — la identidad la llevan las etiquetas de al lado,
 * nunca el color solo. Cada segmento deja un hueco de 2px contra el fondo
 * en vez de un borde de otro color.
 */
export function DonutChart({
  slices,
  size = 84,
  thickness = 10,
  centerValue,
  centerLabel,
  className,
}: DonutChartProps) {
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  // El hueco se descuenta del propio arco, así la suma sigue cerrando el
  // círculo aunque haya 5 segmentos.
  const gap = slices.length > 1 ? 2 : 0

  // Desplazamiento acumulado por segmento, calculado ANTES de pintar: ir
  // mutando un contador dentro del `map` es un efecto en pleno render.
  const arcs = slices.reduce<
    { slice: DonutSlice; length: number; offset: number }[]
  >((acc, slice) => {
    const previous = acc.at(-1)
    const offset = previous
      ? previous.offset + previous.slice.share * circumference
      : 0
    return [
      ...acc,
      {
        slice,
        length: Math.max(slice.share * circumference - gap, 0),
        offset,
      },
    ]
  }, [])

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        // El centro ya dice el valor y la leyenda las etiquetas: para un
        // lector de pantalla el anillo es decorativo.
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={thickness}
        />
        {arcs.map(({ slice, length, offset }) => (
          <circle
            key={slice.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={thickness}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            // Empieza arriba, no a las 3 en punto.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] leading-5 font-semibold text-foreground tabular-nums">
          {centerValue}
        </span>
        {centerLabel && (
          <span className="max-w-[70%] truncate text-[9px] leading-3 text-muted-foreground">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  )
}
