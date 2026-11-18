-- =============================================================================
-- Laboratorio de Configuraciones GCam · 02 · Funciones, triggers y helpers RLS
--
-- 1. `app.set_updated_at` mantiene `updated_at`.
-- 2. `app.value_matches_type` valida la forma de un valor jsonb según el tipo.
-- 3. Triggers de integridad: definición de parámetros, valores de perfil y árbol.
-- 4. `app.owns_camera` / `app.owns_version` aíslan por dueño en las políticas.
--
-- Las funciones `security definer` fijan `search_path = ''` y califican cada
-- objeto. La validación de integridad no depende de lo que RLS deje ver; RLS
-- sigue siendo la que autoriza la escritura.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger cameras_set_updated_at
  before update on public.cameras
  for each row execute function app.set_updated_at();

create trigger camera_versions_set_updated_at
  before update on public.camera_versions
  for each row execute function app.set_updated_at();

create trigger parameter_nodes_set_updated_at
  before update on public.parameter_nodes
  for each row execute function app.set_updated_at();

create trigger parameters_set_updated_at
  before update on public.parameters
  for each row execute function app.set_updated_at();

create trigger configurations_set_updated_at
  before update on public.configurations
  for each row execute function app.set_updated_at();

create trigger configuration_values_set_updated_at
  before update on public.configuration_values
  for each row execute function app.set_updated_at();

create trigger experiments_set_updated_at
  before update on public.experiments
  for each row execute function app.set_updated_at();

create trigger ai_recommendations_set_updated_at
  before update on public.ai_recommendations
  for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Forma del valor según el tipo declarado
