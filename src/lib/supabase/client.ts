import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { HAS_SUPABASE_CONFIG, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from '../config/env'
import { AppError } from '../errors/AppError'

/**
 * Único lugar de la aplicación que crea el cliente de Supabase.
 *
 * - Usa solo la clave pública (`publishable` / `anon`); RLS decide qué se ve.
 * - La sesión la gestiona `supabase-js`; la aplicación no guarda tokens por su cuenta.
 * - El cliente es perezoso: si falta configuración, la UI muestra un error accionable
 *   en lugar de romper el arranque del bundle.
 */

let client: SupabaseClient | null = null

export const isSupabaseConfigured = (): boolean => HAS_SUPABASE_CONFIG

/** Devuelve el cliente compartido o lanza `AppError('config')` si falta entorno. */
export const getSupabase = (): SupabaseClient => {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new AppError(
      'config',
      'Supabase no está configurado. Copia .env.example a .env.local y define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'gcam-lab-session',
      },
    })
  }

  return client
}
