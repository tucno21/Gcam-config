import type { Parameter } from '../../services/types'

/**
 * Representación de un valor según el tipo del parámetro.
 * No convierte tipos: un booleano se muestra como «Sí/No», un decimal conserva
 * sus decimales y el JSON se muestra formateado, nunca como cadena escapada.
 */

export const formatParameterValue = (parameter: Parameter, value: unknown): string => {
  if (value === null || value === undefined) return 'Sin valor'

  switch (parameter.dataType) {
    case 'boolean':
      return value === true ? 'Sí' : value === false ? 'No' : String(value)
    case 'integer':
      return typeof value === 'number' ? String(Math.trunc(value)) : String(value)
    case 'decimal':
      return typeof value === 'number' ? String(value) : String(value)
    case 'json':
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    case 'enum':
    case 'string':
      return String(value)
  }
}

/** Valor predeterminado con su unidad cuando corresponde. */
export const formatDefaultValue = (parameter: Parameter): string => {
  const base = formatParameterValue(parameter, parameter.defaultValue)
  if (parameter.defaultValue === null || parameter.defaultValue === undefined) return base
  return parameter.unit ? `${base} ${parameter.unit}` : base
}

/**
 * Valor que tiene el teléfono ahora, tal como lo muestra GCam.
 * `default` se escribe literal: es un valor de librería que no conocemos.
 */
export const formatCurrentValue = (parameter: Parameter): string => {
  if (parameter.currentValueSource === 'default') return 'Default (From Library)'
  if (parameter.currentValueSource === 'unknown' || parameter.currentValue === null) return 'Sin valor'
  return formatParameterValue(parameter, parameter.currentValue)
}

/** Igual que `formatCurrentValue` pero con la unidad al final. */
export const formatCurrentValueWithUnit = (parameter: Parameter): string => {
  const base = formatCurrentValue(parameter)
  if (parameter.unit && parameter.currentValueSource === 'custom') return `${base} ${parameter.unit}`
  return base
}

export const CURRENT_SOURCE_LABEL: Record<Parameter['currentValueSource'], string> = {
  custom: 'Definido a mano',
  default: 'Default (From Library)',
  unknown: 'Sin valor',
}

export const EFFECT_LABEL = {
  better: 'Mejor',
  same: 'Igual',
  worse: 'Peor',
  unknown: 'Aún no lo sé',
} as const

export type EffectValue = keyof typeof EFFECT_LABEL

export const EFFECT_OPTIONS: Array<{ value: '' | EffectValue; label: string }> = [
  { value: '', label: 'Sin indicar' },
  { value: 'better', label: EFFECT_LABEL.better },
  { value: 'same', label: EFFECT_LABEL.same },
  { value: 'worse', label: EFFECT_LABEL.worse },
  { value: 'unknown', label: EFFECT_LABEL.unknown },
]

export const SOURCE_LABEL: Record<Parameter['defaultValueSource'], string> = {
  documentation: 'Documentación',
  original_file: 'Archivo original',
  observation: 'Observación propia',
  unknown: 'Desconocida',
}

export const CONFIDENCE_LABEL: Record<NonNullable<Parameter['defaultValueConfidence']>, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export const DATA_TYPE_LABEL: Record<Parameter['dataType'], string> = {
  integer: 'Entero',
  decimal: 'Decimal',
  boolean: 'Booleano',
  string: 'Texto',
  enum: 'Lista',
  json: 'JSON',
}
