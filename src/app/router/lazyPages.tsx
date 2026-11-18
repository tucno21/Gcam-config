import { Suspense, lazy } from 'react'
import { PageLoader } from '../../components/feedback/PageLoader'

/**
 * Rutas cargadas bajo demanda (code-splitting).
 * El shell envuelve el `Outlet` en un Suspense; el acceso tiene el suyo porque
 * vive fuera del shell.
 */

export const LazyCamerasPage = lazy(() =>
  import('../../features/cameras/pages/CamerasPage').then((module) => ({ default: module.CamerasPage })),
)
export const LazySettingsPage = lazy(() =>
  import('../../features/settings/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
export const LazyHistoryPage = lazy(() =>
  import('../../features/settings/pages/HistoryPage').then((module) => ({ default: module.HistoryPage })),
)
export const LazyParameterPage = lazy(() =>
  import('../../features/settings/pages/ParameterDetailPage').then((module) => ({ default: module.ParameterDetailPage })),
)

const LoginChunk = lazy(() => import('../../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })))

/** Acceso cargado bajo demanda, con su propio Suspense (está fuera del shell). */
export const LazyLoginPage = () => (
  <Suspense fallback={<PageLoader fullPage label="Cargando acceso…" />}>
    <LoginChunk />
  </Suspense>
)
