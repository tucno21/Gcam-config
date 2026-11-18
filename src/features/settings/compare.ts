import type { CurrentValueSource, DataType, Parameter, ParameterNode } from '../../services/types'

/**
 * Comparación entre dos versiones de la misma cámara.
 *
 * El emparejamiento usa `lineageId`, que se conserva al duplicar una versión y
 * sobrevive a renombrar o mover. Así se distingue con precisión entre:
 * - nivel/parámetro **nuevo** (solo en B),
 * - **retirado/eliminado** (solo en A),
 * - **renombrado** o **movido** (mismo linaje, distinto nombre/ruta),
 * - **cambiado de valor** (mismo ajuste, otro valor actual).
 *
 * Es una función pura: no consulta la base ni conoce la interfaz.
 */

export type VersionSnapshot = {
  nodes: ParameterNode[]
  parameters: Parameter[]
}

export type CompareKind =
  | 'level-added'
  | 'level-removed'
  | 'level-renamed'
  | 'level-moved'
  | 'parameter-added'
  | 'parameter-removed'
  | 'parameter-renamed'
  | 'parameter-moved'
  | 'parameter-changed'

export type CompareItem = {
  kind: CompareKind
  scope: 'level' | 'parameter'
  lineageId: string
  /** Ruta visible: la de B si existe allí; si no, la de A. */
  path: string[]
  name: string
  nameA: string | null
  nameB: string | null
  dataType: DataType | null
  unit: string | null
  valueA: unknown
  valueB: unknown
  sourceA: CurrentValueSource | null
  sourceB: CurrentValueSource | null
  activeA: boolean
  activeB: boolean
}

export type CompareResult = {
  items: CompareItem[]
  counts: {
    levelsAdded: number
    levelsRemoved: number
    levelsRenamed: number
    parametersAdded: number
    parametersRemoved: number
    parametersRenamed: number
    parametersMoved: number
    parametersChanged: number
  }
}

