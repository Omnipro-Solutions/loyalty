import { ShieldAlert } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"

/**
 * Submódulo que el producto sí tiene, pero que el rol de la demo no puede
 * abrir. Es distinto de `route-placeholder.tsx`: ahí lo que falta es la
 * pantalla, aquí lo que falta es el permiso. Se dicen aparte porque un
 * "todavía no construida" sobre algo restringido hace pensar que el
 * producto está incompleto cuando en realidad está cerrado a propósito.
 *
 * El ítem sigue visible en el sidebar: que se vea y no se abra es lo que
 * comunica que hay más programa del que alcanza este rol.
 */
export function RestrictedPlaceholder({ submodule }: { submodule: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-2xl bg-background">
      <EmptyState
        icon={ShieldAlert}
        title="Solo para superusuario"
        description={`«${submodule}» no está habilitado para tu rol. En esta demo entras como administrador, y este submódulo queda reservado al superusuario del programa.`}
      />
    </div>
  )
}
