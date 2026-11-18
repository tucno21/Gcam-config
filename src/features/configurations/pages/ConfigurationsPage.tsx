import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, Copy, Download, Layers, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { IconButton } from '../../../components/common/IconButton'
import { Panel } from '../../../components/common/Panel'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { useWorkspaceStore } from '../../../stores/useWorkspaceStore'
import { AppError, toAppError } from '../../../lib/errors/AppError'
import { backupFilename, downloadJson } from '../../../lib/helpers/downloadJson'
import { slugify } from '../../../lib/helpers/slugify'
import { configurationService } from '../../../services/configurationService'
import { catalogTransferService } from '../../../services/catalogTransferService'
import { nodeService } from '../../../services/nodeService'
import { parameterService } from '../../../services/parameterService'
import type { Configuration } from '../../../services/types'
import { VersionSection } from '../../versions/components/VersionSection'
import { ConfigurationFormDialog } from '../components/ConfigurationFormDialog'
import { ConfigurationValuesPanel } from '../components/ConfigurationValuesPanel'

/** Perfiles de configuración de una versión (Etapa 9). */
export const ConfigurationsPage = () => {
  const { cameraId, versionId } = useParams()
  useWorkspaceSelection(cameraId, versionId)
  const { notify } = useToast()
  const { selectedConfigurationId, selectConfiguration } = useWorkspaceStore()

  const profilesQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return configurationService.listByVersion(versionId, { active: 'all', limit: 100 })
  }, `profiles|${versionId}`)

  const parametersQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return parameterService.listByVersion(versionId)
  }, `parameters|${versionId}`)

  const nodesQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return nodeService.listByVersion(versionId)
  }, `tree|${versionId}`)

  const profiles = profilesQuery.status === 'success' ? (profilesQuery.data?.items ?? []) : []
  const parameters = parametersQuery.status === 'success' ? (parametersQuery.data ?? []) : []
  const nodeNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const node of nodesQuery.data?.items ?? []) map.set(node.id, node.name)
    return map
  }, [nodesQuery.data])

  // Perfil visible: el elegido, o el predeterminado, o el primero.
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedConfigurationId) ??
    profiles.find((profile) => profile.isDefault) ??
    profiles[0] ??
    null

  const valuesQuery = useAsyncData(
    () => (selectedProfile ? configurationService.listValues(selectedProfile.id) : Promise.resolve([])),
    `values|${selectedProfile?.id ?? 'none'}`,
  )
  const values = valuesQuery.status === 'success' ? (valuesQuery.data ?? []) : []

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Configuration | null>(null)
  const [duplicating, setDuplicating] = useState<Configuration | null>(null)
  const [duplicateBusy, setDuplicateBusy] = useState(false)
  const [deleting, setDeleting] = useState<Configuration | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (profile: Configuration) => {
    setEditing(profile)
    setFormOpen(true)
  }

  const handleSaved = (profile: Configuration, mode: 'create' | 'edit') => {
    notify({
      title: mode === 'create' ? 'Perfil creado' : 'Perfil actualizado',
      description: profile.name,
      tone: 'success',
    })
    selectConfiguration(profile.id)
    profilesQuery.reload()
  }

  const setDefault = async (profile: Configuration) => {
    try {
      if (!versionId) return
      await configurationService.setDefault(versionId, profile.id)
      notify({ title: 'Perfil predeterminado', description: profile.name, tone: 'success' })
      profilesQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo marcar como predeterminado', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const exportProfile = async (profile: Configuration) => {
    try {
      const backup = await catalogTransferService.exportConfiguration(profile.id)
      downloadJson(backupFilename(backup.context.cameraSlug, `-${slugify(profile.name)}`), backup)
      notify({
        title: 'Perfil exportado',
        description: `${profile.name} con ${profile.valueCount} ${profile.valueCount === 1 ? 'valor' : 'valores'} y las definiciones usadas.`,
        tone: 'success',
      })
    } catch (cause) {
      notify({ title: 'No se pudo exportar', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const toggleActive = async (profile: Configuration) => {
    try {
      const updated = await configurationService.setActive(profile.id, !profile.isActive)
      notify({
        title: updated.isActive ? 'Perfil reactivado' : 'Perfil archivado',
        description: updated.isActive ? 'Vuelve a estar disponible.' : 'Se conserva con todos sus valores.',
        tone: 'success',
      })
      profilesQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo cambiar el estado', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const confirmDuplicate = async () => {
    if (!duplicating) return
    setDuplicateBusy(true)
    try {
      const copy = await configurationService.duplicate(duplicating.id)
      notify({
        title: 'Perfil duplicado',
        description: `${copy.name} con ${copy.valueCount} ${copy.valueCount === 1 ? 'valor' : 'valores'} personalizados.`,
        tone: 'success',
      })
      selectConfiguration(copy.id)
      setDuplicating(null)
      profilesQuery.reload()
      valuesQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo duplicar', description: toAppError(cause).message, tone: 'danger' })
    } finally {
      setDuplicateBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await configurationService.remove(deleting.id)
      notify({ title: 'Perfil eliminado', description: deleting.name, tone: 'success' })
      if (selectedConfigurationId === deleting.id) selectConfiguration(null)
      setDeleting(null)
      profilesQuery.reload()
    } catch (cause) {
      notify({
        title: 'No se pudo eliminar',
        description: `${toAppError(cause).message} La alternativa segura es archivarlo.`,
        tone: 'danger',
      })
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  const loading = profilesQuery.status === 'loading'
  const error = profilesQuery.status === 'error' ? profilesQuery.error : null

  return (
    <VersionSection
      title="Configuraciones"
      description="Perfiles independientes por versión, con el valor actual de cada parámetro frente a su valor predeterminado."
      actions={
        profiles.length > 0 ? (
          <Button size="sm" leadingIcon={<Plus aria-hidden="true" className="size-4" />} onClick={openCreate}>
            Nuevo perfil
          </Button>
        ) : undefined
      }
    >
      {loading && profiles.length === 0 && (
        <div className="flex items-center gap-2 px-1 py-4 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando perfiles…</span>
        </div>
      )}

      {error && <ErrorState title="No se pudieron cargar los perfiles" description={error.message} onRetry={profilesQuery.reload} />}

      {profilesQuery.status === 'success' && profiles.length === 0 && (
        <EmptyState
          icon={Layers}
          title="Esta versión todavía no tiene perfiles"
          description="Un perfil guarda valores concretos de los parámetros sin modificar el valor predeterminado del catálogo. Puedes tener varios y cambiar entre ellos."
          action={
            <Button variant="primary" onClick={openCreate}>
              Crear el primer perfil
            </Button>
          }
          footnote="Los parámetros sin valor personalizado se muestran como «sin valor personalizado»; no se materializa el predeterminado."
        />
      )}

      {profiles.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]">
          <Panel title={`${profiles.length} ${profiles.length === 1 ? 'perfil' : 'perfiles'}`} flush>
            <ul className="divide-y divide-line">
              {profiles.map((profile) => {
                const isSelected = selectedProfile?.id === profile.id
                return (
                  <li key={profile.id}>
                    <div
                      className={`flex items-start gap-2 px-4 py-3 transition-colors ${
                        isSelected ? 'bg-accent/[0.07]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectConfiguration(profile.id)}
                        aria-current={isSelected ? 'true' : undefined}
                        className="min-w-0 flex-1 rounded-control text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[13px] ${isSelected ? 'font-medium text-ink' : 'text-ink-muted'}`}>
                            {profile.name}
                          </span>
                          {profile.isDefault && <Badge tone="accent">Predeterminado</Badge>}
                          {!profile.isActive && <Badge>Archivado</Badge>}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ink-disabled">
                          {profile.valueCount} {profile.valueCount === 1 ? 'valor personalizado' : 'valores personalizados'}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {!profile.isDefault && (
                          <IconButton
                            size="sm"
                            label={`Marcar ${profile.name} como predeterminado`}
                            onClick={() => void setDefault(profile)}
                          >
                            <Star aria-hidden="true" className="size-3.5" />
                          </IconButton>
                        )}
                        <IconButton
                          size="sm"
                          label={`Exportar ${profile.name}`}
                          onClick={() => void exportProfile(profile)}
                        >
                          <Download aria-hidden="true" className="size-3.5" />
                        </IconButton>
                        <IconButton size="sm" label={`Editar ${profile.name}`} onClick={() => openEdit(profile)}>
                          <Pencil aria-hidden="true" className="size-3.5" />
                        </IconButton>
                        <IconButton size="sm" label={`Duplicar ${profile.name}`} onClick={() => setDuplicating(profile)}>
                          <Copy aria-hidden="true" className="size-3.5" />
                        </IconButton>
                        <IconButton
                          size="sm"
                          label={profile.isActive ? `Archivar ${profile.name}` : `Reactivar ${profile.name}`}
                          onClick={() => void toggleActive(profile)}
                        >
                          {profile.isActive ? (
                            <Archive aria-hidden="true" className="size-3.5" />
                          ) : (
                            <ArchiveRestore aria-hidden="true" className="size-3.5" />
                          )}
                        </IconButton>
                        <IconButton size="sm" label={`Eliminar ${profile.name}`} onClick={() => setDeleting(profile)}>
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </IconButton>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>

          {selectedProfile && (
            <ConfigurationValuesPanel
              configuration={selectedProfile}
              parameters={parameters}
              values={values}
              nodeNames={nodeNames}
              loadingValues={valuesQuery.status === 'loading'}
              onChanged={() => {
                valuesQuery.reload()
                profilesQuery.reload()
              }}
            />
          )}
        </div>
      )}

      <ConfigurationFormDialog
        key={`profile-form-${formOpen ? 'open' : 'closed'}-${editing?.id ?? 'new'}`}
        open={formOpen}
        versionId={versionId ?? ''}
        configuration={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={duplicating !== null}
        onClose={() => setDuplicating(null)}
        onConfirm={() => void confirmDuplicate()}
        title="Duplicar perfil"
        confirmLabel="Duplicar"
        loading={duplicateBusy}
      >
        Se creará «{duplicating?.name} (copia)» con los mismos valores personalizados. No se copian experimentos ni
        historial: esos pertenecen al perfil original.
      </ConfirmDialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar perfil"
        confirmLabel="Eliminar"
        tone="danger"
        loading={deleteBusy}
      >
        Se eliminará el perfil <strong className="text-ink">{deleting?.name}</strong> y todos sus valores
        personalizados. Si tiene experimentos registrados, la base lo impedirá y lo correcto será archivarlo.
      </ConfirmDialog>
    </VersionSection>
  )
}
