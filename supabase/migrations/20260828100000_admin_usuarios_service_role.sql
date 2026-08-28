-- La vista de administración de usuarios (`/ajustes/equipo/usuarios/[id]`)
-- necesita cambiar `role_id`/`estado`/`tienda_id` de OTRO perfil y revocar
-- sus dispositivos/backup codes de MFA. El trigger `profiles_guard_role_change`
-- (20260823100000_equipo_roles_permisos.sql) bloquea esas columnas cuando
-- `auth.role() = 'authenticated'`, así que esas Server Actions usan
-- `createAdminClient()` (service role) — pero, igual que cualquier tabla
-- nueva, `service_role` no tiene privilegios sobre estas hasta que se le
-- otorgan explícitamente (ver comentario de `auto_expose_new_tables` en
-- supabase/config.toml y el bloque de GRANTs de 20260822205859_rls.sql, que
-- solo cubre `authenticated`). Sin esto, el UPDATE falla por privilegios
-- antes de llegar siquiera a evaluar RLS (que además el service role
-- bypasea, así que el aislamiento por `org_id` en estas escrituras lo repone
-- cada Server Action a mano — ver `assertSameOrgProfile` en
-- features/team/actions/users.ts).
--
-- Alcance mínimo: solo lo que las 4 acciones nuevas necesitan. Nada de
-- `insert`/`delete` sobre `profiles` (crear sigue siendo vía invitación,
-- borrar usuarios está fuera de alcance).
grant usage on schema public to service_role;

grant select, update on profiles to service_role;
grant select, delete on trusted_devices, mfa_backup_codes to service_role;
