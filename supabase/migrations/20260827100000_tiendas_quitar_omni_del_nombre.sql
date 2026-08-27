-- Pedido del usuario: quitar "Omni" del nombre de cada tienda (queda solo
-- el barrio/zona: "Polanco", "Santa Fe"...) — la marca ya la dan
-- `organizations.nombre`/`dominio_correo`, no hace falta repetirla en cada
-- fila de `tiendas.nombre`. Corrige las filas YA sembradas en la BD;
-- `supabase/seed.sql` se actualizó en paralelo para que un `db reset`
-- futuro siembre igual desde el inicio (mismo criterio que
-- `20260826151500_fix_provincia_socios_mexico.sql`). No toca
-- `codigo_tienda`/`email`/`organizations` — solo el nombre visible.
update tiendas
set nombre = trim(regexp_replace(nombre, '^Omni\s+', ''))
where org_id = (select id from organizations where slug = 'omni')
  and nombre ~ '^Omni\s';
