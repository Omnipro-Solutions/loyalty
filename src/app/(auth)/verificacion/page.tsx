import { enrollTotpAction, getMfaStatus } from "@/features/auth/actions/mfa"
import { VerificationCard } from "@/features/auth/components/verification-card"

/**
 * El Figma (01.2) solo tiene la pantalla de "verificar código" — no hay una
 * pantalla separada de enrolamiento con QR. Como el plan sí exige
 * enrolamiento TOTP, esta página decide server-side si el usuario ya tiene
 * un factor verificado (pide el código directamente) o no (enrola uno
 * nuevo y muestra el QR encima de la misma tarjeta) — ver
 * VerificationCard.
 */
export default async function VerificationPage() {
  const status = await getMfaStatus()

  if (status.enrolled) {
    return <VerificationCard mode="verify" factorId={status.factorId} />
  }

  const enroll = await enrollTotpAction()
  if (!enroll?.data?.ok) {
    return (
      <VerificationCard
        mode="error"
        message={
          enroll?.data?.message ?? "No se pudo iniciar el enrolamiento de 2FA."
        }
      />
    )
  }

  return (
    <VerificationCard
      mode="enroll"
      factorId={enroll.data.factorId}
      qrCode={enroll.data.qrCode}
      secret={enroll.data.secret}
    />
  )
}
