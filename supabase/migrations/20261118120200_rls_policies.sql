-- =============================================================================
-- Laboratorio de Configuraciones GCam · 03 · RLS y privilegios
--
-- Toda tabla queda con RLS activo y políticas por operación. La propiedad se
-- deriva de `cameras.owner_id`:
--
--   cameras            → owner_id = auth.uid()
--   camera_versions    → app.owns_camera(camera_id)
--   parameter_nodes    → app.owns_version(camera_version_id)
--   parameters         → nodo → versión → cámara
--   configurations     → app.owns_version(camera_version_id)
--   configuration_values → configuración → versión
--   experiments        → configuración → versión
--   parameter_changes  → experimento → configuración → versión  (solo select/insert)
--   ai_recommendations → app.owns_version(camera_version_id)
--
-- `anon` no recibe privilegios de tabla: sin sesión no se puede ni intentar.
-- =============================================================================

alter table public.cameras enable row level security;
alter table public.camera_versions enable row level security;
alter table public.parameter_nodes enable row level security;
alter table public.parameters enable row level security;
alter table public.configurations enable row level security;
alter table public.configuration_values enable row level security;
alter table public.experiments enable row level security;
alter table public.parameter_changes enable row level security;
alter table public.ai_recommendations enable row level security;

-- -----------------------------------------------------------------------------
-- cameras
-- -----------------------------------------------------------------------------
create policy cameras_select_own on public.cameras
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy cameras_insert_own on public.cameras
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy cameras_update_own on public.cameras
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy cameras_delete_own on public.cameras
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- camera_versions
-- -----------------------------------------------------------------------------
create policy camera_versions_select_own on public.camera_versions
  for select to authenticated
  using (app.owns_camera(camera_id));

create policy camera_versions_insert_own on public.camera_versions
  for insert to authenticated
  with check (app.owns_camera(camera_id));

create policy camera_versions_update_own on public.camera_versions
  for update to authenticated
  using (app.owns_camera(camera_id))
  with check (app.owns_camera(camera_id));

create policy camera_versions_delete_own on public.camera_versions
  for delete to authenticated
  using (app.owns_camera(camera_id));

-- -----------------------------------------------------------------------------
-- parameter_nodes
-- -----------------------------------------------------------------------------
create policy parameter_nodes_select_own on public.parameter_nodes
  for select to authenticated
  using (app.owns_version(camera_version_id));

create policy parameter_nodes_insert_own on public.parameter_nodes
  for insert to authenticated
  with check (app.owns_version(camera_version_id));

create policy parameter_nodes_update_own on public.parameter_nodes
  for update to authenticated
  using (app.owns_version(camera_version_id))
  with check (app.owns_version(camera_version_id));

create policy parameter_nodes_delete_own on public.parameter_nodes
  for delete to authenticated
  using (app.owns_version(camera_version_id));

-- -----------------------------------------------------------------------------
-- parameters
-- -----------------------------------------------------------------------------
create policy parameters_select_own on public.parameters
  for select to authenticated
  using (
    exists (
      select 1
        from public.parameter_nodes n
       where n.id = parameters.node_id
         and app.owns_version(n.camera_version_id)
    )
  );

create policy parameters_insert_own on public.parameters
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.parameter_nodes n
       where n.id = parameters.node_id
         and app.owns_version(n.camera_version_id)
    )
  );

create policy parameters_update_own on public.parameters
  for update to authenticated
  using (
    exists (
      select 1
        from public.parameter_nodes n
       where n.id = parameters.node_id
         and app.owns_version(n.camera_version_id)
    )
  )
  with check (
    exists (
      select 1
        from public.parameter_nodes n
       where n.id = parameters.node_id
         and app.owns_version(n.camera_version_id)
    )
  );

create policy parameters_delete_own on public.parameters
  for delete to authenticated
  using (
    exists (
      select 1
        from public.parameter_nodes n
       where n.id = parameters.node_id
         and app.owns_version(n.camera_version_id)
    )
  );

-- -----------------------------------------------------------------------------
-- configurations
-- -----------------------------------------------------------------------------
create policy configurations_select_own on public.configurations
  for select to authenticated
  using (app.owns_version(camera_version_id));

create policy configurations_insert_own on public.configurations
  for insert to authenticated
  with check (app.owns_version(camera_version_id));

create policy configurations_update_own on public.configurations
  for update to authenticated
  using (app.owns_version(camera_version_id))
  with check (app.owns_version(camera_version_id));

