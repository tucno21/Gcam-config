import { useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  Camera as CameraIcon,
  Copy,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { IconButton } from '../../../components/common/IconButton'
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
import { DuplicateCameraDialog } from '../components/DuplicateCameraDialog'
import { ImportCatalogDialog } from '../components/ImportCatalogDialog'

const STATUS_OPTIONS: Array<{ value: ActiveFilter; label: string }> = [
  { value: 'active', label: 'Activas' },
  { value: 'archived', label: 'Archivadas' },
  { value: 'all', label: 'Todas' },
]

const PAGE_SIZE = 25

/** Catálogo principal: cada cámara es una tarjeta que abre sus ajustes. */
export const CamerasPage = () => {
  const { notify } = useToast()

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
  const [duplicating, setDuplicating] = useState<Camera | null>(null)
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
    if (!editing) window.location.assign(`/cameras/${saved.id}`)
  }

  const exportCamera = async (camera: Camera) => {
    setExportingId(camera.id)
    try {
      const backup = await catalogTransferService.exportCamera(camera.id, { includeExperiments: true })
      downloadJson(backupFilename(camera.slug), backup)
      notify({
        title: 'Respaldo exportado',
        description: `${camera.name}. Incluye niveles, parámetros, valores actuales e historial.`,
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
        description="Cada cámara guarda sus propios niveles y parámetros. Abre una tarjeta para ver o cambiar sus ajustes."
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              className="flex-1 sm:flex-none"
              leadingIcon={<RefreshCw aria-hidden="true" className="size-4 max-[359px]:hidden" />}
              onClick={reload}
            >
              Actualizar
            </Button>
            <Button
              size="sm"
              className="flex-1 sm:flex-none"
              leadingIcon={<Upload aria-hidden="true" className="size-4 max-[359px]:hidden" />}
              onClick={() => setImportOpen(true)}
            >
              Importar
            </Button>
            <Button
              variant="primary"
              className="flex-1 sm:flex-none"
              leadingIcon={<Plus aria-hidden="true" className="size-4 max-[359px]:hidden" />}
              onClick={openCreate}
            >
              <span className="sm:hidden">Nueva</span>
              <span className="hidden sm:inline">Nueva cámara</span>
            </Button>
          </div>
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
            <IconButton label="Limpiar búsqueda y filtros" hint="Limpiar filtros" onClick={clearFilters}>
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
              : 'Crea la primera cámara y empieza a cargar sus niveles tal como aparecen en el teléfono.'
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
        <section aria-label="Cámaras">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-faint">
              {total} {total === 1 ? 'cámara' : 'cámaras'} · ordenadas por nombre
            </p>
            {loadStatus === 'loading' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint" role="status">
                <Spinner className="size-3" />
                Actualizando
              </span>
            )}
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cameras.map((camera) => (
              <li
                key={camera.id}
                className="group relative flex flex-col rounded-panel border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong hover:bg-surface-raised/60"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-line bg-surface-sunken text-accent">
                    <CameraIcon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        to={`/cameras/${camera.id}`}
                        className="min-w-0 truncate rounded-sm text-sm font-medium text-ink transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {camera.name}
                      </Link>
                      {!camera.isActive && <Badge tone="warning">Archivada</Badge>}
                    </div>
                    <code className="mt-1 block truncate font-mono text-[11px] text-ink-faint">{camera.slug}</code>
                  </div>

                  <ArrowUpRight
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-ink-disabled transition-colors group-hover:text-accent"
                  />
                </div>

                <p className="mt-3 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-ink-muted">
                  {camera.description || 'Sin descripción.'}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ink-disabled">
                    {camera.developer ? `Desarrollador: ${camera.developer}` : ''}
                  </span>

                  <div className="relative z-10 flex shrink-0 items-center gap-0.5">
                    <IconButton
                      size="sm"
                      label={`Duplicar ${camera.name}`}
                      hint="Duplicar cámara"
                      onClick={() => setDuplicating(camera)}
                    >
                      <Copy aria-hidden="true" className="size-4" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      label={`Exportar ${camera.name}`}
                      hint="Exportar respaldo"
                      disabled={exportingId === camera.id}
                      onClick={() => void exportCamera(camera)}
                    >
                      <Download aria-hidden="true" className="size-4" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      label={`Editar ${camera.name}`}
                      hint="Editar datos"
                      onClick={() => openEdit(camera)}
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      label={camera.isActive ? `Archivar ${camera.name}` : `Reactivar ${camera.name}`}
                      hint={camera.isActive ? 'Archivar cámara' : 'Reactivar cámara'}
                      onClick={() => void toggleActive(camera)}
                    >
                      {camera.isActive ? (
                        <Archive aria-hidden="true" className="size-4" />
                      ) : (
                        <ArchiveRestore aria-hidden="true" className="size-4" />
                      )}
                    </IconButton>
                    <IconButton
                      size="sm"
                      tone="danger"
                      label={`Eliminar ${camera.name}`}
                      hint="Eliminar cámara"
                      onClick={() => setDeleting(camera)}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {canLoadMore && (
            <div className="mt-4">
              <Button size="sm" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
                Mostrar más (quedan {total - cameras.length})
              </Button>
            </div>
          )}
        </section>
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
            description: `${counts.nodes} niveles y ${counts.parameters} parámetros importados.`,
            tone: 'success',
          })
          reload()
          window.location.assign(`/cameras/${cameraId}`)
        }}
      />

      {duplicating && (
        <DuplicateCameraDialog
          key={`duplicate-camera-${duplicating.id}`}
          open
          camera={duplicating}
          onClose={() => setDuplicating(null)}
          onDuplicated={(created) => {
            notify({
              title: 'Cámara duplicada',
              description: `${created.name}: niveles, parámetros y valores copiados.`,
              tone: 'success',
            })
            setDuplicating(null)
            reload()
            // Recarga completa: evita arrastrar peticiones en vuelo del diálogo.
            window.location.assign(`/cameras/${created.id}`)
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar cámara"
        confirmLabel="Eliminar"
        tone="danger"
        loading={deletingBusy}
      >
        Se eliminará permanentemente <strong className="text-ink">{deleting?.name}</strong> con todos sus niveles,
        parámetros, valores e historial. Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  )
}

