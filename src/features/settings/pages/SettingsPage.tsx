import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FolderPlus, History, Network, Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { Tooltip } from '../../../components/common/Tooltip'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { Input } from '../../../components/forms/Input'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { toAppError } from '../../../lib/errors/AppError'
import { nodeService } from '../../../services/nodeService'
import { parameterService } from '../../../services/parameterService'
import { settingsService } from '../../../services/settingsService'
import { versionService } from '../../../services/versionService'
import type { Parameter, ParameterNode } from '../../../services/types'
import { CameraSection } from '../../cameras/components/CameraSection'
import { LevelDialog } from '../components/LevelDialog'
import { LevelRow } from '../components/LevelRow'
import { ParameterDialog } from '../components/ParameterDialog'
import { ParameterRow } from '../components/ParameterRow'
import { ValueDialog } from '../components/ValueDialog'
import { ancestorsOf, branchIds, buildTreeIndex } from '../tree'

type LevelDialogState =
  | { mode: 'closed' }
  | { mode: 'create'; parent: ParameterNode | null }
  | { mode: 'edit'; level: ParameterNode }

type ParameterDialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; parameter: Parameter }

/**
 * Espejo de los ajustes del teléfono.
 *
 * Se navega nivel a nivel, como en el menú de GCam: cada nivel tiene sus
 * subniveles y sus parámetros. Ahí se cambia el valor actual (con comentario y
 * efecto) y todo queda en el historial del parámetro.
 */
