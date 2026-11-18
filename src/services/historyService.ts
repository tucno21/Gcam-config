import { toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import { chunkIds, MAX_ROWS, resolvePagination } from './queryHelpers'
import { configurationService } from './configurationService'
import type { Page, ParameterChange, ParameterChangeInput, ParameterChangeRow } from './types'

/**
 * Historial de cambios: **append-only**. Nunca se actualiza ni se borra desde el
 * cliente (RLS no concede `update` ni `delete` a `authenticated`).
 *
 * Contrato:
 * - Cada registro conserva valor anterior, valor nuevo, motivo, observación y una
 *   instantánea de la ruta jerárquica del momento.
 * - `listByVersion` recorre perfil → experimento → cambio, con conteo exacto y
 *   paginación; nunca descarga la tabla completa.
 * - Todos los errores se traducen a `AppError` (el tipo se importa solo para JSDoc).
 */

const CHANGE_COLUMNS =
  'id, experiment_id, parameter_id, previous_value, new_value, reason, observation, path_snapshot, applied_to_profile, created_at' as const

const toChange = (row: ParameterChangeRow): ParameterChange => ({
  id: row.id,
  experimentId: row.experiment_id,
  parameterId: row.parameter_id,
  previousValue: row.previous_value,
  newValue: row.new_value,
  reason: row.reason,
  observation: row.observation,
  pathSnapshot: row.path_snapshot,
  appliedToProfile: row.applied_to_profile,
  createdAt: row.created_at,
})

const experimentIdsForVersion = async (versionId: string): Promise<string[]> => {
  const { items: configurations } = await configurationService.listByVersion(versionId, {
    active: 'all',
    limit: 100,
  })
  if (configurations.length === 0) return []

  const ids: string[] = []
  for (const configurationIds of chunkIds(configurations.map((configuration) => configuration.id))) {
    const { data, error } = await getSupabase()
      .from('experiments')
      .select('id')
      .in('configuration_id', configurationIds)
      .limit(1_000)
      .returns<Array<{ id: string }>>()

    if (error) throw error
    ids.push(...(data ?? []).map((row) => row.id))
  }
  return ids
}

export const historyService = {
  /** Cambios registrados en los experimentos de una versión, del más reciente al más antiguo. */
  async listByVersion(versionId: string, params?: { limit?: number; offset?: number }): Promise<Page<ParameterChange>> {
    try {
      const { limit, offset, from, to } = resolvePagination(params)
      const experimentIds = await experimentIdsForVersion(versionId)
      if (experimentIds.length === 0) return { items: [], total: 0, limit, offset }

      const rows: ParameterChangeRow[] = []
      let total = 0

      for (const ids of chunkIds(experimentIds, 50)) {
        const { data, error, count } = await getSupabase()
          .from('parameter_changes')
          .select(CHANGE_COLUMNS, { count: 'exact' })
          .in('experiment_id', ids)
          .order('created_at', { ascending: false })

        if (error) throw error
        rows.push(...(data ?? []))
        total += count ?? 0
      }

      rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
      return { items: rows.slice(from, to + 1).map(toChange), total, limit, offset }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Historial completo de un experimento. */
  async listByExperiment(experimentId: string): Promise<ParameterChange[]> {
    try {
      const { data, error } = await getSupabase()
        .from('parameter_changes')
        .select(CHANGE_COLUMNS)
        .eq('experiment_id', experimentId)
        .order('created_at', { ascending: true })
        .limit(1_000)
        .returns<ParameterChangeRow[]>()

      if (error) throw error
      return (data ?? []).map(toChange)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Añade un registro al historial. No existe operación de edición ni borrado. */
  async recordChange(input: ParameterChangeInput): Promise<ParameterChange> {
    try {
      const { data, error } = await getSupabase()
        .from('parameter_changes')
        .insert({
          experiment_id: input.experimentId,
          parameter_id: input.parameterId,
          previous_value: input.previousValue ?? null,
          new_value: input.newValue ?? null,
          reason: input.reason?.trim() || null,
          observation: input.observation?.trim() || null,
          path_snapshot: input.pathSnapshot ?? null,
          applied_to_profile: input.appliedToProfile,
        })
        .select(CHANGE_COLUMNS)
        .single()
        .returns<ParameterChangeRow>()

      if (error) throw error
      return toChange(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /**
   * Todos los cambios de la versión (tope 5 000) para cronología y estadísticas.
   * Pagina internamente con el listado normal: nunca descarga sin límite.
   */
  async listAllByVersion(versionId: string): Promise<ParameterChange[]> {
    try {
      const items: ParameterChange[] = []

      while (items.length < MAX_ROWS) {
        const page = await this.listByVersion(versionId, { limit: 100, offset: items.length })
        items.push(...page.items)
        if (page.items.length === 0 || items.length >= page.total) break
      }

      return items.slice(0, MAX_ROWS)
    } catch (error) {
      throw toAppError(error)
    }
  },
}
