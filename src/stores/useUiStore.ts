import { create } from 'zustand'

/**
 * Estado de interfaz compartido por el shell (Zustand).
 * Nada persistente ni sensible: solo si el menú móvil está abierto.
 */
type UiState = {
  mobileNavOpen: boolean
  openMobileNav: () => void
  closeMobileNav: () => void
}

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
}))
