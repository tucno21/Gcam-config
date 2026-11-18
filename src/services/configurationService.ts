import { toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import { resolvePagination } from './queryHelpers'
import type {
  ActiveFilter,
  Configuration,
  ConfigurationInput,
  ConfigurationRow,
  ConfigurationValue,
  ConfigurationValueInput,
  ConfigurationValueRow,
  Page,
} from './types'

/**
 * Perfiles de configuración: conjuntos de valores de parámetros para una versión.
 *
 * Contrato:
 * - Un perfil pertenece a una versión; sus valores solo pueden apuntar a
 *   parámetros de esa misma versión (lo verifica `app.validate_configuration_value`).
 * - `setValue` hace *upsert* por `(configuration_id, parameter_id)`: un parámetro
 *   sin fila significa «sin valor personalizado», nunca se materializan valores
 *   predeterminados.
 * - `default_value` de `parameters` no se modifica desde aquí.
 * - Todos los errores se traducen a `AppError`.
 */

const CONFIGURATION_COLUMNS =
  'id, camera_version_id, name, description, is_default, is_active, created_at, updated_at' as const

/** Columnas con conteo de valores personalizados. */
const CONFIGURATION_LIST_COLUMNS = `${CONFIGURATION_COLUMNS}, configuration_values(count)` as const

type ConfigurationListRow = ConfigurationRow & { configuration_values?: Array<{ count: number }> }

const VALUE_COLUMNS = 'id, configuration_id, parameter_id, value, notes, updated_at' as const

const toConfiguration = (row: ConfigurationRow, valueCount = 0): Configuration => ({
  id: row.id,
  cameraVersionId: row.camera_version_id,
  name: row.name,
  description: row.description,
  isDefault: row.is_default,
  isActive: row.is_active,
  valueCount,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toConfigurationFromList = (row: ConfigurationListRow): Configuration =>
  toConfiguration(row, row.configuration_values?.[0]?.count ?? 0)

const toValue = (row: ConfigurationValueRow): ConfigurationValue => ({
  id: row.id,
  configurationId: row.configuration_id,
  parameterId: row.parameter_id,
  value: row.value,
  notes: row.notes,
  updatedAt: row.updated_at,
})

const updateConfiguration = async (id: string, input: Partial<ConfigurationInput>): Promise<Configuration> => {
  const patch: Partial<ConfigurationRow> = {}
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.isDefault !== undefined) patch.is_default = input.isDefault
  if (input.isActive !== undefined) patch.is_active = input.isActive

  const { data, error } = await getSupabase()
    .from('configurations')
    .update(patch)
    .eq('id', id)
    .select(CONFIGURATION_COLUMNS)
    .single()
    .returns<ConfigurationRow>()

  if (error) throw error
  return toConfiguration(data)
}

export const configurationService = {
  /** Perfiles de una versión, con el predeterminado primero. */
  async listByVersion(
    versionId: string,
    params?: { active?: ActiveFilter; limit?: number; offset?: number },
  ): Promise<Page<Configuration>> {
    try {
      const { limit, offset, from, to } = resolvePagination(params)
      const active: ActiveFilter = params?.active ?? 'active'

      let query = getSupabase()
        .from('configurations')
        .select(CONFIGURATION_LIST_COLUMNS, { count: 'exact' })
        .eq('camera_version_id', versionId)
      if (active === 'active') query = query.eq('is_active', true)
      if (active === 'archived') query = query.eq('is_active', false)

      const { data, error, count } = await query
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })
        .range(from, to)
        .returns<ConfigurationListRow[]>()

      if (error) throw error

      return { items: (data ?? []).map(toConfigurationFromList), total: count ?? 0, limit, offset }
    } catch (error) {
      throw toAppError(error)
    }
  },

  async getById(id: string): Promise<Configuration> {
    try {
      const { data, error } = await getSupabase()
        .from('configurations')
        .select(CONFIGURATION_COLUMNS)
        .eq('id', id)
        .single()
        .returns<ConfigurationRow>()

      if (error) throw error
      return toConfiguration(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async create(input: ConfigurationInput): Promise<Configuration> {
    try {
      const { data, error } = await getSupabase()
        .from('configurations')
        .insert({
          camera_version_id: input.cameraVersionId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          is_default: input.isDefault ?? false,
          is_active: input.isActive ?? true,
        })
        .select(CONFIGURATION_COLUMNS)
        .single()
        .returns<ConfigurationRow>()

      if (error) throw error
      return toConfiguration(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async update(id: string, input: Partial<ConfigurationInput>): Promise<Configuration> {
    try {
      return await updateConfiguration(id, input)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async setActive(id: string, isActive: boolean): Promise<Configuration> {
    try {
      return await updateConfiguration(id, { isActive })
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Marca un perfil como predeterminado de la versión (desmarca el anterior). */
  async setDefault(versionId: string, configurationId: string): Promise<Configuration> {
    try {
      const { error: clearError } = await getSupabase()
        .from('configurations')
        .update({ is_default: false })
        .eq('camera_version_id', versionId)
        .eq('is_default', true)

      if (clearError) throw clearError
      return await updateConfiguration(configurationId, { isDefault: true })
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Valores personalizados del perfil. Los ausentes usan el predeterminado documentado. */
  async listValues(configurationId: string): Promise<ConfigurationValue[]> {
    try {
      const { data, error } = await getSupabase()
        .from('configuration_values')
        .select(VALUE_COLUMNS)
        .eq('configuration_id', configurationId)
        .order('updated_at', { ascending: false })
        .limit(5_000)
        .returns<ConfigurationValueRow[]>()

      if (error) throw error
      return (data ?? []).map(toValue)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /**
   * Duplica un perfil con **solo** sus valores personalizados.
   * No copia experimentos ni historial: esos pertenecen al perfil original.
   */
  async duplicate(configurationId: string): Promise<Configuration> {
    try {
      const source = await this.getById(configurationId)
      const values = await this.listValues(configurationId)

      const copy = await this.create({
        cameraVersionId: source.cameraVersionId,
        name: `${source.name} (copia)`,
        description: source.description,
        isDefault: false,
        isActive: true,
      })

      if (values.length > 0) {
        for (let index = 0; index < values.length; index += 100) {
          const batch = values.slice(index, index + 100).map((value) => ({
            configuration_id: copy.id,
            parameter_id: value.parameterId,
            value: value.value,
            notes: value.notes,
          }))
          const { error } = await getSupabase().from('configuration_values').insert(batch)
          if (error) throw error
        }
      }

      return { ...copy, valueCount: values.length }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Crea o actualiza el valor de un parámetro en el perfil. */
  async setValue(input: ConfigurationValueInput): Promise<ConfigurationValue> {
    try {
      const { data, error } = await getSupabase()
        .from('configuration_values')
        .upsert(
          {
            configuration_id: input.configurationId,
            parameter_id: input.parameterId,
            value: input.value,
            notes: input.notes?.trim() || null,
          },
          { onConflict: 'configuration_id,parameter_id' },
        )
        .select(VALUE_COLUMNS)
        .single()
        .returns<ConfigurationValueRow>()

      if (error) throw error
      return toValue(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Quita el valor personalizado: el parámetro vuelve a «sin valor». */
  async clearValue(configurationId: string, parameterId: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('configuration_values')
        .delete()
        .eq('configuration_id', configurationId)
        .eq('parameter_id', parameterId)

      if (error) throw error
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Elimina un perfil y sus valores (`cascade` en la base). */
  async remove(id: string): Promise<void> {
    try {
      const { error } = await getSupabase().from('configurations').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      throw toAppError(error)
    }
  },
}
