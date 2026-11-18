import { toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import { MAX_ROWS, chunkIds, resolvePagination } from './queryHelpers'
import { nodeService } from './nodeService'
import { parameterService } from './parameterService'
import type {
  ChangeEffect,
  CurrentValueSource,
  Page,
  Parameter,
  ParameterChange,
  ParameterChangeInput,
  ParameterChangeRow,
  ParameterHistoryEntry,
  ParameterNode,
} from './types'

/**
 * Historial de valores: **append-only**. Nunca se actualiza ni se borra desde el
 * cliente (RLS no concede `update` ni `delete` a `authenticated`).
 *
 * Contrato:
 * - Cada edición de un valor deja una línea con valor anterior, valor nuevo, su
 *   procedencia (`default` = «Default (From Library)»), comentario y efecto.
 * - `applyValue` es la única vía para cambiar el valor actual: actualiza el
 *   parámetro y registra el cambio. Nunca toca el predeterminado.
 * - Las lecturas se acotan (5 000 filas como máximo) y filtran por versión,
 *   parámetro, texto y efecto.
 * - Todos los errores se traducen a `AppError`.
 */

const CHANGE_COLUMNS =
  'id, experiment_id, parameter_id, previous_value, previous_value_source, new_value, new_value_source, reason, observation, effect, path_snapshot, applied_to_profile, created_at' as const

const toChange = (row: ParameterChangeRow): ParameterChange => ({
  id: row.id,
  experimentId: row.experiment_id,
  parameterId: row.parameter_id,
  previousValue: row.previous_value,
  previousValueSource: row.previous_value_source,
  newValue: row.new_value,
  newValueSource: row.new_value_source,
  reason: row.reason,
  observation: row.observation,
  effect: row.effect,
  pathSnapshot: row.path_snapshot,
  appliedToProfile: row.applied_to_profile,
  createdAt: row.created_at,
})

/** Ruta de cada nodo calculada desde las relaciones (nunca se guarda como verdad). */
const buildPaths = (nodes: ParameterNode[]): Map<string, string[]> => {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const paths = new Map<string, string[]>()

  for (const node of nodes) {
    const path: string[] = []
    let current: ParameterNode | undefined = node
    let guard = 0
    while (current && guard < 500) {
      path.unshift(current.name)
      current = current.parentId ? byId.get(current.parentId) : undefined
      guard += 1
    }
    paths.set(node.id, path)
  }

  return paths
}

export type HistoryFilters = {
  /** Busca en el nombre del parámetro y en el comentario. */
  search?: string
  effect?: ChangeEffect | 'all'
  /** Los parámetros retirados siguen apareciendo si se piden. */
  includeRetired?: boolean
}

export type HistoryPageParams = HistoryFilters & { limit?: number; offset?: number }

/** Carga acotada de cambios de una versión, ya resueltos para mostrar. */
const loadEntries = async (versionId: string): Promise<ParameterHistoryEntry[]> => {
  const [{ items: nodes }, parameters] = await Promise.all([
    nodeService.listByVersion(versionId),
    parameterService.listByVersion(versionId),
  ])

  const paths = buildPaths(nodes)
  const parameterById = new Map(parameters.map((parameter) => [parameter.id, parameter]))
  const parameterIds = parameters.map((parameter) => parameter.id)

  const rows: ParameterChangeRow[] = []
  for (const ids of chunkIds(parameterIds, 60)) {
    if (rows.length >= MAX_ROWS) break

    const { data, error } = await getSupabase()
      .from('parameter_changes')
      .select(CHANGE_COLUMNS)
      .in('parameter_id', ids)
      .order('created_at', { ascending: false })
      .limit(1_000)
      .returns<ParameterChangeRow[]>()

    if (error) throw error
    rows.push(...(data ?? []))
  }

  rows.sort((a, b) => b.created_at.localeCompare(a.created_at))

  return rows.map((row) => {
    const parameter = parameterById.get(row.parameter_id)
    return {
      ...toChange(row),
      parameterName: parameter?.name ?? 'Parámetro eliminado',
      dataType: parameter?.dataType ?? 'string',
      unit: parameter?.unit ?? null,
      path: row.path_snapshot ?? (parameter ? (paths.get(parameter.nodeId) ?? []) : []),
      parameterActive: parameter?.isActive ?? false,
    }
  })
}

const matchesFilters = (entry: ParameterHistoryEntry, filters: HistoryFilters): boolean => {
  const effect = filters.effect ?? 'all'
  if (effect !== 'all' && entry.effect !== effect) return false
  if (filters.includeRetired === false && !entry.parameterActive) return false

  const search = filters.search?.trim().toLowerCase()
  if (!search) return true

  return (
    entry.parameterName.toLowerCase().includes(search) ||
    (entry.reason ?? '').toLowerCase().includes(search) ||
    (entry.observation ?? '').toLowerCase().includes(search) ||
    entry.path.join(' ').toLowerCase().includes(search)
  )
}

export const historyService = {
  /** Historial de un parámetro, del más reciente al más antiguo. */
  async listByParameter(parameterId: string): Promise<ParameterChange[]> {
    try {
      const { data, error } = await getSupabase()
        .from('parameter_changes')
        .select(CHANGE_COLUMNS)
        .eq('parameter_id', parameterId)
        .order('created_at', { ascending: false })
        .limit(500)
        .returns<ParameterChangeRow[]>()

      if (error) throw error
      return (data ?? []).map(toChange)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Historial de la versión con nombre y ruta de cada parámetro. */
  async listByVersion(versionId: string, params?: HistoryPageParams): Promise<Page<ParameterHistoryEntry>> {
    try {
      const { limit, offset } = resolvePagination(params)
      const entries = (await loadEntries(versionId)).filter((entry) => matchesFilters(entry, params ?? {}))

      return { items: entries.slice(offset, offset + limit), total: entries.length, limit, offset }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Todo el historial filtrado de la versión (tope 5 000) para estadísticas. */
  async listAllByVersion(versionId: string, filters?: HistoryFilters): Promise<ParameterHistoryEntry[]> {
    try {
      return (await loadEntries(versionId)).filter((entry) => matchesFilters(entry, filters ?? {})).slice(0, MAX_ROWS)
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
          experiment_id: input.experimentId ?? null,
          parameter_id: input.parameterId,
          previous_value: input.previousValue ?? null,
          previous_value_source: input.previousValueSource ?? null,
          new_value: input.newValue ?? null,
          new_value_source: input.newValueSource ?? null,
          reason: input.reason?.trim() || null,
          observation: input.observation?.trim() || null,
          effect: input.effect ?? null,
          path_snapshot: input.pathSnapshot ?? null,
          applied_to_profile: input.appliedToProfile ?? false,
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
   * Cambia el valor actual de un parámetro y registra el cambio.
   *
   * `source = 'default'` significa «usa el valor de librería del propio GCam»:
   * `value` se guarda como `null` y la interfaz lo muestra como tal. El
   * predeterminado documentado (`default_value`) no se modifica nunca.
   */
  async applyValue(input: {
    parameter: Parameter
    value: unknown
    source: CurrentValueSource
    comment?: string | null
    effect?: ChangeEffect | null
    path?: string[] | null
  }): Promise<ParameterChange> {
    try {
      const { parameter } = input
      const { error: updateError } = await getSupabase()
        .from('parameters')
        .update({
          current_value: input.source === 'custom' ? (input.value ?? null) : null,
          current_value_source: input.source,
        })
        .eq('id', parameter.id)

      if (updateError) throw updateError

      return await this.recordChange({
        parameterId: parameter.id,
        previousValue: parameter.currentValue,
        previousValueSource: parameter.currentValueSource,
        newValue: input.source === 'custom' ? (input.value ?? null) : null,
        newValueSource: input.source,
        reason: input.comment ?? null,
        effect: input.effect ?? null,
        pathSnapshot: input.path ?? null,
        appliedToProfile: true,
      })
    } catch (error) {
      throw toAppError(error)
    }
  },
}
