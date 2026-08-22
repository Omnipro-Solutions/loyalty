-- Loyalty builder (sección 08 del Figma): workflows tipo canvas con nodos,
-- aristas, versiones e historial de ejecuciones/simulaciones.

create table workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  nombre text not null,
  descripcion text,
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado', 'pausado', 'archivado')),
  version_actual integer not null default 0,
  creado_por uuid references profiles (id) on delete set null,
  actualizado_por uuid references profiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index workflows_org_id_idx on workflows (org_id);

-- Snapshot completo del grafo en JSONB (nodos + aristas), un registro por
-- versión guardada. Alimenta "Historial de versiones" en la editor bar (08.1).
create table workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows (id) on delete cascade,
  version integer not null,
  grafo jsonb not null,
  autor_id uuid references profiles (id) on delete set null,
  nota text,
  creado_en timestamptz not null default now(),
  unique (workflow_id, version)
);

create index workflow_versions_workflow_id_idx on workflow_versions (workflow_id);

-- Catálogo de 19 tipos de bloque en 5 grupos, extraído del Figma "08.4 ·
-- Loyalty builder · catálogo de bloques". La copia estructurada para UI
-- (etiquetas, íconos, color por grupo) vive en src/config/builder-blocks.ts;
-- este `check` es solo la validación de integridad en base de datos.
create table workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows (id) on delete cascade,
  tipo text not null check (
    tipo in (
      -- Entradas — solo una entrada activa por workflow (regla del Figma,
      -- validada en aplicación, no en constraint: depende del estado 'activo').
      'evento_compra', 'entra_segmento', 'canje_cupon', 'fecha_recurrente', 'alta_socio',
      -- Lealtad
      'acumular_puntos', 'canjear_puntos', 'cambio_nivel', 'emitir_cupon', 'reto', 'referido',
      -- Acciones
      'email', 'push', 'sms_whatsapp', 'aplicar_promocion',
      -- Lógica
      'condicion_multiple', 'ramificacion_valor', 'split_ab', 'esperar',
      -- Fin
      'fin_workflow'
    )
  ),
  etiqueta text not null,
  posicion_x double precision not null default 0,
  posicion_y double precision not null default 0,
  config jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index workflow_nodes_workflow_id_idx on workflow_nodes (workflow_id);

-- Puerto de salida: 'out' para nodos de un solo camino; 'cumple'/'no_cumple'
-- para condición simple; 'rama_<id>'/'por_defecto' para ramificación por
-- valor y split A/B; 'tope_alcanzado' para acumular_puntos.
create table workflow_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows (id) on delete cascade,
  source_node_id uuid not null references workflow_nodes (id) on delete cascade,
  source_port text not null default 'out',
  target_node_id uuid not null references workflow_nodes (id) on delete cascade,
  creado_en timestamptz not null default now(),
  unique (source_node_id, source_port, target_node_id)
);

create index workflow_edges_workflow_id_idx on workflow_edges (workflow_id);
create index workflow_edges_source_node_id_idx on workflow_edges (source_node_id);
create index workflow_edges_target_node_id_idx on workflow_edges (target_node_id);

-- Una fila por Simular/Publicar. `resumen` guarda los conteos por nodo/rama
-- que la analítica (08.3) y las burbujas de audiencia del canvas (08.1)
-- necesitan (ej. 1.514 → 1.402 → 1.088 del Figma), sin recorrer el grafo en
-- cada render.
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows (id) on delete cascade,
  workflow_version integer not null,
  tipo text not null check (tipo in ('simulacion', 'publicacion')),
  estado text not null default 'en_progreso' check (estado in ('en_progreso', 'completado', 'con_errores')),
  resumen jsonb not null default '{}'::jsonb,
  iniciado_en timestamptz not null default now(),
  finalizado_en timestamptz
);

create index workflow_runs_workflow_id_idx on workflow_runs (workflow_id);

create table workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references workflow_runs (id) on delete cascade,
  node_id uuid not null references workflow_nodes (id) on delete cascade,
  port text,
  conteo_entrada integer,
  conteo_salida integer,
  creado_en timestamptz not null default now()
);

create index workflow_run_steps_workflow_run_id_idx on workflow_run_steps (workflow_run_id);

alter table points_ledger
  add constraint points_ledger_workflow_run_id_fkey
  foreign key (workflow_run_id) references workflow_runs (id) on delete set null;

alter table coupons
  add constraint coupons_workflow_run_id_fkey
  foreign key (workflow_run_id) references workflow_runs (id) on delete set null;

alter table challenges
  add constraint challenges_workflow_run_id_fkey
  foreign key (workflow_run_id) references workflow_runs (id) on delete set null;

create trigger workflows_set_actualizado_en
  before update on workflows
  for each row execute function set_actualizado_en();

create trigger workflow_nodes_set_actualizado_en
  before update on workflow_nodes
  for each row execute function set_actualizado_en();
