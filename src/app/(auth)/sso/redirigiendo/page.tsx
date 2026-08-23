import { redirect } from "next/navigation"

import { SsoRedirectCard } from "@/features/auth/components/sso-redirect-card"

export default async function SsoRedirigiendoPage({
  searchParams,
}: PageProps<"/sso/redirigiendo">) {
  const { email } = await searchParams
  const emailStr = Array.isArray(email) ? email[0] : email
  if (!emailStr) redirect("/sso")

  return <SsoRedirectCard email={emailStr} />
}
