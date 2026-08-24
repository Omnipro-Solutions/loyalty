"use client"

/**
 * Último recurso: solo se monta si el propio `app/layout.tsx` falla al
 * renderizar. Reemplaza el documento entero, así que trae su propio
 * `<html>`/`<body>` y estilos inline — no importa `globals.css` ni las
 * fuentes de Google a propósito, para no depender de la misma cadena de
 * imports que pudo haber causado el crash.
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: "#fafafa",
          color: "#171717",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          Algo salió mal
        </p>
        <p
          style={{
            margin: 0,
            maxWidth: 420,
            fontSize: 13,
            lineHeight: "20px",
            color: "#737373",
          }}
        >
          La aplicación no pudo cargar. Intenta recargar la página.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            height: 40,
            padding: "0 16px",
            borderRadius: 8,
            border: "none",
            backgroundColor: "#4f46e5",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  )
}
