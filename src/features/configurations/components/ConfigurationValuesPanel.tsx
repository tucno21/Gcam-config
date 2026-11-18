import { useMemo, useState } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { Input } from '../../../components/forms/Input'
import { Select } from '../../../components/forms/Select'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { toAppError } from '../../../lib/errors/AppError'
import { configurationService } from '../../../services/configurationService'
import type { Configuration, ConfigurationValue, DataType, Parameter } from '../../../services/types'
import { DATA_TYPE_OPTIONS } from '../../parameters/validation'
import { DATA_TYPE_LABEL, formatDefaultValue, formatParameterValue } from '../../parameters/valueFormat'
import { ValueDialog } from './ValueDialog'

type ConfigurationValuesPanelProps = {
  configuration: Configuration
  parameters: Parameter[]
  values: ConfigurationValue[]
  nodeNames: Map<string, string>
  loadingValues: boolean
  onChanged: () => void
}

type StatusFilter = 'all' | 'custom' | 'unset'

/** Comparación lado a lado entre valor predeterminado y valor del perfil. */
export const ConfigurationValuesPanel = ({
  configuration,
  parameters,
  values,
  nodeNames,
  loadingValues,
  onChanged,
}: ConfigurationValuesPanelProps) => {
  const { notify } = useToast()

  const [search, setSearch] = useState('')
  const [nodeFilter, setNodeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | DataType>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [editing, setEditing] = useState<Parameter | null>(null)
  const [restoring, setRestoring] = useState<Parameter | null>(null)
  const [restoreBusy, setRestoreBusy] = useState(false)

  const valueByParameter = useMemo(() => {
    const map = new Map<string, ConfigurationValue>()
    for (const value of values) map.set(value.parameterId, value)
    return map
  }, [values])

  const nodeOptions = useMemo(() => {
    const ids = new Set(parameters.map((parameter) => parameter.nodeId))
    return [...ids].map((id) => ({ id, name: nodeNames.get(id) ?? 'Nodo' }))
  }, [parameters, nodeNames])

  const term = search.trim().toLowerCase()
  const filtered = parameters.filter((parameter) => {
    if (nodeFilter && parameter.nodeId !== nodeFilter) return false
    if (typeFilter && parameter.dataType !== typeFilter) return false
    const hasCustom = valueByParameter.has(parameter.id)
    if (statusFilter === 'custom' && !hasCustom) return false
    if (statusFilter === 'unset' && hasCustom) return false
    if (term) {
      const haystack = `${parameter.name} ${parameter.key ?? ''}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const customCount = parameters.filter((parameter) => valueByParameter.has(parameter.id)).length

  const restoreDefault = async () => {
    if (!restoring) return
    setRestoreBusy(true)
    try {
      await configurationService.clearValue(configuration.id, restoring.id)
      notify({
        title: 'Valor predeterminado restaurado',
        description: `${restoring.name} vuelve a «sin valor personalizado».`,
        tone: 'success',
      })
      setRestoring(null)
      onChanged()
    } catch (cause) {
      notify({ title: 'No se pudo restaurar', description: toAppError(cause).message, tone: 'danger' })
    } finally {
      setRestoreBusy(false)
    }
  }

  return (
    <section className="rounded-panel border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium tracking-tight text-ink">Valores de «{configuration.name}»</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-faint">
              {customCount} de {parameters.length} parámetros con valor personalizado. Los demás muestran el
              predeterminado solo como referencia.
            </p>
          </div>
          {loadingValues && <Spinner className="mt-1 size-3.5 text-ink-faint" />}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
            />
            <Input
              type="search"
              value={search}
              placeholder="Buscar parámetro…"
              aria-label="Buscar parámetro en el perfil"
              className="pl-9"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select aria-label="Filtrar por nodo" value={nodeFilter} onChange={(event) => setNodeFilter(event.target.value)}>
            <option value="">Todos los nodos</option>
            {nodeOptions.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filtrar por tipo"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as '' | DataType)}
          >
            <option value="">Todos los tipos</option>
            {DATA_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filtrar por estado del valor"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Todos</option>
            <option value="custom">Con valor personalizado</option>
            <option value="unset">Sin valor personalizado</option>
          </Select>
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">
          {parameters.length === 0
            ? 'Esta versión no tiene parámetros todavía: créalos en Estructura para poder definir valores.'
            : 'Ningún parámetro coincide con los filtros.'}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((parameter) => {
            const current = valueByParameter.get(parameter.id)
            const hasCustom = current !== undefined
            return (
              <li key={parameter.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-ink">{parameter.name}</span>
                      <Badge>{DATA_TYPE_LABEL[parameter.dataType]}</Badge>
                      {!parameter.isActive && <Badge tone="warning">Inactivo</Badge>}
                      {parameter.key && (
                        <code className="font-mono text-[11px] text-ink-disabled">{parameter.key}</code>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-disabled">{nodeNames.get(parameter.nodeId) ?? 'Nodo'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" onClick={() => setEditing(parameter)}>
                      {hasCustom ? 'Editar valor' : 'Definir valor'}
                    </Button>
                    {hasCustom && (
                      <Button
                        size="sm"
                        variant="ghost"
                        leadingIcon={<RotateCcw aria-hidden="true" className="size-3.5" />}
                        onClick={() => setRestoring(parameter)}
                      >
                        Restaurar
                      </Button>
                    )}
                  </div>
                </div>

                <dl className="mt-2 grid gap-2 text-[12px] sm:grid-cols-2">
                  <div className="rounded-control border border-line bg-surface-sunken/50 px-3 py-2">
                    <dt className="ui-label">Predeterminado</dt>
                    <dd className="mt-0.5 text-ink-muted">{formatDefaultValue(parameter)}</dd>
                  </div>
                  <div
                    className={`rounded-control border px-3 py-2 ${
                      hasCustom ? 'border-accent/30 bg-accent/[0.06]' : 'border-line bg-surface-sunken/50'
                    }`}
                  >
                    <dt className="ui-label">En este perfil</dt>
                    <dd className={`mt-0.5 ${hasCustom ? 'text-ink' : 'text-ink-faint italic'}`}>
                      {hasCustom
                        ? formatParameterValue(parameter, current.value)
                        : 'Sin valor personalizado'}
                    </dd>
                  </div>
                </dl>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <ValueDialog
          key={`value-dialog-${editing.id}-${valueByParameter.get(editing.id)?.updatedAt ?? 'none'}`}
          open
          configuration={configuration}
          parameter={editing}
          currentValue={valueByParameter.get(editing.id)?.value ?? null}
          onClose={() => setEditing(null)}
          onSaved={({ cleared }) => {
            notify({
              title: cleared ? 'Valor quitado' : 'Valor guardado',
              description: cleared
                ? `${editing.name} vuelve a «sin valor personalizado».`
                : `${editing.name} tiene ahora un valor propio de este perfil.`,
              tone: 'success',
            })
            onChanged()
          }}
        />
      )}

      {restoring && (
        <div className="border-t border-line bg-surface-sunken/40 px-5 py-4" role="alertdialog" aria-label="Confirmar restauración">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            ¿Restaurar el valor predeterminado de <strong className="text-ink">{restoring.name}</strong>? Se quitará su
            valor personalizado en este perfil; el predeterminado del catálogo no cambia.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" onClick={() => setRestoring(null)} disabled={restoreBusy}>
              Cancelar
            </Button>
            <Button size="sm" variant="primary" loading={restoreBusy} onClick={() => void restoreDefault()}>
              Restaurar predeterminado
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
