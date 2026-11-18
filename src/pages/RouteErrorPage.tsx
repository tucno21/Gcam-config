import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ButtonLink } from '../components/common/ButtonLink'
import { usePageTitle } from '../hooks/usePageTitle'

const describeError = (error: unknown): string => {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  if (error instanceof Error) return error.message
  return 'Se produjo un error inesperado al renderizar esta vista.'
}

export const RouteErrorPage = () => {
  usePageTitle('Error')
  const error = useRouteError()

  return (
    <div className="flex min-h-[55dvh] flex-col items-start justify-center">
      <p className="ui-label">Error de ruta</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">No se pudo cargar la vista</h1>
      <p className="mt-2 max-w-lg font-mono text-[13px] leading-relaxed break-words text-danger">{describeError(error)}</p>
      <div className="mt-6 flex gap-2">
        <ButtonLink to="/cameras" variant="primary">
          Ir a Mis cámaras
        </ButtonLink>
      </div>
    </div>
  )
}
