import type { ReactNode } from 'react'
import { cn } from '../../lib/helpers/cn'

type PanelProps = {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Sin padding interno: para listas que dibujan sus propias filas. */
  flush?: boolean
  bodyClassName?: string
}

/** Contenedor base: una sola superficie, hairline, sin sombras. */
export const Panel = ({ title, description, action, children, className, flush = false, bodyClassName }: PanelProps) => (
  <section className={cn('rounded-panel border border-line bg-surface', className)}>
    {(title || action) && (
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          {title && <h2 className="text-sm font-medium tracking-tight text-ink">{title}</h2>}
          {description && <p className="mt-1 text-xs leading-relaxed text-ink-faint">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    <div className={cn(flush ? 'p-0' : 'p-5', bodyClassName)}>{children}</div>
  </section>
)
