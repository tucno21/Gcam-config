import type { ConfidenceLevel, DataType, DefaultValueSource, Parameter } from '../../services/types'

/**
 * Validación pura del formulario de parámetro y conversión del valor
 * predeterminado al JSONB tipado que espera la base.
 *
 * Reglas clave (también garantizadas por la base):
 * - Sin valor conocido ⇒ `default_value = null` y procedencia `unknown`.
 * - Con valor ⇒ procedencia obligatoria distinta de `unknown`.
 * - Entero, decimal, booleano y JSON se validan según su forma; nunca se
 *   convierten booleanos a cadenas ni decimales a enteros.
 * - `allowed_values` solo aplica a `enum` y el valor debe pertenecer a la lista.
 */

export type ParameterFormValues = {
  name: string
  key: string
  description: string
  /** Conocimiento acumulado del ajuste. */
  notes: string
  dataType: DataType
  unit: string
  defaultValueRaw: string
  defaultValueSource: DefaultValueSource
  defaultValueConfidence: '' | ConfidenceLevel
  /** Un valor por línea para `enum`. */
  allowedValuesRaw: string
  sortOrder: string
  isActive: boolean
}

export type ParameterField =
  | 'name'
  | 'key'
  | 'description'
  | 'notes'
  | 'unit'
  | 'defaultValue'
  | 'source'
  | 'allowedValues'
  | 'sortOrder'

export type ParameterFieldErrors = Partial<Record<ParameterField, string>>

export const EMPTY_PARAMETER_FORM: ParameterFormValues = {
  name: '',
  key: '',
  description: '',
  notes: '',
  dataType: 'integer',
  unit: '',
  defaultValueRaw: '',
  defaultValueSource: 'unknown',
  defaultValueConfidence: '',
  allowedValuesRaw: '',
  sortOrder: '0',
  isActive: true,
}

export const DATA_TYPE_OPTIONS: Array<{ value: DataType; label: string; hint: string }> = [
  { value: 'integer', label: 'Entero', hint: 'Número sin decimales (ej. 100).' },
  { value: 'decimal', label: 'Decimal', hint: 'Número con decimales (ej. 1.5).' },
  { value: 'boolean', label: 'Booleano', hint: 'Sí o No.' },
  { value: 'string', label: 'Texto', hint: 'Cadena libre.' },
  { value: 'enum', label: 'Lista de opciones', hint: 'El valor debe pertenecer a la lista.' },
  { value: 'json', label: 'JSON', hint: 'Solo cuando el formato necesite estructura.' },
]

export const DEFAULT_VALUE_SOURCE_OPTIONS: Array<{ value: DefaultValueSource; label: string }> = [
  { value: 'documentation', label: 'Documentación' },
  { value: 'original_file', label: 'Archivo original' },
  { value: 'observation', label: 'Observación propia' },
  { value: 'unknown', label: 'Desconocida' },
]

export const CONFIDENCE_OPTIONS: Array<{ value: '' | ConfidenceLevel; label: string }> = [
  { value: '', label: 'Sin indicar' },
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]

const KEY_PATTERN = /^[A-Za-z0-9._-]+$/

/** Lista de opciones del enum, recortada y sin vacíos ni duplicados. */
export const parseAllowedValues = (raw: string): string[] =>
  raw
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .filter((entry, index, list) => list.indexOf(entry) === index)

const parseInteger = (raw: string): number | null => {
  if (!/^-?\d+$/.test(raw.trim())) return null
  const value = Number(raw.trim())
  return Number.isSafeInteger(value) ? value : null
}

/**
 * Convierte el valor escrito al tipo declarado.
 * Devuelve `{ value: null }` cuando no hay valor conocido.
 */
