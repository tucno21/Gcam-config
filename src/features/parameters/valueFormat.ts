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
