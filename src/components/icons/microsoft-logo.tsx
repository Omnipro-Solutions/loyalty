import { cn } from "@/lib/utils"

// Colores oficiales de marca de Microsoft — no son tokens de este design
// system, son fijos por el logo en sí (igual que cualquier logo de terceros).
const SQUARES = [
  { color: "#f1512e", x: "0", y: "0" },
  { color: "#7ebf08", x: "1", y: "0" },
  { color: "#00a9f1", x: "0", y: "1" },
  { color: "#ffb300", x: "1", y: "1" },
] as const

/** Logo de 4 cuadros de Microsoft (Figma "Logo / Microsoft", 1152:4607 y análogos). */
export function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid grid-cols-2 gap-[1.2px]", className)}>
      {SQUARES.map((sq) => (
        <div key={sq.color} style={{ backgroundColor: sq.color }} />
      ))}
    </div>
  )
}
