import type { ReactNode } from 'react'
import { ToastProvider } from '../../components/feedback/ToastProvider'

/** Providers globales de la aplicación. */
export const AppProviders = ({ children }: { children: ReactNode }) => <ToastProvider>{children}</ToastProvider>
