import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { AppError } from '../../../lib/errors/AppError'
import { shortId } from '../../../lib/helpers/shortId'
import { cameraService } from '../../../services/cameraService'
import { versionService } from '../../../services/versionService'
import { VersionTabs } from './VersionTabs'

type VersionSectionProps = {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Cabecera + pestañas compartidas por todas las secciones de una versión.
 * Carga la cámara y la versión para mostrar nombres reales en la ruta.
 */
export const VersionSection = ({ title, description, actions, children }: VersionSectionProps) => {
  const { cameraId, versionId } = useParams()
  const base = `/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}`

  const cameraQuery = useAsyncData(async () => {
    if (!cameraId) throw new AppError('not_found', 'Cámara no indicada.')
    return cameraService.getById(cameraId)
  }, `camera|${cameraId}`)

  const versionQuery = useAsyncData(async () => {
    if (!versionId) throw new AppError('not_found', 'Versión no indicada.')
    return versionService.getById(versionId)
  }, `version|${versionId}`)

  if (cameraQuery.status === 'error' && cameraQuery.error) {
    return <ErrorState title="No se pudo abrir la versión" description={cameraQuery.error.message} onRetry={cameraQuery.reload} />
  }

  const camera = cameraQuery.status === 'success' ? cameraQuery.data : null
  const version = versionQuery.status === 'success' ? versionQuery.data : null
  const cameraName = camera?.name ?? `Cámara · ${shortId(cameraId)}`
  const versionLabel = version?.version ?? `Versión · ${shortId(versionId)}`

  const loading = cameraQuery.status === 'loading' || versionQuery.status === 'loading'

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: 'Mis cámaras', to: '/cameras' },
          { label: cameraName, to: `/cameras/${cameraId ?? ''}` },
          { label: versionLabel, to: base },
          { label: title },
        ]}
        actions={
          loading ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint" role="status">
              <Spinner className="size-3" />
              Cargando
            </span>
          ) : (
            actions
          )
        }
      />
      <VersionTabs />
      <div className="mt-6 sm:mt-8">{children}</div>
    </>
  )
}
