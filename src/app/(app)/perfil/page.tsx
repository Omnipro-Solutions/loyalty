import { redirect } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChangePasswordForm } from "@/features/perfil/components/change-password-form"
import { PerfilHero } from "@/features/perfil/components/perfil-hero"
import { PerfilInfoCard } from "@/features/perfil/components/perfil-info-card"
import { SeguridadCard } from "@/features/perfil/components/seguridad-card"
import { SesionesCard } from "@/features/perfil/components/sesiones-card"
import {
  getPerfilActual,
  getSeguridadActual,
  listDispositivosConfiados,
} from "@/features/perfil/lib/queries"

export default async function PerfilPage() {
  const perfil = await getPerfilActual()
  if (!perfil) redirect("/login")

  const [seguridad, dispositivos] = await Promise.all([
    getSeguridadActual(),
    listDispositivosConfiados(),
  ])

  return (
    <AppPage breadcrumb="Cuenta  ›  Mi perfil" title="Mi perfil">
      <PerfilHero
        nombre={perfil.nombre}
        email={perfil.email}
        rol={perfil.rol.nombre}
      />

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Mis datos</TabsTrigger>
          <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
          <TabsTrigger value="sesiones">Historial de sesiones</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <PerfilInfoCard perfil={perfil} />
        </TabsContent>
        <TabsContent value="seguridad">
          <div className="flex flex-col gap-5">
            <SeguridadCard
              seguridad={seguridad}
              tenantIdp={perfil.organizacion?.tenant_idp ?? null}
            />
            <ChangePasswordForm />
          </div>
        </TabsContent>
        <TabsContent value="sesiones">
          <SesionesCard dispositivos={dispositivos} />
        </TabsContent>
      </Tabs>
    </AppPage>
  )
}
