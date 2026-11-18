import { useState } from 'react'
import { Archive, ArchiveRestore, Camera as CameraIcon, Download, Pencil, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { IconButton } from '../../../components/common/IconButton'
import { Panel } from '../../../components/common/Panel'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { toAppError } from '../../../lib/errors/AppError'
import { backupFilename, downloadJson } from '../../../lib/helpers/downloadJson'
import { cameraService } from '../../../services/cameraService'
import { catalogTransferService } from '../../../services/catalogTransferService'
import type { ActiveFilter, Camera } from '../../../services/types'
import { CameraFormDialog } from '../components/CameraFormDialog'
import { ImportCatalogDialog } from '../components/ImportCatalogDialog'

const STATUS_OPTIONS: Array<{ value: ActiveFilter; label: string }> = [
  { value: 'active', label: 'Activas' },
  { value: 'archived', label: 'Archivadas' },
  { value: 'all', label: 'Todas' },
]

const PAGE_SIZE = 25

/** Catálogo principal: CRUD completo con búsqueda, filtros y estados obligatorios. */
export const CamerasPage = () => {
  const { notify } = useToast()
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [status, setStatus] = useState<ActiveFilter>('active')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const queryKey = `cameras|${search}|${status}|${limit}`
  const { status: loadStatus, data, error, reload } = useAsyncData(
    () => cameraService.list({ search, active: status, limit }),
    queryKey,
  )

  const cameras = data?.items ?? []
  const total = data?.total ?? 0
  const canLoadMore = cameras.length < total

  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Camera | null>(null)
  const [deleting, setDeleting] = useState<Camera | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (camera: Camera) => {
    setEditing(camera)
    setFormOpen(true)
  }

  const handleSaved = (saved: Camera) => {
    notify({
      title: editing ? 'Cámara actualizada' : 'Cámara creada',
      description: saved.name,
      tone: 'success',
    })
    reload()
  }

  const exportCamera = async (camera: Camera) => {
    setExportingId(camera.id)
    try {
      const backup = await catalogTransferService.exportCamera(camera.id, { includeExperiments: true })
      downloadJson(backupFilename(camera.slug), backup)
      notify({
        title: 'Respaldo exportado',
        description: `${camera.name}. Incluye versiones, árbol, parámetros, perfiles, experimentos e historial.`,
        tone: 'success',
      })
    } catch (cause) {
      notify({ title: 'No se pudo exportar', description: toAppError(cause).message, tone: 'danger' })
    } finally {
      setExportingId(null)
    }
  }

  const toggleActive = async (camera: Camera) => {
    try {
      const updated = await cameraService.setActive(camera.id, !camera.isActive)
      notify({
        title: updated.isActive ? 'Cámara reactivada' : 'Cámara archivada',
        description: updated.isActive
          ? 'Vuelve a aparecer en el listado de activas.'
          : 'No aparece en el catálogo activo; puedes reactivarla cuando quieras.',
        tone: 'success',
      })
      reload()
    } catch (cause) {
      notify({ title: 'No se pudo cambiar el estado', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await cameraService.remove(deleting.id)
      notify({ title: 'Cámara eliminada', description: deleting.name, tone: 'success' })
      setDeleting(null)
      reload()
    } catch (cause) {
      notify({
        title: 'No se pudo eliminar',
        description: `${toAppError(cause).message} La alternativa segura es archivarla.`,
        tone: 'danger',
      })
      setDeleting(null)
    } finally {
      setDeletingBusy(false)
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setStatus('active')
  }

  const hasFilters = searchInput.length > 0 || status !== 'active'

  return (
    <>
      <PageHeader
        title="Mis cámaras"
        description="LMC, AGC, BSG o cualquier otra modificación de GCam. Son registros de datos: la aplicación no fija nombres ni versiones."
        breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Mis cámaras' }]}
        actions={
          <>
            <Button
              size="sm"
              leadingIcon={<RefreshCw aria-hidden="true" className="size-4" />}
              onClick={reload}
            >
              Actualizar
            </Button>
            <Button
              size="sm"
              leadingIcon={<Upload aria-hidden="true" className="size-4" />}
              onClick={() => setImportOpen(true)}
            >
              Importar
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Plus aria-hidden="true" className="size-4" />}
              onClick={openCreate}
            >
              Nueva cámara
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
          />
          <Input
            type="search"
            value={searchInput}
            placeholder="Buscar por nombre o slug…"
            aria-label="Buscar cámaras"
            className="pl-9"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => setStatus(event.target.value as ActiveFilter)}
            className="w-36"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {hasFilters && (
            <IconButton label="Limpiar búsqueda y filtros" onClick={clearFilters}>
              <X className="size-4" />
            </IconButton>
          )}
        </div>
      </div>

      {loadStatus === 'loading' && cameras.length === 0 && (
        <div className="flex items-center gap-2 px-1 py-6 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando cámaras…</span>
        </div>
      )}

      {loadStatus === 'error' && error && (
        <ErrorState title="No se pudieron cargar las cámaras" description={error.message} onRetry={reload} />
      )}

      {loadStatus === 'success' && cameras.length === 0 && (
        <EmptyState
          icon={CameraIcon}
          title={hasFilters ? 'Ninguna cámara coincide con la búsqueda' : 'Todavía no hay cámaras registradas'}
          description={
            hasFilters
              ? 'Prueba con otro nombre, otro slug o cambia el filtro de estado.'
              : 'Cada cámara agrupa sus propias versiones, y cada versión mantiene un árbol de parámetros independiente.'
          }
          action={
            hasFilters ? (
              <Button onClick={clearFilters}>Limpiar búsqueda</Button>
            ) : (
              <Button variant="primary" onClick={openCreate}>
                Crear la primera cámara
              </Button>
            )
          }
          footnote={
            hasFilters
              ? undefined
              : 'El alta guarda los datos en Supabase con RLS: solo tu cuenta ve este catálogo.'
          }
        />
      )}

      {cameras.length > 0 && (
        <Panel
          title={`${total} ${total === 1 ? 'cámara' : 'cámaras'}`}
          description="Ordenadas por nombre. Los datos se leen en vivo de Supabase."
          action={
            loadStatus === 'loading' ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint" role="status">
                <Spinner className="size-3" />
                Actualizando
              </span>
            ) : undefined
          }
          flush
        >
          <ul className="divide-y divide-line">
            {cameras.map((camera) => (
              <li key={camera.id} className="flex items-start gap-3 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.02]">
                <Link to={`/cameras/${camera.id}`} className="min-w-0 flex-1 rounded-control">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{camera.name}</span>
                    <code className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-faint">
                      {camera.slug}
                    </code>
                    {!camera.isActive && <Badge>Archivada</Badge>}
                  </span>
                  {camera.description && (
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
                      {camera.description}
                    </span>
                  )}
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-disabled">
                    <span>
                      {camera.versionCount} {camera.versionCount === 1 ? 'versión' : 'versiones'}
                    </span>
                    {camera.developer && <span>Desarrollador: {camera.developer}</span>}
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    label={`Exportar ${camera.name}`}
                    disabled={exportingId === camera.id}
                    onClick={() => void exportCamera(camera)}
                  >
                    <Download className="size-4" />
                  </IconButton>
                  <IconButton label={`Editar ${camera.name}`} onClick={() => openEdit(camera)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton
                    label={camera.isActive ? `Archivar ${camera.name}` : `Reactivar ${camera.name}`}
                    onClick={() => void toggleActive(camera)}
                  >
                    {camera.isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
                  </IconButton>
                  <IconButton
                    label={
                      camera.versionCount > 0
                        ? `${camera.name} tiene versiones: solo se puede archivar`
                        : `Eliminar ${camera.name}`
                    }
                    disabled={camera.versionCount > 0}
                    onClick={() => setDeleting(camera)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
          {canLoadMore && (
            <div className="border-t border-line px-5 py-4">
              <Button size="sm" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
                Mostrar más (quedan {total - cameras.length})
              </Button>
            </div>
          )}
        </Panel>
      )}

      <CameraFormDialog
        // La clave remonta el formulario al abrirlo: estado limpio sin efectos.
        key={`camera-form-${formOpen ? 'open' : 'closed'}-${editing?.id ?? 'new'}`}
        open={formOpen}
        camera={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ImportCatalogDialog
        key={`import-${importOpen ? 'open' : 'closed'}`}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(cameraId, counts) => {
          notify({
            title: 'Respaldo importado',
            description: `${counts.versions} versiones, ${counts.nodes} nodos, ${counts.parameters} parámetros, ${counts.configurations} perfiles y ${counts.experiments} experimentos.`,
            tone: 'success',
          })
          reload()
          navigate(`/cameras/${cameraId}`)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar cámara"
        confirmLabel="Eliminar"
        tone="danger"
        loading={deletingBusy}
      >
        Se eliminará permanentemente <strong className="text-ink">{deleting?.name}</strong>. Solo es posible cuando
        no tiene versiones ni datos históricos; si tiene alguno, la base lo impedirá y la alternativa segura es
        archivarla.
      </ConfirmDialog>
    </>
  )
}
