-- =============================================================================
-- Laboratorio de Configuraciones GCam · 08 · Borrado definitivo de una rama
--
-- El historial es append-only: `authenticated` no tiene privilegio de DELETE
-- sobre `parameter_changes` y RLS tampoco lo concede. Hasta ahora, borrar un
-- nivel o un parámetro con historial era imposible desde el cliente (23503).
--
-- Estas funciones `security definer` concentran el borrado de UNA rama o de UN
-- parámetro, comprobando antes que pertenecen al usuario de la sesión. No
-- amplían privilegios de tabla: el cliente sigue sin poder borrar historial por
-- su cuenta, solo puede invocar el borrado completo de *su* rama o parámetro.
--
-- El borrado de una cámara completa sigue viviendo en `delete_camera`.
-- =============================================================================

create or replace function public.delete_node_branch(p_node_id uuid)
returns table (deleted_nodes integer, deleted_parameters integer, deleted_changes integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_nodes uuid[] := '{}'::uuid[];
  v_parameters integer := 0;
  v_changes integer := 0;
begin
  select c.owner_id
    into v_owner
    from public.parameter_nodes n
    join public.camera_versions v on v.id = n.camera_version_id
    join public.cameras c on c.id = v.camera_id
   where n.id = p_node_id;

  if v_owner is null then
    raise exception 'El nivel no existe' using errcode = 'P0002';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'El nivel no pertenece al usuario de la sesión' using errcode = '42501';
  end if;

  -- El nodo y todos sus descendientes (profundidad ilimitada).
  with recursive branch as (
    select n.id
      from public.parameter_nodes n
     where n.id = p_node_id
    union all
    select child.id
      from public.parameter_nodes child
      join branch parent on child.parent_id = parent.id
  )
  select coalesce(array_agg(branch.id), '{}'::uuid[])
    into v_nodes
    from branch;

  select count(*)::integer
    into v_parameters
    from public.parameters p
   where p.node_id = any(v_nodes);

  select count(*)::integer
    into v_changes
    from public.parameter_changes pc
    join public.parameters p on p.id = pc.parameter_id
   where p.node_id = any(v_nodes);

  -- Dependencias heredadas de perfiles (la interfaz ya no los crea).
  delete from public.configuration_values cv
   using public.parameters p
   where cv.parameter_id = p.id
     and p.node_id = any(v_nodes);

  delete from public.parameter_changes pc
   using public.parameters p
   where pc.parameter_id = p.id
     and p.node_id = any(v_nodes);

  delete from public.parameters p
   where p.node_id = any(v_nodes);

  -- Hijos primero: la FK del árbol es `restrict`, no hay cascada silenciosa.
  loop
    delete from public.parameter_nodes n
     where n.id = any(v_nodes)
       and not exists (
         select 1
           from public.parameter_nodes child
          where child.parent_id = n.id
            and child.id = any(v_nodes)
       );
    exit when not found;
  end loop;

  deleted_nodes := cardinality(v_nodes);
  deleted_parameters := v_parameters;
  deleted_changes := v_changes;
  return next;
end;
$$;

comment on function public.delete_node_branch(uuid) is
  'Borra un nivel, sus descendientes y sus parámetros con historial. Valida la propiedad dentro de la función.';

create or replace function public.delete_parameter(p_parameter_id uuid)
returns table (deleted_parameters integer, deleted_changes integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_changes integer := 0;
begin
  select c.owner_id
    into v_owner
    from public.parameters p
    join public.parameter_nodes n on n.id = p.node_id
    join public.camera_versions v on v.id = n.camera_version_id
    join public.cameras c on c.id = v.camera_id
   where p.id = p_parameter_id;

  if v_owner is null then
    raise exception 'El parámetro no existe' using errcode = 'P0002';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'El parámetro no pertenece al usuario de la sesión' using errcode = '42501';
  end if;

  select count(*)::integer
    into v_changes
    from public.parameter_changes pc
   where pc.parameter_id = p_parameter_id;

  delete from public.configuration_values cv
   where cv.parameter_id = p_parameter_id;

  delete from public.parameter_changes pc
   where pc.parameter_id = p_parameter_id;

  delete from public.parameters p
   where p.id = p_parameter_id;

  deleted_parameters := 1;
  deleted_changes := v_changes;
  return next;
end;
$$;

comment on function public.delete_parameter(uuid) is
  'Borra un parámetro y su historial. Valida la propiedad dentro de la función.';

revoke all on function public.delete_node_branch(uuid) from public;
revoke all on function public.delete_node_branch(uuid) from anon;
grant execute on function public.delete_node_branch(uuid) to authenticated;

revoke all on function public.delete_parameter(uuid) from public;
revoke all on function public.delete_parameter(uuid) from anon;
grant execute on function public.delete_parameter(uuid) to authenticated;