export const SettingsPage = () => {
  const { cameraId, nodeId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()

  const structureQuery = useAsyncData(async () => {
    if (!cameraId) throw new Error('No se indicó la cámara.')
    return versionService.getStructure(cameraId)
  }, `structure|${cameraId}`)

  const versionId = structureQuery.data?.id ?? null
  useWorkspaceSelection(cameraId, versionId ?? undefined)

  const base = `/cameras/${cameraId ?? ''}`
  const settingsBase = `${base}/settings`

  const nodesQuery = useAsyncData(
    () => (versionId ? nodeService.listByVersion(versionId) : Promise.resolve({ items: [], truncated: false })),
    `nodes|${versionId ?? 'none'}`,
  )

  const parametersQuery = useAsyncData(
    () => (versionId ? parameterService.listByVersion(versionId) : Promise.resolve([])),
    `parameters|${versionId ?? 'none'}`,
  )

  const nodes = useMemo(() => nodesQuery.data?.items ?? [], [nodesQuery.data])
  const parameters = useMemo(() => parametersQuery.data ?? [], [parametersQuery.data])
  const index = useMemo(() => buildTreeIndex(nodes), [nodes])

  const current = nodeId ? (index.nodeById.get(nodeId) ?? null) : null
  const currentId = current?.id ?? null

  const [search, setSearch] = useState('')
  const [showRetired, setShowRetired] = useState(false)
  const searchTerm = search.trim().toLowerCase()

  const parametersByNode = useMemo(() => {
    const counts = new Map<string, number>()
    for (const parameter of parameters) counts.set(parameter.nodeId, (counts.get(parameter.nodeId) ?? 0) + 1)
    return counts
  }, [parameters])

  const levels = (index.childrenByParent.get(currentId) ?? []).filter(
    (node) => (showRetired || node.isActive) && (!searchTerm || node.name.toLowerCase().includes(searchTerm)),
  )

  const levelParameters = parameters.filter(
    (parameter) =>
      parameter.nodeId === currentId &&
      (showRetired || parameter.isActive) &&
      (!searchTerm ||
        parameter.name.toLowerCase().includes(searchTerm) ||
        (parameter.notes ?? '').toLowerCase().includes(searchTerm)),
  )

  const [levelDialog, setLevelDialog] = useState<LevelDialogState>({ mode: 'closed' })
  const [parameterDialog, setParameterDialog] = useState<ParameterDialogState>({ mode: 'closed' })
  const [valueTarget, setValueTarget] = useState<Parameter | null>(null)
  const [deletingLevel, setDeletingLevel] = useState<ParameterNode | null>(null)
  const [describeLevel, setDescribeLevel] = useState<{
    nodes: number
    parameters: number
    changes: number
  } | null>(null)
  const [describingLevel, setDescribingLevel] = useState(false)
  const [deletingParameter, setDeletingParameter] = useState<Parameter | null>(null)
  const [busy, setBusy] = useState(false)

  const reloadAll = () => {
    nodesQuery.reload()
    parametersQuery.reload()
  }

  const openDeleteLevel = async (node: ParameterNode) => {
    setDeletingLevel(node)
    setDescribeLevel(null)
    setDescribingLevel(true)
    try {
      setDescribeLevel(await nodeService.describeBranch(node.id))
    } catch {
      setDescribeLevel(null)
    } finally {
      setDescribingLevel(false)
    }
  }

  const confirmDeleteLevel = async () => {
    if (!deletingLevel) return
    setBusy(true)
    try {
      const result = await nodeService.removeBranch(deletingLevel.id)
      notify({
        title: 'Nivel eliminado',
        description: `${deletingLevel.name}: ${result.nodes} ${result.nodes === 1 ? 'nivel' : 'niveles'}, ${
          result.parameters
        } ${result.parameters === 1 ? 'parámetro' : 'parámetros'} y ${result.changes} ${
          result.changes === 1 ? 'cambio de historial' : 'cambios de historial'
        }.`,
        tone: 'success',
      })
      if (currentId && branchIds(index, deletingLevel.id).includes(currentId)) {
        navigate(deletingLevel.parentId ? `${settingsBase}/${deletingLevel.parentId}` : base)
      }
      setDeletingLevel(null)
      nodesQuery.reload()
      parametersQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo eliminar', description: toAppError(cause).message, tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const confirmDeleteParameter = async () => {
    if (!deletingParameter) return
    setBusy(true)
    try {
      const result = await parameterService.remove(deletingParameter.id)
      notify({
        title: 'Parámetro eliminado',
        description:
          result.changes > 0
            ? `${deletingParameter.name} y ${result.changes} ${result.changes === 1 ? 'cambio' : 'cambios'} de historial.`
            : deletingParameter.name,
        tone: 'success',
      })
      setDeletingParameter(null)
      parametersQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo eliminar', description: toAppError(cause).message, tone: 'danger' })
      setDeletingParameter(null)
    } finally {
      setBusy(false)
    }
  }

  const toggleLevel = async (node: ParameterNode) => {
    try {
      const updated = await nodeService.update(node.id, { isActive: !node.isActive })
      notify({
        title: updated.isActive ? 'Nivel reactivado' : 'Nivel retirado',
        description: updated.isActive ? 'Vuelve a la vista activa.' : 'Se conserva para el historial y se oculta.',
        tone: 'success',
      })
      nodesQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo cambiar el estado', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const toggleParameter = async (parameter: Parameter) => {
    try {
      const updated = await parameterService.setActive(parameter.id, !parameter.isActive)
      notify({
        title: updated.isActive ? 'Parámetro reactivado' : 'Parámetro retirado',
        description: updated.isActive ? 'Vuelve a la vista activa.' : 'Se conserva con su historial.',
        tone: 'success',
      })
      parametersQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo cambiar el estado', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const duplicateLevel = async (node: ParameterNode) => {
    try {
      const result = await settingsService.duplicateBranch(node.id)
      notify({
        title: 'Nivel duplicado',
        description: `${result.nodes} ${result.nodes === 1 ? 'nivel' : 'niveles'} y ${result.parameters} ${
          result.parameters === 1 ? 'parámetro' : 'parámetros'
        } copiados.`,
        tone: 'success',
      })
      nodesQuery.reload()
      parametersQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo duplicar', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const duplicateParameter = async (parameter: Parameter) => {
    try {
      const result = await settingsService.duplicateParameter(parameter.id)
      notify({ title: 'Parámetro duplicado', description: result.name, tone: 'success' })
      parametersQuery.reload()
    } catch (cause) {
      notify({ title: 'No se pudo duplicar', description: toAppError(cause).message, tone: 'danger' })
    }
  }

  const isLoading =
    structureQuery.status === 'loading' || nodesQuery.status === 'loading' || parametersQuery.status === 'loading'
  const hasError =
    structureQuery.status === 'error' || nodesQuery.status === 'error' || parametersQuery.status === 'error'

  const actions = current ? (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        className="max-sm:h-8 max-sm:gap-1 max-sm:px-2 max-sm:text-xs"
        leadingIcon={<FolderPlus aria-hidden="true" className="size-4 max-sm:size-3.5" />}
        onClick={() => setLevelDialog({ mode: 'create', parent: current })}
      >
        <span className="sm:hidden">Subnivel</span>
        <span className="hidden sm:inline">Añadir subnivel</span>
      </Button>
      <Button
        size="sm"
        variant="primary"
        className="max-sm:h-8 max-sm:gap-1 max-sm:px-2 max-sm:text-xs"
        leadingIcon={<Plus aria-hidden="true" className="size-4 max-sm:size-3.5" />}
        onClick={() => setParameterDialog({ mode: 'create' })}
      >
        <span className="sm:hidden">Parámetro</span>
        <span className="hidden sm:inline">Añadir parámetro</span>
      </Button>
    </div>
  ) : (
    <>
      <Tooltip label="Historial de la cámara">
        <Link
          to={`${base}/history`}
          aria-label="Ver historial de la cámara"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <History aria-hidden="true" className="size-4" />
        </Link>
      </Tooltip>
      <Button
        size="sm"
        variant="primary"
        leadingIcon={<FolderPlus aria-hidden="true" className="size-4" />}
        onClick={() => setLevelDialog({ mode: 'create', parent: null })}
      >
        Añadir nivel
      </Button>
    </>
  )

  return (
    <CameraSection
      title={current?.name ?? 'Ajustes'}
      description={current?.description ?? undefined}
      trail={
        current
          ? [
              { label: 'Ajustes', to: base },
              ...ancestorsOf(index, current.id).map((ancestor) => ({
                label: ancestor.name,
                to: `${settingsBase}/${ancestor.id}`,
              })),
              { label: current.name },
            ]
          : undefined
      }
      actions={actions}
      actionsInline={!current}
    >
      {isLoading && (
        <div className="flex items-center gap-2 px-1 py-6 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando ajustes…</span>
        </div>
      )}

      {hasError && (
        <ErrorState
          title="No se pudieron cargar los ajustes"
          description={
            (nodesQuery.error ?? parametersQuery.error)?.message ?? 'La estructura de la cámara no está disponible.'
          }
          onRetry={reloadAll}
        />
      )}

      {!isLoading && !hasError && (
        <>
          <div className="mb-5 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                className="size-3.5 accent-[var(--color-accent)]"
                checked={showRetired}
                onChange={(event) => setShowRetired(event.target.checked)}
              />
              Mostrar retirados
            </label>
            <Input
              type="search"
              value={search}
              aria-label="Buscar en este nivel"
              placeholder="Buscar en este nivel…"
              className="min-w-0 flex-1 sm:w-56 sm:flex-none"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {nodeId && !current && (
            <ErrorState
              title="Este nivel no existe en la cámara"
              description="Puede que se haya eliminado o que pertenezca a otra cámara."
              onRetry={() => navigate(base)}
            />
          )}

          {(!nodeId || current) && (
            <div className="mt-5 space-y-5">
              {!current && index.total === 0 && (
                <EmptyState
                  icon={Network}
                  title="Todavía no hay niveles"
                  description="Crea el primer nivel tal como aparece en el menú de la cámara (por ejemplo, «Photo Processing») y ve añadiendo dentro sus subniveles y parámetros."
                  action={
                    <Button variant="primary" onClick={() => setLevelDialog({ mode: 'create', parent: null })}>
                      Crear el primer nivel
                    </Button>
                  }
                  footnote="Cada cámara tiene su propia estructura: nada se copia automáticamente."
                />
              )}

              {levels.length > 0 && (
                <section aria-label="Niveles">
                  <p className="ui-label mb-2 px-1">Niveles · {levels.length}</p>
                  <ul className="rounded-panel border border-line bg-surface">
                    {levels.map((node) => (
                      <LevelRow
                        key={node.id}
                        node={node}
                        to={`${settingsBase}/${node.id}`}
                        childCount={(index.childrenByParent.get(node.id) ?? []).length}
                        parameterCount={parametersByNode.get(node.id) ?? 0}
                        onEdit={() => setLevelDialog({ mode: 'edit', level: node })}
                        onDuplicate={() => void duplicateLevel(node)}
                        onToggleActive={() => void toggleLevel(node)}
                        onDelete={() => void openDeleteLevel(node)}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {current && levelParameters.length > 0 && (
                <section aria-label="Parámetros">
                  <p className="ui-label mb-2 px-1">Parámetros · {levelParameters.length}</p>
                  <ul className="rounded-panel border border-line bg-surface">
                    {levelParameters.map((parameter) => (
                      <ParameterRow
                        key={parameter.id}
                        parameter={parameter}
                        to={`${base}/parameters/${parameter.id}`}
                        onValue={() => setValueTarget(parameter)}
                        onEdit={() => setParameterDialog({ mode: 'edit', parameter })}
                        onDuplicate={() => void duplicateParameter(parameter)}
                        onToggleActive={() => void toggleParameter(parameter)}
                        onDelete={() => setDeletingParameter(parameter)}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {current && levels.length === 0 && levelParameters.length === 0 && (
                <EmptyState
                  icon={SlidersHorizontal}
                  title={searchTerm || showRetired ? 'Nada coincide con el filtro' : 'Este nivel está vacío'}
                  description={
                    searchTerm || showRetired
                      ? 'Prueba con otro texto o activa «Mostrar retirados».'
                      : 'Añade un subnivel (otra pantalla del menú) o un parámetro con su nombre y valor.'
                  }
                  action={
                    searchTerm || showRetired ? undefined : (
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button onClick={() => setLevelDialog({ mode: 'create', parent: current })}>Añadir subnivel</Button>
                        <Button variant="primary" onClick={() => setParameterDialog({ mode: 'create' })}>
                          Añadir parámetro
                        </Button>
                      </div>
                    )
                  }
                />
              )}

              {!current && index.total > 0 && levels.length === 0 && (
                <EmptyState
                  icon={Network}
                  title={searchTerm || showRetired ? 'Ningún nivel coincide' : 'No hay niveles activos'}
                  description={
                    searchTerm || showRetired
                      ? 'Prueba con otro texto o activa «Mostrar retirados».'
                      : 'Los niveles existentes están retirados. Activa «Mostrar retirados» o crea uno nuevo.'
                  }
                  action={
                    <Button variant="primary" onClick={() => setLevelDialog({ mode: 'create', parent: null })}>
                      Crear nivel
                    </Button>
                  }
                />
              )}
            </div>
          )}

          {levelDialog.mode !== 'closed' && (
            <LevelDialog
              key={`level-${levelDialog.mode}-${levelDialog.mode === 'edit' ? levelDialog.level.id : (levelDialog.parent?.id ?? 'root')}`}
              open
              versionId={versionId ?? ''}
              parent={levelDialog.mode === 'create' ? levelDialog.parent : levelDialog.level.parentId ? (index.nodeById.get(levelDialog.level.parentId) ?? null) : null}
              level={levelDialog.mode === 'edit' ? levelDialog.level : null}
              onClose={() => setLevelDialog({ mode: 'closed' })}
              onSaved={(saved, mode) => {
                notify({
                  title: mode === 'create' ? 'Nivel creado' : 'Nivel actualizado',
                  description: saved.name,
                  tone: 'success',
                })
                nodesQuery.reload()
                if (mode === 'create') navigate(`${settingsBase}/${saved.id}`)
              }}
            />
          )}

          {parameterDialog.mode !== 'closed' && current && (
            <ParameterDialog
              key={`parameter-${parameterDialog.mode}-${parameterDialog.mode === 'edit' ? parameterDialog.parameter.id : current.id}`}
              open
              node={current}
              parameter={parameterDialog.mode === 'edit' ? parameterDialog.parameter : null}
              onClose={() => setParameterDialog({ mode: 'closed' })}
              onSaved={(saved, mode) => {
                notify({
                  title: mode === 'create' ? 'Parámetro creado' : 'Parámetro actualizado',
                  description: saved.name,
                  tone: 'success',
                })
                parametersQuery.reload()
              }}
            />
          )}

          {valueTarget && (
            <ValueDialog
              key={`value-${valueTarget.id}`}
              open
              parameter={valueTarget}
              path={[...(ancestorsOf(index, valueTarget.nodeId).map((node) => node.name)), ...(index.nodeById.get(valueTarget.nodeId) ? [index.nodeById.get(valueTarget.nodeId)!.name] : [])]}
              onClose={() => setValueTarget(null)}
              onSaved={() => {
                notify({
                  title: 'Valor guardado',
                  description: `${valueTarget.name}: queda registrado en el historial.`,
                  tone: 'success',
                })
                parametersQuery.reload()
              }}
            />
          )}

          <ConfirmDialog
            open={deletingLevel !== null}
            onClose={() => setDeletingLevel(null)}
            onConfirm={() => void confirmDeleteLevel()}
            title="Eliminar nivel"
            confirmLabel="Eliminar"
            tone="danger"
            loading={busy || describingLevel}
          >
            Se eliminará <strong className="text-ink">{deletingLevel?.name}</strong> con todo su contenido.{' '}
            {describeLevel
              ? `Incluye ${describeLevel.nodes} ${describeLevel.nodes === 1 ? 'nivel' : 'niveles'} y ${
                  describeLevel.parameters
                } ${describeLevel.parameters === 1 ? 'parámetro' : 'parámetros'}${
                  describeLevel.changes > 0
                    ? `, y ${describeLevel.changes} ${
                        describeLevel.changes === 1 ? 'cambio de historial que también se eliminará' : 'cambios de historial que también se eliminarán'
                      }`
                    : ', sin historial'
                }. Esta acción no se puede deshacer.`
              : 'Comprobando su contenido…'}
          </ConfirmDialog>

          <ConfirmDialog
            open={deletingParameter !== null}
            onClose={() => setDeletingParameter(null)}
            onConfirm={() => void confirmDeleteParameter()}
            title="Eliminar parámetro"
            confirmLabel="Eliminar"
            tone="danger"
            loading={busy}
          >
            Se eliminará <strong className="text-ink">{deletingParameter?.name}</strong> y su historial de cambios.
            Esta acción no se puede deshacer.
          </ConfirmDialog>
        </>
      )}
    </CameraSection>
  )
}


