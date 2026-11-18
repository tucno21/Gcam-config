import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { Panel } from '../../../components/common/Panel'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { Textarea } from '../../../components/forms/Textarea'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { AppError, toAppError } from '../../../lib/errors/AppError'
import { formatDateTime } from '../../../lib/helpers/formatDate'
import { historyService } from '../../../services/historyService'
import { nodeService } from '../../../services/nodeService'
import { parameterService } from '../../../services/parameterService'
import { VersionSection } from '../../versions/components/VersionSection'
import { ParameterDialog } from '../components/ParameterDialog'
import { ValueDialog } from '../components/ValueDialog'
import { ancestorsOf, buildTreeIndex } from '../tree'
import {
  CURRENT_SOURCE_LABEL,
  DATA_TYPE_LABEL,
  EFFECT_LABEL,
  formatCurrentValueWithUnit,
  formatDefaultValue,
} from '../valueFormat'

/** Ficha del parámetro: valor actual, referencia, nota e historial completo. */
export const ParameterDetailPage = () => {
  const { cameraId, versionId, parameterId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()

  const query = useAsyncData(async () => {
    if (!versionId || !parameterId) throw new AppError('not_found', 'No se indicó el parámetro solicitado.')
    const [parameter, tree, history] = await Promise.all([
      parameterService.getById(parameterId),
      nodeService.listByVersion(versionId),
      historyService.listByParameter(parameterId),
    ])
    const index = buildTreeIndex(tree.items)
    const node = index.nodeById.get(parameter.nodeId)
    if (!node) throw new AppError('not_found', 'El nodo del parámetro no existe o pertenece a otra versión.')

    return {
      parameter,
      node,
      index,
      history,
      path: [...ancestorsOf(index, node.id).map((ancestor) => ancestor.name), node.name],
    }
  }, `parameter|${parameterId}`)

  const [notes, setNotes] = useState<string | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [valueOpen, setValueOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const data = query.status === 'success' ? query.data : null
  const parameter = data?.parameter ?? null
  const notesValue = notes ?? parameter?.notes ?? ''

  const saveNotes = async () => {
    if (!parameter) return
    setSavingNotes(true)
    try {
      await parameterService.update(parameter.id, { notes: notesValue.trim() || null })
      notify({ title: 'Nota guardada', description: parameter.name, tone: 'success' })
      query.reload()
    } catch (cause) {
      notify({ title: 'No se pudo guardar la nota', description: toAppError(cause).message, tone: 'danger' })
    } finally {
      setSavingNotes(false)
    }
  }

  const deleteParameter = async () => {
    if (!parameter) return
    setDeleteBusy(true)
    try {
      await parameterService.remove(parameter.id)
      notify({ title: 'Parámetro eliminado', description: parameter.name, tone: 'success' })
      navigate(`/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}/settings/${parameter.nodeId}`)
    } catch (cause) {
      notify({
        title: 'No se pudo eliminar',
        description: `${toAppError(cause).message} Si ya tiene historial, retíralo en lugar de borrarlo.`,
        tone: 'danger',
      })
      setDeleteBusy(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <VersionSection
      title={parameter?.name ?? 'Parámetro'}
      description={data?.path.join(' › ') ?? 'Ficha del ajuste.'}
      actions={
        parameter ? (
          <>
            <Button
              size="sm"
              leadingIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
              onClick={() =>
                navigate(`/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}/settings/${parameter.nodeId}`)
              }
            >
              Volver al nivel
            </Button>
            <Button
              size="sm"
              variant="primary"
              leadingIcon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() => setValueOpen(true)}
            >
              Cambiar valor
            </Button>
          </>
        ) : undefined
      }
    >
      {query.status === 'loading' && (
        <div className="flex items-center gap-2 px-1 py-4 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando parámetro…</span>
        </div>
      )}

      {query.status === 'error' && query.error && (
        <ErrorState title="No se pudo abrir el parámetro" description={query.error.message} onRetry={query.reload} />
      )}

      {parameter && data && (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Panel title="Valor" description="Lo que tiene el teléfono ahora y lo que trae la app de fábrica." flush>
              <div className="px-5 py-5">
                <p className="font-mono text-2xl leading-tight text-ink">{formatCurrentValueWithUnit(parameter)}</p>
                <p className="mt-1 text-[11px] text-ink-faint">{CURRENT_SOURCE_LABEL[parameter.currentValueSource]}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => setValueOpen(true)}>
                    Cambiar valor
                  </Button>
                  <Button size="sm" onClick={() => setEditOpen(true)}>
                    Editar definición
                  </Button>
                </div>
              </div>
              <dl className="divide-y divide-line border-t border-line">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <dt className="ui-label w-40 shrink-0">Predeterminado</dt>
                  <dd className="text-[13px] text-ink-muted">{formatDefaultValue(parameter)}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <dt className="ui-label w-40 shrink-0">Tipo</dt>
                  <dd>
                    <Badge>{DATA_TYPE_LABEL[parameter.dataType]}</Badge>
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <dt className="ui-label w-40 shrink-0">Estado</dt>
                  <dd className="text-[13px] text-ink-muted">{parameter.isActive ? 'Activo' : 'Retirado'}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <dt className="ui-label w-40 shrink-0">Creado / editado</dt>
                  <dd className="text-[13px] text-ink-muted">
                    {formatDateTime(parameter.createdAt)} · {formatDateTime(parameter.updatedAt)}
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Nota del parámetro" description="Qué controla y qué has observado. Se conserva entre versiones.">
              <Textarea
                rows={6}
                value={notesValue}
                aria-label="Nota del parámetro"
                placeholder="Ej. Subirlo recupera detalle, pero aparece ruido de color en sombra."
                onChange={(event) => setNotes(event.target.value)}
                disabled={savingNotes}
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[11px] text-ink-faint">Se guarda en el parámetro, no en un cambio concreto.</p>
                <Button size="sm" onClick={() => void saveNotes()} loading={savingNotes}>
                  Guardar nota
                </Button>
              </div>
            </Panel>
          </div>

          <Panel
            className="mt-5"
            title="Historial de este parámetro"
            description={`${data.history.length} ${data.history.length === 1 ? 'cambio registrado' : 'cambios registrados'}. Cada uno conserva el antes y el después.`}
            flush
          >
            {data.history.length === 0 ? (
              <p className="px-5 py-5 text-[13px] leading-relaxed text-ink-muted">
                Sin cambios todavía. Al guardar un valor se registra aquí con su comentario y efecto.
              </p>
            ) : (
              <ol className="divide-y divide-line">
                {data.history.map((change) => (
                  <li key={change.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] text-ink-faint">{formatDateTime(change.createdAt)}</span>
                      <span className="text-[13px] text-ink-muted">
                        {formatCurrentValueWithUnit({
                          ...parameter,
                          currentValue: change.previousValue,
                          currentValueSource: change.previousValueSource ?? 'unknown',
                        })}
                        {' → '}
                        <strong className="font-medium text-ink">
                          {formatCurrentValueWithUnit({
                            ...parameter,
                            currentValue: change.newValue,
                            currentValueSource: change.newValueSource ?? 'unknown',
                          })}
                        </strong>
                      </span>
                      {change.effect && <Badge tone={change.effect === 'better' ? 'accent' : change.effect === 'worse' ? 'warning' : undefined}>{EFFECT_LABEL[change.effect]}</Badge>}
                    </div>
                    {change.reason && (
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-muted text-pretty">{change.reason}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              leadingIcon={<Pencil aria-hidden="true" className="size-4" />}
              onClick={() => setEditOpen(true)}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="danger"
              leadingIcon={<Trash2 aria-hidden="true" className="size-4" />}
              onClick={() => setConfirmingDelete(true)}
            >
              Eliminar
            </Button>
          </div>

          {editOpen && (
            <ParameterDialog
              key={`parameter-detail-${parameter.id}`}
              open
              node={data.node}
              parameter={parameter}
              onClose={() => setEditOpen(false)}
              onSaved={() => {
                notify({ title: 'Parámetro actualizado', description: parameter.name, tone: 'success' })
                query.reload()
              }}
            />
          )}

          {valueOpen && (
            <ValueDialog
              key={`value-detail-${parameter.id}-${parameter.updatedAt}`}
              open
              parameter={parameter}
              path={data.path}
              onClose={() => setValueOpen(false)}
              onSaved={() => {
                notify({ title: 'Valor guardado', description: 'Queda registrado en el historial.', tone: 'success' })
                query.reload()
              }}
            />
          )}

          <ConfirmDialog
            open={confirmingDelete}
            onClose={() => setConfirmingDelete(false)}
            onConfirm={() => void deleteParameter()}
            title="Eliminar parámetro"
            confirmLabel="Eliminar"
            tone="danger"
            loading={deleteBusy}
          >
            Se eliminará <strong className="text-ink">{parameter.name}</strong>. Si ya tiene historial, la base lo
            impedirá: retíralo para conservarlo.
          </ConfirmDialog>
        </>
      )}
    </VersionSection>
  )
}
