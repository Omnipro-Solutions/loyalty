import { ChevronLeft } from "lucide-react"
import Link from "next/link"

type BackLinkProps = {
  href: string
  children: React.ReactNode
}

/** "‹ Volver" link for detail pages with no direct Figma equivalent. */
export function BackLink({ href, children }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-3.5" />
      {children}
    </Link>
  )
}
