import { GitCompare, History, Layers, ListTree } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type VersionTab = {
  /** Segmento de ruta; vacío para el resumen de la versión. */
  key: string
  label: string
  description: string
  icon: LucideIcon
  /** Etapa del roadmap que implementa la sección (0 = ya es navegación real). */
  stage: number
}

export const VERSION_TABS: VersionTab[] = [
  {
    key: '',
    label: 'Resumen',
    description: 'Punto de entrada de la versión y acceso a sus secciones.',
    icon: Layers,
    stage: 0,
  },
  {
    key: 'settings',
    label: 'Ajustes',
    description: 'Espejo de los ajustes del teléfono, nivel a nivel, con su valor actual.',
    icon: ListTree,
    stage: 16,
  },
  {
    key: 'compare',
    label: 'Comparar',
    description: 'Qué se añadió, retiró o cambió entre dos versiones.',
    icon: GitCompare,
    stage: 16,
  },
  {
    key: 'history',
    label: 'Historial',
    description: 'Cambios de valor con su antes, después, comentario y efecto.',
    icon: History,
    stage: 16,
  },
]
