import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../../../components/common/Badge'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { Panel } from '../../../components/common/Panel'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { AppError, toAppError } from '../../../lib/errors/AppError'
import { formatDateTime } from '../../../lib/helpers/formatDate'
import { cameraService } from '../../../services/cameraService'
import { nodeService } from '../../../services/nodeService'
import { parameterService } from '../../../services/parameterService'
import { versionService } from '../../../services/versionService'
import { VersionSection } from '../../versions/components/VersionSection'
import { ParameterFormDialog } from '../components/ParameterFormDialog'
import { CONFIDENCE_LABEL, DATA_TYPE_LABEL, SOURCE_LABEL, formatDefaultValue } from '../valueFormat'
import { ancestorsOf, buildTreeIndex } from '../../hierarchy/treeUtils'

/** Ficha completa del parámetro: definición, ruta, cámara/versión y pendientes por etapa. */
export const ParameterPage = () => {
  const { cameraId, versionId, parameterId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()

  const query = useAsyncData(async () => {
    if (!cameraId || !versionId || !parameterId) {
      throw new AppError('not_found', 'No se indicó el parámetro solicitado.')
    }
    const parameter = await parameterService.getById(parameterId)
    const [camera, version, tree] = await Promise.all([
      cameraService.getById(cameraId),
      versionService.getById(versionId),
      nodeService.listByVersion(versionId),
    ])
    const index = buildTreeIndex(tree.items)
    const node = index.nodeById.get(parameter.nodeId)
    if (!node) throw new AppError('not_found', 'El nodo del parámetro no existe o pertenece a otra versión.')

    return {
      parameter,
      camera,
      version,
      node,
      path: [...ancestorsOf(index, node.id).map((ancestor) => ancestor.name), node.name],
    }
  }, `parameter|${parameterId}`)

  const [formOpen, setFormOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const data = query.status === 'success' ? query.data : null
  const parameter = data?.parameter ?? null

  const deleteParameter = async () => {
    if (!parameter) return
    setDeleteBusy(true)
    try {
      await parameterService.remove(parameter.id)
      notify({ title: 'Parámetro eliminado', description: parameter.name, tone: 'success' })
      navigate(`/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}/hierarchy`)
    } catch (cause) {
      notify({
        title: 'No se pudo eliminar',
        description: `${toAppError(cause).message} Desactívalo en lugar de borrarlo.`,
        tone: 'danger',
      })
      setDeleteBusy(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <VersionSection
      title={parameter?.name ?? 'Parámetro'}
      description={data?.path.join(' › ') ?? 'Ficha del parámetro seleccionado.'}
      actions={
        parameter ? (
          <>
            <Button
              size="sm"
              leadingIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
              onClick={() => navigate(`/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}/hierarchy`)}
            >
              Volver al árbol
            </Button>
            <Button size="sm" leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={() => setFormOpen(true)}>
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
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel title="Definición" description="Valor predeterminado documentado; no es el valor de un perfil." flush>
              <dl className="divide-y divide-line">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-40 shrink-0">Tipo de dato</dt>
                  <dd>
                    <Badge>{DATA_TYPE_LABEL[parameter.dataType]}</Badge>
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-40 shrink-0">Valor predeterminado</dt>
                  <dd>{formatDefaultValue(parameter)}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-40 shrink-0">Procedencia</dt>
                  <dd>{SOURCE_LABEL[parameter.defaultValueSource]}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-40 shrink-0">Certeza</dt>
                  <dd>{parameter.defaultValueConfidence ? CONFIDENCE_LABEL[parameter.defaultValueConfidence] : 'Sin indicar'}</dd>
                </div>
                {parameter.allowedValues && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                    <dt className="ui-label w-40 shrink-0">Opciones</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {parameter.allowedValues.map((option) => (
                        <Badge key={option}>{option}</Badge>
                      ))}
                    </dd>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-40 shrink-0">Clave técnica</dt>
                  <dd>{parameter.key ? <code className="font-mono text-[12px] text-ink-muted">{parameter.key}</code> : '—'}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-40 shrink-0">Estado</dt>
                  <dd className="flex items-center gap-2">
                    {parameter.isActive ? 'Activo' : 'Inactivo'}
                    {!parameter.isActive && <Badge tone="warning">Inactivo</Badge>}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <dt className="ui-label w-40 shrink-0">Creado / editado</dt>
                  <dd>{formatDateTime(parameter.createdAt)} · {formatDateTime(parameter.updatedAt)}</dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Ruta y contexto" description="Calculado desde las relaciones." flush>
              <dl className="divide-y divide-line">
                <div className="px-5 py-4">
                  <dt className="ui-label">Ruta jerárquica</dt>
                  <dd className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                    {data.camera.name} › {data.version.version} › {data.path.join(' › ')}
                  </dd>
                </div>
                <div className="px-5 py-4">
                  <dt className="ui-label">Cámara y versión</dt>
                  <dd className="mt-1 text-[13px] text-ink-muted">
                    <Link to={`/cameras/${cameraId ?? ''}`} className="underline decoration-line-strong underline-offset-4 hover:text-ink">
                      {data.camera.name}
                    </Link>
                    {' · '}
                    <Link
                      to={`/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}`}
                      className="underline decoration-line-strong underline-offset-4 hover:text-ink"
                    >
                      {data.version.version}
                    </Link>
                  </dd>
                </div>
                <div className="px-5 py-4">
                  <dt className="ui-label">Nodo</dt>
                  <dd className="mt-1 text-[13px] text-ink-muted">{data.node.name}</dd>
                </div>
              </dl>
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Valor en la configuración" description="El valor del perfil nunca modifica el predeterminado.">
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Sin perfil seleccionado. La comparación entre valor predeterminado y valor actual llega en la Etapa 09.
              </p>
            </Panel>

            <Panel title="Historial de modificaciones" description="Registro append-only por experimento.">
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Todavía no hay historial: se registra al documentar cambios en experimentos (Etapa 10).
              </p>
            </Panel>
          </div>

          <Panel className="mt-5" title="Observaciones">
            <p className="text-[13px] leading-relaxed text-ink-muted text-pretty">
              {parameter.description ?? 'Sin observaciones.'}
            </p>
          </Panel>

          <ParameterFormDialog
            key={`parameter-ficha-${formOpen ? 'open' : 'closed'}-${parameter.id}`}
            open={formOpen}
            node={data.node}
            parameter={parameter}
            onClose={() => setFormOpen(false)}
            onSaved={(saved) => {
              notify({ title: 'Parámetro actualizado', description: saved.name, tone: 'success' })
              query.reload()
            }}
          />

          <ConfirmDialog
            open={confirmingDelete}
            onClose={() => setConfirmingDelete(false)}
            onConfirm={() => void deleteParameter()}
            title="Eliminar parámetro"
            confirmLabel="Eliminar"
            tone="danger"
            loading={deleteBusy}
          >
            Se eliminará <strong className="text-ink">{parameter.name}</strong>. Si ya tiene valores en perfiles, la
            base lo impedirá y lo correcto es desactivarlo.
          </ConfirmDialog>
        </>
      )}
    </VersionSection>
  )
}
