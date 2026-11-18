import { useCallback, useEffect, useRef, useState } from 'react'
import { toAppError } from '../lib/errors/AppError'
import type { AppError } from '../lib/errors/AppError'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export type AsyncResult<T> = {
  status: AsyncStatus
  data: T | null
  error: AppError | null
  reload: () => void
}

/**
 * Carga datos de un servicio y expone los cuatro estados obligatorios de la UI:
 * `idle`, `loading`, `success` y `error` (con `reload` para reintentar).
 *
 * `key` identifica la consulta: al cambiar, se vuelve a cargar. Las respuestas de
 * una consulta anterior se descartan para no pisar el estado actual.
 */
export const useAsyncData = <T>(load: () => Promise<T>, key: string): AsyncResult<T> => {
  const loadRef = useRef(load)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Pick<AsyncResult<T>, 'status' | 'data' | 'error'>>({
    status: 'idle',
    data: null,
    error: null,
  })

  // La función de carga cambia en cada render; la referencia se actualiza después
  // del render para que el efecto siempre invoque la última versión.
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let cancelled = false
    // Marcar `loading` es parte de la suscripción externa: no se puede derivar.
    // oxlint-disable-next-line react/set-state-in-effect
    setState((previous) => ({ status: 'loading', data: previous.data, error: null }))

    loadRef.current().then(
      (data) => {
        if (!cancelled) setState({ status: 'success', data, error: null })
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', data: null, error: toAppError(error) })
      },
    )

    return () => {
      cancelled = true
    }
  }, [key, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  return { ...state, reload }
}
