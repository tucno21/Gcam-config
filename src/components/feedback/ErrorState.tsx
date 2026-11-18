import { CircleAlert } from 'lucide-react'
import { cn } from '../../lib/helpers/cn'
import { Button } from '../common/Button'

type ErrorStateProps = {
  title?: string
  description: string
  onRetry?: () => void
  className?: string
}

export const ErrorState = ({ title = 'Algo salió mal', description, onRetry, className }: ErrorStateProps) => (
  <div
    role="alert"
    className={cn('flex flex-col items-start rounded-panel border border-danger/25 bg-danger/[0.04] px-6 py-8', className)}
  >
    <span className="flex items-center gap-2 text-danger">
      <CircleAlert aria-hidden="true" className="size-4" />
      <span className="text-sm font-medium">{title}</span>
    </span>
    <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted text-pretty">{description}</p>
    {onRetry && (
      <Button size="sm" className="mt-5" onClick={onRetry}>
        Reintentar
      </Button>
    )}
  </div>
)
