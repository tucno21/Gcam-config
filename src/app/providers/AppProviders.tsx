import type { ReactNode } from 'react'
import { ToastProvider } from '../../components/feedback/ToastProvider'
import { AuthProvider } from '../../features/auth/AuthProvider'

/** Providers globales de la aplicación: sesión y avisos. */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <ToastProvider>{children}</ToastProvider>
  </AuthProvider>
)
