import { SsoDeniedCard } from "@/features/auth/components/sso-denied-card"

export default async function SsoNoAutorizadoPage({
  searchParams,
}: PageProps<"/sso/no-autorizado">) {
  const { email } = await searchParams
  const emailStr = Array.isArray(email) ? email[0] : email

  return (
    <SsoDeniedCard
      email={emailStr ?? "tu cuenta corporativa"}
      motivo="Sin rol asignado en el tenant"
    />
  )
}
