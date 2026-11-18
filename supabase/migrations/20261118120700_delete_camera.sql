-- =============================================================================
-- Laboratorio de Configuraciones GCam · 07 · Borrado explícito de una cámara
--
-- El historial es append-only: `authenticated` no tiene privilegio de DELETE
-- sobre `parameter_changes` y RLS tampoco lo concede. Por eso borrar una cámara
-- con historial desde el cliente era imposible (42501).
--
-- Esta función `security definer` concentra el borrado en orden hijos-primero,
-- comprobando antes que la cámara pertenece al usuario de la sesión. No amplía
-- privilegios de tabla: el cliente sigue sin poder borrar historial por su
-- cuenta, solo puede invocar este borrado completo de *su* cámara.
-- =============================================================================

create or replace function public.delete_camera(p_camera_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.cameras c
     where c.id = p_camera_id
       and c.owner_id = auth.uid()
  ) then
    raise exception 'La cámara no existe o no pertenece al usuario de la sesión'
      using errcode = '42501';
  end if;

  -- Historial de valores sueltos.
  delete from public.parameter_changes pc
   using public.parameters p, public.parameter_nodes n, public.camera_versions v
   where pc.parameter_id = p.id
     and p.node_id = n.id
     and n.camera_version_id = v.id
     and v.camera_id = p_camera_id;

  -- Herencia de perfiles/experimentos.
  delete from public.parameter_changes pc
   using public.experiments e, public.configurations cfg, public.camera_versions v
   where pc.experiment_id = e.id
     and e.configuration_id = cfg.id
     and cfg.camera_version_id = v.id
     and v.camera_id = p_camera_id;

  delete from public.experiments e
   using public.configurations cfg, public.camera_versions v
   where e.configuration_id = cfg.id
     and cfg.camera_version_id = v.id
     and v.camera_id = p_camera_id;

  delete from public.configuration_values cv
   using public.configurations cfg, public.camera_versions v
   where cv.configuration_id = cfg.id
     and cfg.camera_version_id = v.id
     and v.camera_id = p_camera_id;

  delete from public.configurations cfg
   using public.camera_versions v
   where cfg.camera_version_id = v.id
     and v.camera_id = p_camera_id;

  delete from public.ai_recommendations ar
   using public.camera_versions v
   where ar.camera_version_id = v.id
     and v.camera_id = p_camera_id;

  delete from public.parameters p
   using public.parameter_nodes n, public.camera_versions v
   where p.node_id = n.id
     and n.camera_version_id = v.id
     and v.camera_id = p_camera_id;

  delete from public.parameter_nodes n
   using public.camera_versions v
   where n.camera_version_id = v.id
     and v.camera_id = p_camera_id;

  delete from public.camera_versions v where v.camera_id = p_camera_id;
  delete from public.cameras c where c.id = p_camera_id;
end;
$$;

comment on function public.delete_camera(uuid) is
  'Borra una cámara del usuario con toda su estructura, valores e historial. Único punto donde se elimina historial; valida la propiedad dentro de la función.';

revoke all on function public.delete_camera(uuid) from public;
revoke all on function public.delete_camera(uuid) from anon;
grant execute on function public.delete_camera(uuid) to authenticated;
