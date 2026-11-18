import { AppError } from '../lib/errors/AppError'

/**
 * Utilidades compartidas por los servicios: paginación acotada, saneado de
 * búsquedas y lectura por lotes. Ninguna consulta se envía sin límite.
 */

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

/** Tamaño de lote para lecturas que necesitan el conjunto completo (árbol). */
export const BATCH_SIZE = 500
/** Tope duro de filas por lectura completa: evita descargar una tabla entera. */
export const MAX_ROWS = 5_000

export type ResolvedPagination = { limit: number; offset: number; from: number; to: number }

/** Normaliza `limit`/`offset` a un rango válido y calcula el rango de PostgREST. */
export const resolvePagination = (params?: { limit?: number; offset?: number }): ResolvedPagination => {
  const rawLimit = Number.isFinite(params?.limit) ? Math.trunc(params!.limit!) : DEFAULT_PAGE_SIZE
  const rawOffset = Number.isFinite(params?.offset) ? Math.trunc(params!.offset!) : 0
  const limit = Math.min(Math.max(rawLimit, 1), MAX_PAGE_SIZE)
  const offset = Math.max(rawOffset, 0)

  return { limit, offset, from: offset, to: offset + limit - 1 }
}

/**
 * Sanea un término de búsqueda antes de interpolarlo en un filtro PostgREST.
 * Comas, paréntesis y comodines romperían la sintaxis de `or(...)`.
 */
export const sanitizeSearch = (term?: string): string | undefined => {
  const cleaned = (term ?? '')
    .replace(/[,()%*\\"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)

  return cleaned.length > 0 ? cleaned : undefined
}

/**
 * Lee un conjunto acotado de filas por lotes.
 * Devuelve `truncated: true` si se alcanzó `MAX_ROWS` con más datos pendientes:
 * la vista debe advertirlo en lugar de fingir que el árbol está completo.
 */
export const readInBatches = async <T>(
  fetchBatch: (from: number, to: number) => Promise<T[]>,
): Promise<{ items: T[]; truncated: boolean }> => {
  const items: T[] = []

  while (items.length < MAX_ROWS) {
    const from = items.length
    const to = Math.min(from + BATCH_SIZE, MAX_ROWS) - 1
    const batch = await fetchBatch(from, to)
    items.push(...batch)

    if (batch.length < to - from + 1) return { items, truncated: false }
  }

  return { items, truncated: true }
}

/**
 * Divide una lista de identificadores para usarla con `in(...)`, que tiene un
 * límite práctico de longitud en la URL.
 */
export const chunkIds = (ids: string[], size = 100): string[][] => {
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += size) chunks.push(ids.slice(index, index + size))
  return chunks
}

/** Lanza `AppError('not_found')` cuando una relación obligatoria no existe. */
export const requireRows = <T>(rows: T[], message: string): T[] => {
  if (rows.length === 0) throw new AppError('not_found', message)
  return rows
}
