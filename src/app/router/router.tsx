import { createBrowserRouter } from 'react-router-dom'
import {
  LazyCamerasPage,
  LazyHistoryPage,
  LazyLoginPage,
  LazyParameterPage,
  LazySettingsPage,
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
              // La cámara abre directamente sus niveles: no hay «versiones» visibles.
              { path: 'cameras/:cameraId', element: <LazySettingsPage /> },
              { path: 'cameras/:cameraId/settings/:nodeId', element: <LazySettingsPage /> },
              { path: 'cameras/:cameraId/history', element: <LazyHistoryPage /> },
              { path: 'cameras/:cameraId/parameters/:parameterId', element: <LazyParameterPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
