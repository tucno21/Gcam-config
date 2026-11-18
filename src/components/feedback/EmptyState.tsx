import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/helpers/cn'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  footnote?: ReactNode
  className?: string
}

/**
 * Estado vacío alineado a la izquierda: se lee como una herramienta, no como una
 * pantalla de bienvenida genérica.
 */
export const EmptyState = ({ icon: Icon, title, description, action, footnote, className }: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-start rounded-panel border border-line bg-surface px-6 py-10 sm:px-8',
      className,
    )}
  >
    <span className="flex size-11 items-center justify-center rounded-panel border border-line bg-surface-sunken text-ink-faint">
      <Icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
    </span>
    <h2 className="mt-5 text-base font-medium tracking-tight text-ink">{title}</h2>
    <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted text-pretty">{description}</p>
    {action && <div className="mt-6">{action}</div>}
    {footnote && <div className="mt-6 w-full border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">{footnote}</div>}
  </div>
)
