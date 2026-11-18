-- =============================================================================
-- Laboratorio de Configuraciones GCam · 01 · Esquema base
--
-- Crea las nueve tablas descritas en docs/DATABASE.md con sus restricciones e
-- índices. Las funciones y los triggers llegan en la migración 02; las políticas
-- RLS en la 03.
--
-- Entorno objetivo: PostgreSQL de Supabase (14+). Requiere el esquema `auth` y
-- los roles `anon` / `authenticated` que Supabase ya provisiona.
--
-- No es destructiva: solo crea. Para reconstruir desde cero, `supabase db reset`.
-- =============================================================================

create schema if not exists app;

comment on schema app is
  'Funciones internas de integridad y autorización del Laboratorio GCam. No se expone en la API.';

-- -----------------------------------------------------------------------------
-- cameras · una familia o modificación de GCam (LMC, AGC, BSG, …)
-- -----------------------------------------------------------------------------
create table public.cameras (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  slug text not null,
  description text,
  developer text,
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cameras_owner_fk foreign key (owner_id)
    references auth.users (id) on delete cascade,
  constraint cameras_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 120),
  constraint cameras_slug_valid
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  constraint cameras_website_valid
    check (website_url is null or website_url ~* '^https?://[^[:space:]]+$'),
  constraint cameras_description_length
    check (description is null or char_length(description) <= 4000),
  constraint cameras_developer_length
    check (developer is null or char_length(developer) <= 120),
  constraint cameras_owner_slug_unique unique (owner_id, slug)
);

comment on table public.cameras is
  'Familia o modificación de GCam. `owner_id` es el ancla de propiedad de todo el catálogo.';
comment on column public.cameras.owner_id is
  'Dueño del registro. Por defecto auth.uid(); el resto de tablas derivan la propiedad de aquí.';

create index cameras_owner_active_idx on public.cameras (owner_id, is_active);

-- -----------------------------------------------------------------------------
-- camera_versions · versiones de una cámara; cada una con su propio árbol
-- -----------------------------------------------------------------------------
create table public.camera_versions (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null,
  version text not null,
  release_label text,
  notes text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint camera_versions_camera_fk foreign key (camera_id)
    references public.cameras (id) on delete restrict,
  constraint camera_versions_version_valid
    check (version = btrim(version) and char_length(version) between 1 and 60),
  constraint camera_versions_release_label_length
    check (release_label is null or char_length(release_label) <= 120),
  constraint camera_versions_notes_length
    check (notes is null or char_length(notes) <= 4000),
  constraint camera_versions_camera_version_unique unique (camera_id, version)
);

comment on table public.camera_versions is
  'Versión concreta de una cámara. Cada versión mantiene su árbol, perfiles y experimentos.';

-- Una sola versión predeterminada por cámara.
create unique index camera_versions_one_default_per_camera_idx
  on public.camera_versions (camera_id)
  where is_default;

create index camera_versions_camera_active_idx
  on public.camera_versions (camera_id, is_active);

-- -----------------------------------------------------------------------------
-- parameter_nodes · árbol de profundidad ilimitada dentro de una versión
-- -----------------------------------------------------------------------------
create table public.parameter_nodes (
  id uuid primary key default gen_random_uuid(),
  camera_version_id uuid not null,
  parent_id uuid,
  name text not null,
  description text,
  node_type text not null default 'group',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint parameter_nodes_version_fk foreign key (camera_version_id)
    references public.camera_versions (id) on delete restrict,
  constraint parameter_nodes_parent_fk foreign key (parent_id)
    references public.parameter_nodes (id) on delete restrict,
  constraint parameter_nodes_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint parameter_nodes_description_length
    check (description is null or char_length(description) <= 4000),
  constraint parameter_nodes_type_valid
    check (node_type in ('category', 'group', 'subgroup')),
  constraint parameter_nodes_sort_order_valid check (sort_order >= 0),
  constraint parameter_nodes_not_own_parent check (parent_id is null or parent_id <> id),
  -- `nulls not distinct`: los nodos raíz (parent_id null) también compiten por nombre.
  constraint parameter_nodes_sibling_name_unique
    unique nulls not distinct (camera_version_id, parent_id, name)
);

