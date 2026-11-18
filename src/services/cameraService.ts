import { toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import { resolvePagination, sanitizeSearch } from './queryHelpers'
import type { ActiveFilter, Camera, CameraInput, CameraListParams, CameraRow, Page } from './types'

/**
 * Cámaras GCam (LMC, AGC, BSG o cualquier otra): registros de datos, nunca
 * opciones fijas en el código.
 *
 * Contrato:
 * - Todas las funciones rechazan con `AppError` (`config`, `network`,
 *   `unauthorized`, `forbidden`, `not_found`, `conflict`, `validation`, …).
 * - `list` siempre pagina y devuelve el total exacto del filtro.
 * - `remove` puede fallar con `conflict` (`23503`) si la cámara tiene versiones:
 *   en ese caso la UI debe ofrecer archivar (`setActive(id, false)`).
 */

const CAMERA_COLUMNS =
  'id, name, slug, description, developer, website_url, is_active, created_at, updated_at' as const

/** Columnas del listado: añade el conteo de versiones vía embed de PostgREST. */
const CAMERA_LIST_COLUMNS = `${CAMERA_COLUMNS}, camera_versions(count)` as const

type CameraListRow = CameraRow & { camera_versions?: Array<{ count: number }> }

const toCamera = (row: CameraRow, versionCount = 0): Camera => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  developer: row.developer,
  websiteUrl: row.website_url,
  isActive: row.is_active,
  versionCount,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toCameraFromList = (row: CameraListRow): Camera =>
  toCamera(row, row.camera_versions?.[0]?.count ?? 0)

const updateCamera = async (id: string, input: Partial<CameraInput>): Promise<Camera> => {
  const patch: Partial<CameraRow> = {}
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.slug !== undefined) patch.slug = input.slug.trim()
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.developer !== undefined) patch.developer = input.developer?.trim() || null
  if (input.websiteUrl !== undefined) patch.website_url = input.websiteUrl?.trim() || null
  if (input.isActive !== undefined) patch.is_active = input.isActive

  const { data, error } = await getSupabase()
    .from('cameras')
    .update(patch)
    .eq('id', id)
    .select(CAMERA_COLUMNS)
    .single()
    .returns<CameraRow>()

  if (error) throw error
  return toCamera(data)
}

export const cameraService = {
  /** Lista cámaras con búsqueda por nombre/slug y filtro de estado. */
  async list(params?: CameraListParams): Promise<Page<Camera>> {
    try {
      const { limit, offset, from, to } = resolvePagination(params)
      const term = sanitizeSearch(params?.search)
      const active: ActiveFilter = params?.active ?? 'active'

      let query = getSupabase().from('cameras').select(CAMERA_LIST_COLUMNS, { count: 'exact' })
      if (active === 'active') query = query.eq('is_active', true)
      if (active === 'archived') query = query.eq('is_active', false)
      if (term) query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`)

      const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(from, to)
        .returns<CameraListRow[]>()

      if (error) throw error

      return { items: (data ?? []).map(toCameraFromList), total: count ?? 0, limit, offset }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Obtiene una cámara por id (con conteo de versiones). Lanza `not_found` si RLS la oculta. */
  async getById(id: string): Promise<Camera> {
    try {
      const { data, error } = await getSupabase()
        .from('cameras')
        .select(CAMERA_LIST_COLUMNS)
        .eq('id', id)
        .single()
        .returns<CameraListRow>()

      if (error) throw error
      return toCameraFromList(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Crea una cámara. `owner_id` lo pone la base (`auth.uid()`). */
  async create(input: CameraInput): Promise<Camera> {
    try {
      const { data, error } = await getSupabase()
        .from('cameras')
        .insert({
          name: input.name.trim(),
          slug: input.slug.trim(),
          description: input.description?.trim() || null,
          developer: input.developer?.trim() || null,
          website_url: input.websiteUrl?.trim() || null,
          is_active: input.isActive ?? true,
        })
        .select(CAMERA_COLUMNS)
        .single()
        .returns<CameraRow>()

      if (error) throw error
      return toCamera(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Edita los campos enviados. No permite cambiar de propietario. */
  async update(id: string, input: Partial<CameraInput>): Promise<Camera> {
    try {
      return await updateCamera(id, input)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Archiva o reactiva una cámara sin borrar su historial. */
  async setActive(id: string, isActive: boolean): Promise<Camera> {
    try {
      return await updateCamera(id, { isActive })
    } catch (error) {
      throw toAppError(error)
    }
  },

  /**
   * Elimina una cámara **solo** si no tiene versiones.
   * Con dependencias la base responde `23503` y el servicio lo traduce a `conflict`.
   */
  async remove(id: string): Promise<void> {
    try {
      const { error } = await getSupabase().from('cameras').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      throw toAppError(error)
    }
  },
}
