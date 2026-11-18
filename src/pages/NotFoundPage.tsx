import { ButtonLink } from '../components/common/ButtonLink'
import { usePageTitle } from '../hooks/usePageTitle'

export const NotFoundPage = () => {
  usePageTitle('Página no encontrada')

  return (
    <div className="flex min-h-[55dvh] flex-col items-start justify-center">
      <p className="ui-label">Error 404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Esta ruta no existe</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted text-pretty">
        La dirección que abriste no corresponde a ninguna vista del laboratorio.
      </p>
      <ButtonLink to="/" variant="primary" className="mt-6">
        Volver al inicio
      </ButtonLink>
    </div>
  )
}
