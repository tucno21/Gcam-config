import { describe, expect, it } from 'vitest'
import {
  EMPTY_PARAMETER_FORM,
  parseAllowedValues,
  parseDefaultValue,
  toParameterPayload,
  validateParameterField,
  validateParameterForm,
} from './validation'

describe('parseDefaultValue', () => {
  it('parsea enteros y decimales como números, nunca como texto', () => {
    expect(parseDefaultValue('integer', '100', []).value).toBe(100)
    expect(parseDefaultValue('integer', '-5', []).value).toBe(-5)
    expect(parseDefaultValue('decimal', '1.5', []).value).toBe(1.5)
    expect(parseDefaultValue('integer', '1.5', []).error).toBeTruthy()
    expect(parseDefaultValue('decimal', 'abc', []).error).toBeTruthy()
  })

  it('devuelve booleanos reales y vacío como desconocido', () => {
    expect(parseDefaultValue('boolean', 'true', []).value).toBe(true)
    expect(parseDefaultValue('boolean', 'false', []).value).toBe(false)
    expect(parseDefaultValue('boolean', '', []).value).toBeNull()
    expect(parseDefaultValue('integer', '   ', []).value).toBeNull()
  })

  it('valida enums y JSON', () => {
    expect(parseDefaultValue('enum', 'on', ['on', 'off']).value).toBe('on')
    expect(parseDefaultValue('enum', 'quizas', ['on', 'off']).error).toBeTruthy()
    expect(parseDefaultValue('json', '{"a":1}', []).value).toEqual({ a: 1 })
    expect(parseDefaultValue('json', '{roto', []).error).toBeTruthy()
  })
})

describe('parseAllowedValues', () => {
  it('separa por líneas o comas, quita vacíos y duplicados', () => {
    expect(parseAllowedValues('on\noff\n\non')).toEqual(['on', 'off'])
    expect(parseAllowedValues('a, b ,a')).toEqual(['a', 'b'])
  })
})

describe('validateParameterForm', () => {
  it('exige nombre y valida la clave técnica', () => {
    const errors = validateParameterForm({ ...EMPTY_PARAMETER_FORM })
    expect(errors.name).toBeTruthy()

    const badKey = { ...EMPTY_PARAMETER_FORM, name: 'X', key: 'con espacios' }
    expect(validateParameterForm(badKey).key).toBeTruthy()

    const okKey = { ...EMPTY_PARAMETER_FORM, name: 'X', key: 'max_frames' }
    expect(validateParameterForm(okKey).key).toBeUndefined()
  })

  it('exige procedencia cuando hay valor predeterminado', () => {
    const values = { ...EMPTY_PARAMETER_FORM, name: 'X', defaultValueRaw: '10', defaultValueSource: 'unknown' as const }
    expect(validateParameterField('source', values)).toBeTruthy()
  })

  it('exige opciones cuando el tipo es enum', () => {
    const values = { ...EMPTY_PARAMETER_FORM, name: 'X', dataType: 'enum' as const }
    expect(validateParameterField('allowedValues', values)).toBeTruthy()
  })
})

describe('toParameterPayload', () => {
  it('fuerza source unknown y null cuando no hay valor', () => {
    const payload = toParameterPayload({ ...EMPTY_PARAMETER_FORM, name: 'X', defaultValueSource: 'documentation' })
    expect(payload.defaultValue).toBeNull()
    expect(payload.defaultValueSource).toBe('unknown')
    expect(payload.defaultValueConfidence).toBeNull()
  })

  it('convierte el valor y limpia allowedValues fuera de enum', () => {
    const payload = toParameterPayload({
      ...EMPTY_PARAMETER_FORM,
      name: 'Max',
      dataType: 'integer',
      defaultValueRaw: '12',
      defaultValueSource: 'documentation',
      defaultValueConfidence: 'high',
      allowedValuesRaw: 'a\nb',
      sortOrder: '3',
    })
    expect(payload.defaultValue).toBe(12)
    expect(payload.defaultValueSource).toBe('documentation')
    expect(payload.defaultValueConfidence).toBe('high')
    expect(payload.allowedValues).toBeNull()
    expect(payload.sortOrder).toBe(3)
  })
})
