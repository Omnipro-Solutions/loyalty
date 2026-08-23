import { LoginForm } from "@/features/auth/components/login-form"

export default function LoginPage() {
  return <LoginForm samlEnabled={process.env.SSO_SAML_ENABLED === "true"} />
}
