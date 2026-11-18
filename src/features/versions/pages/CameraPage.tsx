import { useState } from 'react'
import { Archive, ArchiveRestore, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { IconButton } from '../../../components/common/IconButton'
import { Panel } from '../../../components/common/Panel'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { PendingStage } from '../../../components/feedback/PendingStage'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { AppError, toAppError } from '../../../lib/errors/AppError'
import { formatDateTime } from '../../../lib/helpers/formatDate'
import { cameraService } from '../../../services/cameraService'
import type { Camera } from '../../../services/types'
import { CameraFormDialog } from '../../cameras/components/CameraFormDialog'

/** Ficha de una cámara: detalle real y acceso a su listado de versiones. */
export const CameraPage = () => {
  const { cameraId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  useWorkspaceSelection(cameraId)

  const { status, data: camera, error, reload } = useAsyncData(
    () => {
      if (!cameraId) throw new AppError('not_found', 'No se indicó la cámara solicitada.')
      return cameraService.getById(cameraId)
    },
    `camera|${cameraId}`,
  )

  const [formOpen, setFormOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-1 py-6 text-sm text-ink-muted" role="status">
        <Spinner />
        <span>Cargando cámara…</span>
      </div>
    )
  }

  if (status === 'error' && error) {
    return (
      <>
        <PageHeader
          title="Cámara"
          breadcrumbs={[
            { label: 'Inicio', to: '/' },
            { label: 'Mis cámaras', to: '/cameras' },
            { label: 'Detalle' },
          ]}
        />
        <ErrorState title="No se pudo abrir la cámara" description={error.message} onRetry={reload} />
        <div className="mt-4">
          <Link to="/cameras" className="ui-label underline decoration-line-strong underline-offset-4">
            Volver a Mis cámaras
          </Link>
        </div>
      </>
    )
  }

  if (!camera) return null

  const handleSaved = (saved: Camera) => {
    notify({ title: 'Cámara actualizada', description: saved.name, tone: 'success' })
    reload()
  }

  const toggleActive = async () => {
    try {
      const updated = await cameraService.setActive(camera.id, !camera.isActive)
      notify({
        title: updated.isActive ? 'Cámara reactivada' : 'Cámara archivada',
        description: updated.isActive
          ? 'Vuelve a aparecer en el catálogo activo.'
          : 'No aparece en el catálogo activo; puedes reactivarla cuando quieras.',
        tone: 'success',
      })
      reload()
    } catch (cause) {
      notify({ title: 'No se pudo cambiar el estado', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const deleteCamera = async () => {
    setDeleteBusy(true)
    try {
      await cameraService.remove(camera.id)
      notify({ title: 'Cámara eliminada', description: camera.name, tone: 'success' })
      navigate('/cameras')
    } catch (cause) {
      notify({
        title: 'No se pudo eliminar',
        description: `${toAppError(cause).message} La alternativa segura es archivarla.`,
        tone: 'danger',
      })
      setDeleteBusy(false)
      setConfirmingDelete(false)
    }
  }

  const canDelete = camera.versionCount === 0

  return (
    <>
      <PageHeader
        title={camera.name}
        description={camera.description ?? 'Ficha de la cámara y acceso a sus versiones.'}
        breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Mis cámaras', to: '/cameras' }, { label: camera.name }]}
        actions={
          <>
            <IconButton
              label={camera.isActive ? 'Archivar cámara' : 'Reactivar cámara'}
              onClick={() => void toggleActive()}
            >
              {camera.isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
            </IconButton>
            <IconButton
              label={canDelete ? 'Eliminar cámara' : 'Solo se puede eliminar si no tiene versiones'}
              disabled={!canDelete}
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="size-4" />
            </IconButton>
            <Button leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={() => setFormOpen(true)}>
              Editar
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() =>
                notify({
                  title: 'Alta de versiones en la Etapa 06',
                  description: 'El catálogo de cámaras ya es real; las versiones llegan en la siguiente etapa.',
                })
              }
            >
              Nueva versión
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Ficha" description="Datos de registro de esta cámara." flush>
          <dl className="divide-y divide-line">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <dt className="ui-label w-32 shrink-0">Identificador</dt>
              <dd>
                <code className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[12px] text-ink-muted">
                  {camera.slug}
                </code>
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <dt className="ui-label w-32 shrink-0">Estado</dt>
              <dd className="flex items-center gap-2">
                {camera.isActive ? 'Activa' : 'Archivada'}
                {!camera.isActive && <Badge>Archivada</Badge>}
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <dt className="ui-label w-32 shrink-0">Versiones</dt>
              <dd>
                {camera.versionCount} {camera.versionCount === 1 ? 'registrada' : 'registradas'}
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <dt className="ui-label w-32 shrink-0">Desarrollador</dt>
              <dd>{camera.developer ?? '—'}</dd>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <dt className="ui-label w-32 shrink-0">Enlace</dt>
              <dd>
                {camera.websiteUrl ? (
                  <a
                    href={camera.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline decoration-line-strong underline-offset-4 hover:text-ink"
                  >
                    {camera.websiteUrl}
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <dt className="ui-label w-32 shrink-0">Creada</dt>
              <dd>{formatDateTime(camera.createdAt)}</dd>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
              <dt className="ui-label w-32 shrink-0">Última edición</dt>
              <dd>{formatDateTime(camera.updatedAt)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Descripción" description="Contexto de uso, sin valores técnicos.">
          <p className="text-[13px] leading-relaxed text-ink-muted text-pretty">
            {camera.description ?? 'Sin descripción.'}
          </p>
        </Panel>
      </div>

      <div className="mt-5">
        <PendingStage
          stage={6}
          title="Versiones de esta cámara"
          description="Una cámara puede tener varias versiones y cada una mantiene su estructura, sus perfiles y sus experimentos por separado."
          items={[
            'Crear, editar y archivar versiones',
            'Marcar una versión como predeterminada',
            'Evitar versiones duplicadas en la misma cámara',
            'Duplicar estructura entre versiones con confirmación',
          ]}
        />
      </div>

      <CameraFormDialog
        // La clave remonta el formulario al abrirlo: estado limpio sin efectos.
        key={`camera-form-${formOpen ? 'open' : 'closed'}-${camera.id}`}
        open={formOpen}
        camera={camera}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => void deleteCamera()}
        title="Eliminar cámara"
        confirmLabel="Eliminar"
        tone="danger"
        loading={deleteBusy}
      >
        Se eliminará permanentemente <strong className="text-ink">{camera.name}</strong>. Solo es posible cuando no
        tiene versiones ni datos históricos; si tiene alguno, la base lo impedirá y la alternativa segura es
        archivarla.
      </ConfirmDialog>
    </>
  )
}
