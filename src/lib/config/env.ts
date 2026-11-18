/**
 * Lectura centralizada de variables de entorno.
 *
 * Solo se leen aquí; el resto de la aplicación importa estas constantes. Vite
 * incrusta los valores `VITE_*` en el bundle, así que **nunca** puede haber claves
 * privadas (`service_role`) en este archivo ni en `.env.local`.
 */

const readValue = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

/** URL del proyecto de Supabase. */
export const SUPABASE_URL = readValue(import.meta.env.VITE_SUPABASE_URL)

/**
 * Clave pública del proyecto. Se admite el nombre nuevo (`publishable`) y el
 * heredado (`anon`); ambas están limitadas por RLS.
 */
export const SUPABASE_PUBLIC_KEY =
  readValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ?? readValue(import.meta.env.VITE_SUPABASE_ANON_KEY)

/** `false` cuando falta configuración: la UI lo muestra como error accionable. */
export const HAS_SUPABASE_CONFIG = Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY)

/** Base de la API propia. En desarrollo usa el proxy de Vite (`/api`). */
export const API_BASE_URL = readValue(import.meta.env.VITE_API_BASE_URL) ?? '/api'

/** Tiempo máximo de espera para la API propia, en milisegundos. */
export const API_TIMEOUT_MS = 15_000
