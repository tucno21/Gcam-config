import { ApiError } from './http.js'

/**
 * Validación de entradas de la API. No se confía en el cliente: ids, límites,
 * filtros y cuerpos se comprueban aquí antes de tocar la base.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const UUID_REGEX = UUID_PATTERN

export const DEFAULT_LIMIT = 25
export const MAX_LIMIT = 100
export const MAX_TREE_NODES = 2_000

export const parseUuid = (value: unknown, field = 'id'): string => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!UUID_PATTERN.test(text)) throw new ApiError('bad_request', `«${field}» debe ser un UUID válido.`)
  return text
}

export const queryString = (value: unknown): string | undefined => {
  const text = Array.isArray(value) ? value[0] : value
  return typeof text === 'string' && text.trim().length > 0 ? text.trim() : undefined
}

export type Pagination = { limit: number; offset: number }

/** Limita los resultados: 1–100 (25 por defecto). Valores altos se recortan. */
export const parsePagination = (query: Record<string, unknown>): Pagination => {
  const rawLimit = queryString(query.limit)
  const rawOffset = queryString(query.offset)

  let limit = DEFAULT_LIMIT
  if (rawLimit !== undefined) {
    const parsed = Number(rawLimit)
    if (!Number.isInteger(parsed) || parsed < 1) throw new ApiError('bad_request', '«limit» debe ser un entero ≥ 1.')
    limit = Math.min(parsed, MAX_LIMIT)
  }

  let offset = 0
  if (rawOffset !== undefined) {
    const parsed = Number(rawOffset)
    if (!Number.isInteger(parsed) || parsed < 0) throw new ApiError('bad_request', '«offset» debe ser un entero ≥ 0.')
    offset = parsed
  }

  return { limit, offset }
}

/** Sanea el término de búsqueda para no romper la sintaxis de `or(...)`. */
export const parseSearch = (value: unknown): string | undefined => {
  const text = queryString(value)
  if (!text) return undefined
  const cleaned = text.replace(/[,()%*\\"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  return cleaned.length > 0 ? cleaned : undefined
}

export const parseActiveFilter = (value: unknown): 'active' | 'archived' | 'all' => {
  const text = queryString(value)
  if (text === undefined) return 'active'
  if (text === 'active' || text === 'archived' || text === 'all') return text
  throw new ApiError('bad_request', '«active» debe ser active, archived o all.')
}

export const EXPERIMENT_STATUSES = ['planned', 'in_progress', 'completed', 'failed', 'inconclusive'] as const
export type ExperimentStatusValue = (typeof EXPERIMENT_STATUSES)[number]

export const parseExperimentStatus = (value: unknown): ExperimentStatusValue | undefined => {
  const text = queryString(value)
  if (text === undefined) return undefined
  if ((EXPERIMENT_STATUSES as readonly string[]).includes(text)) return text as ExperimentStatusValue
  throw new ApiError('bad_request', `«status» debe ser uno de: ${EXPERIMENT_STATUSES.join(', ')}.`)
}

/** Cuerpo JSON obligatorio (Vercel lo entrega ya parseado). */
export const requireBody = (body: unknown): Record<string, unknown> => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError('bad_request', 'El cuerpo debe ser un objeto JSON.')
  }
  return body as Record<string, unknown>
}

export const optionalText = (
  value: unknown,
  field: string,
  maxLength: number,
): string | null | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new ApiError('bad_request', `«${field}» debe ser texto.`)
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > maxLength) throw new ApiError('bad_request', `«${field}» supera ${maxLength} caracteres.`)
  return trimmed
}

export const requiredText = (value: unknown, field: string, maxLength: number): string => {
  const text = optionalText(value, field, maxLength)
  if (!text) throw new ApiError('bad_request', `«${field}» es obligatorio.`)
  return text
}

export const DATA_TYPES = ['integer', 'decimal', 'boolean', 'string', 'enum', 'json'] as const
export type DataTypeValue = (typeof DATA_TYPES)[number]

/**
 * Comprueba que un valor JSON coincide con el tipo declarado del parámetro.
 * La base lo valida de nuevo con triggers; esto da mensajes claros.
 */
export const valueMatchesType = (dataType: DataTypeValue, value: unknown, allowedValues: string[] | null): boolean => {
  if (value === null || value === undefined) return false
  switch (dataType) {
    case 'integer':
      return typeof value === 'number' && Number.isSafeInteger(value)
    case 'decimal':
      return typeof value === 'number' && Number.isFinite(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'string':
      return typeof value === 'string'
    case 'enum':
      return typeof value === 'string' && (allowedValues ?? []).includes(value)
    case 'json':
      return typeof value === 'object' && value !== null
  }
}
