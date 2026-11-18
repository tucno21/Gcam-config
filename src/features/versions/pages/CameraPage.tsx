import { useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { IconButton } from '../../../components/common/IconButton'
import { Panel } from '../../../components/common/Panel'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { AppError, toAppError } from '../../../lib/errors/AppError'
import { formatDateTime } from '../../../lib/helpers/formatDate'
import { cameraService } from '../../../services/cameraService'
import { versionService } from '../../../services/versionService'
import type { Camera, CameraVersion } from '../../../services/types'
import { CameraFormDialog } from '../../cameras/components/CameraFormDialog'
import { DuplicateStructureDialog } from '../components/DuplicateStructureDialog'
import { VersionFormDialog } from '../components/VersionFormDialog'

/** Ficha de la cámara y gestión de sus versiones (Etapa 6). */
export const CameraPage = () => {
  const { cameraId } = useParams()
  const { notify } = useToast()
  useWorkspaceSelection(cameraId)

  const cameraQuery = useAsyncData(
    () => {
      if (!cameraId) throw new AppError('not_found', 'No se indicó la cámara solicitada.')
      return cameraService.getById(cameraId)
    },
    `camera|${cameraId}`,
  )

  const versionsQuery = useAsyncData(
    () => {
      if (!cameraId) throw new AppError('not_found', 'No se indicó la cámara solicitada.')
      return versionService.listByCamera(cameraId, { active: 'all', limit: 100 })
    },
    `versions|${cameraId}`,
  )

  const camera: Camera | null = cameraQuery.status === 'success' ? cameraQuery.data : null
  const versions = versionsQuery.status === 'success' ? (versionsQuery.data?.items ?? []) : []

  const [formOpen, setFormOpen] = useState(false)
  const [cameraFormOpen, setCameraFormOpen] = useState(false)
  const [editingVersion, setEditingVersion] = useState<CameraVersion | null>(null)
  const [duplicatingSource, setDuplicatingSource] = useState<CameraVersion | null>(null)
  const [deletingVersion, setDeletingVersion] = useState<CameraVersion | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const reloadAll = () => {
    cameraQuery.reload()
    versionsQuery.reload()
  }

  if (cameraQuery.status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-1 py-6 text-sm text-ink-muted" role="status">
        <Spinner />
        <span>Cargando cámara…</span>
      </div>
    )
  }

  if (cameraQuery.status === 'error' && cameraQuery.error) {
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
        <ErrorState title="No se pudo abrir la cámara" description={cameraQuery.error.message} onRetry={cameraQuery.reload} />
        <div className="mt-4">
          <Link to="/cameras" className="ui-label underline decoration-line-strong underline-offset-4">
            Volver a Mis cámaras
          </Link>
        </div>
      </>
    )
  }

  if (!camera) return null

  const handleVersionSaved = (saved: CameraVersion) => {
    notify({
      title: editingVersion ? 'Versión actualizada' : 'Versión creada',
      description: `${saved.version} · ${camera.name}`,
      tone: 'success',
    })
    versionsQuery.reload()
  }

  const setDefault = async (version: CameraVersion) => {
    try {
      await versionService.setDefault(camera.id, version.id)
      notify({ title: 'Versión predeterminada', description: version.version, tone: 'success' })
      versionsQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo marcar como predeterminada', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const toggleActive = async (version: CameraVersion) => {
    try {
      const updated = await versionService.setActive(version.id, !version.isActive)
      notify({
        title: updated.isActive ? 'Versión reactivada' : 'Versión archivada',
        description: updated.isActive
          ? 'Vuelve a aparecer como versión activa.'
          : 'Conserva su estructura y sus datos; no se pierde nada.',
        tone: 'success',
      })
      versionsQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo cambiar el estado', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const deleteVersion = async () => {
    if (!deletingVersion) return
    setDeleteBusy(true)
    try {
      await versionService.remove(deletingVersion.id)
      notify({ title: 'Versión eliminada', description: deletingVersion.version, tone: 'success' })
      setDeletingVersion(null)
      versionsQuery.reload()
    } catch (cause) {
      notify({
        title: 'No se pudo eliminar',
        description: `${toAppError(cause).message} La alternativa segura es archivarla.`,
        tone: 'danger',
      })
      setDeletingVersion(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  const handleDuplicated = (result: { targetId: string; nodes: number; parameters: number }) => {
    notify({
      title: 'Estructura duplicada',
      description: `${result.nodes} ${result.nodes === 1 ? 'nodo' : 'nodos'} y ${result.parameters} ${
        result.parameters === 1 ? 'parámetro' : 'parámetros'
      } copiados a la versión destino.`,
      tone: 'success',
    })
    versionsQuery.reload()
  }

  const versionsError =
    versionsQuery.status === 'error' && versionsQuery.error ? versionsQuery.error : null

  return (
    <>
      <PageHeader
        title={camera.name}
        description={camera.description ?? 'Ficha de la cámara y gestión de sus versiones.'}
        breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Mis cámaras', to: '/cameras' }, { label: camera.name }]}
        actions={
          <>
            <IconButton
              label={camera.isActive ? 'Archivar cámara' : 'Reactivar cámara'}
              onClick={() => void cameraService.setActive(camera.id, !camera.isActive).then(reloadAll).catch((cause) => notify({ title: 'No se pudo cambiar el estado', description: toAppError(cause).message, tone: 'danger' }))}
            >
              {camera.isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
            </IconButton>
            <Button leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={() => setCameraFormOpen(true)}>
              Editar cámara
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() => {
                setEditingVersion(null)
                setFormOpen(true)
              }}
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
          </dl>
        </Panel>

        <Panel title="Descripción" description="Contexto de uso, sin valores técnicos.">
          <p className="text-[13px] leading-relaxed text-ink-muted text-pretty">
            {camera.description ?? 'Sin descripción.'}
          </p>
        </Panel>
      </div>

      {/* ── Versiones ─────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-medium tracking-tight text-ink">Versiones</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              Cada versión conserva su propio árbol de parámetros, sus perfiles y sus experimentos.
            </p>
          </div>
          <Button
            size="sm"
            leadingIcon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => {
              setEditingVersion(null)
              setFormOpen(true)
            }}
          >
            Nueva versión
          </Button>
        </header>

        {versionsQuery.status === 'loading' && versions.length === 0 && (
          <div className="flex items-center gap-2 px-1 py-4 text-sm text-ink-muted" role="status">
            <Spinner />
            <span>Cargando versiones…</span>
          </div>
        )}

        {versionsError && (
          <ErrorState title="No se pudieron cargar las versiones" description={versionsError.message} onRetry={versionsQuery.reload} />
        )}

        {versionsQuery.status === 'success' && versions.length === 0 && (
          <EmptyState
            icon={Copy}
            title="Esta cámara todavía no tiene versiones"
            description="Crea la primera versión para empezar a documentar su estructura de parámetros. La etiqueta debe ser única dentro de la cámara."
            action={
              <Button
                variant="primary"
                leadingIcon={<Plus aria-hidden="true" className="size-4" />}
                onClick={() => {
                  setEditingVersion(null)
                  setFormOpen(true)
                }}
              >
                Crear la primera versión
              </Button>
            }
            footnote="Podrás duplicar la estructura de otra versión más adelante, siempre con confirmación previa."
          />
        )}

        {versions.length > 0 && (
          <Panel flush>
            <ul className="divide-y divide-line">
              {versions.map((version) => {
                const canDelete = version.nodeCount === 0 && version.configurationCount === 0
                return (
                  <li key={version.id} className="flex items-start gap-3 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.02]">
                    <Link
                      to={`/cameras/${camera.id}/versions/${version.id}`}
                      className="min-w-0 flex-1 rounded-control"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium text-ink">{version.version}</span>
                        {version.isDefault && <Badge tone="accent">Predeterminada</Badge>}
                        {!version.isActive && <Badge>Archivada</Badge>}
                        {version.nodeCount === 0 && <Badge tone="warning">Sin estructura</Badge>}
                      </span>
                      {version.releaseLabel && (
                        <span className="mt-1 block text-[13px] text-ink-muted">{version.releaseLabel}</span>
                      )}
                      {version.notes && (
                        <span className="mt-1 block text-[13px] leading-relaxed text-ink-faint">
                          {version.notes}
                        </span>
                      )}
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-disabled">
                        <span>
                          {version.nodeCount} {version.nodeCount === 1 ? 'nodo' : 'nodos'}
                        </span>
                        <span>
                          {version.configurationCount}{' '}
                          {version.configurationCount === 1 ? 'perfil' : 'perfiles'}
                        </span>
                        <span>Actualizada {formatDateTime(version.updatedAt)}</span>
                      </span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton
                        label={`Duplicar la estructura de ${version.version}`}
                        disabled={version.nodeCount === 0}
                        onClick={() => setDuplicatingSource(version)}
                      >
                        <Copy className="size-4" />
                      </IconButton>
                      {!version.isDefault && (
                        <IconButton
                          label={`Marcar ${version.version} como predeterminada`}
                          onClick={() => void setDefault(version)}
                        >
                          <Star className="size-4" />
                        </IconButton>
                      )}
                      <IconButton label={`Editar versión ${version.version}`} onClick={() => { setEditingVersion(version); setFormOpen(true) }}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label={version.isActive ? `Archivar ${version.version}` : `Reactivar ${version.version}`}
                        onClick={() => void toggleActive(version)}
                      >
                        {version.isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
                      </IconButton>
                      <IconButton
                        label={
                          canDelete
                            ? `Eliminar ${version.version}`
                            : `${version.version} tiene estructura o perfiles: solo se puede archivar`
                        }
                        disabled={!canDelete}
                        onClick={() => setDeletingVersion(version)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}
      </section>

      <CameraFormDialog
        key={`camera-form-${cameraFormOpen ? 'open' : 'closed'}-${camera.id}`}
        open={cameraFormOpen}
        camera={camera}
        onClose={() => setCameraFormOpen(false)}
        onSaved={(saved) => {
          notify({ title: 'Cámara actualizada', description: saved.name, tone: 'success' })
          reloadAll()
        }}
      />

      <VersionFormDialog
        key={`version-form-${formOpen ? 'open' : 'closed'}-${editingVersion?.id ?? 'new'}`}
        open={formOpen}
        cameraId={camera.id}
        cameraName={camera.name}
        version={editingVersion}
        onClose={() => setFormOpen(false)}
        onSaved={handleVersionSaved}
      />

      <DuplicateStructureDialog
        key={`duplicate-${duplicatingSource?.id ?? 'none'}`}
        open={duplicatingSource !== null}
        cameraId={camera.id}
        cameraName={camera.name}
        versions={versions}
        sourceVersion={duplicatingSource}
        onClose={() => setDuplicatingSource(null)}
        onDuplicated={handleDuplicated}
      />

      <ConfirmDialog
        open={deletingVersion !== null}
        onClose={() => setDeletingVersion(null)}
        onConfirm={() => void deleteVersion()}
        title="Eliminar versión"
        confirmLabel="Eliminar"
        tone="danger"
        loading={deleteBusy}
      >
        Se eliminará permanentemente la versión <strong className="text-ink">{deletingVersion?.version}</strong> de{' '}
        {camera.name}. Solo es posible cuando no tiene estructura de parámetros ni perfiles; con datos, la base lo
        impedirá y el camino seguro es archivarla.
      </ConfirmDialog>
    </>
  )
}
