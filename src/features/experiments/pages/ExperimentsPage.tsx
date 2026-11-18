import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FlaskConical, Plus } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { Panel } from '../../../components/common/Panel'
import { Select } from '../../../components/forms/Select'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { AppError, toAppError } from '../../../lib/errors/AppError'
import { formatDate } from '../../../lib/helpers/formatDate'
import { configurationService } from '../../../services/configurationService'
import { experimentService } from '../../../services/experimentService'
import { historyService } from '../../../services/historyService'
import { nodeService } from '../../../services/nodeService'
import { parameterService } from '../../../services/parameterService'
import type { Experiment, ExperimentStatus, Parameter, ParameterChange } from '../../../services/types'
import { VersionSection } from '../../versions/components/VersionSection'
import { buildTreeIndex } from '../../hierarchy/treeUtils'
import { formatParameterValue } from '../../parameters/valueFormat'
import { ExperimentChangeDialog } from '../components/ExperimentChangeDialog'
import { ExperimentDetail } from '../components/ExperimentDetail'
import { ExperimentFormDialog } from '../components/ExperimentFormDialog'
import { EXPERIMENT_STATUS_LABEL } from '../validation'

/** Laboratorio de experimentos: CRUD, cambios, comparación y estadísticas. */
export const ExperimentsPage = () => {
  const { cameraId, versionId } = useParams()
  useWorkspaceSelection(cameraId, versionId)
  const { notify } = useToast()

  const experimentsQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return experimentService.listByVersion(versionId, { limit: 100 })
  }, `experiments|${versionId}`)

  const profilesQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return configurationService.listByVersion(versionId, { active: 'all', limit: 100 })
  }, `profiles|${versionId}`)

  const parametersQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return parameterService.listByVersion(versionId)
  }, `parameters|${versionId}`)

  const treeQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return nodeService.listByVersion(versionId)
  }, `tree|${versionId}`)

  const allChangesQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return historyService.listAllByVersion(versionId)
  }, `history-all|${versionId}`)

  const experiments = experimentsQuery.status === 'success' ? (experimentsQuery.data?.items ?? []) : []
  const profiles = profilesQuery.status === 'success' ? (profilesQuery.data?.items ?? []) : []
  const parameters = parametersQuery.status === 'success' ? (parametersQuery.data ?? []) : []
  const index = useMemo(() => buildTreeIndex(treeQuery.data?.items ?? []), [treeQuery.data])
  const parameterById = useMemo(
    () => new Map<string, Parameter>((parametersQuery.data ?? []).map((parameter) => [parameter.id, parameter])),
    [parametersQuery.data],
  )
  const experimentById = useMemo(
    () => new Map<string, Experiment>((experimentsQuery.data?.items ?? []).map((experiment) => [experiment.id, experiment])),
    [experimentsQuery.data],
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = experiments.find((item) => item.id === selectedId) ?? experiments[0] ?? null

  const changesQuery = useAsyncData(
    () => (selected ? historyService.listByExperiment(selected.id) : Promise.resolve([])),
    `experiment-changes|${selected?.id ?? 'none'}`,
  )
  const changes = changesQuery.status === 'success' ? (changesQuery.data ?? []) : []

  const valuesQuery = useAsyncData(
    () => (selected ? configurationService.listValues(selected.configurationId) : Promise.resolve([])),
    `experiment-values|${selected?.configurationId ?? 'none'}`,
  )
  const values = valuesQuery.status === 'success' ? (valuesQuery.data ?? []) : []

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Experiment | null>(null)
  const [changeOpen, setChangeOpen] = useState(false)
  const [duplicating, setDuplicating] = useState<Experiment | null>(null)
  const [duplicateBusy, setDuplicateBusy] = useState(false)
  const [deleting, setDeleting] = useState<Experiment | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')

  const reloadAll = () => {
    experimentsQuery.reload()
    changesQuery.reload()
    valuesQuery.reload()
    allChangesQuery.reload()
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (experiment: Experiment) => {
    setEditing(experiment)
    setFormOpen(true)
  }

  const handleSaved = (experiment: Experiment, mode: 'create' | 'edit') => {
    notify({
      title: mode === 'create' ? 'Experimento creado' : 'Experimento actualizado',
      description: experiment.title,
      tone: 'success',
    })
    setSelectedId(experiment.id)
    reloadAll()
  }

  const changeStatus = async (experiment: Experiment, status: ExperimentStatus) => {
    setStatusBusy(true)
    try {
      await experimentService.setStatus(experiment.id, status)
      notify({ title: 'Resultado marcado', description: EXPERIMENT_STATUS_LABEL[status], tone: 'success' })
      reloadAll()
    } catch (cause) {
      notify({ title: 'No se pudo cambiar el estado', description: toAppError(cause).message, tone: 'danger' })
    } finally {
      setStatusBusy(false)
    }
  }

  const confirmDuplicate = async () => {
    if (!duplicating) return
    setDuplicateBusy(true)
    try {
      const copy = await experimentService.duplicate(duplicating.id)
      notify({
        title: 'Experimento duplicado',
        description: `${copy.title}. Se copiaron título, objetivo e hipótesis; los cambios no se replican.`,
        tone: 'success',
      })
      setSelectedId(copy.id)
      setDuplicating(null)
      reloadAll()
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
      await experimentService.remove(deleting.id)
      notify({ title: 'Experimento eliminado', description: deleting.title, tone: 'success' })
      if (selectedId === deleting.id) setSelectedId(null)
      setDeleting(null)
      reloadAll()
    } catch (cause) {
      notify({
        title: 'No se pudo eliminar',
        description: `${toAppError(cause).message} Tiene historial inmutable: consérvalo como documentación.`,
        tone: 'danger',
      })
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  // ── Estadísticas y comparación ─────────────────────────────────────────
  const stats = useMemo(() => {
    const counts = new Map<string, number>()
    for (const change of allChangesQuery.data ?? []) {
      counts.set(change.parameterId, (counts.get(change.parameterId) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([parameterId, count]) => ({ parameterId, count, name: parameterById.get(parameterId)?.name ?? 'Parámetro' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [allChangesQuery.data, parameterById])

  const comparison = useMemo(() => {
    if (!compareA || !compareB) return null
    const all = allChangesQuery.data ?? []
    const changesOf = (experimentId: string) => all.filter((change) => change.experimentId === experimentId)
    const a = changesOf(compareA)
    const b = changesOf(compareB)
    const parameterIds = new Set([...a, ...b].map((change) => change.parameterId))

    const lastByParameter = (list: ParameterChange[]) => {
      const map = new Map<string, ParameterChange>()
      for (const change of [...list].sort((x, y) => x.createdAt.localeCompare(y.createdAt))) {
        map.set(change.parameterId, change)
      }
      return map
    }
    const lastA = lastByParameter(a)
    const lastB = lastByParameter(b)

    return [...parameterIds].map((parameterId) => ({
      parameterId,
      name: parameterById.get(parameterId)?.name ?? 'Parámetro',
      a: lastA.get(parameterId),
      b: lastB.get(parameterId),
    }))
  }, [compareA, compareB, allChangesQuery.data, parameterById])

  const loading = experimentsQuery.status === 'loading' && experiments.length === 0
  const error = experimentsQuery.status === 'error' ? experimentsQuery.error : null

  const experimentForChange = selected
    ? profiles.find((profile) => profile.id === selected.configurationId) ?? null
    : null

  return (
    <VersionSection
      title="Experimentos"
      description="Documenta las pruebas hechas a mano en el teléfono: cambios con valor anterior y nuevo, ruta histórica y resultado."
      actions={
        experiments.length > 0 ? (
          <Button size="sm" leadingIcon={<Plus aria-hidden="true" className="size-4" />} onClick={openCreate}>
            Nuevo experimento
          </Button>
        ) : undefined
      }
    >
      {loading && (
        <div className="flex items-center gap-2 px-1 py-4 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando experimentos…</span>
        </div>
      )}

      {error && <ErrorState title="No se pudieron cargar los experimentos" description={error.message} onRetry={experimentsQuery.reload} />}

      {experimentsQuery.status === 'success' && experiments.length === 0 && (
        <EmptyState
          icon={FlaskConical}
          title="Todavía no hay experimentos en esta versión"
          description="Crea un experimento para documentar una prueba: qué cambiaste, desde qué valor, a qué valor y qué observaste. El historial es append-only."
          action={
            <Button variant="primary" onClick={openCreate} disabled={profiles.length === 0}>
              Crear el primer experimento
            </Button>
          }
          footnote={
            profiles.length === 0
              ? 'Necesitas al menos un perfil de configuración (Configuraciones) antes de registrar un experimento.'
              : 'Los cambios se guardan con una instantánea de la ruta: renombrar nodos después no la altera.'
          }
        />
      )}

      {experiments.length > 0 && (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
            <Panel title={`${experiments.length} ${experiments.length === 1 ? 'experimento' : 'experimentos'}`} flush>
              <ul className="divide-y divide-line">
                {experiments.map((experiment) => {
                  const isSelected = selected?.id === experiment.id
                  return (
                    <li key={experiment.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(experiment.id)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`w-full px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                          isSelected ? 'bg-accent/[0.07]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[13px] ${isSelected ? 'font-medium text-ink' : 'text-ink-muted'}`}>
                            {experiment.title}
                          </span>
                          <Badge>{EXPERIMENT_STATUS_LABEL[experiment.status]}</Badge>
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ink-disabled">
                          {experiment.configurationName} · {experiment.changeCount}{' '}
                          {experiment.changeCount === 1 ? 'cambio' : 'cambios'} · {formatDate(experiment.createdAt)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Panel>

            {selected && experimentForChange ? (
              <ExperimentDetail
                experiment={selected}
                changes={changes}
                parameterById={parameterById}
                busy={statusBusy}
                onAddChange={() => setChangeOpen(true)}
                onEdit={() => openEdit(selected)}
                onDuplicate={() => setDuplicating(selected)}
                onDelete={() => setDeleting(selected)}
                onStatusChange={(status) => void changeStatus(selected, status)}
              />
            ) : (
              <Panel title="Experimento" description="Selecciona un experimento para ver su cronología.">
                <p className="text-[13px] leading-relaxed text-ink-muted">
                  El perfil del experimento no está disponible (puede haberse eliminado). Los cambios históricos se
                  conservan.
                </p>
              </Panel>
            )}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Parámetros más modificados" description="Cuenta todos los cambios de la versión.">
              {stats.length === 0 ? (
                <p className="text-[13px] leading-relaxed text-ink-muted">Todavía no hay cambios registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {stats.map((stat) => (
                    <li key={stat.parameterId} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">{stat.name}</span>
                      <span className="h-1.5 w-24 overflow-hidden rounded bg-surface-sunken">
                        <span
                          className="block h-full rounded bg-accent/70"
                          style={{ width: `${Math.max(12, (stat.count / stats[0].count) * 100)}%` }}
                        />
                      </span>
                      <span className="w-8 text-right font-mono text-[11px] text-ink-faint">{stat.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Comparar experimentos"
              description="Último valor registrado por parámetro en cada prueba."
              action={
                <Button size="sm" onClick={() => setCompareOpen((previous) => !previous)}>
                  {compareOpen ? 'Ocultar' : 'Comparar'}
                </Button>
              }
            >
              {compareOpen ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select aria-label="Experimento A" value={compareA} onChange={(event) => setCompareA(event.target.value)}>
                      <option value="">Experimento A…</option>
                      {experiments.map((experiment) => (
                        <option key={experiment.id} value={experiment.id}>
                          {experiment.title}
                        </option>
                      ))}
                    </Select>
                    <Select aria-label="Experimento B" value={compareB} onChange={(event) => setCompareB(event.target.value)}>
                      <option value="">Experimento B…</option>
                      {experiments.map((experiment) => (
                        <option key={experiment.id} value={experiment.id}>
                          {experiment.title}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {!comparison ? (
                    <p className="mt-3 text-xs text-ink-faint">Elige dos experimentos para comparar sus cambios.</p>
                  ) : comparison.length === 0 ? (
                    <p className="mt-3 text-xs text-ink-faint">Ninguno de los dos tiene cambios registrados.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-line">
                      {comparison.map((row) => {
                        const parameter = parameterById.get(row.parameterId)
                        const format = (change: ParameterChange | undefined) => {
                          if (!change) return '—'
                          if (!parameter) return '—'
                          return `${formatParameterValue(parameter, change.previousValue)} → ${formatParameterValue(
                            parameter,
                            change.newValue,
                          )}`
                        }
                        return (
                          <li key={row.parameterId} className="py-2">
                            <p className="text-[12px] font-medium text-ink">{row.name}</p>
                            <div className="mt-1 grid gap-1 sm:grid-cols-2">
                              <p className="text-[11px] text-ink-faint">
                                {experimentById.get(compareA)?.title ?? 'A'}: <span className="text-ink-muted">{format(row.a)}</span>
                              </p>
                              <p className="text-[11px] text-ink-faint">
                                {experimentById.get(compareB)?.title ?? 'B'}: <span className="text-ink-muted">{format(row.b)}</span>
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-ink-muted">
                  Compara dos pruebas de la misma versión y revisa en qué valores difieren sus cambios.
                </p>
              )}
            </Panel>
          </div>
        </>
      )}

      <ExperimentFormDialog
        key={`experiment-form-${formOpen ? 'open' : 'closed'}-${editing?.id ?? 'new'}`}
        open={formOpen}
        profiles={profiles}
        experiment={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      {selected && experimentForChange && (
        <ExperimentChangeDialog
          key={`experiment-change-${changeOpen ? 'open' : 'closed'}-${selected.id}`}
          open={changeOpen}
          experiment={selected}
          configuration={experimentForChange}
          parameters={parameters}
          values={values}
          index={index}
          onClose={() => setChangeOpen(false)}
          onSaved={({ applied }) => {
            notify({
              title: 'Cambio registrado',
              description: applied
                ? 'Se aplicó al perfil y quedó en el historial.'
                : 'Solo se registró como historial: el perfil no cambió.',
              tone: 'success',
            })
            reloadAll()
          }}
        />
      )}

      <ConfirmDialog
        open={duplicating !== null}
        onClose={() => setDuplicating(null)}
        onConfirm={() => void confirmDuplicate()}
        title="Duplicar experimento"
        confirmLabel="Duplicar"
        loading={duplicateBusy}
      >
        Se creará «{duplicating?.title} (copia)» con el mismo perfil, objetivo e hipótesis, en estado planificado. No se
        copian cambios ni resultados: el historial pertenece al experimento original.
      </ConfirmDialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar experimento"
        confirmLabel="Eliminar"
        tone="danger"
        loading={deleteBusy}
      >
        Se eliminará <strong className="text-ink">{deleting?.title}</strong>. Si ya tiene cambios registrados, la base
        lo impedirá: el historial es inmutable y debe conservarse.
      </ConfirmDialog>
    </VersionSection>
  )
}
