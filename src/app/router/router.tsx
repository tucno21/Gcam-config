import { createBrowserRouter } from 'react-router-dom'
import {
  LazyAssistantPage,
  LazyCameraPage,
  LazyCamerasPage,
  LazyConfigurationsPage,
  LazyExperimentsPage,
  LazyHierarchyPage,
  LazyHistoryPage,
  LazyLoginPage,
  LazyParameterPage,
  LazyVersionOverviewPage,
} from './lazyPages'
import { HomePage } from '../../pages/HomePage'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { RouteErrorPage } from '../../pages/RouteErrorPage'
import { AppShell } from '../AppShell'
import { RequireSession } from './RequireSession'

// Las páginas de datos se cargan bajo demanda (code-splitting): el arranque solo
// descarga el shell y la sesión; cada vista llega al navegar (ver lazyPages).
export const router = createBrowserRouter([
  { path: '/login', element: <LazyLoginPage />, errorElement: <RouteErrorPage /> },
  {
    // Toda vista de datos exige sesión; la seguridad real vive en RLS.
    path: '/',
    element: <RequireSession />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            // Ruta sin segmento: mantiene el shell y captura errores dentro de él.
            errorElement: <RouteErrorPage />,
            children: [
              { index: true, element: <HomePage /> },
              { path: 'cameras', element: <LazyCamerasPage /> },
              { path: 'cameras/:cameraId', element: <LazyCameraPage /> },
              { path: 'cameras/:cameraId/versions/:versionId', element: <LazyVersionOverviewPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/hierarchy', element: <LazyHierarchyPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/parameters/:parameterId', element: <LazyParameterPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/configurations', element: <LazyConfigurationsPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/experiments', element: <LazyExperimentsPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/history', element: <LazyHistoryPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/assistant', element: <LazyAssistantPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
