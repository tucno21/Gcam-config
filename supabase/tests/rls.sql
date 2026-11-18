-- =============================================================================
-- Pruebas de aislamiento RLS · SOLO BASE LOCAL
--
-- Comprueba, contra una base local de Supabase, que:
--   · `anon` no puede ni tocar las tablas.
--   · un usuario autenticado solo ve y modifica sus filas.
--   · no se puede escribir un valor con tipo incorrecto ni de otra versión.
--   · el árbol rechaza ciclos y padres de otra versión.
--   · `parameter_changes` no admite update ni delete.
--
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja datos.
-- NUNCA ejecutar contra un proyecto alojado.
--
-- Uso (con la base local levantada):
--   supabase start
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/rls.sql
-- =============================================================================

\set ON_ERROR_STOP on

begin;

-- -----------------------------------------------------------------------------
-- Utilidades de aserción
-- -----------------------------------------------------------------------------
create schema app_test;

create or replace function app_test.eq(p_label text, p_actual bigint, p_expected bigint)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FALLO · %: se esperaba %, se obtuvo %', p_label, p_expected, p_actual;
  end if;
  raise notice 'OK · % (%)', p_label, p_actual;
end;
$$;

create or replace function app_test.affected(p_label text, p_sql text, p_expected bigint)
returns void
language plpgsql
as $$
declare
  affected bigint;
begin
  execute p_sql;
  get diagnostics affected = row_count;
  if affected <> p_expected then
    raise exception 'FALLO · %: se esperaban % filas afectadas, se obtuvieron %',
      p_label, p_expected, affected;
  end if;
  raise notice 'OK · % (% fila/s)', p_label, affected;
end;
$$;