export const parseDefaultValue = (
  dataType: DataType,
  raw: string,
  allowedValues: string[],
): { value: unknown; error?: string } => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { value: null }

  switch (dataType) {
    case 'integer': {
      const value = parseInteger(trimmed)
      return value === null
        ? { value: null, error: 'Escribe un número entero (ej. 100).' }
        : { value }
    }
    case 'decimal': {
      const value = Number(trimmed)
      return Number.isFinite(value) ? { value } : { value: null, error: 'Escribe un número decimal (ej. 1.5).' }
    }
    case 'boolean':
      if (trimmed === 'true') return { value: true }
      if (trimmed === 'false') return { value: false }
      return { value: null, error: 'Elige Sí o No.' }
    case 'string':
      return { value: raw }
    case 'enum':
      if (allowedValues.length === 0) return { value: null, error: 'Define primero las opciones permitidas.' }
      if (!allowedValues.includes(trimmed)) return { value: null, error: 'El valor debe ser una de las opciones.' }
      return { value: trimmed }
    case 'json':
      try {
        return { value: JSON.parse(trimmed) }
      } catch {
        return { value: null, error: 'El JSON no es válido.' }
      }
  }
}

export const formatValueForInput = (dataType: DataType, value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (dataType === 'json') return JSON.stringify(value, null, 2)
  if (dataType === 'boolean') return value === true ? 'true' : 'false'
  return String(value)
}

export const formatDefaultValueForInput = (parameter: Parameter | null): string => {
  if (!parameter) return ''
  return formatValueForInput(parameter.dataType, parameter.defaultValue)
}

export const parameterToFormValues = (parameter: Parameter | null): ParameterFormValues =>
  parameter
    ? {
        name: parameter.name,
        key: parameter.key ?? '',
        description: parameter.description ?? '',
        notes: parameter.notes ?? '',
        dataType: parameter.dataType,
        unit: parameter.unit ?? '',
        defaultValueRaw: formatDefaultValueForInput(parameter),
        defaultValueSource: parameter.defaultValueSource,
        defaultValueConfidence: parameter.defaultValueConfidence ?? '',
        allowedValuesRaw: (parameter.allowedValues ?? []).join('\n'),
        sortOrder: String(parameter.sortOrder),
        isActive: parameter.isActive,
      }
    : EMPTY_PARAMETER_FORM

export const validateParameterField = (field: ParameterField, values: ParameterFormValues): string | undefined => {
  const allowed = parseAllowedValues(values.allowedValuesRaw)

  switch (field) {
    case 'name': {
      const name = values.name.trim()
      if (name.length === 0) return 'Escribe el nombre del parámetro.'
      if (name.length > 120) return 'Máximo 120 caracteres.'
      return undefined
    }
    case 'key': {
      const key = values.key.trim()
      if (key.length === 0) return undefined
      if (!KEY_PATTERN.test(key)) return 'Solo letras, números, punto, guion y guion bajo.'
      if (key.length > 80) return 'Máximo 80 caracteres.'
      return undefined
    }
    case 'description':
      return values.description.trim().length > 1000 ? 'Máximo 1000 caracteres.' : undefined
    case 'notes':
      return values.notes.trim().length > 4000 ? 'Máximo 4000 caracteres.' : undefined
    case 'unit':
      return values.unit.trim().length > 24 ? 'Máximo 24 caracteres.' : undefined
    case 'sortOrder': {
      const raw = values.sortOrder.trim()
      if (raw.length === 0) return undefined
      const value = parseInteger(raw)
      if (value === null || value < 0) return 'Escribe un entero mayor o igual que 0.'
      return undefined
    }
    case 'allowedValues':
      if (values.dataType !== 'enum') return undefined
      if (allowed.length === 0) return 'Añade al menos una opción.'
      if (allowed.length > 50) return 'Máximo 50 opciones.'
      return undefined
    case 'source':
      if (values.defaultValueRaw.trim().length > 0 && values.defaultValueSource === 'unknown') {
        return 'Indica de dónde sale el valor predeterminado.'
      }
      return undefined
    case 'defaultValue':
      return parseDefaultValue(values.dataType, values.defaultValueRaw, allowed).error
  }
}