comment on table public.parameter_nodes is
  'Árbol jerárquico de una versión. parent_id null = nodo raíz. Sin ciclos y sin mezclar versiones (trigger en migración 02).';

create index parameter_nodes_tree_idx
  on public.parameter_nodes (camera_version_id, parent_id, sort_order);

-- -----------------------------------------------------------------------------
-- parameters · definición de un parámetro dentro de un nodo
-- -----------------------------------------------------------------------------
create table public.parameters (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null,
  key text,
  name text not null,
  description text,
  data_type text not null,
  unit text,
  default_value jsonb,
  default_value_source text not null default 'unknown',
  default_value_confidence text,
  allowed_values jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint parameters_node_fk foreign key (node_id)
    references public.parameter_nodes (id) on delete restrict,
  constraint parameters_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint parameters_key_valid
    check (
      key is null
      or (key = btrim(key) and key ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$')
    ),
  constraint parameters_data_type_valid
    check (data_type in ('integer', 'decimal', 'boolean', 'string', 'enum', 'json')),
  constraint parameters_default_source_valid
    check (default_value_source in ('documentation', 'original_file', 'observation', 'unknown')),
  constraint parameters_default_confidence_valid
    check (default_value_confidence is null or default_value_confidence in ('low', 'medium', 'high')),
  -- Desconocido significa null: nunca se rellena con un valor inventado.
  constraint parameters_unknown_default_is_null
    check (default_value is not null or default_value_source = 'unknown'),
  constraint parameters_allowed_values_array
    check (allowed_values is null or jsonb_typeof(allowed_values) = 'array'),
  constraint parameters_enum_needs_allowed_values
    check (data_type <> 'enum' or allowed_values is not null),
  constraint parameters_description_length
    check (description is null or char_length(description) <= 4000),
  constraint parameters_unit_length
    check (unit is null or char_length(unit) <= 40),
  constraint parameters_sort_order_valid check (sort_order >= 0)
);

comment on table public.parameters is
  'Definición de un parámetro. `default_value` es documentación de referencia y ninguna operación de perfil lo modifica.';

create index parameters_node_order_idx on public.parameters (node_id, sort_order);
create index parameters_node_active_idx on public.parameters (node_id, is_active);

-- Una clave técnica no se repite dentro del mismo nodo (las claves desconocidas sí).
create unique index parameters_node_key_unique_idx
  on public.parameters (node_id, key)
  where key is not null;

-- -----------------------------------------------------------------------------
-- configurations · perfiles de valores por versión
-- -----------------------------------------------------------------------------
create table public.configurations (
  id uuid primary key default gen_random_uuid(),
  camera_version_id uuid not null,
  name text not null,
  description text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint configurations_version_fk foreign key (camera_version_id)
    references public.camera_versions (id) on delete restrict,
  constraint configurations_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 120),
  constraint configurations_description_length
    check (description is null or char_length(description) <= 4000),
  constraint configurations_version_name_unique unique (camera_version_id, name)
);

comment on table public.configurations is
  'Perfil de configuración de una versión. No altera los valores predeterminados del catálogo.';

create unique index configurations_one_default_per_version_idx
  on public.configurations (camera_version_id)
  where is_default;

create index configurations_version_active_idx
  on public.configurations (camera_version_id, is_active);

-- -----------------------------------------------------------------------------
-- configuration_values · valor actual de un parámetro en un perfil
-- -----------------------------------------------------------------------------
create table public.configuration_values (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null,
  parameter_id uuid not null,
  value jsonb not null,
  notes text,
  updated_at timestamptz not null default now(),

  constraint configuration_values_configuration_fk foreign key (configuration_id)
    references public.configurations (id) on delete cascade,
  constraint configuration_values_parameter_fk foreign key (parameter_id)
    references public.parameters (id) on delete restrict,
  constraint configuration_values_notes_length
    check (notes is null or char_length(notes) <= 2000),
  constraint configuration_values_unique unique (configuration_id, parameter_id)
);

comment on table public.configuration_values is
  'Valor personalizado de un parámetro en un perfil. Sin fila = sin valor personalizado (no se materializa el predeterminado).';

