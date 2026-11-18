import type { ReactNode } from 'react'
import { cn } from '../../lib/helpers/cn'

type TooltipProps = {
  /** Texto del globo. */
  label: string
  children: ReactNode
  className?: string
}

/**
 * Globo de ayuda al pasar el ratón o al enfocar con el teclado.
 * Solo presentación: el nombre accesible lo aporta el elemento interactivo.
 */
export const Tooltip = ({ label, children, className }: TooltipProps) => (
  <span className={cn('group/tip relative inline-flex shrink-0', className)}>
    {children}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 rounded-control border border-line-strong bg-surface-raised px-2 py-1 text-[11px] whitespace-nowrap text-ink shadow-lg group-focus-within/tip:block group-hover/tip:block"
    >
      {label}
    </span>
  </span>
)
