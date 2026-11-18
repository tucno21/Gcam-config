import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Search, Network } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Input } from '../../../components/forms/Input'
import { Panel } from '../../../components/common/Panel'
import { Spinner } from '../../../components/feedback/Spinner'
import { useToast } from '../../../components/feedback/ToastContext'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useWorkspaceSelection } from '../../../hooks/useWorkspaceSelection'
import { useWorkspaceStore } from '../../../stores/useWorkspaceStore'
import { toAppError } from '../../../lib/errors/AppError'
import { nodeService } from '../../../services/nodeService'
import type { ParameterNode } from '../../../services/types'
import { NodeDetailPanel } from '../components/NodeDetailPanel'
import { NodeFormDialog } from '../components/NodeFormDialog'
import { NodeRow } from '../components/NodeRow'
import { VersionSection } from '../../versions/components/VersionSection'
import { ancestorsOf, branchIds, buildTreeIndex, searchVisibleIds, siblingOrderAfterDrop } from '../treeUtils'

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create'; parent: ParameterNode | null }
  | { mode: 'edit'; node: ParameterNode }

const useDroppableZone = (id: string): [(element: HTMLElement | null) => void, boolean] => {
  const { setNodeRef, isOver } = useDroppable({ id })
  return [setNodeRef, isOver]
}

/**
 * Colisión por puntero limitada a las zonas explícitas de cada fila.
 * Entre zonas superpuestas gana la más pequeña: los bordes de 10 px reordenan
 * y el resto de la fila anida. El droppable de la fila completa se ignora.
 */
const hierarchyCollision: CollisionDetection = (args) => {
  const collisions = pointerWithin(args).filter((collision) => String(collision.id).includes('::'))

  return collisions.sort((a, b) => {
    const heightA = a.data?.droppableContainer?.rect.current?.height ?? Number.POSITIVE_INFINITY
    const heightB = b.data?.droppableContainer?.rect.current?.height ?? Number.POSITIVE_INFINITY
    return heightA - heightB
  })
}

