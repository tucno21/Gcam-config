import { createContext, useContext } from 'react'

export type ToastTone = 'info' | 'success' | 'danger'

export type ToastOptions = {
  title: string
  description?: string
  tone?: ToastTone
}

export type ToastContextValue = {
  notify: (options: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return context
}
