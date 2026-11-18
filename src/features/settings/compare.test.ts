import { describe, expect, it } from 'vitest'
import type { Parameter, ParameterNode } from '../../services/types'
import { compareVersions } from './compare'

const node = (id: string, lineageId: string, parentId: string | null, name: string): ParameterNode => ({
  id,
  cameraVersionId: 'version',
  parentId,
  lineageId,
  name,
  description: null,
  nodeType: 'group',
  sortOrder: 0,
  isActive: true,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
})

const parameter = (
  id: string,
  lineageId: string,
  nodeId: string,
  name: string,
  currentValue: unknown,
  source: Parameter['currentValueSource'] = 'custom',
): Parameter => ({
  id,
  nodeId,
  lineageId,
  key: null,
  name,
  description: null,
  notes: null,
  dataType: 'decimal',
  unit: null,
  defaultValue: null,
  defaultValueSource: 'unknown',
  defaultValueConfidence: null,
  allowedValues: null,
  currentValue,
  currentValueSource: source,
  sortOrder: 0,
  isActive: true,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
})

describe('compareVersions', () => {
  it('detecta niveles y parámetros nuevos y retirados por linaje', () => {
    const a = {
      nodes: [node('n1', 'L-photo', null, 'Photo Processing'), node('n2', 'L-sharp', 'n1', 'Sharpness')],
      parameters: [parameter('p1', 'L-depth', 'n2', 'Sharp Depth', 1.25)],
    }
    const b = {
      nodes: [node('n1b', 'L-photo', null, 'Photo Processing'), node('n3', 'L-noise', 'n1b', 'Noise reduction')],
      parameters: [parameter('p2', 'L-noise-level', 'n3', 'Noise level', 2)],
    }

    const result = compareVersions(a, b)
    expect(result.counts.levelsRemoved).toBe(1)
    expect(result.counts.levelsAdded).toBe(1)
    expect(result.counts.parametersRemoved).toBe(1)
    expect(result.counts.parametersAdded).toBe(1)
    expect(result.items.find((item) => item.kind === 'level-removed')?.name).toBe('Sharpness')
    expect(result.items.find((item) => item.kind === 'parameter-added')?.path).toEqual(['Photo Processing', 'Noise reduction'])
  })

  it('detecta renombrados y cambios de valor con el mismo linaje', () => {
    const a = {
      nodes: [node('n1', 'L-photo', null, 'Photo Processing')],
      parameters: [
        parameter('p1', 'L-depth', 'n1', 'Sharp Depth 1', 1.25),
        parameter('p2', 'L-default', 'n1', 'Sharp mini', null, 'default'),
      ],
    }
    const b = {
      nodes: [node('n1b', 'L-photo', null, 'Photo processing')],
      parameters: [
        parameter('p1b', 'L-depth', 'n1b', 'Sharp Depth A', 1.375),
        parameter('p2b', 'L-default', 'n1b', 'Sharp mini', 6.5),
      ],
    }

    const result = compareVersions(a, b)
    expect(result.counts.levelsRenamed).toBe(1)
    expect(result.counts.parametersRenamed).toBe(1)
    expect(result.counts.parametersChanged).toBe(1)

    const renamed = result.items.find((item) => item.kind === 'parameter-renamed')
    expect(renamed).toMatchObject({ nameA: 'Sharp Depth 1', nameB: 'Sharp Depth A', valueA: 1.25, valueB: 1.375 })

    const changed = result.items.find((item) => item.kind === 'parameter-changed')
    expect(changed?.sourceA).toBe('default')
    expect(changed?.sourceB).toBe('custom')
    expect(changed?.valueB).toBe(6.5)
  })

  it('detecta un parámetro movido de nivel y respeta el estado retirado', () => {
    const a = {
      nodes: [node('n1', 'L-photo', null, 'Photo'), node('n2', 'L-color', null, 'Color')],
      parameters: [parameter('p1', 'L-sat', 'n1', 'Saturation', 1)],
    }
    const b = {
      nodes: [node('n1b', 'L-photo', null, 'Photo'), { ...node('n2b', 'L-color', null, 'Color'), isActive: false }],
      parameters: [{ ...parameter('p1b', 'L-sat', 'n2b', 'Saturation', 1), isActive: false }],
    }

    const result = compareVersions(a, b)
    expect(result.items.find((item) => item.kind === 'parameter-moved')).toMatchObject({
      path: ['Color'],
      activeB: false,
    })
  })

  it('no reporta nada cuando las versiones son iguales', () => {
    const snapshot = {
      nodes: [node('n1', 'L-photo', null, 'Photo')],
      parameters: [parameter('p1', 'L-depth', 'n1', 'Sharp Depth', 1.25)],
    }

    const result = compareVersions(snapshot, snapshot)
    expect(result.items).toEqual([])
    expect(Object.values(result.counts).every((count) => count === 0)).toBe(true)
  })
})
