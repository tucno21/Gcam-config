import { cn } from '../../lib/helpers/cn'

type SpinnerProps = { className?: string }

/** Indicador de carga decorativo: el texto accesible lo aporta el contenedor. */
export const Spinner = ({ className }: SpinnerProps) => (
  <span
    aria-hidden="true"
    className={cn(
      'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
      className,
    )}
  />
)
