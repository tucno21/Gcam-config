import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { SignUpResult } from '../../services/authService'

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated'

export type AuthContextValue = {
  status: SessionStatus
  session: Session | null
  userEmail: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

/** Contexto de sesión. El valor solo existe dentro de `AuthProvider`. */
export const AuthContext = createContext<AuthContextValue | null>(null)
