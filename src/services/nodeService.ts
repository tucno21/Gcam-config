import { AppError, toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'
import { chunkIds, readInBatches } from './queryHelpers'
import type { NodeInput, NodePatch, ParameterNode, ParameterNodeRow } from './types'

/**
 * Árbol de parámetros de una versión. Profundidad ilimitada; el orden entre
 * hermanos vive en `sort_order`.
 *
 * Invariantes (validadas aquí y en la base por `app.enforce_node_tree`):
 * 1. Un nodo no puede ser padre de sí mismo.
 * 2. Un nodo no puede moverse dentro de su propio subárbol (sin ciclos).
 * 3. Padre e hijo pertenecen a la misma versión.
 * 4. Los descendientes se conservan al mover una rama.
 *
 * Contrato:
 * - `listByVersion` devuelve el árbol completo de la versión por lotes, con tope
 *   de 5 000 nodos; `truncated` avisa si se alcanzó el tope.
 * - `removeBranch` borra explícitamente parámetros y descendientes, hijos primero:
 *   nunca hay borrado en cascada silencioso. Devuelve cuántos registros eliminó.
 * - Todos los errores se traducen a `AppError`.
 */

const NODE_COLUMNS =
  'id, camera_version_id, parent_id, lineage_id, name, description, node_type, sort_order, is_active, created_at, updated_at' as const

const toNode = (row: ParameterNodeRow): ParameterNode => ({
  id: row.id,
  cameraVersionId: row.camera_version_id,
  parentId: row.parent_id,
  lineageId: row.lineage_id,
  name: row.name,
  description: row.description,
  nodeType: row.node_type,
  sortOrder: row.sort_order,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const fetchVersionNodes = async (versionId: string): Promise<ParameterNode[]> => {
  const { items } = await readInBatches<ParameterNodeRow>(async (from, to) => {
    const { data, error } = await getSupabase()
      .from('parameter_nodes')
      .select(NODE_COLUMNS)
      .eq('camera_version_id', versionId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, to)
      .returns<ParameterNodeRow[]>()

    if (error) throw error
    return data ?? []
  })

  return items.map(toNode)
}

const nextSortOrder = async (versionId: string, parentId: string | null): Promise<number> => {
  let query = getSupabase()
    .from('parameter_nodes')
    .select('sort_order')
    .eq('camera_version_id', versionId)

  query = parentId === null ? query.is('parent_id', null) : query.eq('parent_id', parentId)

  const { data, error } = await query
    .order('sort_order', { ascending: false })
    .limit(1)
    .returns<Array<Pick<ParameterNodeRow, 'sort_order'>>>()

  if (error) throw error
  return (data?.[0]?.sort_order ?? -1) + 1
}

/** Ids del nodo y todos sus descendientes, dentro del árbol de la versión. */
const collectBranchIds = (nodes: ParameterNode[], rootId: string): string[] => {
  const childrenByParent = new Map<string | null, ParameterNode[]>()
  for (const node of nodes) {
    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node)
    childrenByParent.set(node.parentId, siblings)
  }

  const result: string[] = []
  const stack = [rootId]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    result.push(current)
    for (const child of childrenByParent.get(current) ?? []) stack.push(child.id)
  }
  return result
}

const assertMovable = (nodes: ParameterNode[], nodeId: string, targetParentId: string | null): void => {
  if (targetParentId === null) return
  if (targetParentId === nodeId) {
    throw new AppError('validation', 'Un nodo no puede ser su propio padre.')
  }
  if (collectBranchIds(nodes, nodeId).includes(targetParentId)) {
    throw new AppError('validation', 'No puedes mover un nodo dentro de su propio subárbol.')
  }
}

export const nodeService = {
  /** Árbol completo de una versión, plano y ordenado por `sort_order`. */
  async listByVersion(versionId: string): Promise<{ items: ParameterNode[]; truncated: boolean }> {
    try {
      const { items, truncated } = await readInBatches<ParameterNodeRow>(async (from, to) => {
        const { data, error } = await getSupabase()
          .from('parameter_nodes')
          .select(NODE_COLUMNS)
          .eq('camera_version_id', versionId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
          .range(from, to)
          .returns<ParameterNodeRow[]>()

        if (error) throw error
        return data ?? []
      })

      return { items: items.map(toNode), truncated }
    } catch (error) {
      throw toAppError(error)
    }
  },

  async getById(id: string): Promise<ParameterNode> {
    try {
      const { data, error } = await getSupabase()
        .from('parameter_nodes')
        .select(NODE_COLUMNS)
        .eq('id', id)
        .single()
        .returns<ParameterNodeRow>()

      if (error) throw error
      return toNode(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Cuenta cuántos nodos y parámetros se perderían al borrar una rama. */
  async describeBranch(nodeId: string): Promise<{ nodes: number; parameters: number }> {
    try {
      const node = await this.getById(nodeId)
      const nodes = await fetchVersionNodes(node.cameraVersionId)
      const branchIds = collectBranchIds(nodes, nodeId)

      let parameters = 0
      for (const ids of chunkIds(branchIds)) {
        const { count, error } = await getSupabase()
          .from('parameters')
          .select('id', { count: 'exact', head: true })
          .in('node_id', ids)

        if (error) throw error
        parameters += count ?? 0
      }

      return { nodes: branchIds.length, parameters }
    } catch (error) {
      throw toAppError(error)
    }
  },

  async create(input: NodeInput): Promise<ParameterNode> {
    try {
      const parentId = input.parentId ?? null
      if (parentId !== null) {
        const parent = await this.getById(parentId)
        if (parent.cameraVersionId !== input.cameraVersionId) {
          throw new AppError('validation', 'El nodo padre pertenece a otra versión.')
        }
      }

      const { data, error } = await getSupabase()
        .from('parameter_nodes')
        .insert({
          camera_version_id: input.cameraVersionId,
          parent_id: parentId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          node_type: input.nodeType ?? 'group',
          sort_order: input.sortOrder ?? (await nextSortOrder(input.cameraVersionId, parentId)),
          is_active: input.isActive ?? true,
          ...(input.lineageId ? { lineage_id: input.lineageId } : {}),
        })
        .select(NODE_COLUMNS)
        .single()
        .returns<ParameterNodeRow>()

      if (error) throw error
      return toNode(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  async update(id: string, patch: NodePatch): Promise<ParameterNode> {
    try {
      if (patch.parentId !== undefined) return await this.move(id, patch.parentId)

      const payload: Partial<ParameterNodeRow> = {}
      if (patch.name !== undefined) payload.name = patch.name.trim()
      if (patch.description !== undefined) payload.description = patch.description?.trim() || null
      if (patch.nodeType !== undefined) payload.node_type = patch.nodeType
      if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder
      if (patch.isActive !== undefined) payload.is_active = patch.isActive

      const { data, error } = await getSupabase()
        .from('parameter_nodes')
        .update(payload)
        .eq('id', id)
        .select(NODE_COLUMNS)
        .single()
        .returns<ParameterNodeRow>()

      if (error) throw error
      return toNode(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Mueve un nodo (y su rama) a otro padre de la misma versión. */
  async move(nodeId: string, targetParentId: string | null, targetSortOrder?: number): Promise<ParameterNode> {
    try {
      const node = await this.getById(nodeId)
      const nodes = await fetchVersionNodes(node.cameraVersionId)
      assertMovable(nodes, nodeId, targetParentId)

      const { data, error } = await getSupabase()
        .from('parameter_nodes')
        .update({
          parent_id: targetParentId,
          sort_order: targetSortOrder ?? (await nextSortOrder(node.cameraVersionId, targetParentId)),
        })
        .eq('id', nodeId)
        .select(NODE_COLUMNS)
        .single()
        .returns<ParameterNodeRow>()

      if (error) throw error
      return toNode(data)
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Reordena hermanos con la lista completa de ids en el orden deseado. */
  async reorder(versionId: string, parentId: string | null, orderedIds: string[]): Promise<void> {
    try {
      for (const [index, id] of orderedIds.entries()) {
        let query = getSupabase()
          .from('parameter_nodes')
          .update({ sort_order: index })
          .eq('id', id)
          .eq('camera_version_id', versionId)

        query = parentId === null ? query.is('parent_id', null) : query.eq('parent_id', parentId)

        const { error } = await query
        if (error) throw error
      }
    } catch (error) {
      throw toAppError(error)
    }
  },

  /**
   * Borra una rama completa: primero los parámetros, luego los nodos de abajo
   * hacia arriba. Devuelve cuántos registros se eliminaron para el resumen.
   */
  async removeBranch(nodeId: string): Promise<{ nodes: number; parameters: number }> {
    try {
      const node = await this.getById(nodeId)
      const nodes = await fetchVersionNodes(node.cameraVersionId)
      const branchIds = collectBranchIds(nodes, nodeId)
      const depth = new Map<string, number>()

      const byId = new Map(nodes.map((candidate) => [candidate.id, candidate]))
      for (const id of branchIds) {
        let current = byId.get(id)
        let level = 0
        while (current?.parentId && byId.has(current.parentId)) {
          level += 1
          current = byId.get(current.parentId)
        }
        depth.set(id, level)
      }

      let removedParameters = 0
      for (const ids of chunkIds(branchIds)) {
        const { error, count } = await getSupabase()
          .from('parameters')
          .delete({ count: 'exact' })
          .in('node_id', ids)

        if (error) throw error
        removedParameters += count ?? 0
      }

      const levels = [...new Set(depth.values())].sort((a, b) => b - a)
      for (const level of levels) {
        const ids = [...depth.entries()].filter(([, value]) => value === level).map(([id]) => id)
        const { error } = await getSupabase().from('parameter_nodes').delete().in('id', ids)
        if (error) throw error
      }

      return { nodes: branchIds.length, parameters: removedParameters }
    } catch (error) {
      throw toAppError(error)
    }
  },
}
