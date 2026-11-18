-- =============================================================================
-- 20261118120400_parameter_changes_applied.sql
-- Distingue un cambio aplicado al perfil de uno registrado solo como historial.
--
-- Motivo (D-031): el laboratorio documenta cambios que el usuario aplica a mano
-- en el teléfono. Al registrar un cambio hay que saber si en ese momento también
-- se actualizó `configuration_values` (perfil) o si solo quedó constancia
-- histórica. Sin esta marca la cronología no puede explicarse.
--
-- `parameter_changes` sigue siendo append-only: la marca se fija al insertar y
-- no existe UPDATE para `authenticated`.
-- =============================================================================

alter table public.parameter_changes
  add column if not exists applied_to_profile boolean not null default false;

comment on column public.parameter_changes.applied_to_profile is
  'true si al registrar el cambio también se actualizó configuration_values; false si solo es histórico.';
