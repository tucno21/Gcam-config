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
export const LazyCameraPage = lazy(() =>
  import('../../features/versions/pages/CameraPage').then((module) => ({ default: module.CameraPage })),
)
export const LazyVersionOverviewPage = lazy(() =>
  import('../../features/versions/pages/VersionOverviewPage').then((module) => ({ default: module.VersionOverviewPage })),
)
export const LazyHierarchyPage = lazy(() =>
  import('../../features/hierarchy/pages/HierarchyPage').then((module) => ({ default: module.HierarchyPage })),
)
export const LazyConfigurationsPage = lazy(() =>
  import('../../features/configurations/pages/ConfigurationsPage').then((module) => ({ default: module.ConfigurationsPage })),
)
export const LazyExperimentsPage = lazy(() =>
  import('../../features/experiments/pages/ExperimentsPage').then((module) => ({ default: module.ExperimentsPage })),
)
export const LazyHistoryPage = lazy(() =>
  import('../../features/history/pages/HistoryPage').then((module) => ({ default: module.HistoryPage })),
)
export const LazyAssistantPage = lazy(() =>
  import('../../features/assistant/pages/AssistantPage').then((module) => ({ default: module.AssistantPage })),
)
export const LazyParameterPage = lazy(() =>
  import('../../features/parameters/pages/ParameterPage').then((module) => ({ default: module.ParameterPage })),
)

const LoginChunk = lazy(() => import('../../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })))

/** Acceso cargado bajo demanda, con su propio Suspense (está fuera del shell). */
export const LazyLoginPage = () => (
  <Suspense fallback={<PageLoader fullPage label="Cargando acceso…" />}>
    <LoginChunk />
  </Suspense>
)
