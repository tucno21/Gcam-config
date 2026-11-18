import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { History } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { formatDateTime } from '../../../lib/helpers/formatDate'
import { historyService } from '../../../services/historyService'
import type { ChangeEffect, CurrentValueSource, DataType } from '../../../services/types'
import { VersionSection } from '../../versions/components/VersionSection'
import { EFFECT_LABEL } from '../valueFormat'

const formatHistoryValue = (
  dataType: DataType,
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

/** Cronología de cambios de la versión: qué se tocó, de qué a qué y con qué efecto. */
export const HistoryPage = () => {
  const { cameraId, versionId } = useParams()

  const [search, setSearch] = useState('')
  const [effect, setEffect] = useState<ChangeEffect | 'all'>('all')
  const [includeRetired, setIncludeRetired] = useState(true)
  const [visible, setVisible] = useState(50)

  const query = useAsyncData(() => {
    if (!versionId) throw new Error('No se indicó la versión.')
    return historyService.listAllByVersion(versionId)
  }, `history|${versionId}`)

  const entries = useMemo(() => query.data ?? [], [query.data])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return entries.filter((entry) => {
      if (effect !== 'all' && entry.effect !== effect) return false
      if (!includeRetired && !entry.parameterActive) return false
      if (!term) return true
      return (
        entry.parameterName.toLowerCase().includes(term) ||
        (entry.reason ?? '').toLowerCase().includes(term) ||
        entry.path.join(' ').toLowerCase().includes(term)
      )
    })
  }, [entries, search, effect, includeRetired])

  return (
    <VersionSection
      title="Historial"
      description="Todo cambio de valor queda aquí con su antes, después, comentario y efecto. No se edita ni se borra."
    >
      {query.status === 'loading' && (
        <div className="flex items-center gap-2 px-1 py-6 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando historial…</span>
        </div>
      )}

      {query.status === 'error' && query.error && (
        <ErrorState title="No se pudo cargar el historial" description={query.error.message} onRetry={query.reload} />
      )}

      {query.status === 'success' && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <Input
                type="search"
                value={search}
                aria-label="Buscar en el historial"
                placeholder="Buscar por parámetro, ruta o comentario…"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select
              value={effect}
              aria-label="Filtrar por efecto"
              onChange={(event) => setEffect(event.target.value as ChangeEffect | 'all')}
            >
              <option value="all">Todos los efectos</option>
              {Object.entries(EFFECT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 pb-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                className="size-3.5 accent-[var(--color-accent)]"
                checked={includeRetired}
                onChange={(event) => setIncludeRetired(event.target.checked)}
              />
              Incluir retirados
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={History}
              title={entries.length === 0 ? 'Todavía no hay cambios' : 'Ningún cambio coincide'}
              description={
                entries.length === 0
                  ? 'Cuando cambies un valor desde Ajustes, aparecerá aquí con el antes y el después.'
                  : 'Prueba con otro texto o quita los filtros.'
              }
            />
          ) : (
            <ul className="mt-5 divide-y divide-line rounded-panel border border-line bg-surface">
              {filtered.slice(0, visible).map((entry) => (
                <li key={entry.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      to={`/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}/parameters/${entry.parameterId}`}
                      className="text-[13px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent"
                    >
                      {entry.parameterName}
                    </Link>
                    {!entry.parameterActive && <Badge tone="warning">Retirado</Badge>}
                    {entry.effect && (
                      <Badge tone={entry.effect === 'better' ? 'accent' : entry.effect === 'worse' ? 'warning' : undefined}>
                        {EFFECT_LABEL[entry.effect]}
                      </Badge>
                    )}
                    <span className="text-[11px] text-ink-faint">{formatDateTime(entry.createdAt)}</span>
                  </div>

                  <p className="mt-0.5 text-[11px] text-ink-faint">{entry.path.join(' › ')}</p>

                  <p className="mt-1.5 text-[13px] text-ink-muted">
                    <span className="font-mono text-[12px]">
                      {formatHistoryValue(entry.dataType, entry.unit, entry.previousValue, entry.previousValueSource)}
                    </span>
                    {' → '}
                    <strong className="font-mono text-[12px] font-medium text-ink">
                      {formatHistoryValue(entry.dataType, entry.unit, entry.newValue, entry.newValueSource)}
                    </strong>
                  </p>

                  {entry.reason && (
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-muted text-pretty">{entry.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {filtered.length > visible && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => setVisible((previous) => previous + 50)}>
                Ver más ({filtered.length - visible} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </VersionSection>
  )
}
