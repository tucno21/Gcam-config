import { describe, expect, it } from 'vitest'
import {
  MAX_LIMIT,
  parseActiveFilter,
  parsePagination,
  parseSearch,
  parseUuid,
  optionalText,
  requireBody,
  requiredText,
  valueMatchesType,
} from './validation'
import { ApiError } from './http'

const UUID = '11111111-1111-4111-8111-111111111111'

describe('parseUuid', () => {
  it('acepta UUID válidos y rechaza el resto', () => {
    expect(parseUuid(UUID)).toBe(UUID)
    expect(() => parseUuid('no-es-uuid')).toThrow(ApiError)
    expect(() => parseUuid(undefined, 'cameraId')).toThrow(/cameraId/)
  })
})

describe('parsePagination', () => {
  it('usa 25 por defecto, recorta a 100 y valida', () => {
    expect(parsePagination({})).toEqual({ limit: 25, offset: 0 })
    expect(parsePagination({ limit: '500' }).limit).toBe(MAX_LIMIT)
    expect(() => parsePagination({ limit: '0' })).toThrow(ApiError)
    expect(() => parsePagination({ offset: '-1' })).toThrow(ApiError)
    expect(() => parsePagination({ limit: 'abc' })).toThrow(ApiError)
  })
})

describe('parseSearch y filtros', () => {
  it('sanea el término y valida el estado', () => {
    expect(parseSearch('  lmc,(8.4)  ')).toBe('lmc 8.4')
    expect(parseSearch('   ')).toBeUndefined()
    expect(parseActiveFilter(undefined)).toBe('active')
    expect(parseActiveFilter('all')).toBe('all')
    expect(() => parseActiveFilter('otro')).toThrow(ApiError)
  })
})

describe('cuerpos y textos', () => {
  it('exige objeto JSON y campos de texto', () => {
    expect(() => requireBody(null)).toThrow(ApiError)
    expect(() => requireBody([])).toThrow(ApiError)
    expect(requireBody({ a: 1 })).toEqual({ a: 1 })
    expect(requiredText('  hola ', 'title', 10)).toBe('hola')
    expect(() => requiredText('', 'title', 10)).toThrow(ApiError)
    expect(() => optionalText('x'.repeat(11), 'reason', 10)).toThrow(ApiError)
    expect(optionalText(undefined, 'reason', 10)).toBeUndefined()
    expect(optionalText('  ', 'reason', 10)).toBeNull()
  })
})

describe('valueMatchesType', () => {
  it('respeta el tipo declarado del parámetro', () => {
    expect(valueMatchesType('integer', 100, null)).toBe(true)
    expect(valueMatchesType('integer', 1.5, null)).toBe(false)
    expect(valueMatchesType('integer', '100', null)).toBe(false)
    expect(valueMatchesType('decimal', 1.5, null)).toBe(true)
    expect(valueMatchesType('boolean', false, null)).toBe(true)
    expect(valueMatchesType('boolean', 'false', null)).toBe(false)
    expect(valueMatchesType('enum', 'on', ['on', 'off'])).toBe(true)
    expect(valueMatchesType('enum', 'quizas', ['on', 'off'])).toBe(false)
    expect(valueMatchesType('json', { a: 1 }, null)).toBe(true)
    expect(valueMatchesType('json', null, null)).toBe(false)
  })
})
