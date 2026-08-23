import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { RoutePlaceholder } from "@/components/layout/route-placeholder"
import {
  EquipoTabsNav,
  type EquipoTab,
} from "@/features/equipo/components/equipo-tabs-nav"
import { InvitacionesTabla } from "@/features/equipo/components/invitaciones-tabla"
import { RolDetallePanel } from "@/features/equipo/components/rol-detalle-panel"
import { RolesList } from "@/features/equipo/components/roles-list"
import { UsuariosCard } from "@/features/equipo/components/usuarios-card"
import {
  getEquipoKpis,
  getPerfilConPermisos,
  getRoleDetalle,
  listInvitaciones,
  listRoles,
  listTiendasOptions,
  listUsuarios,
  tienePermiso,
} from "@/features/equipo/lib/queries"
import { formatNumber } from "@/lib/format"

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

/**
 * Figma "09 · Equipo y permisos" (725:3563). El sidebar principal de estas
 * pantallas resalta "Ajustes" — no es un ítem de nav propio, es una
 * sub-vista de Ajustes, agrupada junto a Integraciones bajo el ítem
 * colapsable "Ajustes" del sidebar (ver `config/navigation.ts`).
 */
export default async function EquipoPage({
  searchParams,
}: PageProps<"/ajustes/equipo">) {
  const params = await searchParams
  const tab = (primerValor(params.tab) ?? "usuarios") as EquipoTab

  const perfil = await getPerfilConPermisos()
  const puedeGestionar = perfil
    ? tienePermiso(perfil.permisos, "equipo", "editar")
    : false

  return (
    <AppPage
      breadcrumb="Configuración  ›  Equipo y permisos"
      titulo="Equipo y permisos"
    >
      <EquipoTabsNav activo={tab} />

      {tab === "usuarios" && (
        <UsuariosTabContent params={params} puedeGestionar={puedeGestionar} />
      )}
      {tab === "roles" && (
        <RolesTabContent
          rolId={primerValor(params.rol)}
          puedeGestionar={puedeGestionar}
        />
      )}
      {tab === "invitaciones" && (
        <InvitacionesTabContent puedeGestionar={puedeGestionar} />
      )}
      {tab === "auditoria" && <RoutePlaceholder fase="Fase 5" />}
    </AppPage>
  )
}

type SearchParams = Awaited<PageProps<"/ajustes/equipo">["searchParams"]>

async function UsuariosTabContent({
  params,
  puedeGestionar,
}: {
  params: SearchParams
  puedeGestionar: boolean
}) {
  const busqueda = primerValor(params.q)
  const roleId = primerValor(params.rolFiltro)
  const estado = primerValor(params.estado) as "activo" | "inactivo" | undefined
  const page = Number(primerValor(params.page) ?? "1")

  const [{ usuarios, total }, kpis, roles, tiendas] = await Promise.all([
    listUsuarios({ busqueda, roleId, estado, page }),
    getEquipoKpis(),
    listRoles(),
    listTiendasOptions(),
  ])

  return (
    <>
      <div className="flex items-start gap-4">
        <KpiCard
          etiqueta="Usuarios activos"
          valor={formatNumber(kpis.usuariosActivos)}
          detalle={`+${formatNumber(kpis.nuevosEsteMes)} este mes`}
        />
        <KpiCard
          etiqueta="Invitaciones pendientes"
          valor={formatNumber(kpis.invitacionesPendientes)}
          detalle={
            kpis.invitacionesPorVencer > 0
              ? `${formatNumber(kpis.invitacionesPorVencer)} vencen en 3 días`
              : "ninguna vence pronto"
          }
        />
        <KpiCard
          etiqueta="Con 2FA activo"
          valor={`${formatNumber(kpis.con2fa)} de ${formatNumber(kpis.totalUsuarios)}`}
          detalle={
            kpis.totalUsuarios
              ? `${Math.round((kpis.con2fa / kpis.totalUsuarios) * 100)}% de cobertura`
              : "sin usuarios todavía"
          }
        />
        <KpiCard
          etiqueta="Sin acceso hace 60 días"
          valor={formatNumber(kpis.sinAccesoHace60Dias)}
          detalle="revisar y desactivar"
        />
      </div>
      <UsuariosCard
        usuarios={usuarios}
        total={total}
        totalActivos={kpis.usuariosActivos}
        invitacionesPendientes={kpis.invitacionesPendientes}
        roles={roles}
        tiendas={tiendas}
        puedeGestionar={puedeGestionar}
        hayFiltrosAplicados={!!(busqueda || roleId || estado)}
      />
    </>
  )
}

async function RolesTabContent({
  rolId,
  puedeGestionar,
}: {
  rolId: string | undefined
  puedeGestionar: boolean
}) {
  const roles = await listRoles()
  const rolSeleccionadoId = rolId ?? roles[0]?.id

  if (!rolSeleccionadoId) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
        <p className="py-16 text-sm text-muted-foreground">
          Todavía no hay roles configurados.
        </p>
      </div>
    )
  }

  const roleDetalle = await getRoleDetalle(rolSeleccionadoId)
  if (!roleDetalle) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
        <p className="py-16 text-sm text-muted-foreground">
          No se encontró el rol seleccionado.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 items-start gap-3.5">
      <RolesList
        roles={roles}
        rolSeleccionadoId={rolSeleccionadoId}
        puedeGestionar={puedeGestionar}
      />
      <RolDetallePanel
        key={roleDetalle.id}
        roleDetalle={roleDetalle}
        puedeGestionar={puedeGestionar}
      />
    </div>
  )
}

async function InvitacionesTabContent({
  puedeGestionar,
}: {
  puedeGestionar: boolean
}) {
  const invitaciones = await listInvitaciones()

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex-1">
          <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
            Invitaciones
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(invitaciones.length)} en total
          </p>
        </div>
      </div>
      {invitaciones.length === 0 ? (
        <p className="px-[22px] pb-6 text-sm text-muted-foreground">
          Todavía no se ha invitado a nadie. Invita a tu equipo desde la pestaña
          Usuarios.
        </p>
      ) : (
        <InvitacionesTabla
          invitaciones={invitaciones}
          puedeGestionar={puedeGestionar}
        />
      )}
    </div>
  )
}
