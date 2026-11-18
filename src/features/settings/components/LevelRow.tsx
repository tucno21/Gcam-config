import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, ChevronRight, Copy, FolderTree, Pencil, Trash2 } from 'lucide-react'
import { ActionMenu } from '../../../components/common/ActionMenu'
import { Badge } from '../../../components/common/Badge'
import { cn } from '../../../lib/helpers/cn'
import type { ParameterNode } from '../../../services/types'

type LevelRowProps = {
  node: ParameterNode
  to: string
  childCount: number
  parameterCount: number
  onEdit: () => void
  onDuplicate: () => void
  onToggleActive: () => void
  onDelete: () => void
}

/** Fila de un nivel: el nombre manda y las acciones viven en un menú. */
export const LevelRow = ({
  node,
  to,
  childCount,
  parameterCount,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: LevelRowProps) => (
  <li
    className={cn(
      'flex items-center gap-1 border-b border-line pr-1.5 pl-1 last:border-b-0',
      !node.isActive && 'opacity-60',
    )}
  >
    <Link
      to={to}
      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-control px-2 py-2.5 transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <FolderTree aria-hidden="true" className="size-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{node.name}</span>
          {!node.isActive && <Badge tone="warning">Retirado</Badge>}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
          {childCount === 0 ? 'Sin subniveles' : `${childCount} ${childCount === 1 ? 'subnivel' : 'subniveles'}`}
          {' · '}
          {parameterCount === 0
            ? 'sin parámetros'
            : `${parameterCount} ${parameterCount === 1 ? 'parámetro' : 'parámetros'}`}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-disabled" />
    </Link>

    <ActionMenu
      label={`Acciones de ${node.name}`}
      items={[
        { key: 'edit', label: 'Editar nivel', icon: Pencil, onSelect: onEdit },
        { key: 'duplicate', label: 'Duplicar nivel', icon: Copy, onSelect: onDuplicate },
        {
          key: 'toggle',
          label: node.isActive ? 'Retirar nivel' : 'Reactivar nivel',
          icon: node.isActive ? Archive : ArchiveRestore,
          onSelect: onToggleActive,
        },
        { key: 'delete', label: 'Eliminar nivel', icon: Trash2, onSelect: onDelete, tone: 'danger' },
      ]}
    />
  </li>
)
