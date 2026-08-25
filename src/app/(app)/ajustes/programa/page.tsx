import { AppPage } from "@/components/layout/app-page"
import { ProgramParametersForm } from "@/features/settings/components/program-parameters-form"
import { getProgramParameters } from "@/lib/program-parameters"
import { REGULATION_EXCLUSIONS, type RegulationExclusion } from "@/types/domain"

function isRegulationExclusion(value: string): value is RegulationExclusion {
  return (REGULATION_EXCLUSIONS as readonly string[]).includes(value)
}

/**
 * "Parámetros del programa" — sin equivalente en el Figma, ver
 * `config/navigation.ts` y la Fase 0 del plan de cobertura en
 * `docs/promociones.md`.
 */
export default async function ProgramParametersPage() {
  const parameters = await getProgramParameters()

  return (
    <AppPage
      breadcrumb="Configuración  ›  Parámetros del programa"
      title="Parámetros del programa"
    >
      <ProgramParametersForm
        initialValues={{
          valorPunto: parameters.valorPunto,
          breakageEstimadoPct: parameters.breakageEstimadoPct,
          redencionCashbackPct: parameters.redencionCashbackPct,
          techoDescuentoApiladoPct: parameters.techoDescuentoApiladoPct,
          vigenciaPuntosDias: parameters.vigenciaPuntosDias ?? undefined,
          exclusionesReglamento: parameters.exclusionesReglamento.filter(
            isRegulationExclusion
          ),
        }}
      />
    </AppPage>
  )
}