const pathsOf = (nodes: ParameterNode[]): Map<string, string[]> => {
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

const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

export const compareVersions = (a: VersionSnapshot, b: VersionSnapshot): CompareResult => {
  const pathsA = pathsOf(a.nodes)
  const pathsB = pathsOf(b.nodes)

  const nodesA = new Map(a.nodes.map((node) => [node.lineageId, node]))
  const nodesB = new Map(b.nodes.map((node) => [node.lineageId, node]))
  const nodeLineageByIdA = new Map(a.nodes.map((node) => [node.id, node.lineageId]))
  const nodeLineageByIdB = new Map(b.nodes.map((node) => [node.id, node.lineageId]))

  const parametersA = new Map(a.parameters.map((parameter) => [parameter.lineageId, parameter]))
  const parametersB = new Map(b.parameters.map((parameter) => [parameter.lineageId, parameter]))

  const items: CompareItem[] = []

  const base = {
    nameA: null as string | null,
    nameB: null as string | null,
    dataType: null as DataType | null,
    unit: null as string | null,
    valueA: null as unknown,
    valueB: null as unknown,
    sourceA: null as CurrentValueSource | null,
    sourceB: null as CurrentValueSource | null,
    activeA: true,
    activeB: true,
  }

  // ── Niveles ────────────────────────────────────────────────────────────
  const levelLineages = new Set([...nodesA.keys(), ...nodesB.keys()])
  for (const lineageId of levelLineages) {
    const nodeA = nodesA.get(lineageId)
    const nodeB = nodesB.get(lineageId)

    if (nodeA && !nodeB) {
      items.push({
        ...base,
        kind: 'level-removed',
        scope: 'level',
        lineageId,
        path: pathsA.get(nodeA.id) ?? [nodeA.name],
        name: nodeA.name,
        nameA: nodeA.name,
        activeA: nodeA.isActive,
      })
      continue
    }

    if (!nodeA && nodeB) {
      items.push({
        ...base,
        kind: 'level-added',
        scope: 'level',
        lineageId,
        path: pathsB.get(nodeB.id) ?? [nodeB.name],
        name: nodeB.name,
        nameB: nodeB.name,
        activeB: nodeB.isActive,
      })
      continue
    }

    if (!nodeA || !nodeB) continue

    const moved =
      (nodeA.parentId ? nodeLineageByIdA.get(nodeA.parentId) : null) !==
      (nodeB.parentId ? nodeLineageByIdB.get(nodeB.parentId) : null)
    const renamed = nodeA.name !== nodeB.name

    if (renamed || moved) {
      items.push({
        ...base,
        kind: moved ? 'level-moved' : 'level-renamed',
        scope: 'level',
        lineageId,
        path: pathsB.get(nodeB.id) ?? [nodeB.name],
        name: nodeB.name,
        nameA: nodeA.name,
        nameB: nodeB.name,
        activeA: nodeA.isActive,
        activeB: nodeB.isActive,
      })
    }
  }

  // ── Parámetros ─────────────────────────────────────────────────────────
  const parameterLineages = new Set([...parametersA.keys(), ...parametersB.keys()])
  for (const lineageId of parameterLineages) {
    const parameterA = parametersA.get(lineageId)
    const parameterB = parametersB.get(lineageId)

    if (parameterA && !parameterB) {
      items.push({
        ...base,
        kind: 'parameter-removed',
        scope: 'parameter',
        lineageId,
        path: pathsA.get(parameterA.nodeId) ?? [],
        name: parameterA.name,
        nameA: parameterA.name,
        dataType: parameterA.dataType,
        unit: parameterA.unit,
        valueA: parameterA.currentValue,
        sourceA: parameterA.currentValueSource,
        activeA: parameterA.isActive,
      })
      continue
    }

    if (!parameterA && parameterB) {
      items.push({
        ...base,
        kind: 'parameter-added',
        scope: 'parameter',
        lineageId,
        path: pathsB.get(parameterB.nodeId) ?? [],
        name: parameterB.name,
        nameB: parameterB.name,
        dataType: parameterB.dataType,
        unit: parameterB.unit,
        valueB: parameterB.currentValue,
        sourceB: parameterB.currentValueSource,
        activeB: parameterB.isActive,
      })
      continue
    }

    if (!parameterA || !parameterB) continue

    const moved = nodeLineageByIdA.get(parameterA.nodeId) !== nodeLineageByIdB.get(parameterB.nodeId)
    const renamed = parameterA.name !== parameterB.name

    if (renamed || moved) {
      items.push({
        ...base,
        kind: moved ? 'parameter-moved' : 'parameter-renamed',
        scope: 'parameter',
        lineageId,
        path: pathsB.get(parameterB.nodeId) ?? [],
        name: parameterB.name,
        nameA: parameterA.name,
        nameB: parameterB.name,
        dataType: parameterB.dataType,
        unit: parameterB.unit,
        valueA: parameterA.currentValue,
        valueB: parameterB.currentValue,
        sourceA: parameterA.currentValueSource,
        sourceB: parameterB.currentValueSource,
        activeA: parameterA.isActive,
        activeB: parameterB.isActive,
      })
      continue
    }

    const valueChanged =
      parameterA.currentValueSource !== parameterB.currentValueSource ||
      !sameValue(parameterA.currentValue, parameterB.currentValue)

    if (valueChanged) {
      items.push({
        ...base,
        kind: 'parameter-changed',
        scope: 'parameter',
        lineageId,
        path: pathsB.get(parameterB.nodeId) ?? [],
        name: parameterB.name,
        nameA: parameterA.name,
        nameB: parameterB.name,
        dataType: parameterB.dataType,
        unit: parameterB.unit,
        valueA: parameterA.currentValue,
        valueB: parameterB.currentValue,
        sourceA: parameterA.currentValueSource,
        sourceB: parameterB.currentValueSource,
        activeA: parameterA.isActive,
        activeB: parameterB.isActive,
      })
    }
  }

  const counts = {
    levelsAdded: items.filter((item) => item.kind === 'level-added').length,
    levelsRemoved: items.filter((item) => item.kind === 'level-removed').length,
    levelsRenamed: items.filter((item) => item.kind === 'level-renamed' || item.kind === 'level-moved').length,
    parametersAdded: items.filter((item) => item.kind === 'parameter-added').length,
    parametersRemoved: items.filter((item) => item.kind === 'parameter-removed').length,
    parametersRenamed: items.filter((item) => item.kind === 'parameter-renamed').length,
    parametersMoved: items.filter((item) => item.kind === 'parameter-moved').length,
    parametersChanged: items.filter((item) => item.kind === 'parameter-changed').length,
  }

  return { items, counts }
}
