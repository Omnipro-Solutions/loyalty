import { cn } from "@/lib/utils"

// Official Microsoft brand colors — not tokens of this design system, they're
// fixed by the logo itself (same as any third-party logo).
const SQUARES = [
  { color: "#f1512e", x: "0", y: "0" },
  { color: "#7ebf08", x: "1", y: "0" },
  { color: "#00a9f1", x: "0", y: "1" },
  { color: "#ffb300", x: "1", y: "1" },
] as const

/** Microsoft's 4-square logo (Figma "Logo / Microsoft", 1152:4607 and analogous). */
export function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid grid-cols-2 gap-[1.2px]", className)}>
      {SQUARES.map((sq) => (
        <div key={sq.color} style={{ backgroundColor: sq.color }} />
      ))}
    </div>
  )
}
