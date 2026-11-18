import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { History, ListTree, Pencil } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { AppError } from '../../../lib/errors/AppError'
import { cn } from '../../../lib/helpers/cn'
import { shortId } from '../../../lib/helpers/shortId'
import { cameraService } from '../../../services/cameraService'
import { CameraFormDialog } from './CameraFormDialog'

const TABS = [
  { key: '', label: 'Ajustes', icon: ListTree },
  { key: 'history', label: 'Historial', icon: History },
] as const

type CameraSectionProps = {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Cabecera y pestañas de una cámara. No hay «versiones» visibles: la cámara
 * abre directamente su estructura de ajustes.
 */
export const CameraSection = ({ title, description, actions, children }: CameraSectionProps) => {
  const { cameraId } = useParams()
  const { notify } = useToast()
  const [editOpen, setEditOpen] = useState(false)

  const cameraQuery = useAsyncData(async () => {
    if (!cameraId) throw new AppError('not_found', 'Cámara no indicada.')
    return cameraService.getById(cameraId)
  }, `camera|${cameraId}`)

  const camera = cameraQuery.status === 'success' ? cameraQuery.data : null
  const cameraName = camera?.name ?? `Cámara · ${shortId(cameraId)}`
  const base = `/cameras/${cameraId ?? ''}`

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
        breadcrumbs={[{ label: 'Mis cámaras', to: '/cameras' }, { label: cameraName }]}
        actions={
          cameraQuery.status === 'loading' ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint" role="status">
              <Spinner className="size-3" />
              Cargando
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              <Button
                size="sm"
                leadingIcon={<Pencil aria-hidden="true" className="size-4" />}
                onClick={() => setEditOpen(true)}
                disabled={!camera}
              >
                Editar cámara
              </Button>
            </div>
          )
        }
      />

      <nav
        aria-label="Secciones de la cámara"
        className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex min-w-max gap-1 border-b border-line">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const to = tab.key ? `${base}/${tab.key}` : base

            return (
              <li key={tab.key || 'ajustes'}>
                <NavLink
                  to={to}
                  end={tab.key === ''}
                  className={({ isActive }) =>
                    cn(
                      '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] whitespace-nowrap transition-colors duration-150',
                      isActive
                        ? 'border-accent font-medium text-ink'
                        : 'border-transparent text-ink-faint hover:border-line-strong hover:text-ink',
                    )
                  }
                >
                  <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                  {tab.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-6 sm:mt-8">{children}</div>

      {camera && (
        <CameraFormDialog
          key={`camera-edit-${camera.id}`}
          open={editOpen}
          camera={camera}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => {
            notify({ title: 'Cámara actualizada', description: saved.name, tone: 'success' })
            cameraQuery.reload()
          }}
        />
      )}
    </>
  )
}
