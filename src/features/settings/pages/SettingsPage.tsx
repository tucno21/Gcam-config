import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FolderPlus, Network, Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { Panel } from '../../../components/common/Panel'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { Breadcrumbs } from '../../../components/layout/Breadcrumbs'
import { Input } from '../../../components/forms/Input'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { toAppError } from '../../../lib/errors/AppError'
import { nodeService } from '../../../services/nodeService'
import { parameterService } from '../../../services/parameterService'
import { settingsService } from '../../../services/settingsService'
import type { Parameter, ParameterNode } from '../../../services/types'
import { VersionSection } from '../../versions/components/VersionSection'
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
  const { cameraId, versionId, nodeId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  useWorkspaceSelection(cameraId, versionId)

  const base = `/cameras/${cameraId ?? ''}/versions/${versionId ?? ''}`
  const settingsBase = `${base}/settings`

  const nodesQuery = useAsyncData(() => {
    if (!versionId) throw new Error('No se indicó la versión.')
    return nodeService.listByVersion(versionId)
  }, `nodes|${versionId}`)

  const parametersQuery = useAsyncData(() => {
    if (!versionId) throw new Error('No se indicó la versión.')
    return parameterService.listByVersion(versionId)
  }, `parameters|${versionId}`)

  const nodes = useMemo(() => nodesQuery.data?.items ?? [], [nodesQuery.data])
  const parameters = useMemo(() => parametersQuery.data ?? [], [parametersQuery.data])
  const index = useMemo(() => buildTreeIndex(nodes), [nodes])

  const current = nodeId ? (index.nodeById.get(nodeId) ?? null) : null
  const currentId = current?.id ?? null
  const path = useMemo(
    () => [...ancestorsOf(index, currentId).map((node) => node.name), ...(current ? [current.name] : [])],
    [index, currentId, current],
  )

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
  const [describeLevel, setDescribeLevel] = useState<{ nodes: number; parameters: number } | null>(null)
  const [deletingParameter, setDeletingParameter] = useState<Parameter | null>(null)
  const [busy, setBusy] = useState(false)

  const reloadAll = () => {
    nodesQuery.reload()
    parametersQuery.reload()
  }

  const openDeleteLevel = async (node: ParameterNode) => {
    setDeletingLevel(node)
    setDescribeLevel(null)
    try {
      setDescribeLevel(await nodeService.describeBranch(node.id))
    } catch {
      setDescribeLevel(null)
    }
  }

  const confirmDeleteLevel = async () => {
    if (!deletingLevel) return
    setBusy(true)
    try {
      const result = await nodeService.removeBranch(deletingLevel.id)
      notify({
        title: 'Nivel eliminado',
        description: `${deletingLevel.name}: ${result.nodes} ${result.nodes === 1 ? 'nivel' : 'niveles'} y ${result.parameters} ${
          result.parameters === 1 ? 'parámetro' : 'parámetros'
        }.`,
        tone: 'success',
      })
      if (currentId && branchIds(index, deletingLevel.id).includes(currentId)) {
        navigate(deletingLevel.parentId ? `${settingsBase}/${deletingLevel.parentId}` : settingsBase)
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
      await parameterService.remove(deletingParameter.id)
      notify({ title: 'Parámetro eliminado', description: deletingParameter.name, tone: 'success' })
      setDeletingParameter(null)
      parametersQuery.reload()
    } catch (cause) {
      notify({
        title: 'No se pudo eliminar',
        description: `${toAppError(cause).message} Si ya tiene historial, retíralo en lugar de borrarlo.`,
        tone: 'danger',
      })
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

  const isLoading = nodesQuery.status === 'loading' || parametersQuery.status === 'loading'
  const hasError = nodesQuery.status === 'error' || parametersQuery.status === 'error'

  const canAddParameter = current !== null

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        leadingIcon={<FolderPlus aria-hidden="true" className="size-4" />}
        onClick={() =>
          current
            ? setLevelDialog({ mode: 'create', parent: current })
            : setLevelDialog({ mode: 'create', parent: null })
        }
      >
        {current ? 'Añadir subnivel' : 'Añadir nivel'}
      </Button>
      {canAddParameter && (
        <Button
          size="sm"
          variant="primary"
          leadingIcon={<Plus aria-hidden="true" className="size-4" />}
          onClick={() => setParameterDialog({ mode: 'create' })}
        >
          Añadir parámetro
        </Button>
      )}
    </div>
  )

  return (
    <VersionSection
      title={current?.name ?? 'Ajustes'}
      description={
        current?.description ??
        'Réplica de los ajustes del teléfono: crea un nivel por pantalla y añade dentro sus parámetros con el valor actual.'
      }
      actions={actions}
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
            (nodesQuery.error ?? parametersQuery.error)?.message ?? 'La versión no está disponible.'
          }
          onRetry={reloadAll}
        />
      )}

      {!isLoading && !hasError && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Breadcrumbs
              items={[
                { label: 'Ajustes', to: settingsBase },
                ...(current
                  ? [
                      ...ancestorsOf(index, current.id).map((ancestor) => ({
                        label: ancestor.name,
                        to: `${settingsBase}/${ancestor.id}`,
                      })),
                      { label: current.name },
                    ]
                  : []),
              ]}
            />
            <div className="flex flex-wrap items-center gap-3">
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
                className="w-full sm:w-56"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {nodeId && !current && (
            <ErrorState
              title="Este nivel no existe en la versión"
              description="Puede que se haya eliminado o que pertenezca a otra versión."
              onRetry={() => navigate(settingsBase)}
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
                  footnote="Cada cámara y versión tiene su propia estructura: nada se copia automáticamente."
                />
              )}

              {current && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-panel border border-line bg-surface-sunken px-4 py-3">
                  <div className="min-w-0">
                    <p className="ui-label">Estás en</p>
                    <p className="mt-0.5 truncate text-[13px] text-ink">{path.join(' › ') || current.name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" onClick={() => setLevelDialog({ mode: 'edit', level: current })}>
                      Editar nivel
                    </Button>
                    <Button size="sm" onClick={() => void duplicateLevel(current)}>
                      Duplicar nivel
                    </Button>
                    <Button size="sm" onClick={() => void toggleLevel(current)}>
                      {current.isActive ? 'Retirar nivel' : 'Reactivar nivel'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void openDeleteLevel(current)}>
                      Eliminar nivel
                    </Button>
                  </div>
                </div>
              )}

              {levels.length > 0 && (
                <Panel
                  title="Niveles"
                  description="Pantallas dentro de este nivel. Entra para ver o añadir sus parámetros."
                  flush
                >
                  <ul>
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
                </Panel>
              )}

              {current && levelParameters.length > 0 && (
                <Panel
                  title="Parámetros"
                  description="Pulsa el valor para cambiarlo: el historial guarda el antes, el después, tu comentario y el efecto."
                  flush
                >
                  <ul>
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
                </Panel>
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
            loading={busy}
          >
            Se eliminará <strong className="text-ink">{deletingLevel?.name}</strong> con todo su contenido.{' '}
            {describeLevel
              ? `Incluye ${describeLevel.nodes} ${describeLevel.nodes === 1 ? 'nivel' : 'niveles'} y ${describeLevel.parameters} ${
                  describeLevel.parameters === 1 ? 'parámetro' : 'parámetros'
                } con su historial.`
              : 'La base lo impedirá si tiene historial: en ese caso retíralo.'}{' '}
            No se puede deshacer.
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
            Se eliminará <strong className="text-ink">{deletingParameter?.name}</strong>. Si ya tiene historial, la base
            lo impedirá: retíralo para conservarlo.
          </ConfirmDialog>
        </>
      )}
    </VersionSection>
  )
}
