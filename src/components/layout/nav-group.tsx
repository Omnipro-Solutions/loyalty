/**
 * Figma "Nav / Group" (624:183). 11/14 semibold, tracking amplio,
 * pt-14 pb-6 px-10 — encabezado de sección del sidebar.
 */
export function NavGroup({ title }: { title: string }) {
  return (
    <div className="w-full px-2.5 pt-3.5 pb-1.5">
      <p className="text-[11px] leading-[14px] font-semibold tracking-[0.6px] text-muted-foreground uppercase">
        {title}
      </p>
    </div>
  )
}
