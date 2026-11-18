import { Suspense } from 'react'
import { LogOut } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { PageLoader } from '../components/feedback/PageLoader'
import { Brand } from '../components/layout/Brand'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { useAuth } from '../features/auth/hooks/useAuth'
import { APP_NAME } from '../lib/constants/app'

/**
 * Marco de la aplicación: una sola barra superior con la marca y la sesión.
 * No hay menú lateral: «Mis cámaras» es la vista principal y las cámaras se
 * abren desde sus tarjetas.
 */
export const AppShell = () => {
  const { userEmail, signOut } = useAuth()

  return (
    <div className="min-h-dvh">
      <ScrollToTop />
      <a href="#contenido" className="ui-skip-link">
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            to="/cameras"
            aria-label={`${APP_NAME} · Mis cámaras`}
            className="inline-flex rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Brand />
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            {userEmail && (
              <span className="hidden min-w-0 truncate text-xs text-ink-faint sm:block" title={userEmail}>
                {userEmail}
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              leadingIcon={<LogOut aria-hidden="true" className="size-4" />}
              onClick={() => void signOut()}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Suspense fallback={<PageLoader label="Cargando vista…" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
