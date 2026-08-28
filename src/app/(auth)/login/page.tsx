import { LoginForm } from "@/features/auth/components/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const initialError =
    error === "enlace_invalido"
      ? "Tu enlace expiró o ya se usó. Pide uno nuevo."
      : error === "cuenta_inactiva"
        ? "Tu cuenta está desactivada. Contacta a un administrador."
        : undefined

  return (
    <LoginForm
      samlEnabled={process.env.SSO_SAML_ENABLED === "true"}
      initialError={initialError}
    />
  )
}
