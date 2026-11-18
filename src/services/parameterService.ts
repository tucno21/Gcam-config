import { toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import { chunkIds, MAX_ROWS, readInBatches } from './queryHelpers'
import { nodeService } from './nodeService'
import type { Parameter, ParameterInput, ParameterRow } from './types'

/**
 * Parámetros definidos en los nodos de una versión.
 *
 * `defaultValue` es **documentación de referencia** y nunca se sobrescribe al
 * editar un perfil; el valor actual de un perfil vive en `configuration_values`.
 *
 * Contrato:
 * - `listByVersion` necesita los nodos de la versión y lee por lotes acotados.
 * - La base valida la forma del JSONB según `dataType` y, para `enum`, que el
 *   valor pertenezca a `allowedValues` (`app.validate_parameter_definition`).
 * - Todos los errores se traducen a `AppError`.
 */

const PARAMETER_COLUMNS =
  'id, node_id, key, name, description, data_type, unit, default_value, default_value_source, default_value_confidence, allowed_values, sort_order, is_active, created_at, updated_at' as const

const toParameter = (row: ParameterRow): Parameter => ({
  id: row.id,
  nodeId: row.node_id,
  key: row.key,
  name: row.name,
  description: row.description,
  dataType: row.data_type,
  unit: row.unit,
  defaultValue: row.default_value,
  defaultValueSource: row.default_value_source,
  defaultValueConfidence: row.default_value_confidence,
  allowedValues: row.allowed_values,
  sortOrder: row.sort_order,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toRowPatch = (input: Partial<ParameterInput>): Partial<ParameterRow> => {
  const patch: Partial<ParameterRow> = {}
  if (input.key !== undefined) patch.key = input.key?.trim() || null
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.dataType !== undefined) patch.data_type = input.dataType
  if (input.unit !== undefined) patch.unit = input.unit?.trim() || null
  if (input.defaultValue !== undefined) patch.default_value = input.defaultValue
  if (input.defaultValueSource !== undefined) patch.default_value_source = input.defaultValueSource
  if (input.defaultValueConfidence !== undefined) patch.default_value_confidence = input.defaultValueConfidence
  if (input.allowedValues !== undefined) patch.allowed_values = input.allowedValues
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
  if (input.isActive !== undefined) patch.is_active = input.isActive
  return patch
}

export const parameterService = {
  /** Parámetros de un nodo, incluidos los inactivos si se piden. */
  async listByNode(nodeId: string, options?: { includeInactive?: boolean }): Promise<Parameter[]> {
    try {
      let query = getSupabase().from('parameters').select(PARAMETER_COLUMNS).eq('node_id', nodeId)
      if (!options?.includeInactive) query = query.eq('is_active', true)

      const { data, error } = await query
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .limit(500)
        .returns<ParameterRow[]>()

      if (error) throw error
      return (data ?? []).map(toParameter)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Todos los parámetros de la versión, en el orden de sus nodos. */
  async listByVersion(versionId: string): Promise<Parameter[]> {
    try {
      const { items: nodes } = await nodeService.listByVersion(versionId)
      if (nodes.length === 0) return []

      const result: Parameter[] = []
      for (const ids of chunkIds(nodes.map((node) => node.id), 50)) {
        if (result.length >= MAX_ROWS) break

        const { items } = await readInBatches<ParameterRow>(async (from, to) => {
          const { data, error } = await getSupabase()
            .from('parameters')
            .select(PARAMETER_COLUMNS)
            .in('node_id', ids)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true })
            .range(from, to)
            .returns<ParameterRow[]>()

          if (error) throw error
          return data ?? []
        })

        result.push(...items.map(toParameter))
      }

      return result.slice(0, MAX_ROWS)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async getById(id: string): Promise<Parameter> {
    try {
      const { data, error } = await getSupabase()
        .from('parameters')
        .select(PARAMETER_COLUMNS)
        .eq('id', id)
        .single()
        .returns<ParameterRow>()

      if (error) throw error
      return toParameter(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async create(input: ParameterInput): Promise<Parameter> {
    try {
      const { data, error } = await getSupabase()
        .from('parameters')
        .insert({
          node_id: input.nodeId,
          ...toRowPatch(input),
          name: input.name.trim(),
          data_type: input.dataType,
          default_value_source: input.defaultValueSource ?? 'unknown',
        })
        .select(PARAMETER_COLUMNS)
        .single()
        .returns<ParameterRow>()

      if (error) throw error
      return toParameter(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Edita la definición. No toca `configuration_values` de ningún perfil. */
  async update(id: string, input: Partial<ParameterInput>): Promise<Parameter> {
    try {
      const { data, error } = await getSupabase()
        .from('parameters')
        .update(toRowPatch(input))
        .eq('id', id)
        .select(PARAMETER_COLUMNS)
        .single()
        .returns<ParameterRow>()

      if (error) throw error
      return toParameter(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async setActive(id: string, isActive: boolean): Promise<Parameter> {
    return this.update(id, { isActive })
  },

  /** Borra un parámetro sin valores de perfil asociados (si los hay: `conflict`). */
  async remove(id: string): Promise<void> {
    try {
      const { error } = await getSupabase().from('parameters').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      throw toAppError(error)
    }
  },
}
