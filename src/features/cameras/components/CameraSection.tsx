import type { ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { PageHeader } from '../../../components/layout/PageHeader'
import type { Crumb } from '../../../components/layout/Breadcrumbs'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { AppError } from '../../../lib/errors/AppError'
import { shortId } from '../../../lib/helpers/shortId'
import { cameraService } from '../../../services/cameraService'

type CameraSectionProps = {
  title: string
  description?: string
  /** Ruta interna (Ajustes › nivel › …) bajo las migas de la cámara. */
  trail?: Crumb[]
  actions?: ReactNode
  /** Título y acciones en la misma fila (también en móvil). */
  actionsInline?: boolean
  children: ReactNode
}

/**
 * Cabecera de una cámara. No hay «versiones» ni pestañas: la cámara abre
 * directamente sus ajustes y la ruta interna se muestra como migas bajo
 * «Mis cámaras › cámara».
 */
export const CameraSection = ({
  title,
  description,
  trail,
  actions,
  actionsInline = false,
  children,
}: CameraSectionProps) => {
  const { cameraId } = useParams()
  const { pathname } = useLocation()

  const cameraQuery = useAsyncData(async () => {
    if (!cameraId) throw new AppError('not_found', 'Cámara no indicada.')
    return cameraService.getById(cameraId)
  }, `camera|${cameraId}`)

  const cameraName = cameraQuery.data?.name ?? `Cámara · ${shortId(cameraId)}`
  const base = `/cameras/${cameraId ?? ''}`
  const isCameraRoot = pathname === base

  if (cameraQuery.status === 'error' && cameraQuery.error) {
    return (
      <ErrorState
        title="No se pudo abrir la cámara"
        description={cameraQuery.error.message}
        onRetry={cameraQuery.reload}
      />
    )
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: 'Mis cámaras', to: '/cameras' },
          { label: cameraName, to: isCameraRoot ? undefined : base },
        ]}
        trail={trail}
        actionsInline={actionsInline}
        actions={
          cameraQuery.status === 'loading' ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint" role="status">
              <Spinner className="size-3" />
              Cargando
            </span>
          ) : (
            actions
          )
        }
      />

      <div className="mt-6 sm:mt-8">{children}</div>
    </>
  )
}
