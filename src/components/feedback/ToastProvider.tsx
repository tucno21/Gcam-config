import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/helpers/cn'
import { IconButton } from '../common/IconButton'
import { ToastContext } from './ToastContext'
import type { ToastOptions, ToastTone } from './ToastContext'

type Toast = ToastOptions & { id: number }

const AUTO_DISMISS_MS = 4500

const TONE_ICON: Record<ToastTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  danger: CircleAlert,
}

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'text-ink-faint',
  success: 'text-success',
  danger: 'text-danger',
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (options: ToastOptions) => {
      nextId.current += 1
      const id = nextId.current
      // Máximo tres notificaciones visibles: las más recientes.
      setToasts((current) => [...current.slice(-2), { ...options, id }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[22rem]"
      >
        {toasts.map((toast) => {
          const tone = toast.tone ?? 'info'
          const Icon = TONE_ICON[tone]
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 rounded-panel border border-line-strong bg-surface-raised p-3.5 animate-[ui-toast-in_200ms_ease-out]"
            >
              <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', TONE_CLASS[tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{toast.description}</p>
                )}
              </div>
              <IconButton
                label="Descartar notificación"
                size="sm"
                onClick={() => dismiss(toast.id)}
                className="-mt-1.5 -mr-1.5"
              >
                <X className="size-3.5" />
              </IconButton>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
