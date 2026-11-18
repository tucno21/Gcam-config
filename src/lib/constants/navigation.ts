import { Camera, House } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** `end` evita que la ruta raíz quede activa en todas las vistas. */
  end?: boolean
}

export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/cameras', label: 'Mis cámaras', icon: Camera },
]
