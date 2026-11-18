-- =============================================================================
-- 20261118120300_privileges_hardening.sql
-- Endurece los privilegios concedidos por defecto por Supabase.
--
-- Motivo: el proyecto alojado crea cada tabla con `grant all` implícito a
-- `authenticated` y `service_role` (default privileges del proyecto). La
-- migración 20261118120200 concedió los privilegios del modelo, pero no revocó
-- los extras, y en la base local de pruebas no existían:
--   * `parameter_changes` quedaba con update/delete/truncate para
--     `authenticated` (el historial debía ser append-only, D-020).
--   * Todas las tablas quedaban con references/trigger/truncate.
-- La capa RLS impedía tocar filas ajenas, pero un comando update/delete sobre
-- el historial terminaba en «0 filas afectadas» en lugar de un error claro.
--
-- Resultado: `authenticated` solo puede hacer DML por fila (select/insert/
-- update/delete según cada tabla); el historial queda en select/insert; y ni
-- `authenticated` ni `anon` conservan privileges de esquema (references,
-- trigger, truncate). `service_role` no se toca: es la clave administrativa del
-- servidor y nunca llega al navegador.
-- =============================================================================

-- 1. Historial append-only: solo leer y añadir registros.
revoke all on table public.parameter_changes from authenticated;
grant select, insert on table public.parameter_changes to authenticated;

-- 2. Resto de tablas: quitar privilegios de esquema que excede el modelo.
revoke references, trigger, truncate on table
  public.cameras,
  public.camera_versions,
  public.parameter_nodes,
  public.parameters,
  public.configurations,
  public.configuration_values,
  public.experiments,
  public.ai_recommendations
from authenticated;

-- 3. `anon` sigue sin nada (reafirmación idempotente ante default privileges).
revoke all on table
  public.cameras,
  public.camera_versions,
  public.parameter_nodes,
  public.parameters,
  public.configurations,
  public.configuration_values,
  public.experiments,
  public.parameter_changes,
  public.ai_recommendations
from anon;
