import { useEffect } from 'react'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'

/**
 * Sincroniza la cámara/versión visibles con el store de interfaz.
 * Solo guarda identificadores de navegación; los datos se consultan siempre.
 */
export const useWorkspaceSelection = (cameraId: string | undefined, versionId?: string | undefined): void => {
  const selectCamera = useWorkspaceStore((state) => state.selectCamera)
  const selectVersion = useWorkspaceStore((state) => state.selectVersion)

  useEffect(() => {
    if (!cameraId) return
    if (versionId) selectVersion(cameraId, versionId)
    else selectCamera(cameraId)
  }, [cameraId, versionId, selectCamera, selectVersion])
}
