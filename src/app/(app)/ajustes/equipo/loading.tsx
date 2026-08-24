import { AppPage } from "@/components/layout/app-page"
import { KpiRowSkeleton } from "@/components/feedback/kpi-row-skeleton"
import { ListCardSkeleton } from "@/components/feedback/list-card-skeleton"
import { TeamTabsNav } from "@/features/team/components/team-tabs-nav"

/** Igual al `size` de cada `ColumnDef` en `users-table.tsx`. */
const USERS_TABLE_COLUMNS = [null, 150, 150, 110, 120, 90]

/**
 * `loading.tsx` no tiene acceso a `searchParams`, así que no puede saber qué
 * pestaña está activa — usa la forma de la pestaña por defecto ("usuarios").
 */
export default function TeamLoading() {
  return (
    <AppPage
      breadcrumb="Configuración  ›  Equipo y permisos"
      title="Equipo y permisos"
    >
      <TeamTabsNav active="usuarios" />
      <KpiRowSkeleton variant="card" count={4} />
      <ListCardSkeleton columns={USERS_TABLE_COLUMNS} />
    </AppPage>
  )
}
