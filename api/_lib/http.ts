/**
 * Tipos mínimos de las funciones de Vercel (Node) que usamos.
 * Evitamos añadir `@vercel/node` como dependencia: la forma es la documentada
 * por Vercel (req con query/body/headers y res con status/json/setHeader).
 */

export type ApiRequest = {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  query: Record<string, string | string[] | undefined>
  body?: unknown
}

export type ApiResponse = {
  status: (code: number) => ApiResponse
  setHeader: (name: string, value: string) => void
  json: (payload: unknown) => void
  end: () => void
}

export type ErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'conflict'
  | 'rate_limit'
  | 'server_error'

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  conflict: 409,
  rate_limit: 429,
  server_error: 500,
}

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: string

  constructor(code: ErrorCode, message: string, details?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = STATUS_BY_CODE[code]
    this.details = details
  }
}

/** Respuesta correcta con formato consistente: `{ data, meta? }`. */
export const sendJson = (res: ApiResponse, status: number, data: unknown, meta?: Record<string, unknown>): void => {
  res.status(status)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.json(meta ? { data, meta } : { data })
}

export const sendError = (res: ApiResponse, error: ApiError): void => {
  res.status(error.status)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.json({ error: { code: error.code, message: error.message } })
}

/** Convierte errores de PostgREST/Postgres en `ApiError` con mensajes claros. */
export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error

  const shape = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {}
  const code = typeof shape.code === 'string' ? shape.code : undefined
  const detail = typeof shape.message === 'string' ? shape.message : undefined

  switch (code) {
    case '23505':
      return new ApiError('conflict', 'Ya existe un registro con esos datos.', detail)
    case '23503':
      return new ApiError('conflict', 'El registro tiene datos dependientes; no se puede eliminar.', detail)
    case '23514':
      return new ApiError('bad_request', 'Alguno de los valores no cumple las reglas del modelo de datos.', detail)
    case '42501':
      return new ApiError('forbidden', 'Sin permiso para esta operación. Inicia sesión de nuevo.', detail)
    case 'PGRST116':
      return new ApiError('not_found', 'El recurso no existe o no tienes acceso.', detail)
    default:
      return new ApiError('server_error', 'Error inesperado al consultar los datos.', detail)
  }
}
