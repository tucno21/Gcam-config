import { describe, expect, it } from 'vitest'
import { chunkIds, readInBatches, resolvePagination, sanitizeSearch } from './queryHelpers'

describe('resolvePagination', () => {
  it('aplica valores por defecto y límites', () => {
    expect(resolvePagination()).toEqual({ limit: 25, offset: 0, from: 0, to: 24 })
    expect(resolvePagination({ limit: 1, offset: 40 })).toEqual({ limit: 1, offset: 40, from: 40, to: 40 })
  })

  it('recorta el máximo y corrige valores inválidos', () => {
    expect(resolvePagination({ limit: 500 }).limit).toBe(100)
    expect(resolvePagination({ limit: 0 }).limit).toBe(1)
    expect(resolvePagination({ offset: -5 }).offset).toBe(0)
    expect(resolvePagination({ limit: Number.NaN }).limit).toBe(25)
  })
})

describe('sanitizeSearch', () => {
  it('elimina caracteres que rompen la sintaxis de PostgREST', () => {
    expect(sanitizeSearch('  lmc, (8.4)*  ')).toBe('lmc 8.4')
    expect(sanitizeSearch('a,b(c)%d*e"f\'g')).toBe('a b c d e f g')
  })

  it('devuelve undefined para búsquedas vacías y recorta a 80 caracteres', () => {
    expect(sanitizeSearch('   ')).toBeUndefined()
    expect(sanitizeSearch(undefined)).toBeUndefined()
    expect(sanitizeSearch('x'.repeat(120))?.length).toBe(80)
  })
})

describe('chunkIds', () => {
  it('divide listas largas en bloques', () => {
    const ids = Array.from({ length: 250 }, (_, index) => `id-${index}`)
    const chunks = chunkIds(ids, 100)
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toHaveLength(100)
    expect(chunks[2]).toHaveLength(50)
    expect(chunks.flat()).toEqual(ids)
  })
})

describe('readInBatches', () => {
  it('lee hasta que un lote llega incompleto', async () => {
    const data = Array.from({ length: 700 }, (_, index) => index)
    const calls: Array<[number, number]> = []
    const result = await readInBatches(async (from, to) => {
      calls.push([from, to])
      return data.slice(from, to + 1)
    })

    expect(result.truncated).toBe(false)
    expect(result.items).toHaveLength(700)
    expect(calls).toEqual([
      [0, 499],
      [500, 999],
    ])
  })
})
