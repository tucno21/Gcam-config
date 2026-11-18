import { FlaskConical, History, Layers, Network, SlidersHorizontal, Sparkles } from 'lucide-react'
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
    key: 'hierarchy',
    label: 'Estructura',
    description: 'Árbol de categorías, grupos y parámetros sin límite de profundidad.',
    icon: Network,
    stage: 7,
  },
  {
    key: 'configurations',
    label: 'Configuraciones',
    description: 'Perfiles con los valores actuales de cada parámetro.',
    icon: SlidersHorizontal,
    stage: 9,
  },
  {
    key: 'experiments',
    label: 'Experimentos',
    description: 'Pruebas registradas con objetivos, cambios y conclusión.',
    icon: FlaskConical,
    stage: 10,
  },
  {
    key: 'history',
    label: 'Historial',
    description: 'Cronología de cambios con valor anterior, valor nuevo y motivo.',
    icon: History,
    stage: 10,
  },
  {
    key: 'assistant',
    label: 'Asistente',
    description: 'Consultas sobre el catálogo y propuestas de experimentos.',
    icon: Sparkles,
    stage: 12,
  },
]
