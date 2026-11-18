import { create } from 'zustand'

/**
 * Selección actual de trabajo (Zustand).
 *
 * Solo guarda identificadores para preferencias de navegación: **no** copia
 * registros ni datos de la base. La fuente de verdad sigue siendo Supabase y cada
 * vista vuelve a consultar lo que necesita.
 */
type WorkspaceState = {
  selectedCameraId: string | null
  selectedVersionId: string | null
  /** Elegir cámara limpia la versión: nunca se mezclan contextos. */
  selectCamera: (cameraId: string | null) => void
  selectVersion: (cameraId: string, versionId: string | null) => void
  clearSelection: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedCameraId: null,
  selectedVersionId: null,
  selectCamera: (cameraId) => set({ selectedCameraId: cameraId, selectedVersionId: null }),
  selectVersion: (cameraId, versionId) => set({ selectedCameraId: cameraId, selectedVersionId: versionId }),
  clearSelection: () => set({ selectedCameraId: null, selectedVersionId: null }),
}))
