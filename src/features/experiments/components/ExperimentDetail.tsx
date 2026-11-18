import { ClipboardList, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { Panel } from '../../../components/common/Panel'
import { Select } from '../../../components/forms/Select'
import { formatDateTime } from '../../../lib/helpers/formatDate'
import type { Experiment, ExperimentStatus, Parameter, ParameterChange } from '../../../services/types'
import { EXPERIMENT_STATUS_LABEL, EXPERIMENT_STATUS_OPTIONS } from '../validation'
import { formatParameterValue } from '../../parameters/valueFormat'

type ExperimentDetailProps = {
  experiment: Experiment
  changes: ParameterChange[]
  parameterById: Map<string, Parameter>
  onAddChange: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onStatusChange: (status: ExperimentStatus) => void
  busy?: boolean
}

const STATUS_TONE: Record<ExperimentStatus, 'neutral' | 'accent' | 'success' | 'danger' | 'warning'> = {
  planned: 'neutral',
  in_progress: 'accent',
  completed: 'success',
  failed: 'danger',
  inconclusive: 'warning',
}

/** Detalle del experimento con su cronología de cambios (append-only). */
export const ExperimentDetail = ({
  experiment,
  changes,
  parameterById,
  onAddChange,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
  busy = false,
}: ExperimentDetailProps) => (
  <Panel
    title="Experimento"
    description={`Perfil: ${experiment.configurationName}`}
    action={
      <span className="flex items-center gap-1">
        <Button size="sm" variant="primary" leadingIcon={<Plus aria-hidden="true" className="size-3.5" />} onClick={onAddChange}>
          Añadir cambio
        </Button>
        <Button size="sm" leadingIcon={<Pencil aria-hidden="true" className="size-3.5" />} onClick={onEdit}>
          Editar
        </Button>
        <Button size="sm" leadingIcon={<Copy aria-hidden="true" className="size-3.5" />} onClick={onDuplicate}>
          Duplicar
        </Button>
        <Button size="sm" variant="danger" leadingIcon={<Trash2 aria-hidden="true" className="size-3.5" />} onClick={onDelete}>
          Eliminar
        </Button>
      </span>
    }
  >
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-sm font-medium tracking-tight text-ink">{experiment.title}</h3>
      <Badge tone={STATUS_TONE[experiment.status]}>{EXPERIMENT_STATUS_LABEL[experiment.status]}</Badge>
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label htmlFor="experiment-status-select" className="ui-label">
        Marcar resultado
      </label>
      <Select
        id="experiment-status-select"
        value={experiment.status}
        onChange={(event) => onStatusChange(event.target.value as ExperimentStatus)}
        disabled={busy}
        className="w-44"
      >
        {EXPERIMENT_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>

    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
      <div>
        <dt className="ui-label">Inicio</dt>
        <dd className="mt-0.5 text-ink-muted">{experiment.startedAt ? formatDateTime(experiment.startedAt) : 'Sin iniciar'}</dd>
      </div>
      <div>
        <dt className="ui-label">Finalización</dt>
        <dd className="mt-0.5 text-ink-muted">{experiment.completedAt ? formatDateTime(experiment.completedAt) : 'Abierto'}</dd>
      </div>
    </dl>

    {experiment.objective && (
      <div className="mt-4 border-t border-line pt-3">
        <p className="ui-label">Objetivo</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted text-pretty">{experiment.objective}</p>
      </div>
    )}
    {experiment.hypothesis && (
      <div className="mt-3">
        <p className="ui-label">Hipótesis</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted text-pretty">{experiment.hypothesis}</p>
      </div>
    )}
    {experiment.observations && (
      <div className="mt-3">
        <p className="ui-label">Observaciones</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted text-pretty">{experiment.observations}</p>
      </div>
    )}
    {experiment.conclusion && (
      <div className="mt-3">
        <p className="ui-label">Conclusión</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted text-pretty">{experiment.conclusion}</p>
      </div>
    )}

    <div className="mt-4 border-t border-line pt-3">
      <p className="ui-label">Cronología de cambios ({changes.length})</p>

      {changes.length === 0 ? (
        <div className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
          <ClipboardList aria-hidden="true" className="mt-0.5 size-3.5" />
          <span>
            Sin cambios registrados. Usa «Añadir cambio» para documentar cada ajuste con su valor anterior y nuevo.
          </span>
        </div>
      ) : (
        <ol className="mt-2 space-y-3">
          {changes.map((change) => {
            const parameter = parameterById.get(change.parameterId)
            return (
              <li key={change.id} className="rounded-control border border-line bg-surface-sunken/50 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink">{parameter?.name ?? 'Parámetro'}</span>
                  <span className="text-[11px] text-ink-disabled">{formatDateTime(change.createdAt)}</span>
                </div>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">
                  {change.pathSnapshot?.join(' › ') ?? 'Ruta no registrada'}
                </p>
                <p className="mt-1.5 text-[12px] text-ink-muted">
                  {parameter ? (
                    <>
                      <span className="text-ink-faint">{formatParameterValue(parameter, change.previousValue)}</span>
                      <span className="mx-1.5 text-ink-disabled">→</span>
                      <span className="text-ink">{formatParameterValue(parameter, change.newValue)}</span>
                    </>
                  ) : (
                    <span className="text-ink-faint">Parámetro ya no disponible</span>
                  )}
                  <span className="ml-2">
                    {change.appliedToProfile ? (
                      <Badge tone="accent">Aplicado al perfil</Badge>
                    ) : (
                      <Badge>Solo historial</Badge>
                    )}
                  </span>
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
        </ol>
      )}
    </div>
  </Panel>
)