/** Constructor del árbol de parámetros: profundidad ilimitada, drag & drop y búsqueda. */
export const HierarchyPage = () => {
  const { notify } = useToast()
  const { cameraId, versionId } = useParams()
  useWorkspaceSelection(cameraId, versionId)
  const { selectedNodeId, selectNode } = useWorkspaceStore()

  const { status, data, error, reload } = useAsyncData(() => {
    if (!versionId) throw new Error('No se indicó la versión.')
    return nodeService.listByVersion(versionId)
  }, `tree|${versionId}`)

  const truncated = data?.truncated ?? false
  const index = useMemo(() => buildTreeIndex(data?.items ?? []), [data])

  const [searchInput, setSearchInput] = useState('')
  const searchTerm = searchInput.trim().toLowerCase()
  const searching = searchTerm.length > 0
  const searchIds = useMemo(() => searchVisibleIds(index, searchTerm), [index, searchTerm])

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })
  const [deleting, setDeleting] = useState<ParameterNode | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [describe, setDescribe] = useState<{ nodes: number; parameters: number } | null>(null)
  const [dragging, setDragging] = useState<ParameterNode | null>(null)

  const selected = selectedNodeId ? (index.nodeById.get(selectedNodeId) ?? null) : null

  // La rama del nodo seleccionado se considera expandida aunque no lo esté:
  // así «recordar el nodo seleccionado» también lo muestra al volver.
  const selectedAncestors = useMemo(() => {
    const ids = new Set<string>()
    if (selectedNodeId) for (const ancestor of ancestorsOf(index, selectedNodeId)) ids.add(ancestor.id)
    return ids
  }, [index, selectedNodeId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Filas visibles: expandidas en modo normal (la rama del seleccionado siempre);
  // en búsqueda, solo coincidencias y ancestros.
  const visibleRows = useMemo(() => {
    const rows: Array<{ node: ParameterNode; depth: number }> = []
    const walk = (list: ParameterNode[], depth: number) => {
      for (const node of list) {
        if (searching && !searchIds.has(node.id)) continue
        rows.push({ node, depth })
        const showChildren = searching || expandedIds.has(node.id) || selectedAncestors.has(node.id)
        if (showChildren) walk(index.childrenByParent.get(node.id) ?? [], depth + 1)
      }
    }
    walk(index.roots, 0)
    return rows
  }, [index, expandedIds, searching, searchIds, selectedAncestors])

  const toggleExpanded = (nodeId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  const expandAncestors = (nodeId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      for (const ancestor of ancestorsOf(index, nodeId)) next.add(ancestor.id)
      return next
    })
  }

  const handleSelect = (node: ParameterNode) => {
    selectNode(node.id)
    expandAncestors(node.id)
  }

  // ── Mutaciones ─────────────────────────────────────────────────────────
  const handleSaved = (node: ParameterNode, mode: 'create' | 'edit') => {
    notify({
      title: mode === 'create' ? 'Nodo creado' : 'Nodo actualizado',
      description: node.name,
      tone: 'success',
    })
    if (mode === 'create') {
      if (node.parentId) {
        setExpandedIds((previous) => new Set(previous).add(node.parentId as string))
      }
      selectNode(node.id)
    }
    reload()
  }

  const openDelete = async (node: ParameterNode) => {
    setDeleting(node)
    setDescribe(null)
    try {
      setDescribe(await nodeService.describeBranch(node.id))
    } catch {
      setDescribe(null) // el confirm sigue; la base valida de nuevo
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const result = await nodeService.removeBranch(deleting.id)
      notify({
        title: 'Nodo eliminado',
        description: `${deleting.name}: ${result.nodes} ${result.nodes === 1 ? 'nodo' : 'nodos'} y ${result.parameters} ${
          result.parameters === 1 ? 'parámetro' : 'parámetros'
        } eliminados.`,
        tone: 'success',
      })
      if (selectedNodeId && branchIds(index, deleting.id).includes(selectedNodeId)) {
        selectNode(deleting.parentId)
      }
      setDeleting(null)
      reload()
    } catch (cause) {
      notify({ title: 'No se pudo eliminar', description: toAppError(cause).message, tone: 'danger' })
    } finally {
      setDeleteBusy(false)
    }
  }

  // ── Drag & drop ────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setDragging(index.nodeById.get(String(event.active.id)) ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setDragging(null)
    if (!versionId || !event.over) return

    const draggedId = String(event.active.id)
    const overId = String(event.over.id)
    const separator = overId.indexOf('::')
    // Sin sufijo de zona, el destino es el droppable de la fila completa: anidar.
    const targetId = separator === -1 ? overId : overId.slice(0, separator)
    const position = (separator === -1 ? 'into' : overId.slice(separator + 2)) as 'before' | 'into' | 'after'
    if (draggedId === targetId) return

    const dragged = index.nodeById.get(draggedId)
    const target = index.nodeById.get(targetId)
    if (!dragged || !target) return

    try {
      if (position === 'into') {
        await nodeService.move(draggedId, targetId)
        setExpandedIds((previous) => new Set(previous).add(targetId))
        notify({ title: 'Nodo movido', description: `${dragged.name} → dentro de ${target.name}`, tone: 'success' })
      } else {
        const targetParentId = target.parentId
        const siblings = (index.childrenByParent.get(targetParentId) ?? []).map((candidate) => candidate.id)
        const ordered = siblingOrderAfterDrop(siblings, draggedId, targetId, position)
        if (dragged.parentId !== targetParentId) {
          await nodeService.move(draggedId, targetParentId, ordered.indexOf(draggedId))
        }
        await nodeService.reorder(versionId, targetParentId, ordered)
        notify({
          title: dragged.parentId !== targetParentId ? 'Nodo movido' : 'Orden actualizado',
          description: `${dragged.name} ${dragged.parentId !== targetParentId ? '→' : 'reordenado junto a'} ${
            targetParentId ? (index.nodeById.get(targetParentId)?.name ?? '') : 'la raíz'
          }`,
          tone: 'success',
        })
        if (targetParentId) setExpandedIds((previous) => new Set(previous).add(targetParentId))
      }
      reload()
    } catch (cause) {
      notify({ title: 'Movimiento no permitido', description: toAppError(cause).message, tone: 'danger' })
      reload()
    }
  }

  const isEmpty = index.total === 0

  const content = (
    <>
      {status === 'loading' && (
        <div className="flex items-center gap-2 px-1 py-6 text-sm text-ink-muted" role="status">
          <Spinner />
          <span>Cargando estructura…</span>
        </div>
      )}

      {status === 'error' && error && (
        <ErrorState title="No se pudo cargar la estructura" description={error.message} onRetry={reload} />
      )}

      {status === 'success' && (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          title="Estructura de parámetros"
          description={
            truncated
              ? `Se muestran los primeros ${index.total} nodos: la versión supera el tope de lectura.`
              : 'Arrastra el icono del nodo: suéltalo sobre otro para hacerlo hijo, o en el borde para reordenar.'
          }
          action={
            <Button size="sm" variant="primary" onClick={() => setDialog({ mode: 'create', parent: null })}>
              Nodo raíz
            </Button>
          }
          flush
          bodyClassName="p-0"
        >
          {!isEmpty && (
            <div className="relative border-b border-line p-3">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
              />
              <Input
                type="search"
                value={searchInput}
                placeholder="Buscar nodos por nombre…"
                aria-label="Buscar nodos"
                className="pl-9"
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          )}

          {isEmpty ? (
            <EmptyState
              icon={Network}
              title="Esta versión todavía no tiene estructura"
              description="Crea el primer nodo raíz (por ejemplo, una categoría general) y construye debajo la jerarquía que necesites, sin límite de profundidad."
              action={
                <Button variant="primary" onClick={() => setDialog({ mode: 'create', parent: null })}>
                  Crear nodo raíz
                </Button>
              }
              footnote="Los nombres son tuyos: LMC, AGC y BSG organizan sus menús de forma distinta y la aplicación no impone ninguna estructura."
            />
          ) : visibleRows.length === 0 ? (
            <div className="px-5 py-6 text-sm text-ink-muted" role="status">
              Ningún nodo coincide con «{searchInput}».
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={hierarchyCollision}
              onDragStart={handleDragStart}
              onDragEnd={(event) => void handleDragEnd(event)}
              onDragCancel={() => setDragging(null)}
            >
              <SortableContext items={visibleRows.map((row) => row.node.id)} strategy={verticalListSortingStrategy}>
                <ul className="p-2 pb-4">
                  {visibleRows.map(({ node, depth }) => (
                    <VisibleNodeRow
                      key={node.id}
                      node={node}
                      depth={depth}
                      index={index}
                      expandedIds={expandedIds}
                      searchTerm={searchTerm}
                      selectedNodeId={selectedNodeId}
                      dragging={dragging}
                      onToggle={toggleExpanded}
                      onSelect={handleSelect}
                      onAddChild={(parent) => setDialog({ mode: 'create', parent })}
                      onEdit={(nodeToEdit) => setDialog({ mode: 'edit', node: nodeToEdit })}
                      onDelete={(nodeToDelete) => void openDelete(nodeToDelete)}
                    />
                  ))}
                </ul>
              </SortableContext>
              <DragOverlay>
                {dragging && (
                  <span className="inline-flex items-center gap-2 rounded-control border border-line-strong bg-surface px-3 py-1.5 text-[13px] text-ink">
                    {dragging.name}
                  </span>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </Panel>

        {selected ? (
          <NodeDetailPanel
            index={index}
            node={selected}
            onAddChild={(parent) => setDialog({ mode: 'create', parent })}
            onEdit={(nodeToEdit) => setDialog({ mode: 'edit', node: nodeToEdit })}
            onDelete={(nodeToDelete) => void openDelete(nodeToDelete)}
          />
        ) : (
          <Panel title="Detalle del nodo" description="Selecciona un nodo del árbol para ver su detalle.">
            <p className="text-[13px] leading-relaxed text-ink-muted">
              Al seleccionar un nodo verás su ruta completa, cuántos descendientes y parámetros tiene, y las acciones
              para añadir hijos, editarlo o eliminarlo.
            </p>
          </Panel>
        )}
      </div>
      )}

      {dialog.mode !== 'closed' && (
        <NodeFormDialog
          key={`node-form-${dialog.mode}-${dialog.mode === 'edit' ? dialog.node.id : dialog.parent?.id ?? 'root'}`}
          open
          versionId={versionId ?? ''}
          mode={dialog.mode === 'edit' ? 'edit' : 'create'}
          target={dialog.mode === 'edit' ? dialog.node : dialog.parent}
          parentName={dialog.mode === 'create' && dialog.parent ? dialog.parent.name : null}
          onClose={() => setDialog({ mode: 'closed' })}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Eliminar nodo"
        confirmLabel="Eliminar nodo"
        tone="danger"
        loading={deleteBusy}
      >
        Se eliminará <strong className="text-ink">{deleting?.name}</strong> y{' '}
        <strong className="text-ink">todo su subárbol</strong>.{' '}
        {describe
          ? `Se borrarán ${describe.nodes} ${describe.nodes === 1 ? 'nodo' : 'nodos'} y ${describe.parameters} ${
              describe.parameters === 1 ? 'parámetro' : 'parámetros'
            }.`
          : 'La base lo impedirá si tiene datos dependientes.'}{' '}
        Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  )

  return (
    <VersionSection
      title="Estructura"
      description="Categorías, grupos y parámetros con profundidad ilimitada. El orden y la ruta se calculan desde las relaciones."
    >
      {content}
    </VersionSection>
  )
}

/** Fila visible conectada a dnd-kit y a las zonas de soltado. */
const VisibleNodeRow = ({
  node,
  depth,
  index,
  expandedIds,
  searchTerm,
  selectedNodeId,
  dragging,
  onToggle,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: ParameterNode
  depth: number
  index: ReturnType<typeof buildTreeIndex>
  expandedIds: Set<string>
  searchTerm: string
  selectedNodeId: string | null
  dragging: ParameterNode | null
  onToggle: (nodeId: string) => void
  onSelect: (node: ParameterNode) => void
  onAddChild: (node: ParameterNode) => void
  onEdit: (node: ParameterNode) => void
  onDelete: (node: ParameterNode) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { type: 'node' },
  })

  const children = index.childrenByParent.get(node.id) ?? []
  const searching = searchTerm.length > 0
  const expanded = searching ? true : expandedIds.has(node.id)

  const [beforeRef, beforeOver] = useDroppableZone(`${node.id}::before`)
  const [intoRef, intoOver] = useDroppableZone(`${node.id}::into`)
  const [afterRef, afterOver] = useDroppableZone(`${node.id}::after`)

  const activeZone = intoOver ? 'into' : beforeOver ? 'before' : (afterOver ? 'after' : null)

  return (
    <NodeRow
      node={node}
      depth={depth}
      expanded={expanded}
      hasChildren={children.length > 0}
      childCount={children.length}
      parameterCount={0}
      selected={selectedNodeId === node.id}
      dropZone={activeZone}
      isDragging={isDragging || dragging?.id === node.id}
      searchMatch={searching && node.name.toLowerCase().includes(searchTerm)}
      onToggle={onToggle}
      onSelect={onSelect}
      onAddChild={onAddChild}
      onEdit={onEdit}
      onDelete={onDelete}
      setDragRef={setNodeRef}
      setDropRef={(zoneName, element) => {
        if (zoneName === 'before') beforeRef(element)
        if (zoneName === 'into') intoRef(element)
        if (zoneName === 'after') afterRef(element)
      }}
      dragHandleProps={{ ...attributes, ...listeners }}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    />
  )
}
