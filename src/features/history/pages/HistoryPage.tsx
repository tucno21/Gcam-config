import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { History, Search } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { Panel } from '../../../components/common/Panel'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { AppError } from '../../../lib/errors/AppError'
import { formatDateTime } from '../../../lib/helpers/formatDate'
import { experimentService } from '../../../services/experimentService'
import { historyService } from '../../../services/historyService'
import { parameterService } from '../../../services/parameterService'
import type { Experiment, Parameter } from '../../../services/types'
import { VersionSection } from '../../versions/components/VersionSection'
import { formatParameterValue } from '../../parameters/valueFormat'

type AppliedFilter = 'all' | 'applied' | 'history'

/** Cronología de todos los cambios de la versión (historial inmutable). */
export const HistoryPage = () => {
  const { cameraId, versionId } = useParams()
  useWorkspaceSelection(cameraId, versionId)

  const changesQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return historyService.listAllByVersion(versionId)
  }, `history-all|${versionId}`)

  const parametersQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return parameterService.listByVersion(versionId)
  }, `parameters|${versionId}`)

  const experimentsQuery = useAsyncData(() => {
    if (!versionId) throw new AppError('not_found', 'No se indicó la versión.')
    return experimentService.listByVersion(versionId, { limit: 100 })
  }, `experiments|${versionId}`)

  const changes = changesQuery.status === 'success' ? (changesQuery.data ?? []) : []
  const experiments = experimentsQuery.status === 'success' ? (experimentsQuery.data?.items ?? []) : []

  const parameterById = useMemo(
    () => new Map<string, Parameter>((parametersQuery.data ?? []).map((parameter) => [parameter.id, parameter])),
    [parametersQuery.data],
  )
  const experimentById = useMemo(
    () => new Map<string, Experiment>((experimentsQuery.data?.items ?? []).map((experiment) => [experiment.id, experiment])),
    [experimentsQuery.data],
  )

  const [search, setSearch] = useState('')
  const [experimentFilter, setExperimentFilter] = useState('')
  const [appliedFilter, setAppliedFilter] = useState<AppliedFilter>('all')

  const filtered = changes.filter((change) => {
    if (experimentFilter && change.experimentId !== experimentFilter) return false
    if (appliedFilter === 'applied' && !change.appliedToProfile) return false
    if (appliedFilter === 'history' && change.appliedToProfile) return false
    if (search.trim()) {
      const parameter = parameterById.get(change.parameterId)
      const haystack = `${parameter?.name ?? ''} ${parameter?.key ?? ''} ${(change.pathSnapshot ?? []).join(' ')}`.toLowerCase()
      if (!haystack.includes(search.trim().toLowerCase())) return false
    }
    return true
  })

  const loading = changesQuery.status === 'loading' && changes.length === 0
  const error = changesQuery.status === 'error' ? changesQuery.error : null

  return (
    <VersionSection
      title="Historial"
      description="Registro append-only de cada cambio documentado: valor anterior, valor nuevo, ruta congelada y experimento asociado."
    >
      {loading && (
        <div className="flex items-center gap-2 px-1 py-4 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando historial…</span>
        </div>
      )}

      {error && <ErrorState title="No se pudo cargar el historial" description={error.message} onRetry={changesQuery.reload} />}

      {changesQuery.status === 'success' && changes.length === 0 && (
        <EmptyState
          icon={History}
          title="Todavía no hay cambios registrados"
          description="Cada cambio que documentes en un experimento aparecerá aquí con su valor anterior, el nuevo y la ruta jerárquica del momento."
          footnote="El historial es inmutable: no se edita ni se borra desde la aplicación."
        />
      )}

      {changes.length > 0 && (
        <Panel
          title={`${changes.length} ${changes.length === 1 ? 'cambio' : 'cambios'}`}
          description="Del más reciente al más antiguo."
          action={
            <span className="inline-flex items-center gap-2">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-disabled"
                />
                <Input
                  type="search"
                  value={search}
                  placeholder="Buscar por parámetro o ruta…"
                  aria-label="Buscar en el historial"
                  className="h-9 w-52 pl-8 text-[13px]"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                aria-label="Filtrar por experimento"
                value={experimentFilter}
                onChange={(event) => setExperimentFilter(event.target.value)}
                className="h-9 w-44"
              >
                <option value="">Todos los experimentos</option>
                {experiments.map((experiment) => (
                  <option key={experiment.id} value={experiment.id}>
                    {experiment.title}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Filtrar por aplicación"
                value={appliedFilter}
                onChange={(event) => setAppliedFilter(event.target.value as AppliedFilter)}
                className="h-9 w-44"
              >
                <option value="all">Todos</option>
                <option value="applied">Aplicados al perfil</option>
                <option value="history">Solo historial</option>
              </Select>
            </span>
          }
          flush
        >
          {filtered.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted">Ningún cambio coincide con los filtros.</p>
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((change) => {
                const parameter = parameterById.get(change.parameterId)
                const experiment = experimentById.get(change.experimentId)
                return (
                  <li key={change.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-ink">{parameter?.name ?? 'Parámetro eliminado'}</span>
                        {change.appliedToProfile ? (
                          <Badge tone="accent">Aplicado al perfil</Badge>
                        ) : (
                          <Badge>Solo historial</Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-ink-disabled">{formatDateTime(change.createdAt)}</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
                      {change.pathSnapshot?.join(' › ') ?? 'Ruta no registrada'}
                    </p>
                    <p className="mt-1.5 text-[12px] text-ink-muted">
                      <span className="text-ink-faint">
                        {parameter ? formatParameterValue(parameter, change.previousValue) : String(change.previousValue)}
                      </span>
                      <span className="mx-1.5 text-ink-disabled">→</span>
                      <span className="text-ink">
                        {parameter ? formatParameterValue(parameter, change.newValue) : String(change.newValue)}
                      </span>
                      {experiment && <span className="ml-2 text-ink-disabled">en «{experiment.title}»</span>}
                    </p>
                    {(change.reason || change.observation) && (
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                        {change.reason && <>Motivo: {change.reason}. </>}
                        {change.observation && <>Observación: {change.observation}</>}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}
    </VersionSection>
  )
}
