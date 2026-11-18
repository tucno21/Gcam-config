import type { Session } from '@supabase/supabase-js'
import { AppError, toAppError } from '../lib/errors/AppError'
import { getSupabase } from '../lib/supabase/client'

/**
 * Acceso privado con Supabase Auth (correo y contraseña).
 *
 * Contrato:
 * - `signIn` devuelve la sesión o rechaza con `unauthorized` / `rate_limit`.
 * - `signUp` puede requerir confirmación por correo: en ese caso no hay sesión y
 *   la UI debe explicarlo (el proyecto tiene la confirmación activada).
 * - `onSessionChange` expone la suscripción de `supabase-js` para que React se
 *   mantenga sincronizado; es la única forma en que la app escucha el token.
 * - La sesión la persiste `supabase-js`; la aplicación nunca copia tokens a
 *   Zustand, a `localStorage` propio ni a la URL.
 */

export type SignUpResult = { session: Session | null; needsEmailConfirmation: boolean }

export const authService = {
  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await getSupabase().auth.getSession()
      if (error) throw error
      return data.session
    } catch (error) {
      throw toAppError(error)
    }
  },

  async signIn(email: string, password: string): Promise<Session> {
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error
      if (!data.session) throw new AppError('unauthorized', 'No se pudo iniciar la sesión. Vuelve a intentarlo.')

      return data.session
    } catch (error) {
      throw toAppError(error)
    }
  },

  async signUp(email: string, password: string): Promise<SignUpResult> {
    try {
      const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password })
      if (error) throw error

      return { session: data.session, needsEmailConfirmation: data.session === null }
    } catch (error) {
      throw toAppError(error)
    }
  },

  async signOut(): Promise<void> {
    try {
      const { error } = await getSupabase().auth.signOut()
      if (error) throw error
    } catch (error) {
      throw toAppError(error)
    }
  },

  /** Suscribe a los cambios de sesión y devuelve la función para cancelarla. */
  onSessionChange(callback: (session: Session | null) => void): () => void {
    try {
      const { data } = getSupabase().auth.onAuthStateChange((_event, session) => callback(session))
      return () => data.subscription.unsubscribe()
    } catch {
      // Sin configuración no hay sesión que observar; la UI ya muestra el error.
      callback(null)
      return () => undefined
    }
  },
}
