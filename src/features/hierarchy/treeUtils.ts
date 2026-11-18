import type { ParameterNode } from '../../services/types'

/**
 * Utilidades puras del árbol de parámetros: índices en memoria, rutas calculadas
 * desde las relaciones y filtros de búsqueda. Nada de aquí toca la base de datos.
 */

export type TreeIndex = {
  nodeById: Map<string, ParameterNode>
  childrenByParent: Map<string | null, ParameterNode[]>
  /** Hijos de un nodo ya ordenados por `sort_order` (orden de llegada del listado). */
  roots: ParameterNode[]
  /** Conteo total de nodos cargados, para el aviso de truncado. */
  total: number
}

export const buildTreeIndex = (nodes: ParameterNode[]): TreeIndex => {
  const nodeById = new Map<string, ParameterNode>()
  const childrenByParent = new Map<string | null, ParameterNode[]>()

  for (const node of nodes) {
    nodeById.set(node.id, node)
    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node)
    childrenByParent.set(node.parentId, siblings)
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
  }

  return { nodeById, childrenByParent, roots: childrenByParent.get(null) ?? [], total: nodes.length }
}

/** Cadena de ancestros desde la raíz hasta el nodo (sin incluirlo). */
export const ancestorsOf = (index: TreeIndex, nodeId: string | null): ParameterNode[] => {
  const chain: ParameterNode[] = []
  let current = nodeId ? index.nodeById.get(nodeId) : undefined
  const visited = new Set<string>()

  while (current?.parentId) {
    if (visited.has(current.parentId)) break // defensa extra ante ciclos imposibles
    visited.add(current.parentId)
    const parent = index.nodeById.get(current.parentId)
    if (!parent) break
    chain.unshift(parent)
    current = parent
  }

  return chain
}

/** Ids del nodo y de todos sus descendientes. */
export const branchIds = (index: TreeIndex, nodeId: string): string[] => {
  const result: string[] = []
  const stack = [nodeId]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    result.push(current)
    for (const child of index.childrenByParent.get(current) ?? []) stack.push(child.id)
  }
  return result
}

export const descendantCount = (index: TreeIndex, nodeId: string): number => branchIds(index, nodeId).length - 1

/** Profundidad de un nodo (raíz = 0), calculada desde las relaciones. */
export const depthOf = (index: TreeIndex, nodeId: string): number => ancestorsOf(index, nodeId).length

/**
 * Conjunto de ids visibles durante una búsqueda: coincidencias por nombre más
 * sus ancestros, para que la rama se muestre expandida.
 */
export const searchVisibleIds = (index: TreeIndex, term: string): Set<string> => {
  const normalized = term.trim().toLowerCase()
  const visible = new Set<string>()
  if (normalized.length === 0) return visible

  for (const node of index.nodeById.values()) {
    if (!node.name.toLowerCase().includes(normalized)) continue
    visible.add(node.id)
    for (const ancestor of ancestorsOf(index, node.id)) visible.add(ancestor.id)
  }
  return visible
}

/**
 * Nuevo orden de hermanos tras soltar un nodo «antes» o «después» de otro.
 * `orderedIds` debe venir ya ordenado por `sort_order`.
 */
export const siblingOrderAfterDrop = (
  orderedIds: string[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'after',
): string[] => {
  const withoutDragged = orderedIds.filter((id) => id !== draggedId)
  const insertAt = withoutDragged.indexOf(targetId)
  if (insertAt === -1) return withoutDragged

  const result = [...withoutDragged]
  result.splice(position === 'before' ? insertAt : insertAt + 1, 0, draggedId)
  return result
}

/** ¿Es `candidateId` descendiente (o igual) de `ancestorId`? */
export const isInsideBranch = (index: TreeIndex, ancestorId: string, candidateId: string): boolean =>
  branchIds(index, ancestorId).includes(candidateId)
