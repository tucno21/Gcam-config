import { useEffect, useState } from 'react'

/**
 * Aplaza un valor (p. ej. el texto de búsqueda) hasta que deja de cambiar.
 * Evita lanzar una consulta por cada tecla.
 */
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
