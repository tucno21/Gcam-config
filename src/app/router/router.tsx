import { createBrowserRouter } from 'react-router-dom'
import { CamerasPage } from '../../features/cameras/pages/CamerasPage'
import { CameraPage } from '../../features/versions/pages/CameraPage'
import { VersionOverviewPage } from '../../features/versions/pages/VersionOverviewPage'
import { HierarchyPage } from '../../features/hierarchy/pages/HierarchyPage'
import { ConfigurationsPage } from '../../features/configurations/pages/ConfigurationsPage'
import { ExperimentsPage } from '../../features/experiments/pages/ExperimentsPage'
import { HistoryPage } from '../../features/history/pages/HistoryPage'
import { AssistantPage } from '../../features/assistant/pages/AssistantPage'
import { ParameterPage } from '../../features/parameters/pages/ParameterPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { HomePage } from '../../pages/HomePage'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { RouteErrorPage } from '../../pages/RouteErrorPage'
import { AppShell } from '../AppShell'
import { RequireSession } from './RequireSession'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
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
              { path: 'cameras', element: <CamerasPage /> },
              { path: 'cameras/:cameraId', element: <CameraPage /> },
              { path: 'cameras/:cameraId/versions/:versionId', element: <VersionOverviewPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/hierarchy', element: <HierarchyPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/parameters/:parameterId', element: <ParameterPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/configurations', element: <ConfigurationsPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/experiments', element: <ExperimentsPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/history', element: <HistoryPage /> },
              { path: 'cameras/:cameraId/versions/:versionId/assistant', element: <AssistantPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
