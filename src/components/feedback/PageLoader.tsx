import { cn } from '../../lib/helpers/cn'
import { Spinner } from './Spinner'

type PageLoaderProps = {
  label?: string
  /** Ocupa la ventana completa (pantalla de acceso). */
  fullPage?: boolean
  className?: string
}

/** Indicador de carga para rutas en lazy (code-splitting). */
export const PageLoader = ({ label = 'Cargando…', fullPage = false, className }: PageLoaderProps) => (
  <div
    role="status"
    className={cn(
      'flex items-center justify-center gap-2 text-sm text-ink-muted',
      fullPage ? 'min-h-dvh' : 'min-h-[40vh]',
      className,
    )}
  >
    <Spinner />
    <span>{label}</span>
  </div>
)
