import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { GitCompare } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { Panel } from '../../../components/common/Panel'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { Select } from '../../../components/forms/Select'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { AppError } from '../../../lib/errors/AppError'
import { nodeService } from '../../../services/nodeService'
import { parameterService } from '../../../services/parameterService'
import { versionService } from '../../../services/versionService'
import type { CurrentValueSource, DataType } from '../../../services/types'
import { VersionSection } from '../../versions/components/VersionSection'
import { compareVersions } from '../compare'
import type { CompareItem } from '../compare'

const formatValue = (
  dataType: DataType | null,
  unit: string | null,
  value: unknown,
  source: CurrentValueSource | null,
): string => {
  if (source === 'default') return 'Default (From Library)'
  if (source === 'unknown' || value === null || value === undefined) return 'Sin valor'
  if (dataType === 'boolean') return value === true ? 'Sí' : 'No'
  if (dataType === 'json') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  const base = String(value)
  return unit ? `${base} ${unit}` : base
}

const KIND_LABEL: Record<CompareItem['kind'], string> = {
  'level-added': 'Nivel nuevo',
  'level-removed': 'Nivel que ya no está',
  'level-renamed': 'Nivel renombrado',
  'level-moved': 'Nivel movido',
  'parameter-added': 'Parámetro nuevo',
  'parameter-removed': 'Parámetro que ya no está',
  'parameter-renamed': 'Parámetro renombrado',
  'parameter-moved': 'Parámetro movido',
  'parameter-changed': 'Valor cambiado',
}

const kindTone = (kind: CompareItem['kind']): 'accent' | 'warning' | undefined => {
  if (kind.endsWith('added')) return 'accent'
  if (kind.endsWith('removed')) return 'warning'
  return undefined
}

