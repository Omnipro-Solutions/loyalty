import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * TEMPORAL — diagnóstico de `getSessionPermissions()`.
 *
 * Repite la consulta de `src/lib/session-permissions.ts` pero SIN descartar
 * el `error`, que es justo lo que la versión de producción tira a la basura:
 * si el embed falla o RLS devuelve cero filas, `data` llega `null`, el `Set`
 * sale vacío y la pantalla simplemente no pinta botones — sin un solo aviso.
 *
 * Vive bajo `/ds` a propósito: fuera del route group `(app)`, así que no
 * redirige a /login y se puede abrir con la sesión que ya tengas puesta.
 */
export default async function PermisosDiagnosticoPage() {
  const user = await getAuthenticatedUser()
  const supabase = await createClient()

  // La consulta exacta de getSessionPermissions, con el error a la vista.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role:roles(role_permissions(recurso, accion))")
    .eq("id", user?.id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle()

  // Y la fila del perfil por separado: si esto llega pero el embed no, el
  // problema está en `roles`/`role_permissions`, no en `profiles`.
  const { data: plano, error: errorPlano } = await supabase
    .from("profiles")
    .select("id, nombre, email, estado, org_id, role_id")
    .eq("id", user?.id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle()

  const permissions = await getSessionPermissions()
  const lista = [...permissions].sort()

  const pruebas = [
    ["promociones", "crear"],
    ["promociones", "editar"],
    ["promociones", "aprobar"],
    ["promociones", "asignar"],
    ["cupones", "crear"],
    ["clientes", "crear"],
    ["puntos", "ajustar"],
  ] as const

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8 font-mono text-xs">
      <h1 className="font-sans text-xl font-bold">
        Diagnóstico de permisos de sesión
      </h1>

      <Bloque titulo="1 · Sesión">
        <p>user.id: {user?.id ?? "— SIN SESIÓN —"}</p>
        <p>user.email: {user?.email ?? "—"}</p>
      </Bloque>

      <Bloque titulo="2 · Fila de profiles (sin embed)">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(plano, null, 2)}
        </pre>
        <p className="text-red-600">
          error: {errorPlano ? JSON.stringify(errorPlano) : "ninguno"}
        </p>
      </Bloque>

      <Bloque titulo="3 · El embed roles → role_permissions">
        <p className="text-red-600">
          error: {error ? JSON.stringify(error) : "ninguno"}
        </p>
        <p>profile: {profile === null ? "null" : "objeto"}</p>
        <p>
          profile.role:{" "}
          {profile?.role === null || profile?.role === undefined
            ? "null / undefined ← aquí estaría el fallo"
            : "objeto"}
        </p>
        <p>filas anidadas: {profile?.role?.role_permissions?.length ?? 0}</p>
      </Bloque>

      <Bloque titulo="4 · El Set que consumen las pantallas">
        <p className="mb-2">
          tamaño: <b>{permissions.size}</b>{" "}
          {permissions.size === 0 && "← vacío: ninguna pantalla pinta acciones"}
        </p>
        {pruebas.map(([recurso, accion]) => (
          <p key={`${recurso}:${accion}`}>
            allows({recurso}, {accion}) ={" "}
            <b
              className={
                allows(permissions, recurso, accion)
                  ? "text-green-700"
                  : "text-red-600"
              }
            >
              {String(allows(permissions, recurso, accion))}
            </b>
          </p>
        ))}
        <details className="mt-2">
          <summary className="cursor-pointer">
            ver las {lista.length} entradas
          </summary>
          <pre className="mt-2 whitespace-pre-wrap">{lista.join("\n")}</pre>
        </details>
      </Bloque>
    </main>
  )
}

function Bloque({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1 rounded-xl border border-border p-4">
      <h2 className="mb-1 font-sans text-sm font-semibold">{titulo}</h2>
      {children}
    </section>
  )
}
