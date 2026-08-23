import { AppPage } from "@/components/layout/app-page"
import { ConexionesActivasCard } from "@/features/integraciones/components/conexiones-activas-card"
import { CuentasCard } from "@/features/integraciones/components/cuentas-card"
import { IntegracionesCatalogo } from "@/features/integraciones/components/integraciones-catalogo"
import {
  IntegracionesTabsNav,
  type IntegracionesTab,
} from "@/features/integraciones/components/integraciones-tabs-nav"
import { VistaSistemaCard } from "@/features/integraciones/components/vista-sistema-card"
import { DESTINOS, ORIGENES } from "@/features/integraciones/lib/catalogo"

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

/**
 * Figma "12 · Integraciones" (1261:3974): sub-vista de Ajustes, agrupada
 * junto a Equipo bajo el ítem colapsable "Ajustes" del sidebar (ver
 * `config/navigation.ts`).
 */
export default async function IntegracionesPage({
  searchParams,
}: PageProps<"/ajustes/integraciones">) {
  const params = await searchParams
  const tab = (primerValor(params.tab) ?? "origenes") as IntegracionesTab

  return (
    <AppPage
      breadcrumb="Configuración  ›  Integraciones"
      titulo="Integraciones"
    >
      <IntegracionesTabsNav activo={tab} />
      {tab === "origenes" && (
        <IntegracionesCatalogo
          direccion="origen"
          grupos={ORIGENES}
          seleccionInicialId="cjo"
          titulo="Integraciones"
          descripcion="Conecta los sistemas que alimentan a Etteer y define a dónde enviar audiencias, eventos y resultados."
          labelBuscar="Buscar integración…"
          labelTotal="orígenes"
          labelTodos="Todos los orígenes"
          labelAccionSecundaria="Ver flujos de datos"
          labelAccionPrimaria="Nueva conexión"
        />
      )}
      {tab === "destinos" && (
        <IntegracionesCatalogo
          direccion="destino"
          grupos={DESTINOS}
          seleccionInicialId="power-bi"
          titulo="Integraciones"
          descripcion="Elige a dónde enviar audiencias, eventos de lealtad y resultados de campaña desde Etteer."
          labelBuscar="Buscar destino…"
          labelTotal="destinos"
          labelTodos="Todos los destinos"
          labelAccionSecundaria="Ver flujos de salida"
          labelAccionPrimaria="Nuevo destino"
        />
      )}
      {tab === "conexiones" && <ConexionesActivasCard />}
      {tab === "cuentas" && <CuentasCard />}
      {tab === "sistema" && <VistaSistemaCard />}
    </AppPage>
  )
}
