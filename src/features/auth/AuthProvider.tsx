import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import { authService } from '../../services/authService'
import { AuthContext } from './AuthContext'
import type { SessionStatus } from './AuthContext'

/**
 * Mantiene la sesión de Supabase sincronizada con React.
 *
 * - Si falta configuración, queda en `anonymous`: la pantalla de acceso explica
 *   qué falta en `.env.local`.
 * - Nunca copia el token a ningún store: `supabase-js` es el único dueño.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<SessionStatus>(() => (isSupabaseConfigured() ? 'loading' : 'anonymous'))
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let active = true
    authService
      .getSession()
      .then((current) => {
        if (!active) return
        setSession(current)
        setStatus(current ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (!active) return
        setSession(null)
        setStatus('anonymous')
      })

    const unsubscribe = authService.onSessionChange((next) => {
      if (!active) return
      setSession(next)
      setStatus(next ? 'authenticated' : 'anonymous')
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await authService.signIn(email, password)
    setSession(next)
    setStatus('authenticated')
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await authService.signUp(email, password)
    if (result.session) {
      setSession(result.session)
      setStatus('authenticated')
    }
    return result
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setSession(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({
      status,
      session,
      userEmail: session?.user.email ?? null,
      signIn,
      signUp,
      signOut,
    }),
    [status, session, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
