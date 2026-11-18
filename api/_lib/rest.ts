import { SUPABASE_PUBLIC_KEY, SUPABASE_URL, isSupabaseConfigured } from './env'
import { ApiError } from './http'
import type { ApiRequest } from './http'

/**
 * Cliente REST mínimo para la API (sin `supabase-js`).
 *
 * Motivo: `@supabase/supabase-js` inicializa Realtime y exige WebSocket nativo
 * (Node ≥ 22) en Vercel; aquí no hay tiempo real. Con `fetch` + PostgREST
 * evitamos esa dependencia y mantenemos la misma seguridad: JWT del usuario +
 * RLS. No se usa `service_role` en ningún punto.
 */

export type RequestContext = {
  token: string
  userId: string
  userEmail: string | null
}

const authHeaders = (token?: string): Record<string, string> => ({
  apikey: SUPABASE_PUBLIC_KEY,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

const bearerToken = (req: ApiRequest): string | undefined => {
  const header = req.headers.authorization ?? req.headers.Authorization
  const value = Array.isArray(header) ? header[0] : header
  if (!value) return undefined
  const match = /^Bearer\s+(.+)$/i.exec(value)
  return match?.[1]?.trim() || undefined
}

/** Valida el JWT contra Supabase Auth y devuelve el contexto de la petición. */
export const authenticate = async (req: ApiRequest): Promise<RequestContext> => {
  if (!isSupabaseConfigured()) {
    throw new ApiError('server_error', 'La API no está configurada: faltan VITE_SUPABASE_URL y la clave pública.')
  }

  const token = bearerToken(req)
  if (!token) {
    throw new ApiError('unauthorized', 'Falta la cabecera Authorization: Bearer <token>.')
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(token) })
  if (!response.ok) {
    throw new ApiError('unauthorized', 'Token inválido o caducado. Inicia sesión de nuevo.')
  }

  const user = (await response.json()) as { id?: string; email?: string }
  if (!user.id) throw new ApiError('unauthorized', 'Token inválido o caducado.')

  return { token, userId: user.id, userEmail: user.email ?? null }
}

export type RestQuery = Record<string, string | number | undefined>

type RestOptions = {
  method?: 'GET' | 'POST'
  path: string
  query?: RestQuery
  body?: unknown
  /** Cabecera `Prefer` (count, representation, merge-duplicates…). */
  prefer?: string
  /** Espera UNA fila (Accept de objeto único de PostgREST). */
  single?: boolean
}

export type RestResult<T> = { data: T; total: number | null }

const postgrestError = (status: number, body: unknown): ApiError => {
  const shape = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const code = typeof shape.code === 'string' ? shape.code : undefined

  if (code === '42501') return new ApiError('forbidden', 'Sin permiso para esta operación.', code)
  if (code === '23505') return new ApiError('conflict', 'Ya existe un registro con esos datos.', code)
  if (code === '23503') return new ApiError('conflict', 'El registro tiene datos dependientes.', code)
  if (code === '23514') return new ApiError('bad_request', 'Alguno de los valores no cumple las reglas del modelo de datos.', code)
  if (code === 'PGRST116') return new ApiError('not_found', 'El recurso no existe o no tienes acceso.', code)

  if (status === 401) return new ApiError('unauthorized', 'Token inválido o caducado.', code)
  if (status === 403) return new ApiError('forbidden', 'Sin permiso para esta operación.', code)
  if (status === 404 || status === 406) return new ApiError('not_found', 'El recurso no existe o no tienes acceso.', code)
  if (status === 409) return new ApiError('conflict', 'Conflicto con un registro existente.', code)

  const message = typeof shape.message === 'string' ? shape.message : 'Error al consultar los datos.'
  if (status >= 400 && status < 500) return new ApiError('bad_request', message, code)
  return new ApiError('server_error', 'Error inesperado al consultar los datos.', code)
}

/** Petición a PostgREST autenticada con el JWT del usuario. */
export const rest = async <T>(context: RequestContext, options: RestOptions): Promise<RestResult<T>> => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) params.set(key, String(value))
  }
  const queryString = params.toString()
  const url = `${SUPABASE_URL}/rest/v1/${options.path}${queryString ? `?${queryString}` : ''}`

  const headers: Record<string, string> = {
    ...authHeaders(context.token),
    Accept: options.single ? 'application/vnd.pgrst.object+json' : 'application/json',
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.prefer) headers.Prefer = options.prefer

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    throw postgrestError(response.status, body)
  }

  const contentRange = response.headers.get('content-range')
  const total = contentRange ? Number(contentRange.split('/')[1]) : null

  if (response.status === 204) return { data: null as T, total }

  const text = await response.text()
  return { data: (text ? JSON.parse(text) : null) as T, total }
}
