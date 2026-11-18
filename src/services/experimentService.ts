import { AppError, toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import { chunkIds, resolvePagination } from './queryHelpers'
import { configurationService } from './configurationService'
import type {
  Experiment,
  ExperimentInput,
  ExperimentPatch,
  ExperimentRow,
  ExperimentStatus,
  Page,
} from './types'

/**
 * Experimentos: documentan una prueba hecha a mano en el teléfono. La aplicación
 * **no** aplica cambios en el dispositivo.
 *
 * Contrato:
 * - Un experimento pertenece a un perfil y nunca se comparte entre versiones
 *   (`app.validate_parameter_change` valida además sus cambios).
 * - `listByVersion` resuelve primero los perfiles de la versión.
 * - `remove` falla con `conflict` si el experimento ya tiene historial: el
 *   historial es intocable.
 * - Todos los errores se traducen a `AppError`.
 */

const EXPERIMENT_COLUMNS =
  'id, configuration_id, title, objective, hypothesis, status, observations, conclusion, started_at, completed_at, created_at, updated_at' as const

/** Columnas con perfil y conteo de cambios para los listados. */
const EXPERIMENT_LIST_COLUMNS =
  `${EXPERIMENT_COLUMNS}, configurations(name), parameter_changes(count)` as const

type ExperimentListRow = ExperimentRow & {
  /** PostgREST devuelve el embed como objeto o array según la inferencia de tipos. */
  configurations?: { name: string } | Array<{ name: string }> | null
  parameter_changes?: Array<{ count: number }>
}

const configurationNameOf = (row: ExperimentListRow): string => {
  const embedded = row.configurations
  if (!embedded) return 'Perfil'
  return Array.isArray(embedded) ? (embedded[0]?.name ?? 'Perfil') : embedded.name
}

const toExperiment = (row: ExperimentRow, configurationName = '', changeCount = 0): Experiment => ({
  id: row.id,
  configurationId: row.configuration_id,
  configurationName,
  title: row.title,
  objective: row.objective,
  hypothesis: row.hypothesis,
  status: row.status,
  observations: row.observations,
  conclusion: row.conclusion,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  changeCount,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toExperimentFromList = (row: ExperimentListRow): Experiment =>
  toExperiment(row, configurationNameOf(row), row.parameter_changes?.[0]?.count ?? 0)

const toRowPatch = (input: ExperimentPatch): Partial<ExperimentRow> => {
  const patch: Partial<ExperimentRow> = {}
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.objective !== undefined) patch.objective = input.objective?.trim() || null
  if (input.hypothesis !== undefined) patch.hypothesis = input.hypothesis?.trim() || null
  if (input.status !== undefined) patch.status = input.status
  if (input.observations !== undefined) patch.observations = input.observations?.trim() || null
  if (input.conclusion !== undefined) patch.conclusion = input.conclusion?.trim() || null
  if (input.startedAt !== undefined) patch.started_at = input.startedAt
  if (input.completedAt !== undefined) patch.completed_at = input.completedAt
  return patch
}

const updateExperiment = async (id: string, input: ExperimentPatch): Promise<Experiment> => {
  const { data, error } = await getSupabase()
    .from('experiments')
    .update(toRowPatch(input))
    .eq('id', id)
    .select(EXPERIMENT_COLUMNS)
    .single()
    .returns<ExperimentRow>()

  if (error) throw error
  return toExperiment(data)
}

export const experimentService = {
  async listByConfiguration(
    configurationId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<Page<Experiment>> {
    try {
      const { limit, offset, from, to } = resolvePagination(params)
      const { data, error, count } = await getSupabase()
        .from('experiments')
        .select(EXPERIMENT_LIST_COLUMNS, { count: 'exact' })
        .eq('configuration_id', configurationId)
        .order('created_at', { ascending: false })
        .range(from, to)
        .returns<ExperimentListRow[]>()

      if (error) throw error
      return { items: (data ?? []).map(toExperimentFromList), total: count ?? 0, limit, offset }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Experimentos de todos los perfiles de una versión. */
  async listByVersion(versionId: string, params?: { limit?: number; offset?: number }): Promise<Page<Experiment>> {
    try {
      const { limit, offset, from, to } = resolvePagination(params)
      const { items: configurations } = await configurationService.listByVersion(versionId, {
        active: 'all',
        limit: 100,
      })

      if (configurations.length === 0) return { items: [], total: 0, limit, offset }

      const configurationIds = configurations.map((configuration) => configuration.id)
      const results: ExperimentListRow[] = []
      let total = 0

      for (const ids of chunkIds(configurationIds)) {
        const { data, error, count } = await getSupabase()
          .from('experiments')
          .select(EXPERIMENT_LIST_COLUMNS, { count: 'exact' })
          .in('configuration_id', ids)
          .order('created_at', { ascending: false })

        if (error) throw error
        results.push(...(data ?? []))
        total += count ?? 0
      }

      results.sort((a, b) => b.created_at.localeCompare(a.created_at))
      return {
        items: results.slice(from, to + 1).map(toExperimentFromList),
        total,
        limit,
        offset,
      }
    } catch (error) {
      throw toAppError(error)
    }
  },

  async getById(id: string): Promise<Experiment> {
    try {
      const { data, error } = await getSupabase()
        .from('experiments')
        .select(EXPERIMENT_LIST_COLUMNS)
        .eq('id', id)
        .single()
        .returns<ExperimentListRow>()

      if (error) throw error
      return toExperimentFromList(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async create(input: ExperimentInput): Promise<Experiment> {
    try {
      if (!input.title.trim()) throw new AppError('validation', 'El título del experimento es obligatorio.')

      const now = new Date().toISOString()
      const status = input.status ?? 'planned'
      const closing = status === 'completed' || status === 'failed' || status === 'inconclusive'

      const { data, error } = await getSupabase()
        .from('experiments')
        .insert({
          configuration_id: input.configurationId,
          title: input.title.trim(),
          ...toRowPatch({ ...input }),
          status,
          started_at: status === 'planned' ? (input.startedAt ?? null) : (input.startedAt ?? now),
          completed_at: closing ? (input.completedAt ?? now) : (input.completedAt ?? null),
        })
        .select(EXPERIMENT_COLUMNS)
        .single()
        .returns<ExperimentRow>()

      if (error) throw error
      return toExperiment(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async update(id: string, input: ExperimentPatch): Promise<Experiment> {
    try {
      return await updateExperiment(id, input)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Cambia el estado sellando inicio y finalización según corresponda. */
  async setStatus(id: string, status: ExperimentStatus): Promise<Experiment> {
    try {
      const current = await this.getById(id)
      const now = new Date().toISOString()
      const closing = status === 'completed' || status === 'failed' || status === 'inconclusive'

      return await updateExperiment(id, {
        status,
        startedAt: status === 'planned' ? null : (current.startedAt ?? now),
        completedAt: closing ? now : null,
      })
    } catch (error) {
      throw toAppError(error)
    }
  },

  /**
   * Duplica un experimento como base de uno nuevo.
   * Copia título/objetivo/hipótesis y perfil; **no** copia cambios ni
   * resultados: el historial del original es único y no se replica.
   */
  async duplicate(id: string): Promise<Experiment> {
    try {
      const source = await this.getById(id)
      return await this.create({
        configurationId: source.configurationId,
        title: `${source.title} (copia)`,
        objective: source.objective,
        hypothesis: source.hypothesis,
        status: 'planned',
      })
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Elimina un experimento sin historial. Con cambios registrados: `conflict`. */
  async remove(id: string): Promise<void> {
    try {
      const { error } = await getSupabase().from('experiments').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      throw toAppError(error)
    }
  },
}