--
-- `integer` exige número sin parte decimal; `decimal` cualquier número;
-- `boolean` booleano real (no "true" como texto); `string` cadena; `enum` una
-- cadena presente en `allowed_values`; `json` cualquier forma.
-- -----------------------------------------------------------------------------
create or replace function app.value_matches_type(
  p_data_type text,
  p_value jsonb,
  p_allowed_values jsonb
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value is null then true
    when p_data_type = 'integer' then
      jsonb_typeof(p_value) = 'number' and (p_value #>> '{}') ~ '^-?[0-9]+$'
    when p_data_type = 'decimal' then
      jsonb_typeof(p_value) = 'number'
    when p_data_type = 'boolean' then
      jsonb_typeof(p_value) = 'boolean'
    when p_data_type = 'string' then
      jsonb_typeof(p_value) = 'string'
    when p_data_type = 'enum' then
      jsonb_typeof(p_value) = 'string'
      and (p_allowed_values is null or p_allowed_values ? (p_value #>> '{}'))
    when p_data_type = 'json' then true
    else false
  end;
$$;

comment on function app.value_matches_type(text, jsonb, jsonb) is
  'Comprueba que un valor jsonb tenga la forma del tipo de dato declarado. Compartida por parámetros y valores de perfil.';

-- -----------------------------------------------------------------------------
-- parameters · `default_value` y `allowed_values` coherentes con `data_type`
-- -----------------------------------------------------------------------------
create or replace function app.validate_parameter_definition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
begin
  if new.data_type = 'enum' then
    for item in select value from jsonb_array_elements(new.allowed_values) loop
      if jsonb_typeof(item) <> 'string' then
        raise exception 'allowed_values solo admite cadenas; se encontró un valor de tipo %',
          jsonb_typeof(item)
          using errcode = '23514';
      end if;
    end loop;
  end if;

  if new.default_value is not null
     and not app.value_matches_type(new.data_type, new.default_value, new.allowed_values) then
    raise exception 'default_value % no corresponde al tipo de dato %',
      new.default_value, new.data_type
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function app.validate_parameter_definition() is
  'Impide guardar un valor predeterminado con forma incompatible con su tipo o una lista enum con elementos que no son texto.';

create trigger parameters_validate_definition
  before insert or update of data_type, default_value, allowed_values on public.parameters
  for each row execute function app.validate_parameter_definition();

-- -----------------------------------------------------------------------------
-- configuration_values · el valor debe corresponder al parámetro y a su versión
-- -----------------------------------------------------------------------------
create or replace function app.validate_configuration_value()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_parameter record;
  matches_version boolean;
begin
  select p.data_type, p.allowed_values, p.node_id
    into target_parameter
    from public.parameters p
   where p.id = new.parameter_id;

  if not found then
    raise exception 'El parámetro % no existe', new.parameter_id
      using errcode = '23503';
  end if;

  select exists (
    select 1
      from public.configurations c
      join public.parameter_nodes n on n.camera_version_id = c.camera_version_id
     where c.id = new.configuration_id
       and n.id = target_parameter.node_id
  ) into matches_version;

  if not matches_version then
    raise exception 'El parámetro % no pertenece a la versión de la configuración %',
      new.parameter_id, new.configuration_id
      using errcode = '23514';
  end if;

  if not app.value_matches_type(target_parameter.data_type, new.value, target_parameter.allowed_values) then
    raise exception 'El valor % no corresponde al tipo de dato % del parámetro %',
      new.value, target_parameter.data_type, new.parameter_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function app.validate_configuration_value() is
  'Verifica tipo del valor y que el parámetro pertenezca a la misma versión que la configuración.';

create trigger configuration_values_validate
  before insert or update of value, parameter_id, configuration_id on public.configuration_values
  for each row execute function app.validate_configuration_value();

-- -----------------------------------------------------------------------------
-- parameter_nodes · sin ciclos y sin mezclar versiones
--
-- Las reglas que un CHECK no puede expresar: el padre debe estar en la misma
-- `camera_version_id` y no puede ser descendiente del nodo que se mueve.
-- -----------------------------------------------------------------------------
create or replace function app.enforce_node_tree()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_version uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select n.camera_version_id
    into parent_version
    from public.parameter_nodes n
   where n.id = new.parent_id;

  if parent_version is null then
    raise exception 'El nodo padre % no existe', new.parent_id
      using errcode = '23503';
  end if;

  if parent_version <> new.camera_version_id then
    raise exception 'Un nodo no puede colgar de otra versión'
      using errcode = '23514';
  end if;

  if exists (
    with recursive ancestors(id, parent_id, depth) as (
      select n.id, n.parent_id, 1
        from public.parameter_nodes n
       where n.id = new.parent_id
      union all
      select n.id, n.parent_id, a.depth + 1
        from public.parameter_nodes n
        join ancestors a on n.id = a.parent_id
       where a.depth < 200
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'El movimiento crearía un ciclo en el árbol'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function app.enforce_node_tree() is
  'Impide ciclos, autoparentado (también por CHECK) y nodos que cuelgan de otra versión.';

create trigger parameter_nodes_enforce_tree
  before insert or update of parent_id, camera_version_id on public.parameter_nodes
  for each row execute function app.enforce_node_tree();

-- -----------------------------------------------------------------------------
-- parameter_changes · el parámetro debe ser de la versión del experimento
-- -----------------------------------------------------------------------------
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
  select c.camera_version_id
    into experiment_version
    from public.experiments e
    join public.configurations c on c.id = e.configuration_id
   where e.id = new.experiment_id;

  if experiment_version is null then
    raise exception 'El experimento % no existe', new.experiment_id
      using errcode = '23503';
  end if;

  select n.camera_version_id
    into parameter_version
    from public.parameters p
    join public.parameter_nodes n on n.id = p.node_id
   where p.id = new.parameter_id;

  if parameter_version is null then
    raise exception 'El parámetro % no existe', new.parameter_id
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
  'Un cambio de historial solo puede referirse a un parámetro del árbol de la versión del experimento.';

create trigger parameter_changes_validate
  before insert or update of experiment_id, parameter_id on public.parameter_changes
  for each row execute function app.validate_parameter_change();

-- -----------------------------------------------------------------------------
-- ai_recommendations · perfil y experimento deben ser de la misma versión
-- -----------------------------------------------------------------------------
create or replace function app.validate_recommendation_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.configuration_id is not null and not exists (
    select 1
      from public.configurations c
     where c.id = new.configuration_id
       and c.camera_version_id = new.camera_version_id
  ) then
    raise exception 'La configuración % no pertenece a la versión %',
      new.configuration_id, new.camera_version_id
      using errcode = '23514';
  end if;

  if new.experiment_id is not null and not exists (
    select 1
      from public.experiments e
      join public.configurations c on c.id = e.configuration_id
     where e.id = new.experiment_id
       and c.camera_version_id = new.camera_version_id
  ) then
    raise exception 'El experimento % no pertenece a la versión %',
      new.experiment_id, new.camera_version_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function app.validate_recommendation_scope() is
  'Evita recomendaciones que mezclen una versión con perfiles o experimentos de otra.';

create trigger ai_recommendations_validate_scope
  before insert or update of camera_version_id, configuration_id, experiment_id on public.ai_recommendations
  for each row execute function app.validate_recommendation_scope();

-- -----------------------------------------------------------------------------
-- Propiedad derivada · usadas por las políticas RLS
--
-- `security definer` con `search_path` fijo: leen las tablas como dueño, sin
-- recursión de políticas y sin exponer filas ajenas.
-- -----------------------------------------------------------------------------
create or replace function app.owns_camera(p_camera_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.cameras c
     where c.id = p_camera_id
       and c.owner_id = auth.uid()
  );
$$;

comment on function app.owns_camera(uuid) is
  'true si la cámara existe y pertenece al usuario de la sesión.';

create or replace function app.owns_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.camera_versions v
      join public.cameras c on c.id = v.camera_id
     where v.id = p_version_id
       and c.owner_id = auth.uid()
  );
$$;

comment on function app.owns_version(uuid) is
  'true si la versión existe y su cámara pertenece al usuario de la sesión.';

-- -----------------------------------------------------------------------------
-- Privilegios de las funciones internas
-- -----------------------------------------------------------------------------
revoke all on function app.set_updated_at() from public;
revoke all on function app.value_matches_type(text, jsonb, jsonb) from public;
revoke all on function app.validate_parameter_definition() from public;
revoke all on function app.validate_configuration_value() from public;
revoke all on function app.enforce_node_tree() from public;
revoke all on function app.validate_parameter_change() from public;
revoke all on function app.validate_recommendation_scope() from public;
revoke all on function app.owns_camera(uuid) from public;
revoke all on function app.owns_version(uuid) from public;

revoke all on function app.owns_camera(uuid) from anon;
revoke all on function app.owns_version(uuid) from anon;

grant usage on schema app to authenticated;
grant execute on function app.owns_camera(uuid) to authenticated;
grant execute on function app.owns_version(uuid) to authenticated;