/** Compara dos versiones por linaje: nuevo, retirado, renombrado, movido o cambiado. */
export const ComparePage = () => {
  const { cameraId, versionId } = useParams()

  const versionsQuery = useAsyncData(async () => {
    if (!cameraId) throw new AppError('not_found', 'No se indicó la cámara.')
    const page = await versionService.listByCamera(cameraId, { limit: 100, active: 'all' })
    return page.items
  }, `versions|${cameraId}`)

  const versions = versionsQuery.data ?? []

  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')

  // Por defecto compara la anterior con la versión abierta (o la más reciente).
  const effectiveTo = toId || versionId || versions[0]?.id || ''
  const effectiveFrom =
    fromId ||
    versions.find((candidate) => candidate.id !== effectiveTo && candidate.nodeCount > 0)?.id ||
    versions.find((candidate) => candidate.id !== effectiveTo)?.id ||
    ''

  const compareQuery = useAsyncData(async () => {
    if (!effectiveFrom || !effectiveTo || effectiveFrom === effectiveTo) return null
    const [fromNodes, fromParameters, toNodes, toParameters] = await Promise.all([
      nodeService.listByVersion(effectiveFrom),
      parameterService.listByVersion(effectiveFrom),
      nodeService.listByVersion(effectiveTo),
      parameterService.listByVersion(effectiveTo),
    ])

    return compareVersions(
      { nodes: fromNodes.items, parameters: fromParameters },
      { nodes: toNodes.items, parameters: toParameters },
    )
  }, `compare|${effectiveFrom}|${effectiveTo}`)

  const fromLabel = versions.find((candidate) => candidate.id === effectiveFrom)?.version ?? '—'
  const toLabel = versions.find((candidate) => candidate.id === effectiveTo)?.version ?? '—'

  const levels = useMemo(
    () => (compareQuery.data?.items ?? []).filter((item) => item.scope === 'level'),
    [compareQuery.data],
  )
  const parameters = useMemo(
    () => (compareQuery.data?.items ?? []).filter((item) => item.scope === 'parameter'),
    [compareQuery.data],
  )

  return (
    <VersionSection
      title="Comparar versiones"
      description="Qué niveles y parámetros se añadieron, se retiraron o cambiaron entre dos versiones de la misma cámara."
    >
      {versionsQuery.status === 'loading' && (
        <div className="flex items-center gap-2 px-1 py-6 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando versiones…</span>
        </div>
      )}

      {versionsQuery.status === 'error' && versionsQuery.error && (
        <ErrorState
          title="No se pudieron cargar las versiones"
          description={versionsQuery.error.message}
          onRetry={versionsQuery.reload}
        />
      )}

      {versionsQuery.status === 'success' && versions.length < 2 && (
        <EmptyState
          icon={GitCompare}
          title="Necesitas dos versiones para comparar"
          description="Duplica la versión actual con su estructura y valores; después ajusta lo que cambie en la nueva versión de GCam."
        />
      )}

      {versionsQuery.status === 'success' && versions.length >= 2 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="ui-label">Versión anterior</span>
              <Select
                className="mt-1"
                value={effectiveFrom}
                onChange={(event) => setFromId(event.target.value)}
                aria-label="Versión anterior"
              >
                {versions.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.version} · {candidate.nodeCount} nodos
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="ui-label">Versión nueva</span>
              <Select
                className="mt-1"
                value={effectiveTo}
                onChange={(event) => setToId(event.target.value)}
                aria-label="Versión nueva"
              >
                {versions.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.version} · {candidate.nodeCount} nodos
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {compareQuery.status === 'loading' && (
            <div className="mt-5 flex items-center gap-2 px-1 py-6 text-sm text-ink-muted" role="status">
              <Spinner />
              <span>Comparando {fromLabel} con {toLabel}…</span>
            </div>
          )}

          {compareQuery.status === 'error' && compareQuery.error && (
            <ErrorState
              title="No se pudo comparar"
              description={compareQuery.error.message}
              onRetry={compareQuery.reload}
            />
          )}

          {compareQuery.status === 'success' && compareQuery.data && (
            <>
              <Panel className="mt-5" title="Resumen" flush>
                <div className="flex flex-wrap gap-2 px-5 py-4">
                  <Badge tone="accent">{compareQuery.data.counts.levelsAdded} niveles nuevos</Badge>
                  <Badge tone="warning">{compareQuery.data.counts.levelsRemoved} niveles retirados</Badge>
                  <Badge>{compareQuery.data.counts.levelsRenamed} niveles renombrados/movidos</Badge>
                  <Badge tone="accent">{compareQuery.data.counts.parametersAdded} parámetros nuevos</Badge>
                  <Badge tone="warning">{compareQuery.data.counts.parametersRemoved} parámetros retirados</Badge>
                  <Badge>{compareQuery.data.counts.parametersRenamed + compareQuery.data.counts.parametersMoved} renombrados/movidos</Badge>
                  <Badge tone="accent">{compareQuery.data.counts.parametersChanged} valores cambiados</Badge>
                </div>
              </Panel>

              {compareQuery.data.items.length === 0 ? (
                <EmptyState
                  icon={GitCompare}
                  title="Las dos versiones son idénticas"
                  description="No hay diferencias de estructura ni de valores entre las versiones elegidas."
                />
              ) : (
                <div className="mt-5 space-y-5">
                  {levels.length > 0 && (
                    <Panel title="Niveles" description={`${fromLabel} → ${toLabel}`} flush>
                      <ul className="divide-y divide-line">
                        {levels.map((item) => (
                          <li key={`${item.kind}-${item.lineageId}`} className="px-4 py-3 sm:px-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={kindTone(item.kind)}>
                                {KIND_LABEL[item.kind]}
                              </Badge>
                              <span className="text-[13px] font-medium text-ink">{item.name}</span>
                              {item.nameA && item.nameB && item.nameA !== item.nameB && (
                                <span className="text-[12px] text-ink-muted">{item.nameA} → {item.nameB}</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-ink-faint">{item.path.join(' › ')}</p>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  )}

                  {parameters.length > 0 && (
                    <Panel title="Parámetros" description={`${fromLabel} → ${toLabel}`} flush>
                      <ul className="divide-y divide-line">
                        {parameters.map((item) => (
                          <li key={`${item.kind}-${item.lineageId}`} className="px-4 py-3 sm:px-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={kindTone(item.kind)}>
                                {KIND_LABEL[item.kind]}
                              </Badge>
                              <span className="text-[13px] font-medium text-ink">{item.name}</span>
                              {item.nameA && item.nameB && item.nameA !== item.nameB && (
                                <span className="text-[12px] text-ink-muted">{item.nameA} → {item.nameB}</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-ink-faint">{item.path.join(' › ')}</p>
                            {(item.kind === 'parameter-changed' || item.kind === 'parameter-renamed' || item.kind === 'parameter-moved') && (
                              <p className="mt-1 text-[13px] text-ink-muted">
                                <span className="font-mono text-[12px]">
                                  {formatValue(item.dataType, item.unit, item.valueA, item.sourceA)}
                                </span>
                                {' → '}
                                <strong className="font-mono text-[12px] font-medium text-ink">
                                  {formatValue(item.dataType, item.unit, item.valueB, item.sourceB)}
                                </strong>
                              </p>
                            )}
                            {item.kind === 'parameter-added' && (
                              <p className="mt-1 text-[13px] text-ink-muted">
                                Valor: <span className="font-mono text-[12px]">{formatValue(item.dataType, item.unit, item.valueB, item.sourceB)}</span>
                              </p>
                            )}
                            {item.kind === 'parameter-removed' && (
                              <p className="mt-1 text-[13px] text-ink-muted">
                                Último valor: <span className="font-mono text-[12px]">{formatValue(item.dataType, item.unit, item.valueA, item.sourceA)}</span>
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  )}
                </div>
              )}
            </>
          )}

          {compareQuery.status === 'success' && !compareQuery.data && (
            <EmptyState
              icon={GitCompare}
              title="Elige dos versiones distintas"
              description="La comparación necesita dos versiones diferentes de la misma cámara."
            />
          )}
        </>
      )}
    </VersionSection>
  )
}

