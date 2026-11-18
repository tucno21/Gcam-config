/**
 * Contrato de errores de la aplicación.
 *
 * Los servicios son el único punto que traduce errores de Supabase, Axios o del
 * navegador a `AppError`; las vistas solo muestran `error.message` y, si aplica,
 * ofrecen reintentar. El `code` permite decidir comportamiento sin comparar textos.
 */

export type AppErrorCode =
  | 'config'
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limit'
  | 'unknown'

export class AppError extends Error {
  readonly code: AppErrorCode
  /** Detalle técnico para diagnóstico; no se muestra en la interfaz. */
  readonly details?: string

  constructor(code: AppErrorCode, message: string, details?: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError

type ErrorShape = {
  name?: unknown
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
  status?: unknown
  isAxiosError?: unknown
  response?: unknown
}

const asShape = (error: unknown): ErrorShape =>
  typeof error === 'object' && error !== null ? (error as ErrorShape) : {}

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

/**
 * Códigos de PostgreSQL y PostgREST que la aplicación traduce.
 * Se revisan antes que los de red porque un `42501` no es un fallo de conexión.
 */
const postgresMessages: Record<string, { code: AppErrorCode; message: string }> = {
  '23505': { code: 'conflict', message: 'Ya existe un registro con ese mismo identificador.' },
  '23503': {
    code: 'conflict',
    message: 'El registro tiene datos dependientes. Archívalo en lugar de eliminarlo.',
  },
  '23514': { code: 'validation', message: 'Alguno de los valores no cumple las reglas del modelo de datos.' },
  '23502': { code: 'validation', message: 'Falta un campo obligatorio.' },
  '22P02': { code: 'validation', message: 'El identificador o el valor tiene un formato no válido.' },
  '42501': {
    code: 'forbidden',
    message: 'No tienes permiso para esta operación. Inicia sesión de nuevo o revisa el registro.',
  },
  '42P01': {
    code: 'config',
    message: 'Faltan las tablas en la base de datos. Aplica las migraciones de la Etapa 3.',
  },
  PGRST205: {
    code: 'config',
    message: 'La tabla no existe en el proyecto de Supabase. Aplica las migraciones de la Etapa 3.',
  },
  PGRST116: { code: 'not_found', message: 'El registro solicitado no existe o no tienes acceso.' },
  PGRST301: { code: 'unauthorized', message: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' },
}

/** Códigos de Supabase Auth que tienen un mensaje propio. */
const authMessages: Record<string, { code: AppErrorCode; message: string }> = {
  invalid_credentials: { code: 'unauthorized', message: 'Correo o contraseña incorrectos.' },
  email_not_confirmed: {
    code: 'unauthorized',
    message: 'Confirma tu correo electrónico antes de iniciar sesión.',
  },
  user_already_exists: { code: 'conflict', message: 'Ya existe una cuenta con ese correo electrónico.' },
  email_exists: { code: 'conflict', message: 'Ya existe una cuenta con ese correo electrónico.' },
  session_not_found: { code: 'unauthorized', message: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' },
  refresh_token_not_found: { code: 'unauthorized', message: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' },
  weak_password: { code: 'validation', message: 'La contraseña es demasiado débil.' },
  over_email_send_rate_limit: {
    code: 'rate_limit',
    message: 'Se han enviado demasiados correos. Espera unos minutos antes de reintentar.',
  },
}

const isNetworkFailure = (message: string | undefined): boolean =>
  typeof message === 'string' && /failed to fetch|network ?error|load failed/i.test(message)

/**
 * Normaliza cualquier error a `AppError`.
 * Es la única función que debe usarse dentro de los servicios.
 */
export const toAppError = (error: unknown): AppError => {
  if (isAppError(error)) return error

  const shape = asShape(error)
  const code = asString(shape.code)
  const rawMessage = asString(shape.message)
  const details = [rawMessage, asString(shape.details), asString(shape.hint)].filter(Boolean).join(' · ') || undefined

  const postgres = code ? postgresMessages[code] : undefined
  if (postgres) return new AppError(postgres.code, postgres.message, details)

  const auth = code ? authMessages[code] : undefined
  if (auth) return new AppError(auth.code, auth.message, details)

  if (shape.isAxiosError === true) {
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      return new AppError('timeout', 'La operación tardó demasiado. Comprueba tu conexión y reintenta.', details)
    }
    const status = typeof shape.response === 'object' && shape.response !== null ? asShape(shape.response).status : undefined
    if (status === 401) return new AppError('unauthorized', 'Tu sesión ha caducado. Vuelve a iniciar sesión.', details)
    if (status === 403) return new AppError('forbidden', 'No tienes permiso para esta operación.', details)
    if (status === 404) return new AppError('not_found', 'El recurso solicitado no existe.', details)
    if (status === 429) return new AppError('rate_limit', 'Demasiadas peticiones. Espera un momento.', details)
    return new AppError('network', 'No se pudo contactar con el servidor. Revisa tu conexión.', details)
  }

  if (isNetworkFailure(rawMessage)) {
    return new AppError('network', 'No se pudo contactar con Supabase. Revisa tu conexión.', details)
  }

  const status = typeof shape.status === 'number' ? shape.status : undefined
  if (status === 401) return new AppError('unauthorized', 'Tu sesión ha caducado. Vuelve a iniciar sesión.', details)
  if (status === 403) return new AppError('forbidden', 'No tienes permiso para esta operación.', details)
  if (status === 429) return new AppError('rate_limit', 'Demasiadas peticiones. Espera un momento.', details)

  return new AppError('unknown', 'Ha ocurrido un error inesperado. Vuelve a intentarlo.', details)
}
