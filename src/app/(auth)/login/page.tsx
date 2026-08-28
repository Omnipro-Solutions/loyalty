import { LoginForm } from "@/features/auth/components/login-form"

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  enlace_invalido: "Tu enlace expiró o ya se usó. Pide uno nuevo.",
  cuenta_inactiva: "Tu cuenta está desactivada. Contacta a un administrador.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const initialError = error ? LOGIN_ERROR_MESSAGES[error] : undefined

  return (
    <LoginForm
      samlEnabled={process.env.SSO_SAML_ENABLED === "true"}
      initialError={initialError}
    />
  )
}
