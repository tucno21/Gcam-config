import { AppError, toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import { resolvePagination } from './queryHelpers'
import { nodeService } from './nodeService'
import { parameterService } from './parameterService'
import type { ActiveFilter, CameraVersion, CameraVersionRow, Page, ParameterNode, VersionInput } from './types'

/**
 * Versiones de una cámara. Cada versión mantiene su propio árbol de parámetros,
 * sus perfiles y sus experimentos.
 *
 * Contrato:
 * - `listByCamera` pagina (por defecto 25, máximo 100), ordena por etiqueta y trae
 *   conteos de estructura (`nodeCount`) y perfiles (`configurationCount`).
 * - `setDefault` desmarca la versión anterior y marca la nueva; si el segundo
 *   paso falla, la cámara puede quedar sin versión predeterminada (no hay
 *   transacción en el cliente). La vista debe pedir reintento.
 * - `duplicateStructure` copia la estructura de una versión a otra **solo** cuando
 *   la vista lo pide explícitamente; nunca copia perfiles ni historial.
 * - Los errores se traducen siempre a `AppError`.
 */

const VERSION_COLUMNS =
  'id, camera_id, version, release_label, notes, is_default, is_active, created_at, updated_at' as const

/** Columnas con conteos: estructura creada y perfiles registrados. */
const VERSION_LIST_COLUMNS =
  `${VERSION_COLUMNS}, parameter_nodes(count), configurations(count)` as const

type VersionListRow = CameraVersionRow & {
  parameter_nodes?: Array<{ count: number }>
  configurations?: Array<{ count: number }>
}

const toVersion = (row: CameraVersionRow, nodeCount = 0, configurationCount = 0): CameraVersion => ({
  id: row.id,
  cameraId: row.camera_id,
  version: row.version,
  releaseLabel: row.release_label,
  notes: row.notes,
  isDefault: row.is_default,
  isActive: row.is_active,
  nodeCount,
  configurationCount,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toVersionFromList = (row: VersionListRow): CameraVersion =>
  toVersion(row, row.parameter_nodes?.[0]?.count ?? 0, row.configurations?.[0]?.count ?? 0)

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
  /**
   * Estructura de ajustes de una cámara. En la interfaz no existen «versiones»:
   * cada cámara tiene una sola estructura interna, que se crea sola si falta.
   * (La tabla `camera_versions` sigue siendo el ancla de los nodos.)
   */
  async getStructure(cameraId: string): Promise<CameraVersion> {
    try {
      const page = await this.listByCamera(cameraId, { active: 'all', limit: 100 })
      const existing = page.items.find((candidate) => candidate.isDefault) ?? page.items[0]
      if (existing) return existing
      return await this.create(cameraId, { version: 'estructura', isDefault: true })
    } catch (error) {
      throw toAppError(error)
    }
  },
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
        .select(VERSION_LIST_COLUMNS, { count: 'exact' })
        .eq('camera_id', cameraId)
      if (active === 'active') query = query.eq('is_active', true)
      if (active === 'archived') query = query.eq('is_active', false)

      const { data, error, count } = await query
        .order('is_default', { ascending: false })
        .order('version', { ascending: false })
        .range(from, to)
        .returns<VersionListRow[]>()

      if (error) throw error

      return { items: (data ?? []).map(toVersionFromList), total: count ?? 0, limit, offset }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Versión por id (con conteos). Lanza `not_found` si no existe o es de otra cuenta. */
  async getById(id: string): Promise<CameraVersion> {
    try {
      const { data, error } = await getSupabase()
        .from('camera_versions')
        .select(VERSION_LIST_COLUMNS)
        .eq('id', id)
        .single()
        .returns<VersionListRow>()

      if (error) throw error
      return toVersionFromList(data)
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

  /**
   * Duplica la **estructura de ajustes** de una cámara en otra.
   * Es una acción explícita: jamás se ejecuta sola.
   *
   * Copia nodos (jerarquía, orden, estado y `lineage_id`) y los parámetros con
   * `lineage_id`, notas y —si se pide— el valor actual. **No** copia historial.
   * Se inserta por niveles y por lotes para que una cámara con cientos de
   * parámetros no haga cientos de peticiones.
   */
  async duplicateStructure(
    sourceVersionId: string,
    targetVersionId: string,
    options?: { includeValues?: boolean },
  ): Promise<{ nodes: number; parameters: number }> {
    try {
      if (sourceVersionId === targetVersionId) {
        throw new AppError('validation', 'Elige una estructura de destino distinta a la de origen.')
      }

      const supabase = getSupabase()
      const { items: nodes } = await nodeService.listByVersion(sourceVersionId)
      const childrenByParent = new Map<string | null, ParameterNode[]>()
      for (const node of nodes) {
        const siblings = childrenByParent.get(node.parentId) ?? []
        siblings.push(node)
        childrenByParent.set(node.parentId, siblings)
      }

      const idMap = new Map<string, string>()
      let nodeCount = 0

      // Un INSERT por grupo de hermanos: los nombres son únicos dentro del padre,
      // así que sirven para emparejar la respuesta con el nodo de origen.
      const insertLevel = async (sourceParentId: string | null, targetParentId: string | null): Promise<void> => {
        const siblings = childrenByParent.get(sourceParentId) ?? []
        if (siblings.length === 0) return

        const { data, error } = await supabase
          .from('parameter_nodes')
          .insert(
            siblings.map((node) => ({
              camera_version_id: targetVersionId,
              parent_id: targetParentId,
              name: node.name,
              description: node.description,
              node_type: node.nodeType,
              sort_order: node.sortOrder,
              is_active: node.isActive,
              lineage_id: node.lineageId,
            })),
          )
          .select('id, name')

        if (error) throw error
        const inserted = (data ?? []) as Array<{ id: string; name: string }>
        nodeCount += inserted.length

        for (const sibling of siblings) {
          const copy = inserted.find((row) => row.name === sibling.name)
          if (copy) idMap.set(sibling.id, copy.id)
        }

        for (const sibling of siblings) {
          const targetId = idMap.get(sibling.id)
          if (targetId) await insertLevel(sibling.id, targetId)
        }
      }

      await insertLevel(null, null)

      // Parámetros por lotes, con el nodo ya remapeado.
      const parameters = await parameterService.listByVersion(sourceVersionId)
      const rows = parameters.flatMap((parameter) => {
        const nodeId = idMap.get(parameter.nodeId)
        if (!nodeId) return []
        return [
          {
            node_id: nodeId,
            lineage_id: parameter.lineageId,
            key: parameter.key,
            name: parameter.name,
            description: parameter.description,
            notes: parameter.notes,
            data_type: parameter.dataType,
            unit: parameter.unit,
            default_value: parameter.defaultValue ?? null,
            default_value_source: parameter.defaultValueSource,
            default_value_confidence: parameter.defaultValueConfidence,
            allowed_values: parameter.allowedValues,
            current_value: options?.includeValues ? (parameter.currentValue ?? null) : null,
            current_value_source: options?.includeValues ? parameter.currentValueSource : 'unknown',
            sort_order: parameter.sortOrder,
            is_active: parameter.isActive,
          },
        ]
      })

      for (let index = 0; index < rows.length; index += 100) {
        const { error } = await supabase.from('parameters').insert(rows.slice(index, index + 100))
        if (error) throw error
      }

      return { nodes: nodeCount, parameters: rows.length }
    } catch (error) {
      throw toAppError(error)
    }
  },
}
