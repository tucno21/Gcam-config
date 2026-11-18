-- =============================================================================
-- Semilla de demostración · SOLO DATOS FICTICIOS
--
-- No describe ni replica parámetros, rangos o valores de LMC, AGC o BSG. Sirve
-- para ver la interfaz con datos mientras se construyen las etapas 5–10.
--
-- Requiere al menos un usuario en auth.users (regístrate primero desde la app o
-- crea uno en Supabase Auth). Si no hay usuarios, la semilla no hace nada.
--
-- Se ejecuta con `supabase db reset` (config.toml → [db.seed]) y siempre como
-- dueño de las tablas, así que RLS no interviene.
-- =============================================================================

do $$
declare
  v_owner uuid;
  v_camera uuid;
  v_version uuid;
  v_root uuid;
  v_group uuid;
  v_integer_parameter uuid;
  v_enum_parameter uuid;
  v_configuration uuid;
  v_experiment uuid;
begin
  select u.id
    into v_owner
    from auth.users u
   order by u.created_at nulls last
   limit 1;

  if v_owner is null then
    raise notice 'Semilla omitida: todavía no existe ningún usuario en auth.users.';
    return;
  end if;

  insert into public.cameras (owner_id, name, slug, description, developer)
  values (
    v_owner,
    'Cámara ficticia de demostración',
    'camara-ficticia-demo',
    'DATOS FICTICIOS. Esta cámara existe solo para probar la interfaz: no documenta ninguna versión real de GCam.',
    'Demostración'
  )
  on conflict (owner_id, slug) do nothing
  returning id into v_camera;

  if v_camera is null then
    raise notice 'Semilla omitida: la cámara ficticia ya existe para este usuario.';
    return;
  end if;

  insert into public.camera_versions (camera_id, version, release_label, notes, is_default)
  values (
    v_camera,
    '0.0-demo',
    'Versión ficticia',
    'DATOS FICTICIOS. Sirve para recorrer el árbol, los perfiles y el historial.',
    true
  )
  returning id into v_version;

  insert into public.parameter_nodes (camera_version_id, name, description, node_type, sort_order)
  values (
    v_version,
    'Categoría ficticia',
    'Nivel raíz de ejemplo. No corresponde a ninguna categoría real de GCam.',
    'category',
    0
  )
  returning id into v_root;

  insert into public.parameter_nodes (camera_version_id, parent_id, name, description, node_type, sort_order)
  values (
    v_version,
    v_root,
    'Grupo ficticio',
    'Nivel intermedio de ejemplo, para comprobar la profundidad del árbol.',
    'group',
    0
  )
  returning id into v_group;

  insert into public.parameters (
    node_id, key, name, description, data_type, unit,
    default_value, default_value_source, allowed_values, sort_order
  )
  values (
    v_group,
    'demo_entero',
    'Parámetro ficticio A',
    'DATOS FICTICIOS. Parámetro numérico de ejemplo; no representa un ajuste real.',
    'integer',
    'unidades ficticias',
    '3'::jsonb,
    'documentation',
    null,
    0
  )
  returning id into v_integer_parameter;

  insert into public.parameters (
    node_id, key, name, description, data_type,
    default_value, default_value_source, allowed_values, sort_order
  )
  values (
    v_group,
    'demo_opcion',
    'Parámetro ficticio B',
    'DATOS FICTICIOS. Parámetro enumerado de ejemplo; no representa un ajuste real.',
    'enum',
    '"opcion-a"'::jsonb,
    'observation',
    '["opcion-a", "opcion-b"]'::jsonb,
    1
  )
  returning id into v_enum_parameter;

  insert into public.configurations (camera_version_id, name, description, is_default)
  values (
    v_version,
    'Perfil ficticio',
    'DATOS FICTICIOS. Perfil de demostración con un único valor personalizado.',
    true
  )
  returning id into v_configuration;

  insert into public.configuration_values (configuration_id, parameter_id, value, notes)
  values (
    v_configuration,
    v_integer_parameter,
    '5'::jsonb,
    'Valor ficticio distinto del predeterminado, para comparar en la interfaz.'
  );

  insert into public.experiments (configuration_id, title, objective, hypothesis, status, observations)
  values (
    v_configuration,
    'Experimento ficticio',
    'Comprobar cómo se muestra un experimento con historial.',
    'La interfaz mostrará el cambio con su ruta jerárquica.',
    'in_progress',
    'Observación ficticia de demostración.'
  )
  returning id into v_experiment;

  insert into public.parameter_changes (
    experiment_id, parameter_id, previous_value, new_value, reason, observation, path_snapshot
  )
  values (
    v_experiment,
    v_integer_parameter,
    '3'::jsonb,
    '5'::jsonb,
    'Motivo ficticio de demostración.',
    'Observación ficticia del cambio.',
    '["Categoría ficticia", "Grupo ficticio", "Parámetro ficticio A"]'::jsonb
  );

  raise notice 'Semilla ficticia creada para el usuario %.', v_owner;
end;
$$;
