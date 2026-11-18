/**
 * Entorno del servidor.
 *
 * La API usa la **clave pública** de Supabase y el JWT del usuario: no necesita
 * `service_role`. En Vercel se configuran las mismas variables que usa el
 * frontend (`VITE_*`); se aceptan también nombres sin prefijo para despliegues
 * solo-servidor. Nunca hay claves privilegiadas en el navegador.
 */

const read = (value: string | undefined): string => (value ?? '').trim()

export const SUPABASE_URL =
  read(process.env.VITE_SUPABASE_URL) || read(process.env.SUPABASE_URL)

export const SUPABASE_PUBLIC_KEY =
  read(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  read(process.env.SUPABASE_PUBLISHABLE_KEY) ||
  read(process.env.VITE_SUPABASE_ANON_KEY)

export const isSupabaseConfigured = (): boolean => Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY)
