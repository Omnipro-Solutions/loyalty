const ITEMS = [
  "El ID de tienda coincide con el POS y no está duplicado.",
  "La dirección está completa para segmentación geográfica.",
  "Asignar la tienda a un grupo de precios (se puede hacer después).",
  "Habilitar acumulación de puntos del programa de lealtad.",
]

/** Figma "Card · Antes de guardar" (1241:3998): checklist informativo, no interactivo. */
export function ChecklistAntesDeGuardar() {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-background px-5 py-5 shadow-form-section">
      <p className="text-sm font-semibold text-foreground">Antes de guardar</p>
      <ul className="flex flex-col gap-3">
        {ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-xs leading-4 text-muted-foreground"
          >
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-border-strong" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