create policy configurations_delete_own on public.configurations
  for delete to authenticated
  using (app.owns_version(camera_version_id));

-- -----------------------------------------------------------------------------
-- configuration_values
-- -----------------------------------------------------------------------------
create policy configuration_values_select_own on public.configuration_values
  for select to authenticated
  using (
    exists (
      select 1
        from public.configurations c
       where c.id = configuration_values.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  );

create policy configuration_values_insert_own on public.configuration_values
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.configurations c
       where c.id = configuration_values.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  );

create policy configuration_values_update_own on public.configuration_values
  for update to authenticated
  using (
    exists (
      select 1
        from public.configurations c
       where c.id = configuration_values.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  )
  with check (
    exists (
      select 1
        from public.configurations c
       where c.id = configuration_values.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  );

create policy configuration_values_delete_own on public.configuration_values
  for delete to authenticated
  using (
    exists (
      select 1
        from public.configurations c
       where c.id = configuration_values.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  );

-- -----------------------------------------------------------------------------
-- experiments
-- -----------------------------------------------------------------------------
create policy experiments_select_own on public.experiments
  for select to authenticated
  using (
    exists (
      select 1
        from public.configurations c
       where c.id = experiments.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  );

create policy experiments_insert_own on public.experiments
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.configurations c
       where c.id = experiments.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  );

create policy experiments_update_own on public.experiments
  for update to authenticated
  using (
    exists (
      select 1
        from public.configurations c
       where c.id = experiments.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  )
  with check (
    exists (
      select 1
        from public.configurations c
       where c.id = experiments.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  );

create policy experiments_delete_own on public.experiments
  for delete to authenticated
  using (
    exists (
      select 1
        from public.configurations c
       where c.id = experiments.configuration_id
         and app.owns_version(c.camera_version_id)
    )
  );

-- -----------------------------------------------------------------------------
-- parameter_changes · historial append-only: sin update ni delete
-- -----------------------------------------------------------------------------
create policy parameter_changes_select_own on public.parameter_changes
  for select to authenticated
  using (
    exists (
      select 1
        from public.experiments e
        join public.configurations c on c.id = e.configuration_id
       where e.id = parameter_changes.experiment_id
         and app.owns_version(c.camera_version_id)
    )
  );

create policy parameter_changes_insert_own on public.parameter_changes
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.experiments e
        join public.configurations c on c.id = e.configuration_id
       where e.id = parameter_changes.experiment_id
         and app.owns_version(c.camera_version_id)
    )
  );

-- -----------------------------------------------------------------------------
-- ai_recommendations
-- -----------------------------------------------------------------------------
create policy ai_recommendations_select_own on public.ai_recommendations
  for select to authenticated
  using (app.owns_version(camera_version_id));

create policy ai_recommendations_insert_own on public.ai_recommendations
  for insert to authenticated
  with check (app.owns_version(camera_version_id));

create policy ai_recommendations_update_own on public.ai_recommendations
  for update to authenticated
  using (app.owns_version(camera_version_id))
  with check (app.owns_version(camera_version_id));

create policy ai_recommendations_delete_own on public.ai_recommendations
  for delete to authenticated
  using (app.owns_version(camera_version_id));

-- -----------------------------------------------------------------------------
-- Privilegios de tabla
--
-- Sin sesión no hay privilegios: `anon` no puede leer ni escribir aunque
-- intentara saltarse la interfaz. `parameter_changes` solo admite select/insert.
-- -----------------------------------------------------------------------------
revoke all on table public.cameras from anon;
revoke all on table public.camera_versions from anon;
revoke all on table public.parameter_nodes from anon;
revoke all on table public.parameters from anon;
revoke all on table public.configurations from anon;
revoke all on table public.configuration_values from anon;
revoke all on table public.experiments from anon;
revoke all on table public.parameter_changes from anon;
revoke all on table public.ai_recommendations from anon;

grant select, insert, update, delete on table public.cameras to authenticated;
grant select, insert, update, delete on table public.camera_versions to authenticated;
grant select, insert, update, delete on table public.parameter_nodes to authenticated;
grant select, insert, update, delete on table public.parameters to authenticated;
grant select, insert, update, delete on table public.configurations to authenticated;
grant select, insert, update, delete on table public.configuration_values to authenticated;
grant select, insert, update, delete on table public.experiments to authenticated;
grant select, insert on table public.parameter_changes to authenticated;
grant select, insert, update, delete on table public.ai_recommendations to authenticated;