create or replace function app_test.expect_error(p_label text, p_sql text, p_sqlstate text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate <> p_sqlstate then
      raise exception 'FALLO · %: se esperaba SQLSTATE %, llegó % — %',
        p_label, p_sqlstate, sqlstate, sqlerrm;
    end if;
    raise notice 'OK · % (bloqueado con %)', p_label, sqlstate;
    return;
  end;
  raise exception 'FALLO · %: la operación no fue bloqueada', p_label;
end;
$$;

grant usage on schema app_test to anon, authenticated;
grant execute on all functions in schema app_test to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Datos de prueba: dos usuarios con un catálogo mínimo cada uno
-- -----------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  (
    'aaaaaaaa-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rls-a@example.test', '',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  ),
  (
    'bbbbbbbb-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rls-b@example.test', '',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  )
on conflict (id) do nothing;

-- Catálogo del usuario A (dos niveles de árbol, dos parámetros, un perfil).
insert into public.cameras (id, owner_id, name, slug)
values ('aaaaaaaa-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-000000000001', 'Cámara A', 'camara-a');

insert into public.camera_versions (id, camera_id, version, is_default)
values ('aaaaaaaa-0000-4000-8000-0000000000ba', 'aaaaaaaa-0000-4000-8000-00000000000a', '1.0', true);

insert into public.parameter_nodes (id, camera_version_id, parent_id, name, node_type, sort_order)
values ('aaaaaaaa-0000-4000-8000-0000000000ca', 'aaaaaaaa-0000-4000-8000-0000000000ba', null, 'Raíz A', 'category', 0);
insert into public.parameter_nodes (id, camera_version_id, parent_id, name, node_type, sort_order)
values ('aaaaaaaa-0000-4000-8000-0000000000cb', 'aaaaaaaa-0000-4000-8000-0000000000ba', 'aaaaaaaa-0000-4000-8000-0000000000ca', 'Grupo A', 'group', 0);

insert into public.parameters (id, node_id, key, name, data_type, default_value, default_value_source)
values ('aaaaaaaa-0000-4000-8000-0000000000da', 'aaaaaaaa-0000-4000-8000-0000000000cb', 'entero_a', 'Entero A', 'integer', '1'::jsonb, 'documentation');
insert into public.parameters (
  id, node_id, key, name, data_type, default_value, default_value_source, allowed_values
)
values (
  'aaaaaaaa-0000-4000-8000-0000000000db', 'aaaaaaaa-0000-4000-8000-0000000000cb', 'opcion_a', 'Opción A',
  'enum', '"uno"'::jsonb, 'observation', '["uno", "dos"]'::jsonb
);

insert into public.configurations (id, camera_version_id, name, is_default)
values ('aaaaaaaa-0000-4000-8000-0000000000ea', 'aaaaaaaa-0000-4000-8000-0000000000ba', 'Perfil A', true);

insert into public.configuration_values (configuration_id, parameter_id, value)
values ('aaaaaaaa-0000-4000-8000-0000000000ea', 'aaaaaaaa-0000-4000-8000-0000000000da', '2'::jsonb);

insert into public.experiments (id, configuration_id, title)
values ('aaaaaaaa-0000-4000-8000-0000000000fa', 'aaaaaaaa-0000-4000-8000-0000000000ea', 'Experimento A');

insert into public.parameter_changes (
  id, experiment_id, parameter_id, previous_value, new_value, path_snapshot
)
values (
  'aaaaaaaa-0000-4000-8000-0000000000fc', 'aaaaaaaa-0000-4000-8000-0000000000fa',
  'aaaaaaaa-0000-4000-8000-0000000000da', '1'::jsonb, '2'::jsonb, '["Raíz A", "Grupo A", "Entero A"]'::jsonb
);

-- Catálogo del usuario B.
insert into public.cameras (id, owner_id, name, slug)
values ('bbbbbbbb-0000-4000-8000-00000000000b', 'bbbbbbbb-0000-4000-8000-000000000002', 'Cámara B', 'camara-b');

insert into public.camera_versions (id, camera_id, version, is_default)
values ('bbbbbbbb-0000-4000-8000-0000000000bb', 'bbbbbbbb-0000-4000-8000-00000000000b', '1.0', true);

insert into public.parameter_nodes (id, camera_version_id, parent_id, name, node_type, sort_order)
values ('bbbbbbbb-0000-4000-8000-0000000000cb', 'bbbbbbbb-0000-4000-8000-0000000000bb', null, 'Raíz B', 'category', 0);

insert into public.parameters (id, node_id, key, name, data_type, default_value, default_value_source)
values ('bbbbbbbb-0000-4000-8000-0000000000db', 'bbbbbbbb-0000-4000-8000-0000000000cb', 'entero_b', 'Entero B', 'integer', '1'::jsonb, 'documentation');

insert into public.configurations (id, camera_version_id, name, is_default)
values ('bbbbbbbb-0000-4000-8000-0000000000eb', 'bbbbbbbb-0000-4000-8000-0000000000bb', 'Perfil B', true);

insert into public.experiments (id, configuration_id, title)
values ('bbbbbbbb-0000-4000-8000-0000000000fb', 'bbbbbbbb-0000-4000-8000-0000000000eb', 'Experimento B');

insert into public.parameter_changes (
  id, experiment_id, parameter_id, previous_value, new_value, path_snapshot
)
values (
  'bbbbbbbb-0000-4000-8000-0000000000fd', 'bbbbbbbb-0000-4000-8000-0000000000fb',
  'bbbbbbbb-0000-4000-8000-0000000000db', '1'::jsonb, '2'::jsonb, '["Raíz B", "Entero B"]'::jsonb
);

-- -----------------------------------------------------------------------------
-- 1 · Anónimo: sin privilegios de tabla
-- -----------------------------------------------------------------------------
set local role anon;

select app_test.expect_error(
  'anon no lee cámaras',
  $sql$select count(*) from public.cameras$sql$,
  '42501'
);
select app_test.expect_error(
  'anon no inserta cámaras',
  $sql$insert into public.cameras (owner_id, name, slug)
       values ('aaaaaaaa-0000-4000-8000-000000000001', 'Intruso', 'intruso')$sql$,
  '42501'
);

reset role;

-- -----------------------------------------------------------------------------
-- 2 · Usuario A: solo ve lo suyo
-- -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';

select app_test.eq('A ve una sola cámara', (select count(*) from public.cameras), 1);
select app_test.eq('A ve una sola versión', (select count(*) from public.camera_versions), 1);
select app_test.eq('A ve dos nodos', (select count(*) from public.parameter_nodes), 2);
select app_test.eq('A ve dos parámetros', (select count(*) from public.parameters), 2);
select app_test.eq('A ve un perfil', (select count(*) from public.configurations), 1);
select app_test.eq('A ve un valor', (select count(*) from public.configuration_values), 1);
select app_test.eq('A ve un experimento', (select count(*) from public.experiments), 1);
select app_test.eq('A ve un cambio', (select count(*) from public.parameter_changes), 1);

select app_test.eq(
  'A no ve la cámara de B',
  (select count(*) from public.cameras where id = 'bbbbbbbb-0000-4000-8000-00000000000b'),
  0
);
select app_test.eq(
  'A no ve los cambios de B',
  (select count(*) from public.parameter_changes where id = 'bbbbbbbb-0000-4000-8000-0000000000fd'),
  0
);

-- No puede modificar filas ajenas: la actualización afecta a cero filas.
select app_test.affected(
  'A no actualiza la cámara de B',
  $sql$update public.cameras set name = 'secuestrada'
        where id = 'bbbbbbbb-0000-4000-8000-00000000000b'$sql$,
  0
);

-- No puede crear filas colgando de datos ajenos ni cambiar el dueño.
select app_test.expect_error(
  'A no crea una versión en la cámara de B',
  $sql$insert into public.camera_versions (camera_id, version)
       values ('bbbbbbbb-0000-4000-8000-00000000000b', '9.9')$sql$,
  '42501'
);
select app_test.expect_error(
  'A no crea una cámara a nombre de B',
  $sql$insert into public.cameras (owner_id, name, slug)
       values ('bbbbbbbb-0000-4000-8000-000000000002', 'Suplantada', 'suplantada')$sql$,
  '42501'
);
select app_test.expect_error(
  'A no cambia el dueño de su cámara',
  $sql$update public.cameras set owner_id = 'bbbbbbbb-0000-4000-8000-000000000002'
        where id = 'aaaaaaaa-0000-4000-8000-00000000000a'$sql$,
  '42501'
);

-- -----------------------------------------------------------------------------
-- 3 · Integridad de valores
-- -----------------------------------------------------------------------------
select app_test.expect_error(
  'un entero no acepta texto',
  $sql$insert into public.configuration_values (configuration_id, parameter_id, value)
       values ('aaaaaaaa-0000-4000-8000-0000000000ea', 'aaaaaaaa-0000-4000-8000-0000000000da', '"3"'::jsonb)$sql$,
  '23514'
);
select app_test.expect_error(
  'un entero no acepta decimales',
  $sql$insert into public.configuration_values (configuration_id, parameter_id, value)
       values ('aaaaaaaa-0000-4000-8000-0000000000ea', 'aaaaaaaa-0000-4000-8000-0000000000da', '3.5'::jsonb)$sql$,
  '23514'
);
select app_test.expect_error(
  'un enum rechaza valores fuera de la lista',
  $sql$insert into public.configuration_values (configuration_id, parameter_id, value)
       values ('aaaaaaaa-0000-4000-8000-0000000000ea', 'aaaaaaaa-0000-4000-8000-0000000000db', '"tres"'::jsonb)$sql$,
  '23514'
);
select app_test.affected(
  'un enum acepta un valor permitido',
  $sql$insert into public.configuration_values (configuration_id, parameter_id, value)
       values ('aaaaaaaa-0000-4000-8000-0000000000ea', 'aaaaaaaa-0000-4000-8000-0000000000db', '"dos"'::jsonb)$sql$,
  1
);
select app_test.expect_error(
  'el valor no puede ser de otra versión',
  $sql$insert into public.configuration_values (configuration_id, parameter_id, value)
       values ('aaaaaaaa-0000-4000-8000-0000000000ea', 'bbbbbbbb-0000-4000-8000-0000000000db', '7'::jsonb)$sql$,
  '23514'
);
select app_test.expect_error(
  'el valor predeterminado respeta el tipo',
  $sql$update public.parameters set default_value = '"no-es-un-entero"'::jsonb
        where id = 'aaaaaaaa-0000-4000-8000-0000000000da'$sql$,
  '23514'
);
select app_test.expect_error(
  'un enum requiere valores permitidos',
  $sql$update public.parameters set allowed_values = null
        where id = 'aaaaaaaa-0000-4000-8000-0000000000db'$sql$,
  '23514'
);

-- -----------------------------------------------------------------------------
-- 4 · Integridad del árbol
-- -----------------------------------------------------------------------------
select app_test.expect_error(
  'un nodo no puede ser su propio padre',
  $sql$update public.parameter_nodes set parent_id = id
        where id = 'aaaaaaaa-0000-4000-8000-0000000000ca'$sql$,
  '23514'
);
select app_test.expect_error(
  'un nodo no puede colgar de su descendiente',
  $sql$update public.parameter_nodes set parent_id = 'aaaaaaaa-0000-4000-8000-0000000000cb'
        where id = 'aaaaaaaa-0000-4000-8000-0000000000ca'$sql$,
  '23514'
);
select app_test.expect_error(
  'un nodo no puede colgar de otra versión',
  $sql$update public.parameter_nodes set parent_id = 'bbbbbbbb-0000-4000-8000-0000000000cb'
        where id = 'aaaaaaaa-0000-4000-8000-0000000000ca'$sql$,
  '23514'
);

-- -----------------------------------------------------------------------------
-- 5 · Historial append-only
-- -----------------------------------------------------------------------------
select app_test.expect_error(
  'el historial no se actualiza',
  $sql$update public.parameter_changes set reason = 'corregido'
        where id = 'aaaaaaaa-0000-4000-8000-0000000000fc'$sql$,
  '42501'
);
select app_test.expect_error(
  'el historial no se borra',
  $sql$delete from public.parameter_changes
        where id = 'aaaaaaaa-0000-4000-8000-0000000000fc'$sql$,
  '42501'
);
select app_test.affected(
  'el historial sí admite inserciones propias',
  $sql$insert into public.parameter_changes (experiment_id, parameter_id, previous_value, new_value)
       values ('aaaaaaaa-0000-4000-8000-0000000000fa', 'aaaaaaaa-0000-4000-8000-0000000000da', '2'::jsonb, '3'::jsonb)$sql$,
  1
);
select app_test.expect_error(
  'el historial no admite cambios en experimentos ajenos',
  $sql$insert into public.parameter_changes (experiment_id, parameter_id, previous_value, new_value)
       values ('bbbbbbbb-0000-4000-8000-0000000000fb', 'bbbbbbbb-0000-4000-8000-0000000000db', '2'::jsonb, '3'::jsonb)$sql$,
  '42501'
);
select app_test.expect_error(
  'el historial no admite parámetros de otra versión',
  $sql$insert into public.parameter_changes (experiment_id, parameter_id, previous_value, new_value)
       values ('aaaaaaaa-0000-4000-8000-0000000000fa', 'bbbbbbbb-0000-4000-8000-0000000000db', '2'::jsonb, '3'::jsonb)$sql$,
  '23514'
);

reset role;

-- -----------------------------------------------------------------------------
-- 6 · Usuario B: simetría
-- -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}';

select app_test.eq('B ve una sola cámara', (select count(*) from public.cameras), 1);
select app_test.eq(
  'B ve su propia cámara',
  (select count(*) from public.cameras where id = 'bbbbbbbb-0000-4000-8000-00000000000b'),
  1
);
select app_test.eq(
  'B no ve la cámara de A',
  (select count(*) from public.cameras where id = 'aaaaaaaa-0000-4000-8000-00000000000a'),
  0
);
select app_test.eq(
  'B no ve los nodos de A',
  (select count(*) from public.parameter_nodes where camera_version_id = 'aaaaaaaa-0000-4000-8000-0000000000ba'),
  0
);

reset role;

do $$
begin
  raise notice 'Todas las comprobaciones de RLS e integridad terminaron correctamente.';
end;
$$;

rollback;
