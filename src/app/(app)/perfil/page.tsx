import { redirect } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChangePasswordForm } from "@/features/profile/components/change-password-form"
import { ProfileHero } from "@/features/profile/components/profile-hero"
import { ProfileInfoCard } from "@/features/profile/components/profile-info-card"
import { SecurityCard } from "@/features/profile/components/security-card"
import { SessionsCard } from "@/features/profile/components/sessions-card"
import {
  getCurrentProfile,
  getCurrentSecurity,
  listTrustedDevices,
} from "@/features/profile/lib/queries"

export default async function ProfilePage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  const [security, devices] = await Promise.all([
    getCurrentSecurity(),
    listTrustedDevices(),
  ])

  return (
    <AppPage breadcrumb="Cuenta  ›  Mi perfil" title="Mi perfil">
      <ProfileHero
        name={profile.nombre}
        email={profile.email}
        role={profile.role.nombre}
      />

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Mis datos</TabsTrigger>
          <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
          <TabsTrigger value="sesiones">Historial de sesiones</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <ProfileInfoCard profile={profile} />
        </TabsContent>
        <TabsContent value="seguridad">
          <div className="flex flex-col gap-5">
            <SecurityCard
              security={security}
              tenantIdp={profile.organization?.tenant_idp ?? null}
            />
            <ChangePasswordForm />
          </div>
        </TabsContent>
        <TabsContent value="sesiones">
          <SessionsCard devices={devices} />
        </TabsContent>
      </Tabs>
    </AppPage>
  )
}
