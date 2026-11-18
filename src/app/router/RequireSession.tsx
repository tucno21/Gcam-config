import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../../components/feedback/Spinner'
import { useAuth } from '../../features/auth/hooks/useAuth'

/**
 * Guarda de sesión: sin sesión no se monta ninguna vista de datos.
 *
 * No es el mecanismo de seguridad (eso es RLS): solo evita mostrar una interfaz
 * vacía y conserva la ruta solicitada para volver después del acceso.
 */
export const RequireSession = () => {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 text-sm text-ink-muted">
        <Spinner />
        <span>Comprobando sesión…</span>
      </div>
    )
  }

  if (status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}
