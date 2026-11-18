-- =============================================================================
-- Laboratorio de Configuraciones GCam · 06 · Espejo de ajustes
--
-- Replanteo del núcleo (Etapa 16): el usuario replica los ajustes del teléfono
-- nivel a nivel y guarda el valor actual de cada parámetro, sin perfiles.
--
-- 1. `lineage_id` en nodos y parámetros: identidad estable entre versiones, para
--    poder duplicar AGC 8.2 → 9.4 y comparar qué se añadió, retiró o cambió.
-- 2. `is_active` en nodos: un nivel que ya no existe en una versión nueva se
--    marca como retirado en lugar de borrarse.
-- 3. `current_value`, `current_value_source` y `notes` en parámetros: valor que
--    tiene el teléfono, procedencia (`custom` | `default` | `unknown`) y
--    conocimiento acumulado del ajuste.
-- 4. `parameter_changes` deja de exigir experimento: cada edición de valor deja
--    su propia línea de historial con comentario y efecto observado.
-- 5. RLS del historial: la autorización pasa por el parámetro → nodo → versión,
--    en lugar de depender del experimento.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Nodos · identidad estable y estado retirado
-- -----------------------------------------------------------------------------
alter table public.parameter_nodes
  add column lineage_id uuid not null default gen_random_uuid(),
  add column is_active boolean not null default true;

-- Los nodos existentes reciben su propio id como linaje: cada uno es único.
update public.parameter_nodes set lineage_id = id;

create index parameter_nodes_lineage_idx
  on public.parameter_nodes (camera_version_id, lineage_id);

comment on column public.parameter_nodes.lineage_id is
  'Identidad del mismo nivel entre versiones. Al duplicar una versión se conserva; los niveles nuevos reciben otro.';
comment on column public.parameter_nodes.is_active is
  'false = nivel retirado en esta versión: se conserva para el historial y se oculta de la vista activa.';

-- -----------------------------------------------------------------------------
-- Parámetros · linaje, valor actual y notas
-- -----------------------------------------------------------------------------
alter table public.parameters
  add column lineage_id uuid not null default gen_random_uuid(),
  add column notes text,
  add column current_value jsonb,
  add column current_value_source text not null default 'unknown';

update public.parameters set lineage_id = id;

alter table public.parameters
  add constraint parameters_current_source_valid
    check (current_value_source in ('custom', 'default', 'unknown')),
  add constraint parameters_notes_length
    check (notes is null or char_length(notes) <= 4000),
  -- Un valor personalizado no puede quedar vacío; «sin valor» se expresa con la
  -- procedencia en `unknown`.
  add constraint parameters_custom_value_present
    check (current_value_source <> 'custom' or current_value is not null);

create index parameters_lineage_idx on public.parameters (node_id, lineage_id);
create index parameters_current_source_idx on public.parameters (current_value_source);

comment on column public.parameters.lineage_id is
  'Identidad del mismo parámetro entre versiones (sobrevive a renombres y a duplicar la versión).';
comment on column public.parameters.notes is
  'Conocimiento acumulado del ajuste: qué controla y qué se observó al cambiarlo.';
comment on column public.parameters.current_value is
  'Valor actual en el teléfono. null con procedencia `default` significa «Default (From Library)»; con `unknown`, sin dato.';
comment on column public.parameters.current_value_source is
  'custom = definido a mano; default = valor de librería del propio GCam; unknown = sin dato.';

-- El valor actual debe respetar el tipo declarado (igual que el predeterminado).
create or replace function app.validate_parameter_current_value()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.current_value is not null
     and not app.value_matches_type(new.data_type, new.current_value, new.allowed_values) then
    raise exception 'current_value % no corresponde al tipo de dato %',
      new.current_value, new.data_type
      using errcode = '23514';
  end if;

  if new.current_value is null and new.current_value_source = 'custom' then
    raise exception 'Un valor personalizado no puede estar vacío'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function app.validate_parameter_current_value() is
  'Impide guardar un valor actual con forma incompatible con su tipo o un «custom» sin valor.';

revoke all on function app.validate_parameter_current_value() from public;

create trigger parameters_validate_current_value
  before insert or update of current_value, current_value_source, data_type, allowed_values
  on public.parameters
  for each row execute function app.validate_parameter_current_value();

-- -----------------------------------------------------------------------------
-- Historial · sin experimento obligatorio, con comentario y efecto
-- -----------------------------------------------------------------------------
alter table public.parameter_changes
  alter column experiment_id drop not null,
  add column effect text,
  add column previous_value_source text,
  add column new_value_source text;

alter table public.parameter_changes
  add constraint parameter_changes_effect_valid
    check (effect is null or effect in ('better', 'same', 'worse', 'unknown')),
  add constraint parameter_changes_previous_source_valid
    check (previous_value_source is null or previous_value_source in ('custom', 'default', 'unknown')),
  add constraint parameter_changes_new_source_valid
    check (new_value_source is null or new_value_source in ('custom', 'default', 'unknown'));

comment on column public.parameter_changes.effect is
  'Efecto observado del cambio: mejor, igual, peor o aún desconocido. Opcional.';
comment on column public.parameter_changes.experiment_id is
  'Experimento asociado (opcional). Los cambios sueltos solo se ligan al parámetro.';

-- La validación ya no puede exigir experimento: si existe, debe ser de la misma
-- versión; si no, basta con que el parámetro exista.
create or replace function app.validate_parameter_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  experiment_version uuid;
  parameter_version uuid;
begin
  select n.camera_version_id
    into parameter_version
    from public.parameters p
    join public.parameter_nodes n on n.id = p.node_id
   where p.id = new.parameter_id;

  if parameter_version is null then
    raise exception 'El parámetro % no existe', new.parameter_id
      using errcode = '23503';
  end if;

  if new.experiment_id is null then
    return new;
  end if;

  select c.camera_version_id
    into experiment_version
    from public.experiments e
    join public.configurations c on c.id = e.configuration_id
   where e.id = new.experiment_id;

  if experiment_version is null then
    raise exception 'El experimento % no existe', new.experiment_id
      using errcode = '23503';
  end if;

  if parameter_version <> experiment_version then
    raise exception 'El parámetro % no pertenece a la versión del experimento %',
      new.parameter_id, new.experiment_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function app.validate_parameter_change() is
  'El cambio pertenece siempre a un parámetro existente; si hay experimento, ambos deben compartir versión.';

-- -----------------------------------------------------------------------------
-- RLS · el historial se autoriza por el árbol del parámetro
-- -----------------------------------------------------------------------------
drop policy if exists parameter_changes_select_own on public.parameter_changes;
drop policy if exists parameter_changes_insert_own on public.parameter_changes;

create policy parameter_changes_select_own on public.parameter_changes
for select to authenticated
using (
  exists (
    select 1
      from public.parameters p
      join public.parameter_nodes n on n.id = p.node_id
     where p.id = parameter_changes.parameter_id
       and app.owns_version(n.camera_version_id)
  )
);

create policy parameter_changes_insert_own on public.parameter_changes
for insert to authenticated
with check (
  exists (
    select 1
      from public.parameters p
      join public.parameter_nodes n on n.id = p.node_id
     where p.id = parameter_changes.parameter_id
       and app.owns_version(n.camera_version_id)
  )
);
