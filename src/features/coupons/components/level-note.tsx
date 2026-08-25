import Link from "next/link"

type LevelNoteProps = { text: string; linkHref: string; linkLabel: string }

/** Figma "Nota de nivel" (13.1/13.2): explica si se está viendo el nivel de emisión o de cupón, con enlace para cambiar. */
export function LevelNote({ text, linkHref, linkLabel }: LevelNoteProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-accent px-[13px] py-[11px]">
      <p className="text-[11px] leading-4 text-accent-foreground">{text}</p>
      <Link
        href={linkHref}
        className="shrink-0 text-[11px] font-medium whitespace-nowrap text-primary"
      >
        {linkLabel}
      </Link>
    </div>
  )
}
