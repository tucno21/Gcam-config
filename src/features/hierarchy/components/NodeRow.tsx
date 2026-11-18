import {
  ChevronRight,
  CornerDownRight,
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { IconButton } from '../../../components/common/IconButton'
import type { NodeType, ParameterNode } from '../../../services/types'

export type NodeRowProps = {
  node: ParameterNode
  depth: number
  expanded: boolean
  hasChildren: boolean
  childCount: number
  parameterCount: number
  selected: boolean
  /** Zona de soltado resaltada al arrastrar: 'before' | 'into' | 'after' | null. */
  dropZone: 'before' | 'into' | 'after' | null
  isDragging: boolean
  searchMatch: boolean
  onToggle: (nodeId: string) => void
  onSelect: (node: ParameterNode) => void
  onAddChild: (node: ParameterNode) => void
  onEdit: (node: ParameterNode) => void
  onDelete: (node: ParameterNode) => void
  setDragRef: (element: HTMLElement | null) => void
  setDropRef: (zone: 'before' | 'into' | 'after', element: HTMLElement | null) => void
  dragHandleProps: Record<string, unknown>
  style?: CSSProperties
}

const TYPE_ICON: Record<NodeType, typeof Folder> = {
  category: Folder,
  group: FolderOpen,
  subgroup: CornerDownRight,
}

/**
 * Fila del árbol: guía por nivel, expansión, selección y tres zonas de soltado
 * (antes / dentro / después) para mover y reordenar con dnd-kit.
 */
export const NodeRow = ({
  node,
  depth,
  expanded,
  hasChildren,
  childCount,
  parameterCount,
  selected,
  dropZone,
  isDragging,
  searchMatch,
  onToggle,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
  setDragRef,
  setDropRef,
  dragHandleProps,
  style,
}: NodeRowProps) => {
  const Icon = TYPE_ICON[node.nodeType] ?? Folder

  return (
    <li
      ref={setDragRef}
      className={`group relative flex flex-col rounded-control transition-colors duration-150 ${
        isDragging ? 'opacity-40' : selected ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'
      }`}
      style={{ ...style, paddingLeft: `${depth * 18}px` }}
    >
      {/* Zona «antes»: reordenar como hermano anterior */}
      <div
        ref={(element) => setDropRef('before', element)}
        className="absolute left-0 right-0 top-0 z-10 h-2.5"
      >
        {dropZone === 'before' && <span className="absolute left-2 right-2 top-0 h-0.5 rounded bg-accent" />}
      </div>

      <div
        ref={(element) => setDropRef('into', element)}
        className={`flex items-center gap-1.5 py-1.5 pr-2 ${
          dropZone === 'into' ? 'rounded-control bg-accent/[0.08] ring-1 ring-accent' : ''
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={expanded ? `Contraer ${node.name}` : `Expandir ${node.name}`}
            aria-expanded={expanded}
            onClick={() => onToggle(node.id)}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-white/[0.05] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronRight
              aria-hidden="true"
              className={`size-3.5 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <span className="inline-flex size-6 shrink-0" />
        )}

        <button
          type="button"
          aria-label={`Arrastrar ${node.name}`}
          className="inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-control text-ink-disabled transition-colors hover:bg-white/[0.05] hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:cursor-grabbing"
          {...dragHandleProps}
        >
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={() => onSelect(node)}
          aria-current={selected ? 'true' : undefined}
          className={`min-w-0 flex-1 truncate rounded-control px-2 py-1 text-left text-[13px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            selected ? 'bg-accent/[0.12] font-medium text-ink' : 'text-ink-muted hover:bg-white/[0.04] hover:text-ink'
          }`}
        >
          {node.name}
          {searchMatch && !selected && <span className="ml-1 text-accent" aria-hidden="true">•</span>}
        </button>

        {parameterCount > 0 && (
          <span className="shrink-0 rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
            {parameterCount}p
          </span>
        )}
        {hasChildren && (
          <span className="shrink-0 font-mono text-[10px] text-ink-disabled">
            {expanded ? childCount : `${childCount}+`}
          </span>
        )}

        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
          <IconButton size="sm" label={`Añadir nodo hijo dentro de ${node.name}`} onClick={() => onAddChild(node)}>
            <Plus aria-hidden="true" className="size-3.5" />
          </IconButton>
          <IconButton size="sm" label={`Editar ${node.name}`} onClick={() => onEdit(node)}>
            <Pencil aria-hidden="true" className="size-3.5" />
          </IconButton>
          <IconButton size="sm" label={`Eliminar ${node.name}`} onClick={() => onDelete(node)}>
            <Trash2 aria-hidden="true" className="size-3.5" />
          </IconButton>
        </span>
      </div>

      {/* Zona «después»: reordenar como hermano siguiente */}
      <div
        ref={(element) => setDropRef('after', element)}
        className="absolute bottom-0 left-0 right-0 z-10 h-2.5"
      >
        {dropZone === 'after' && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded bg-accent" />}
      </div>
    </li>
  )
}
