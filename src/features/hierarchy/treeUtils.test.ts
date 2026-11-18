import { describe, expect, it } from 'vitest'
import type { ParameterNode } from '../../services/types'
import {
  ancestorsOf,
  branchIds,
  buildTreeIndex,
  depthOf,
  descendantCount,
  isInsideBranch,
  searchVisibleIds,
  siblingOrderAfterDrop,
} from './treeUtils'

const node = (id: string, parentId: string | null, name: string, sortOrder = 0): ParameterNode => ({
  id,
  cameraVersionId: 'version-1',
  parentId,
  name,
  description: null,
  nodeType: 'group',
  sortOrder,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
})

const NODES = [
  node('base', null, 'Base', 0),
  node('expo', 'base', 'Exposición', 1),
  node('sombras', 'expo', 'Sombras', 0),
  node('hdr', 'base', 'HDR', 0),
]

describe('buildTreeIndex', () => {
  it('indexa raíces y hermanos ordenados', () => {
    const index = buildTreeIndex(NODES)
    expect(index.total).toBe(4)
    expect(index.roots.map((root) => root.id)).toEqual(['base'])
    expect(index.childrenByParent.get('base')?.map((child) => child.id)).toEqual(['hdr', 'expo'])
  })
})

describe('ancestorsOf / depthOf', () => {
  it('calcula la ruta desde la raíz sin incluir el nodo', () => {
    const index = buildTreeIndex(NODES)
    expect(ancestorsOf(index, 'sombras').map((ancestor) => ancestor.name)).toEqual(['Base', 'Exposición'])
    expect(depthOf(index, 'sombras')).toBe(2)
    expect(depthOf(index, 'base')).toBe(0)
  })
})

describe('branchIds / descendantCount', () => {
  it('incluye el nodo y todos sus descendientes', () => {
    const index = buildTreeIndex(NODES)
    expect(branchIds(index, 'base').slice().sort()).toEqual(['base', 'expo', 'hdr', 'sombras'])
    expect(descendantCount(index, 'base')).toBe(3)
    expect(descendantCount(index, 'sombras')).toBe(0)
    expect(isInsideBranch(index, 'base', 'sombras')).toBe(true)
    expect(isInsideBranch(index, 'sombras', 'base')).toBe(false)
  })
})

describe('searchVisibleIds', () => {
  it('devuelve coincidencias y sus ancestros', () => {
    const index = buildTreeIndex(NODES)
    expect([...searchVisibleIds(index, 'sombra')].sort()).toEqual(['base', 'expo', 'sombras'])
    expect([...searchVisibleIds(index, 'nada')]).toEqual([])
    expect([...searchVisibleIds(index, '  ')]).toEqual([])
  })
})

describe('siblingOrderAfterDrop', () => {
  it('inserta antes y después del destino quitando el arrastrado', () => {
    const order = ['a', 'b', 'c']
    expect(siblingOrderAfterDrop(order, 'c', 'a', 'before')).toEqual(['c', 'a', 'b'])
    expect(siblingOrderAfterDrop(order, 'a', 'c', 'after')).toEqual(['b', 'c', 'a'])
    expect(siblingOrderAfterDrop(order, 'b', 'c', 'after')).toEqual(['a', 'c', 'b'])
  })

  it('es estable si el destino no está en la lista', () => {
    expect(siblingOrderAfterDrop(['a', 'b'], 'a', 'zz', 'before')).toEqual(['b'])
  })
})