export const validateParameterForm = (values: ParameterFormValues): ParameterFieldErrors => {
  const fields: ParameterField[] = [
    'name',
    'key',
    'description',
    'notes',
    'unit',
    'sortOrder',
    'allowedValues',
    'source',
    'defaultValue',
  ]
  const errors: ParameterFieldErrors = {}
  for (const field of fields) {
    const message = validateParameterField(field, values)
    if (message) errors[field] = message
  }
  return errors
}

/** Valores listos para el servicio: JSONB tipado, null para desconocido. */
export const toParameterPayload = (values: ParameterFormValues) => {
  const dataType = values.dataType
  const allowedValues = dataType === 'enum' ? parseAllowedValues(values.allowedValuesRaw) : []
  const parsed = parseDefaultValue(dataType, values.defaultValueRaw, allowedValues)
  const hasValue = parsed.value !== null && parsed.value !== undefined
  const sortOrderRaw = values.sortOrder.trim()

  return {
    name: values.name.trim(),
    key: values.key.trim() || null,
    description: values.description.trim() || null,
    notes: values.notes.trim() || null,
    dataType,
    unit: values.unit.trim() || null,
    defaultValue: hasValue ? parsed.value : null,
    defaultValueSource: hasValue ? values.defaultValueSource : ('unknown' as const),
    defaultValueConfidence: hasValue && values.defaultValueConfidence ? values.defaultValueConfidence : null,
    allowedValues: dataType === 'enum' ? allowedValues : null,
    sortOrder: sortOrderRaw.length > 0 ? Number(sortOrderRaw) : 0,
    isActive: values.isActive,
  }
}

/* ── Niveles (pantallas del menú de la cámara) ────────────────────────────── */

export type LevelFormValues = { name: string; description: string }
export const EMPTY_LEVEL_FORM: LevelFormValues = { name: '', description: '' }

export const validateLevelForm = (values: LevelFormValues): { name?: string; description?: string } => {
  const errors: { name?: string; description?: string } = {}
  const name = values.name.trim()
  if (name.length === 0) errors.name = 'Escribe el nombre del nivel.'
  else if (name.length > 160) errors.name = 'Máximo 160 caracteres.'
  if (values.description.trim().length > 1000) errors.description = 'Máximo 1000 caracteres.'
  return errors
}

/* ── Cambio de valor actual ───────────────────────────────────────────────── */

export type ValueChangeFormValues = {
  /** Texto del valor; vacío con procedencia `default` o `unknown`. */
  raw: string
  source: 'custom' | 'default' | 'unknown'
  /** Comentario del cambio: qué se hizo y qué se esperaba. */
  comment: string
  effect: '' | 'better' | 'same' | 'worse' | 'unknown'
}

export const validateValueChange = (
  parameter: Parameter,
  values: ValueChangeFormValues,
): { raw?: string; comment?: string } => {
  const errors: { raw?: string; comment?: string } = {}
  if (values.source === 'custom') {
    const parsed = parseDefaultValue(parameter.dataType, values.raw, parameter.allowedValues ?? [])
    if (parsed.error) errors.raw = parsed.error
    else if (parsed.value === null) errors.raw = 'Escribe el valor.'
  }
  if (values.comment.trim().length > 2000) errors.comment = 'Máximo 2000 caracteres.'
  return errors
}

/** Valor listo para guardar: `null` cuando la procedencia no es `custom`. */
export const toCurrentValue = (
  parameter: Parameter,
  values: ValueChangeFormValues,
): { value: unknown; source: 'custom' | 'default' | 'unknown' } => {
  if (values.source !== 'custom') return { value: null, source: values.source }
  const parsed = parseDefaultValue(parameter.dataType, values.raw, parameter.allowedValues ?? [])
  return { value: parsed.value, source: 'custom' }
}