create index configuration_values_parameter_idx
  on public.configuration_values (parameter_id);

-- -----------------------------------------------------------------------------
-- experiments · pruebas documentadas manualmente por el usuario
-- -----------------------------------------------------------------------------
create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null,
  title text not null,
  objective text,
  hypothesis text,
  status text not null default 'planned',
  observations text,
  conclusion text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint experiments_configuration_fk foreign key (configuration_id)
    references public.configurations (id) on delete restrict,
  constraint experiments_title_valid
    check (title = btrim(title) and char_length(title) between 1 and 200),
  constraint experiments_status_valid
    check (status in ('planned', 'in_progress', 'completed', 'failed', 'inconclusive')),
  constraint experiments_text_length
    check (
      (objective is null or char_length(objective) <= 4000)
      and (hypothesis is null or char_length(hypothesis) <= 4000)
      and (observations is null or char_length(observations) <= 20000)
      and (conclusion is null or char_length(conclusion) <= 4000)
    ),
  constraint experiments_timeline_valid
    check (started_at is null or completed_at is null or completed_at >= started_at)
);

comment on table public.experiments is
  'Prueba aplicada a mano en el teléfono y documentada aquí. Editar uno antiguo no cambia el perfil actual.';

create index experiments_configuration_created_idx
  on public.experiments (configuration_id, created_at desc);

create index experiments_status_idx on public.experiments (status);

-- -----------------------------------------------------------------------------
-- parameter_changes · historial append-only de cambios
-- -----------------------------------------------------------------------------
create table public.parameter_changes (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null,
  parameter_id uuid not null,
  previous_value jsonb,
  new_value jsonb not null,
  reason text,
  observation text,
  path_snapshot jsonb,
  created_at timestamptz not null default now(),

  constraint parameter_changes_experiment_fk foreign key (experiment_id)
    references public.experiments (id) on delete restrict,
  constraint parameter_changes_parameter_fk foreign key (parameter_id)
    references public.parameters (id) on delete restrict,
  constraint parameter_changes_text_length
    check (
      (reason is null or char_length(reason) <= 2000)
      and (observation is null or char_length(observation) <= 4000)
    ),
  constraint parameter_changes_path_is_array
    check (path_snapshot is null or jsonb_typeof(path_snapshot) = 'array')
);

comment on table public.parameter_changes is
  'Historial inmutable: solo se inserta y se lee. `path_snapshot` conserva la ruta aunque el nodo se renombre.';

create index parameter_changes_experiment_created_idx
  on public.parameter_changes (experiment_id, created_at desc);

create index parameter_changes_parameter_created_idx
  on public.parameter_changes (parameter_id, created_at desc);

-- -----------------------------------------------------------------------------
-- ai_recommendations · propuestas registradas, nunca aplicadas solas
-- -----------------------------------------------------------------------------
create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  camera_version_id uuid not null,
  configuration_id uuid,
  experiment_id uuid,
  title text not null,
  reasoning_summary text,
  suggested_changes jsonb not null default '[]'::jsonb,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_recommendations_version_fk foreign key (camera_version_id)
    references public.camera_versions (id) on delete restrict,
  constraint ai_recommendations_configuration_fk foreign key (configuration_id)
    references public.configurations (id) on delete set null,
  constraint ai_recommendations_experiment_fk foreign key (experiment_id)
    references public.experiments (id) on delete set null,
  constraint ai_recommendations_title_valid
    check (title = btrim(title) and char_length(title) between 1 and 200),
  constraint ai_recommendations_reasoning_length
    check (reasoning_summary is null or char_length(reasoning_summary) <= 4000),
  constraint ai_recommendations_changes_is_array
    check (jsonb_typeof(suggested_changes) = 'array'),
  constraint ai_recommendations_status_valid
    check (status in ('proposed', 'accepted', 'rejected', 'tested'))
);

comment on table public.ai_recommendations is
  'Recomendación registrada con estado. Consultarla nunca aplica cambios: la aceptación es explícita.';

create index ai_recommendations_version_created_idx
  on public.ai_recommendations (camera_version_id, created_at desc);

create index ai_recommendations_status_idx on public.ai_recommendations (status);
