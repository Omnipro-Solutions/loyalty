import { NoAccess } from "@/components/feedback/no-access"
import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { AppPage } from "@/components/layout/app-page"
import { RestrictedPlaceholder } from "@/components/layout/restricted-placeholder"

/**
 * "Parámetros del programa" — sin equivalente en el Figma, ver
 * `config/navigation.ts` y la Fase 0 del plan de cobertura en
 * `docs/promociones.md`.
 *
 * Cerrado al rol de la demo: lo que se configura aquí (valor del punto,
 * breakage, techo de descuento apilado, exclusiones del reglamento) mueve
 * la economía de TODO el programa, no la de una promoción — es decisión de
 * superusuario, no de administración diaria.
 *
 * El formulario sigue en el repo y funciona: para reactivarlo basta
 * devolver `<ProgramParametersForm>` con los `initialValues` de
 * `getProgramParameters()` (ver `features/settings/components/program-parameters-form.tsx`).
 */
export default async function ProgramParametersPage() {
  if (!allows(await getSessionPermissions(), "programa", "ver")) {
    return <NoAccess action="ver" moduleLabel="Parámetros del programa" />
  }

  return (
    <AppPage
      breadcrumb="Configuración  ›  Parámetros del programa"
      title="Parámetros del programa"
    >
      <RestrictedPlaceholder submodule="Parámetros del programa" />
    </AppPage>
  )
}
