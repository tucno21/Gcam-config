import { describe, expect, it } from 'vitest'
import type { Parameter } from '../../services/types'
import {
  EMPTY_LEVEL_FORM,
  EMPTY_PARAMETER_FORM,
  parseAllowedValues,
  parseDefaultValue,
  toParameterPayload,
  validateLevelForm,
  validateParameterField,
  validateParameterForm,
  validateValueChange,
  toCurrentValue,
} from './validation'

const parameter = (overrides: Partial<Parameter> = {}): Parameter => ({
  id: 'p1',
  nodeId: 'n1',
  lineageId: 'L-p1',
  key: null,
  name: 'Sharp Depth 1',
  description: null,
  notes: null,
  dataType: 'decimal',
  unit: null,
  defaultValue: null,
  defaultValueSource: 'unknown',
  defaultValueConfidence: null,
  allowedValues: null,
  currentValue: 1.25,
  currentValueSource: 'custom',
  sortOrder: 0,
  isActive: true,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...overrides,
})

describe('parseDefaultValue', () => {
  it('parsea números y booleanos sin convertirlos a texto', () => {
    expect(parseDefaultValue('integer', '100', []).value).toBe(100)
    expect(parseDefaultValue('decimal', '1.375', []).value).toBe(1.375)
    expect(parseDefaultValue('boolean', 'true', []).value).toBe(true)
    expect(parseDefaultValue('integer', '1.5', []).error).toBeTruthy()
    expect(parseDefaultValue('json', '{roto', []).error).toBeTruthy()
    expect(parseDefaultValue('decimal', '  ', []).value).toBeNull()
  })

  it('valida enums contra sus opciones', () => {
    expect(parseDefaultValue('enum', 'on', ['on', 'off']).value).toBe('on')
    expect(parseDefaultValue('enum', 'quizas', ['on', 'off']).error).toBeTruthy()
  })
})

describe('niveles', () => {
  it('exige nombre y respeta el límite', () => {
    expect(validateLevelForm(EMPTY_LEVEL_FORM).name).toBeTruthy()
    expect(validateLevelForm({ name: 'Photo Processing', description: '' })).toEqual({})
    expect(validateLevelForm({ name: 'x'.repeat(161), description: '' }).name).toBeTruthy()
  })
})

describe('formulario de parámetro', () => {
  it('exige nombre y valida las notas', () => {
    expect(validateParameterForm(EMPTY_PARAMETER_FORM).name).toBeTruthy()
    expect(validateParameterField('notes', { ...EMPTY_PARAMETER_FORM, name: 'X', notes: 'x'.repeat(4001) })).toBeTruthy()
  })

  it('incluye las notas en el payload y limpia la procedencia sin valor', () => {
    const payload = toParameterPayload({ ...EMPTY_PARAMETER_FORM, name: 'X', notes: '  Sube el ruido  ' })
    expect(payload.notes).toBe('Sube el ruido')
    expect(payload.defaultValueSource).toBe('unknown')
    expect(payload.defaultValue).toBeNull()
  })

  it('mantiene allowedValues solo en enum', () => {
    const payload = toParameterPayload({ ...EMPTY_PARAMETER_FORM, name: 'X', allowedValuesRaw: 'a\nb' })
    expect(payload.allowedValues).toBeNull()
    expect(parseAllowedValues('a\nb, a')).toEqual(['a', 'b'])
  })
})

describe('cambio de valor', () => {
  it('valida el valor solo cuando es personalizado', () => {
    expect(validateValueChange(parameter(), { raw: '', source: 'default', comment: '', effect: '' })).toEqual({})
    expect(validateValueChange(parameter(), { raw: '', source: 'unknown', comment: '', effect: '' })).toEqual({})
    expect(validateValueChange(parameter(), { raw: '', source: 'custom', comment: '', effect: '' }).raw).toBeTruthy()
    expect(validateValueChange(parameter(), { raw: '1.5', source: 'custom', comment: '', effect: '' })).toEqual({})
  })

  it('devuelve null para default y el valor tipado para custom', () => {
    expect(toCurrentValue(parameter(), { raw: '', source: 'default', comment: '', effect: '' })).toEqual({
      value: null,
      source: 'default',
    })
    expect(toCurrentValue(parameter(), { raw: '1.375', source: 'custom', comment: '', effect: 'better' })).toEqual({
      value: 1.375,
      source: 'custom',
    })
  })
})
