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
  selectedNodeId: string | null
  selectedConfigurationId: string | null
  /** Elegir cámara limpia la versión; elegir versión limpia nodo y perfil. */
  selectCamera: (cameraId: string | null) => void
  selectVersion: (cameraId: string, versionId: string | null) => void
  selectNode: (nodeId: string | null) => void
  selectConfiguration: (configurationId: string | null) => void
  clearSelection: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedCameraId: null,
  selectedVersionId: null,
  selectedNodeId: null,
  selectedConfigurationId: null,
  // Volver a la misma cámara/versión conserva la selección (recordar al navegar).
  selectCamera: (cameraId) =>
    set((state) =>
      state.selectedCameraId === cameraId
        ? { selectedCameraId: cameraId }
        : {
            selectedCameraId: cameraId,
            selectedVersionId: null,
            selectedNodeId: null,
            selectedConfigurationId: null,
          },
    ),
  selectVersion: (cameraId, versionId) =>
    set((state) =>
      state.selectedVersionId === versionId
        ? { selectedCameraId: cameraId, selectedVersionId: versionId }
        : {
            selectedCameraId: cameraId,
            selectedVersionId: versionId,
            selectedNodeId: null,
            selectedConfigurationId: null,
          },
    ),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  selectConfiguration: (configurationId) => set({ selectedConfigurationId: configurationId }),
  clearSelection: () =>
    set({
      selectedCameraId: null,
      selectedVersionId: null,
      selectedNodeId: null,
      selectedConfigurationId: null,
    }),
}))
