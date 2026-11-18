import { toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import { resolvePagination } from './queryHelpers'
import type { ActiveFilter, CameraVersion, CameraVersionRow, Page, VersionInput } from './types'

/**
 * Versiones de una cámara. Cada versión mantiene su propio árbol de parámetros,
 * sus perfiles y sus experimentos.
 *
 * Contrato:
 * - `listByCamera` pagina (por defecto 25, máximo 100) y ordena por etiqueta.
 * - `setDefault` desmarca la versión anterior y marca la nueva; si el segundo
 *   paso falla, la cámara puede quedar sin versión predeterminada (no hay
 *   transacción en el cliente). La vista debe pedir reintento.
 * - Los errores se traducen siempre a `AppError`.
 */

const VERSION_COLUMNS =
  'id, camera_id, version, release_label, notes, is_default, is_active, created_at, updated_at' as const

const toVersion = (row: CameraVersionRow): CameraVersion => ({
  id: row.id,
  cameraId: row.camera_id,
  version: row.version,
  releaseLabel: row.release_label,
  notes: row.notes,
  isDefault: row.is_default,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const updateVersion = async (id: string, input: Partial<VersionInput>): Promise<CameraVersion> => {
  const patch: Partial<CameraVersionRow> = {}
  if (input.version !== undefined) patch.version = input.version.trim()
  if (input.releaseLabel !== undefined) patch.release_label = input.releaseLabel?.trim() || null
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null
  if (input.isDefault !== undefined) patch.is_default = input.isDefault
  if (input.isActive !== undefined) patch.is_active = input.isActive

  const { data, error } = await getSupabase()
    .from('camera_versions')
    .update(patch)
    .eq('id', id)
    .select(VERSION_COLUMNS)
    .single()
    .returns<CameraVersionRow>()

  if (error) throw error
  return toVersion(data)
}

export const versionService = {
  /** Versiones de una cámara, de la más reciente a la más antigua por etiqueta. */
  async listByCamera(
    cameraId: string,
    params?: { active?: ActiveFilter; limit?: number; offset?: number },
  ): Promise<Page<CameraVersion>> {
    try {
      const { limit, offset, from, to } = resolvePagination(params)
      const active: ActiveFilter = params?.active ?? 'active'

      let query = getSupabase()
        .from('camera_versions')
        .select(VERSION_COLUMNS, { count: 'exact' })
        .eq('camera_id', cameraId)
      if (active === 'active') query = query.eq('is_active', true)
      if (active === 'archived') query = query.eq('is_active', false)

      const { data, error, count } = await query
        .order('is_default', { ascending: false })
        .order('version', { ascending: false })
        .range(from, to)
        .returns<CameraVersionRow[]>()

      if (error) throw error

      return { items: (data ?? []).map(toVersion), total: count ?? 0, limit, offset }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Versión por id. Lanza `not_found` si no existe o pertenece a otra cuenta. */
  async getById(id: string): Promise<CameraVersion> {
    try {
      const { data, error } = await getSupabase()
        .from('camera_versions')
        .select(VERSION_COLUMNS)
        .eq('id', id)
        .single()
        .returns<CameraVersionRow>()

      if (error) throw error
      return toVersion(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async create(cameraId: string, input: VersionInput): Promise<CameraVersion> {
    try {
      const { data, error } = await getSupabase()
        .from('camera_versions')
        .insert({
          camera_id: cameraId,
          version: input.version.trim(),
          release_label: input.releaseLabel?.trim() || null,
          notes: input.notes?.trim() || null,
          is_default: input.isDefault ?? false,
          is_active: input.isActive ?? true,
        })
        .select(VERSION_COLUMNS)
        .single()
        .returns<CameraVersionRow>()

      if (error) throw error
      return toVersion(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async update(id: string, input: Partial<VersionInput>): Promise<CameraVersion> {
    try {
      return await updateVersion(id, input)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Archiva o reactiva una versión sin tocar su árbol ni sus datos. */
  async setActive(id: string, isActive: boolean): Promise<CameraVersion> {
    try {
      return await updateVersion(id, { isActive })
    } catch (error) {
      throw toAppError(error)
    }
  },

  /**
   * Marca una versión como predeterminada de su cámara.
   * El índice parcial único `(camera_id) where is_default` impide dos a la vez,
   * por eso se desmarcan las demás antes.
   */
  async setDefault(cameraId: string, versionId: string): Promise<CameraVersion> {
    try {
      const { error: clearError } = await getSupabase()
        .from('camera_versions')
        .update({ is_default: false })
        .eq('camera_id', cameraId)
        .eq('is_default', true)

      if (clearError) throw clearError
      return await updateVersion(versionId, { isDefault: true })
    } catch (error) {
      throw toAppError(error)
    }
  },

  /**
   * Elimina una versión **solo** si no tiene árbol, perfiles ni experimentos.
   * Con dependencias la base responde `23503` → `conflict`: la UI ofrece archivar.
   */
  async remove(id: string): Promise<void> {
    try {
      const { error } = await getSupabase().from('camera_versions').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      throw toAppError(error)
    }
  },
}
